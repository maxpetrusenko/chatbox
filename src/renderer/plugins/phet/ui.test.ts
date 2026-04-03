import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('PhET plugin UI', () => {
  it('emits a completion event when finish is invoked', () => {
    const html = readFileSync(join(__dirname, 'ui.html'), 'utf8')

    expect(html).toContain("type: 'COMPLETION'")
    expect(html).toContain("pluginId: 'phet'")
    expect(html).toContain('sendCompletion(summary);')
  })
})
