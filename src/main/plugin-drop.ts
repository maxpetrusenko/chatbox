import AdmZip from 'adm-zip'
import { JSDOM } from 'jsdom'
import { isPluginManifest } from '../shared/plugin-protocol'
import type { PluginPackageAudit, PluginSecurityCapabilities, PluginSecurityFinding } from '../shared/plugin-security'
import type { PluginManifest } from '../shared/plugin-types'

export interface InspectedPluginPackage {
  manifest: PluginManifest
  uiHtml?: string
  sourceType: 'manifest' | 'package'
  audit: PluginPackageAudit
}

const MAX_PACKAGE_BYTES = 5 * 1024 * 1024
const MAX_FILE_COUNT = 128
const MAX_ENTRY_BYTES = 2 * 1024 * 1024

const MIME_TYPES: Record<string, string> = {
  css: 'text/css',
  gif: 'image/gif',
  html: 'text/html',
  ico: 'image/x-icon',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  js: 'text/javascript',
  json: 'application/json',
  mjs: 'text/javascript',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  ogg: 'audio/ogg',
  otf: 'font/otf',
  png: 'image/png',
  svg: 'image/svg+xml',
  ttf: 'font/ttf',
  wav: 'audio/wav',
  webm: 'video/webm',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
}

const NETWORK_API_PATTERNS: Array<[keyof PluginSecurityCapabilities, RegExp]> = [
  ['usesNetworkApis', /\b(fetch\s*\(|XMLHttpRequest\b|WebSocket\b|EventSource\b|sendBeacon\s*\()/],
  ['usesDynamicCode', /\b(eval\s*\(|Function\s*\(|import\s*\(|importScripts\s*\()/],
  ['usesStorage', /\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/],
  ['usesForms', /<form\b|\.submit\s*\(/i],
  ['usesWorkers', /\b(Worker\b|SharedWorker\b|serviceWorker\b)/],
  ['usesNavigation', /\b(window\.open\s*\(|top\.location\b|parent\.location\b|location\.(assign|replace)\s*\()/],
  ['usesPostMessage', /\bpostMessage\s*\(/],
]

function decodePackageBase64(base64: string): Buffer {
  return Buffer.from(base64, 'base64')
}

function parseManifestJson(raw: string): PluginManifest {
  const parsed = JSON.parse(raw)
  if (!isPluginManifest(parsed)) {
    throw new Error('Invalid plugin manifest')
  }
  return parsed
}

function createCapabilities(): PluginSecurityCapabilities {
  return {
    usesInlineScripts: false,
    usesNetworkApis: false,
    usesDynamicCode: false,
    usesStorage: false,
    usesForms: false,
    usesWorkers: false,
    usesNavigation: false,
    usesPostMessage: false,
  }
}

function createAudit(partial?: Partial<PluginPackageAudit>): PluginPackageAudit {
  return {
    passed: false,
    findings: [],
    fileCount: 0,
    totalBytes: 0,
    entrypoint: null,
    detectedDomains: [],
    allowedDomains: [],
    capabilities: createCapabilities(),
    ...partial,
  }
}

function pushFinding(findings: PluginSecurityFinding[], code: string, severity: PluginSecurityFinding['severity'], message: string, evidence?: string[]) {
  findings.push({ code, severity, message, evidence })
}

function normalizeArchivePath(entryName: string): string {
  const normalized = entryName.replace(/\\/g, '/').replace(/^\.\//, '')
  if (!normalized || normalized.startsWith('/') || normalized.split('/').some((part) => part === '..')) {
    throw new Error(`Unsafe archive path: ${entryName}`)
  }
  return normalized
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function isDataLikeUrl(value: string): boolean {
  return /^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(value)
}

function extname(path: string): string {
  const idx = path.lastIndexOf('.')
  return idx === -1 ? '' : path.slice(idx + 1).toLowerCase()
}

function toDataUrl(path: string, buffer: Buffer): string {
  const mime = MIME_TYPES[extname(path)] || 'application/octet-stream'
  return `data:${mime};base64,${buffer.toString('base64')}`
}

function resolveRelativePath(basePath: string, target: string): string {
  const cleanedTarget = target.split('#')[0]?.split('?')[0] || ''
  const baseParts = basePath.split('/')
  baseParts.pop()
  const parts = cleanedTarget.split('/')
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (baseParts.length === 0) {
        throw new Error(`Unsafe relative path: ${target}`)
      }
      baseParts.pop()
      continue
    }
    baseParts.push(part)
  }
  return normalizeArchivePath(baseParts.join('/'))
}

function normalizeAllowedOrigin(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('*.')) return trimmed.toLowerCase()
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      return new URL(trimmed).origin.toLowerCase()
    }
    return new URL(`https://${trimmed}`).origin.toLowerCase()
  } catch {
    return null
  }
}

function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  const lowerOrigin = origin.toLowerCase()
  const hostname = new URL(lowerOrigin).hostname
  return allowedOrigins.some((allowed) => {
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(2)
      return hostname === suffix || hostname.endsWith(`.${suffix}`)
    }
    return lowerOrigin === allowed
  })
}

function extractOrigins(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s'"`()<>]+/gi) || []
  const origins = new Set<string>()
  for (const match of matches) {
    try {
      origins.add(new URL(match).origin.toLowerCase())
    } catch {
      continue
    }
  }
  return [...origins]
}

function rewriteCssUrls(css: string, currentPath: string, entries: Map<string, Buffer>, findings: PluginSecurityFinding[]): string {
  return css.replace(/url\(([^)]+)\)/gi, (full, rawTarget) => {
    const target = String(rawTarget).trim().replace(/^['"]|['"]$/g, '')
    if (!target || isDataLikeUrl(target)) return full
    if (isHttpUrl(target)) {
      pushFinding(findings, 'remote-css-url', 'critical', `Remote CSS asset is not allowed: ${target}`)
      return full
    }
    try {
      const resolved = resolveRelativePath(currentPath, target)
      const asset = entries.get(resolved)
      if (!asset) {
        pushFinding(findings, 'missing-css-asset', 'critical', `Missing CSS asset: ${resolved}`)
        return full
      }
      return `url(${toDataUrl(resolved, asset)})`
    } catch (error) {
      pushFinding(findings, 'unsafe-css-url', 'critical', error instanceof Error ? error.message : String(error))
      return full
    }
  })
}

function inlinePackageAssets(html: string, entrypoint: string, entries: Map<string, Buffer>, findings: PluginSecurityFinding[]): string {
  const dom = new JSDOM(html)
  const { document } = dom.window

  const scripts = [...document.querySelectorAll('script[src]')]
  for (const script of scripts) {
    const src = script.getAttribute('src')?.trim()
    if (!src) continue
    if (isHttpUrl(src)) {
      pushFinding(findings, 'remote-script', 'critical', `Remote script is not allowed: ${src}`)
      continue
    }
    const type = script.getAttribute('type')?.trim()
    if (type === 'module') {
      pushFinding(findings, 'module-script', 'critical', 'Module scripts are not supported for uploaded plugins')
      continue
    }
    try {
      const resolved = resolveRelativePath(entrypoint, src)
      const asset = entries.get(resolved)
      if (!asset) {
        pushFinding(findings, 'missing-script', 'critical', `Missing script asset: ${resolved}`)
        continue
      }
      const inline = document.createElement('script')
      inline.textContent = asset.toString('utf8')
      script.replaceWith(inline)
    } catch (error) {
      pushFinding(findings, 'unsafe-script-path', 'critical', error instanceof Error ? error.message : String(error))
    }
  }

  const stylesheets = [...document.querySelectorAll('link[rel="stylesheet"][href]')]
  for (const link of stylesheets) {
    const href = link.getAttribute('href')?.trim()
    if (!href) continue
    if (isHttpUrl(href)) {
      pushFinding(findings, 'remote-stylesheet', 'critical', `Remote stylesheet is not allowed: ${href}`)
      continue
    }
    try {
      const resolved = resolveRelativePath(entrypoint, href)
      const asset = entries.get(resolved)
      if (!asset) {
        pushFinding(findings, 'missing-stylesheet', 'critical', `Missing stylesheet asset: ${resolved}`)
        continue
      }
      const style = document.createElement('style')
      style.textContent = rewriteCssUrls(asset.toString('utf8'), resolved, entries, findings)
      link.replaceWith(style)
    } catch (error) {
      pushFinding(findings, 'unsafe-stylesheet-path', 'critical', error instanceof Error ? error.message : String(error))
    }
  }

  const sourceSelectors: Array<[string, string]> = [
    ['img[src]', 'src'],
    ['audio[src]', 'src'],
    ['video[src]', 'src'],
    ['source[src]', 'src'],
    ['track[src]', 'src'],
    ['image[href]', 'href'],
    ['[poster]', 'poster'],
    ['link[rel="icon"][href]', 'href'],
  ]
  for (const [selector, attr] of sourceSelectors) {
    const nodes = [...document.querySelectorAll(selector)]
    for (const node of nodes) {
      const value = node.getAttribute(attr)?.trim()
      if (!value || isDataLikeUrl(value)) continue
      if (isHttpUrl(value)) {
        pushFinding(findings, 'remote-asset', 'critical', `Remote asset is not allowed: ${value}`)
        continue
      }
      try {
        const resolved = resolveRelativePath(entrypoint, value)
        const asset = entries.get(resolved)
        if (!asset) {
          pushFinding(findings, 'missing-asset', 'critical', `Missing asset: ${resolved}`)
          continue
        }
        node.setAttribute(attr, toDataUrl(resolved, asset))
      } catch (error) {
        pushFinding(findings, 'unsafe-asset-path', 'critical', error instanceof Error ? error.message : String(error))
      }
    }
  }

  return dom.serialize()
}

function buildRuntimePolicyScript(allowedOrigins: string[]): string {
  const allowed = JSON.stringify(allowedOrigins)
  return `
(function () {
  const allowedOrigins = ${allowed};
  const isAllowed = (value) => {
    try {
      const url = new URL(value, location.href);
      return allowedOrigins.some((origin) => {
        if (origin.startsWith('*.')) {
          const suffix = origin.slice(2);
          return url.hostname === suffix || url.hostname.endsWith('.' + suffix);
        }
        return url.origin === origin;
      });
    } catch {
      return false;
    }
  };
  const report = (code, severity, message, evidence) => {
    window.parent.postMessage({
      type: 'PLUGIN_POLICY_VIOLATION',
      finding: { code, severity, message, evidence },
    }, '*');
  };
  const guardUrl = (value, code, message) => {
    if (!value) return value;
    if (!isAllowed(value)) {
      report(code, 'critical', message + ': ' + value, [String(value)]);
      throw new Error(message + ': ' + value);
    }
    return value;
  };
  const nativeFetch = window.fetch;
  window.fetch = (...args) => nativeFetch.call(window, guardUrl(args[0], 'runtime-fetch-domain', 'Blocked fetch to undeclared domain'), ...args.slice(1));
  const NativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    return NativeOpen.call(this, method, guardUrl(url, 'runtime-xhr-domain', 'Blocked XHR to undeclared domain'), ...rest);
  };
  const NativeWebSocket = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    return protocols === undefined
      ? new NativeWebSocket(guardUrl(url, 'runtime-websocket-domain', 'Blocked WebSocket to undeclared domain'))
      : new NativeWebSocket(guardUrl(url, 'runtime-websocket-domain', 'Blocked WebSocket to undeclared domain'), protocols);
  };
  window.WebSocket.prototype = NativeWebSocket.prototype;
  const NativeEventSource = window.EventSource;
  if (NativeEventSource) {
    window.EventSource = function (url, config) {
      return config === undefined
        ? new NativeEventSource(guardUrl(url, 'runtime-eventsource-domain', 'Blocked EventSource to undeclared domain'))
        : new NativeEventSource(guardUrl(url, 'runtime-eventsource-domain', 'Blocked EventSource to undeclared domain'), config);
    };
    window.EventSource.prototype = NativeEventSource.prototype;
  }
  if (navigator.sendBeacon) {
    const nativeBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      return nativeBeacon(guardUrl(url, 'runtime-beacon-domain', 'Blocked beacon to undeclared domain'), data);
    };
  }
  const nativeOpenWindow = window.open;
  window.open = function (...args) {
    report('runtime-window-open', 'critical', 'window.open is blocked inside uploaded plugins');
    return nativeOpenWindow ? null : null;
  };
  window.addEventListener('error', (event) => {
    report('runtime-error', 'critical', event.message || 'Unhandled runtime error');
  });
  window.addEventListener('unhandledrejection', (event) => {
    report('runtime-rejection', 'critical', event.reason?.message || String(event.reason || 'Unhandled promise rejection'));
  });
})();`
}

function buildCsp(allowedOrigins: string[]): string {
  const connectSrc = allowedOrigins.length > 0 ? allowedOrigins.join(' ') : "'none'"
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "worker-src 'none'",
    "form-action 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline' data:",
    "img-src data: blob:",
    "font-src data:",
    "media-src data: blob:",
    `connect-src ${connectSrc}`,
  ].join('; ')
}

function hardenHtmlForRuntime(html: string, manifest: PluginManifest): string {
  const dom = new JSDOM(html)
  const { document } = dom.window
  const allowedOrigins = [...new Set((manifest.allowedDomains || []).map(normalizeAllowedOrigin).filter(Boolean))] as string[]

  let head = document.querySelector('head')
  if (!head) {
    head = document.createElement('head')
    if (document.documentElement.firstChild) {
      document.documentElement.insertBefore(head, document.documentElement.firstChild)
    } else {
      document.documentElement.appendChild(head)
    }
  }

  const referrer = document.createElement('meta')
  referrer.setAttribute('name', 'referrer')
  referrer.setAttribute('content', 'no-referrer')
  head.prepend(referrer)

  const csp = document.createElement('meta')
  csp.setAttribute('http-equiv', 'Content-Security-Policy')
  csp.setAttribute('content', buildCsp(allowedOrigins))
  head.prepend(csp)

  const policyScript = document.createElement('script')
  policyScript.textContent = buildRuntimePolicyScript(allowedOrigins)
  head.prepend(policyScript)

  return dom.serialize()
}

function auditHtml(manifest: PluginManifest, html: string, entrypoint: string, fileCount: number, totalBytes: number): PluginPackageAudit {
  const findings: PluginSecurityFinding[] = []
  const dom = new JSDOM(html)
  const { document } = dom.window
  const capabilities = createCapabilities()
  const sourceText = dom.serialize()
  const detectedDomains = extractOrigins(sourceText)
  const allowedOrigins = [...new Set((manifest.allowedDomains || []).map(normalizeAllowedOrigin).filter(Boolean))] as string[]

  capabilities.usesInlineScripts = document.querySelectorAll('script:not([src])').length > 0
  if (document.querySelector('iframe, frame, object, embed')) {
    pushFinding(findings, 'embedded-frame', 'critical', 'Nested frames and embedded objects are not allowed')
  }
  if (document.querySelector('base')) {
    pushFinding(findings, 'base-tag', 'critical', 'Base tags are not allowed in uploaded plugins')
  }
  if ([...document.querySelectorAll('meta[http-equiv]')].some((meta) => meta.getAttribute('http-equiv')?.toLowerCase() === 'refresh')) {
    pushFinding(findings, 'meta-refresh', 'critical', 'Meta refresh redirects are not allowed')
  }
  if ([...document.querySelectorAll('[onload],[onclick],[onerror],[onmouseover],[onfocus],[onsubmit],[onchange]')].length > 0) {
    pushFinding(findings, 'inline-handlers', 'warning', 'Inline DOM event handlers increase audit risk')
  }

  for (const form of [...document.querySelectorAll('form')]) {
    capabilities.usesForms = true
    const action = form.getAttribute('action')?.trim()
    if (action && !isDataLikeUrl(action)) {
      pushFinding(findings, 'form-action', 'critical', 'Uploaded plugins may not submit forms to external endpoints', [action])
    }
  }

  for (const [capability, pattern] of NETWORK_API_PATTERNS) {
    if (pattern.test(sourceText)) {
      capabilities[capability] = true
    }
  }

  if (capabilities.usesDynamicCode) {
    pushFinding(findings, 'dynamic-code', 'critical', 'Dynamic code execution APIs are not allowed')
  }
  if (capabilities.usesWorkers) {
    pushFinding(findings, 'worker-api', 'critical', 'Workers and service workers are not allowed in uploaded plugins')
  }
  if (capabilities.usesStorage) {
    pushFinding(findings, 'persistent-storage', 'warning', 'Plugin uses browser storage APIs')
  }
  if (capabilities.usesNavigation) {
    pushFinding(findings, 'navigation-api', 'critical', 'Navigation APIs are not allowed in uploaded plugins')
  }
  if (capabilities.usesNetworkApis) {
    if (allowedOrigins.length === 0) {
      pushFinding(findings, 'missing-allowed-domains', 'critical', 'Network APIs detected but manifest.allowedDomains is empty')
    }
    const undeclared = detectedDomains.filter((origin) => !isOriginAllowed(origin, allowedOrigins))
    if (undeclared.length > 0) {
      pushFinding(findings, 'undeclared-domains', 'critical', 'Plugin references domains not declared in manifest.allowedDomains', undeclared)
    }
  }
  for (const allowed of manifest.allowedDomains || []) {
    if (normalizeAllowedOrigin(allowed) === null) {
      pushFinding(findings, 'invalid-allowed-domain', 'critical', `Invalid allowedDomains entry: ${allowed}`)
    }
  }

  const passed = !findings.some((finding) => finding.severity === 'critical')
  return {
    passed,
    findings,
    fileCount,
    totalBytes,
    entrypoint,
    detectedDomains,
    allowedDomains: allowedOrigins,
    capabilities,
  }
}

function inspectManifestOnly(manifest: PluginManifest): PluginPackageAudit {
  const audit = createAudit({
    fileCount: 1,
    totalBytes: Buffer.byteLength(JSON.stringify(manifest), 'utf8'),
    allowedDomains: [...new Set((manifest.allowedDomains || []).map(normalizeAllowedOrigin).filter(Boolean))] as string[],
  })
  pushFinding(audit.findings, 'manifest-only-upload', 'critical', 'Production marketplace submissions require a packaged plugin with executable UI')
  audit.passed = false
  return audit
}

export function inspectPluginPackage(filename: string, base64: string): InspectedPluginPackage {
  const lower = filename.toLowerCase()
  const buffer = decodePackageBase64(base64)

  if (buffer.length > MAX_PACKAGE_BYTES) {
    throw new Error(`Plugin package exceeds ${Math.floor(MAX_PACKAGE_BYTES / (1024 * 1024))}MB limit`)
  }

  if (lower.endsWith('.json')) {
    const manifest = parseManifestJson(buffer.toString('utf8'))
    return {
      manifest,
      sourceType: 'manifest',
      audit: inspectManifestOnly(manifest),
    }
  }

  if (!lower.endsWith('.cbplugin') && !lower.endsWith('.zip')) {
    throw new Error('Unsupported plugin package. Use .cbplugin, .zip, or .json')
  }

  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()
  if (entries.length > MAX_FILE_COUNT) {
    throw new Error(`Plugin package has too many files (${entries.length}/${MAX_FILE_COUNT})`)
  }

  const entryBuffers = new Map<string, Buffer>()
  let totalBytes = 0
  for (const entry of entries) {
    if (entry.isDirectory) continue
    const normalized = normalizeArchivePath(entry.entryName)
    const data = entry.getData()
    totalBytes += data.length
    if (data.length > MAX_ENTRY_BYTES) {
      throw new Error(`Archive entry too large: ${normalized}`)
    }
    entryBuffers.set(normalized, data)
  }

  if (totalBytes > MAX_PACKAGE_BYTES) {
    throw new Error(`Plugin archive contents exceed ${Math.floor(MAX_PACKAGE_BYTES / (1024 * 1024))}MB limit`)
  }

  const manifestEntryName = entryBuffers.has('plugin.json') ? 'plugin.json' : entryBuffers.has('manifest.json') ? 'manifest.json' : null
  if (!manifestEntryName) {
    throw new Error('No plugin.json found in package')
  }

  const manifest = parseManifestJson(entryBuffers.get(manifestEntryName)!.toString('utf8'))
  const entrypoint = normalizeArchivePath(manifest.widget.entrypoint.replace(/^\.\//, ''))
  const uiEntry = entryBuffers.get(entrypoint)
  if (!uiEntry) {
    throw new Error(`Missing ${entrypoint} in package`)
  }

  const initialHtml = uiEntry.toString('utf8')
  if (!initialHtml.trim()) {
    throw new Error(`Empty ${entrypoint} in package`)
  }

  const rewriteFindings: PluginSecurityFinding[] = []
  const inlinedHtml = inlinePackageAssets(initialHtml, entrypoint, entryBuffers, rewriteFindings)
  const hardenedHtml = hardenHtmlForRuntime(inlinedHtml, manifest)
  const audit = auditHtml(manifest, hardenedHtml, entrypoint, entryBuffers.size, totalBytes)
  audit.findings.unshift(...rewriteFindings)
  audit.passed = !audit.findings.some((finding) => finding.severity === 'critical')

  return {
    manifest,
    uiHtml: hardenedHtml,
    sourceType: 'package',
    audit,
  }
}
