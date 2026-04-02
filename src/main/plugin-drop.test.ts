import AdmZip from 'adm-zip'
import { describe, expect, it } from 'vitest'
import { inspectPluginPackage } from './plugin-drop'

const manifest = {
  id: 'drop-weather',
  name: 'Drop Weather',
  version: '1.0.0',
  description: 'Dropped plugin',
  category: 'external-public' as const,
  tools: [
    {
      name: 'start_game',
      description: 'Start the game',
      parameters: [],
    },
  ],
  widget: { entrypoint: 'ui.html' },
  allowedDomains: ['api.example.com'],
}

describe('inspectPluginPackage', () => {
  it('marks manifest-only uploads as not production ready', () => {
    const base64 = Buffer.from(JSON.stringify(manifest), 'utf8').toString('base64')
    const result = inspectPluginPackage('plugin.json', base64)
    expect(result.sourceType).toBe('manifest')
    expect(result.audit.passed).toBe(false)
    expect(result.audit.findings.some((finding) => finding.code === 'manifest-only-upload')).toBe(true)
  })

  it('parses cbplugin archives and hardens local assets into single-file html', () => {
    const zip = new AdmZip()
    zip.addFile('plugin.json', Buffer.from(JSON.stringify(manifest), 'utf8'))
    zip.addFile('ui.html', Buffer.from('<html><head><script src="app.js"></script></head><body><img src="icon.png"></body></html>', 'utf8'))
    zip.addFile('app.js', Buffer.from('window.parent.postMessage({ type: "PLUGIN_READY", nonce: "" }, "*")', 'utf8'))
    zip.addFile('icon.png', Buffer.from([137, 80, 78, 71]))

    const result = inspectPluginPackage('drop-weather.cbplugin', zip.toBuffer().toString('base64'))

    expect(result.sourceType).toBe('package')
    expect(result.audit.passed).toBe(true)
    expect(result.uiHtml).toContain('Content-Security-Policy')
    expect(result.uiHtml).toContain('data:image/png;base64')
    expect(result.uiHtml).not.toContain('src="app.js"')
  })

  it('fails package audit when remote scripts are present', () => {
    const zip = new AdmZip()
    zip.addFile('plugin.json', Buffer.from(JSON.stringify(manifest), 'utf8'))
    zip.addFile(
      'ui.html',
      Buffer.from('<html><head><script src="https://evil.example.com/payload.js"></script></head><body></body></html>', 'utf8'),
    )

    const result = inspectPluginPackage('drop-weather.cbplugin', zip.toBuffer().toString('base64'))

    expect(result.audit.passed).toBe(false)
    expect(result.audit.findings.some((finding) => finding.code === 'remote-script')).toBe(true)
  })

  it('fails package audit when network APIs are used without declared domains', () => {
    const zip = new AdmZip()
    zip.addFile(
      'plugin.json',
      Buffer.from(
        JSON.stringify({
          ...manifest,
          allowedDomains: [],
        }),
        'utf8',
      ),
    )
    zip.addFile(
      'ui.html',
      Buffer.from(
        '<html><body><script>fetch("https://api.example.com/game");window.parent.postMessage({ type: "PLUGIN_READY", nonce: "" }, "*")</script></body></html>',
        'utf8',
      ),
    )

    const result = inspectPluginPackage('drop-weather.cbplugin', zip.toBuffer().toString('base64'))

    expect(result.audit.passed).toBe(false)
    expect(result.audit.findings.some((finding) => finding.code === 'missing-allowed-domains')).toBe(true)
  })
})
