/**
 * @vitest-environment jsdom
 */

import type { PluginAuthDefinition } from '@shared/plugin-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import platform from '@/platform'
import { createPluginAuthStore, registerPluginAuth } from './pluginAuthStore'

const spotifyAuth: PluginAuthDefinition = {
  type: 'oauth2-pkce',
  clientId: 'spotify-client',
  authorizationUrl: 'https://accounts.spotify.com/authorize',
  tokenUrl: 'https://accounts.spotify.com/api/token',
  scopes: ['playlist-read-private'],
}

const githubAuth: PluginAuthDefinition = {
  type: 'device-flow',
  clientId: 'github-client',
  deviceAuthorizationUrl: 'https://github.com/login/device/code',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  scopes: ['read:user'],
}

describe('pluginAuthStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    ;(window as any).electronAPI = undefined
    vi.spyOn(platform, 'openLink').mockResolvedValue(undefined)
    vi.spyOn(platform, 'getStoreBlob').mockResolvedValue(null)
    vi.spyOn(platform, 'setStoreBlob').mockResolvedValue(undefined)
    vi.spyOn(platform, 'delStoreBlob').mockResolvedValue(undefined)
    registerPluginAuth('spotify', spotifyAuth)
    registerPluginAuth('github', githubAuth)
  })

  it('starts PKCE auth and opens the browser', async () => {
    const store = createPluginAuthStore()

    await store.getState().beginAuth('spotify', spotifyAuth)

    expect(platform.openLink).toHaveBeenCalledOnce()
    expect(String(vi.mocked(platform.openLink).mock.calls[0]?.[0])).toContain('accounts.spotify.com/authorize')
    expect(String(vi.mocked(platform.openLink).mock.calls[0]?.[0])).toContain('client_id=spotify-client')
    expect(store.getState().sessions.spotify?.status).toBe('authorizing')
  })

  it('handles PKCE callback and stores the exchanged token', async () => {
    const store = createPluginAuthStore()
    vi.spyOn(platform, 'getStoreBlob').mockImplementation(async (key: string) => {
      if (key === 'plugin-auth-pending:state-123') {
        return JSON.stringify({
          pluginId: 'spotify',
          verifier: 'verifier-1',
          redirectUri: 'chatbox://plugin-auth/callback',
        })
      }
      return null
    })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'token-1', refresh_token: 'refresh-1', expires_in: 3600 }),
    } as Response) as any

    await store.getState().handleCallbackPath('/plugin-auth/callback?state=state-123&code=code-abc')

    expect(platform.setStoreBlob).toHaveBeenCalledWith('plugin-auth-token:spotify', expect.stringContaining('token-1'))
    expect(store.getState().sessions.spotify?.status).toBe('connected')
    expect(store.getState().sessions.spotify?.accessToken).toBe('token-1')
  })

  it('refreshes an expired oauth token on hydrate', async () => {
    const store = createPluginAuthStore()
    vi.spyOn(platform, 'getStoreBlob').mockResolvedValue(
      JSON.stringify({ accessToken: 'old', refreshToken: 'refresh-1', expiresAt: Date.now() - 1000 })
    )
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'fresh', refresh_token: 'refresh-2', expires_in: 3600 }),
    } as Response) as any

    await store.getState().hydrate('spotify', spotifyAuth)

    expect(store.getState().sessions.spotify?.status).toBe('connected')
    expect(store.getState().sessions.spotify?.accessToken).toBe('fresh')
  })

  it('starts device flow and opens verification URL', async () => {
    vi.useFakeTimers()
    const store = createPluginAuthStore()
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_code: 'device-1',
          user_code: 'ABCD-EFGH',
          verification_uri: 'https://github.com/login/device',
          verification_uri_complete: 'https://github.com/login/device?user_code=ABCD-EFGH',
          expires_in: 600,
          interval: 1,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'gh-token', expires_in: 3600 }),
      } as Response) as any

    const promise = store.getState().beginAuth('github', githubAuth)
    await vi.runAllTimersAsync()
    await promise

    expect(platform.openLink).toHaveBeenCalledWith('https://github.com/login/device?user_code=ABCD-EFGH')
    expect(store.getState().sessions.github?.status).toBe('connected')
    expect(store.getState().sessions.github?.accessToken).toBe('gh-token')
    vi.useRealTimers()
  })
})
