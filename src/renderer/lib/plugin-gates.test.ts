import { describe, expect, it } from 'vitest'
import { getPluginToolVisibility } from './plugin-gates'

describe('getPluginToolVisibility', () => {
  it('returns heuristic visibility copy for plugins with tools', () => {
    expect(
      getPluginToolVisibility({
        name: 'Chess',
        tools: [{ name: 'start_game', description: 'Start game', parameters: [] }],
      })
    ).toEqual({
      label: 'AI intent gated',
      description: 'Chess tool appears to the model only when chat intent or active-app follow-up matches.',
    })
  })

  it('returns null when a plugin exposes no tools', () => {
    expect(
      getPluginToolVisibility({
        name: 'Viewer',
        tools: [],
      })
    ).toBeNull()
  })
})
