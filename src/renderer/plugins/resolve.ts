/**
 * Resolve plugin entrypoint URLs.
 *
 * For bundled plugins we build a blob URL from the raw HTML source.
 * This works in sandboxed iframes without needing a custom protocol
 * or static file serving configuration.
 *
 * For remote plugins (future), this would return a sandboxed URL.
 */

// Cache blob URLs so we don't recreate them on every render
const blobUrlCache = new Map<string, string>()

// Map of pluginId → raw HTML source string for bundled plugins.
const pluginHtmlSources = new Map<string, string>()

export function registerPluginHtml(pluginId: string, html: string): void {
  pluginHtmlSources.set(pluginId, html)
  // Invalidate cached blob URL
  const old = blobUrlCache.get(pluginId)
  if (old) {
    URL.revokeObjectURL(old)
    blobUrlCache.delete(pluginId)
  }
}

export function resolvePluginEntrypoint(pluginId: string, _entrypoint: string): string | null {
  // Check for registered HTML source
  const html = pluginHtmlSources.get(pluginId)
  if (html) {
    let url = blobUrlCache.get(pluginId)
    if (!url) {
      const blob = new Blob([html], { type: 'text/html' })
      url = URL.createObjectURL(blob)
      blobUrlCache.set(pluginId, url)
    }
    return url
  }
  return null
}
