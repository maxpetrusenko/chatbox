import { describe, expect, it, vi } from 'vitest'
import { buildPluginAvailabilityPrompt } from './plugin-access'

vi.mock('@/stores/chatboxAuthStore', () => ({
  chatboxAuthStore: {
    getState: () => ({ status: 'signed_out' }),
  },
}))

vi.mock('@/stores/k12Store', () => ({
  k12Store: {
    getState: () => ({ isAuthenticated: false }),
  },
}))

describe('buildPluginAvailabilityPrompt', () => {
  it('does not mention deleted plugins when they are omitted from the visible manifest list', () => {
    const prompt = buildPluginAvailabilityPrompt([
      {
        id: 'chess',
        name: 'Chess',
        version: '1.0.0',
        description: 'Play chess inline',
        category: 'internal',
        appAuth: { type: 'chatbox-ai-login' },
        tools: [],
        widget: { entrypoint: 'ui.html' },
      },
    ])

    expect(prompt).toContain('Chess')
    expect(prompt).not.toContain('Weather Lab')
  })
})
