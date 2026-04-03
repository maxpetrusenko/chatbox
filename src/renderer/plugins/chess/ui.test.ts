import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Chess plugin UI', () => {
  it('does not render an in-game sign-in prompt', () => {
    const html = readFileSync(join(__dirname, 'ui.html'), 'utf8')

    expect(html).not.toContain('Sign in to play')
    expect(html).not.toContain('btn-sign-in')
    expect(html).not.toContain("type: 'AUTH_REQUEST'")
  })
})
