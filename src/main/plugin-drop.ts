import AdmZip from 'adm-zip'
import { isPluginManifest } from '../shared/plugin-protocol'
import type { PluginManifest } from '../shared/plugin-types'

export interface InspectedPluginPackage {
  manifest: PluginManifest
  uiHtml?: string
  sourceType: 'manifest' | 'package'
}

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

export function inspectPluginPackage(filename: string, base64: string): InspectedPluginPackage {
  const lower = filename.toLowerCase()
  const buffer = decodePackageBase64(base64)

  if (lower.endsWith('.json')) {
    const manifest = parseManifestJson(buffer.toString('utf8'))
    return {
      manifest,
      sourceType: 'manifest',
    }
  }

  if (!lower.endsWith('.cbplugin') && !lower.endsWith('.zip')) {
    throw new Error('Unsupported plugin package. Use .cbplugin, .zip, or .json')
  }

  const zip = new AdmZip(buffer)
  const manifestEntry = zip.getEntry('plugin.json') || zip.getEntry('manifest.json')
  if (!manifestEntry) {
    throw new Error('No plugin.json found in package')
  }

  const manifest = parseManifestJson(manifestEntry.getData().toString('utf8'))
  const entrypoint = manifest.widget.entrypoint.replace(/^\.\//, '')
  const uiEntry = zip.getEntry(entrypoint)
  if (!uiEntry) {
    throw new Error(`Missing ${entrypoint} in package`)
  }

  const uiHtml = uiEntry.getData().toString('utf8')
  if (!uiHtml.trim()) {
    throw new Error(`Empty ${entrypoint} in package`)
  }

  return {
    manifest,
    uiHtml,
    sourceType: 'package',
  }
}
