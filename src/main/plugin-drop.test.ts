import AdmZip from 'adm-zip'
import { describe, expect, it } from 'vitest'
import { inspectPluginPackage } from './plugin-drop'

const manifest = {
  id: 'drop-weather',
  name: 'Drop Weather',
  version: '1.0.0',
  description: 'Dropped plugin',
  category: 'external-public',
  tools: [],
  widget: { entrypoint: 'ui.html' },
}

describe('inspectPluginPackage', () => {
  it('parses manifest json uploads', () => {
    const base64 = Buffer.from(JSON.stringify(manifest), 'utf8').toString('base64')
    const result = inspectPluginPackage('plugin.json', base64)
    expect(result.sourceType).toBe('manifest')
    expect(result.manifest.id).toBe('drop-weather')
  })

  it('parses cbplugin archives with plugin.json and ui.html', () => {
    const zip = new AdmZip()
    zip.addFile('plugin.json', Buffer.from(JSON.stringify(manifest), 'utf8'))
    zip.addFile('ui.html', Buffer.from('<html><body>ok</body></html>', 'utf8'))
    const result = inspectPluginPackage('drop-weather.cbplugin', zip.toBuffer().toString('base64'))
    expect(result.sourceType).toBe('package')
    expect(result.uiHtml).toContain('ok')
  })
})
