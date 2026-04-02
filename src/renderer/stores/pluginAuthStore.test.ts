/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { createPluginAuthStore, getPluginAuthSetupError } from './pluginAuthStore'

describe('plugin auth setup errors', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reports missing spotify client id clearly', () => {
    expect(getPluginAuthSetupError('spotify', { type: 'oauth2-pkce' })).toContain('SPOTIFY_CLIENT_ID')
  })

  it('hydrates auth error for misconfigured spotify plugin', async () => {
    const store = createPluginAuthStore()
    await store.getState().hydrate('spotify', { type: 'oauth2-pkce' })
    expect(store.getState().sessions.spotify.status).toBe('error')
    expect(store.getState().sessions.spotify.error).toContain('SPOTIFY_CLIENT_ID')
  })
})
