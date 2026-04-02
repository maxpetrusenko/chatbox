import type { PluginAuthDefinition, PluginAuthType } from '@shared/plugin-types'
import { createStore, useStore } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { startDeviceFlow } from '@/packages/plugin-auth/device-flow'
import { createPkcePair, randomBase64Url } from '@/packages/plugin-auth/pkce'

export interface PluginAuthSession {
  pluginId: string
  authType: PluginAuthType
  status: 'idle' | 'required' | 'authorizing' | 'connected' | 'expired' | 'error'
  accessToken?: string
  expiresAt?: number
  userCode?: string
  verificationUri?: string
  verificationUriComplete?: string
  error?: string
}

interface StoredToken {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  scope?: string
  tokenType?: string
}

interface PendingPkceState {
  pluginId: string
  verifier: string
  redirectUri: string
}

interface PluginAuthState {
  sessions: Record<string, PluginAuthSession>
}

interface PluginAuthActions {
  hydrate: (pluginId: string, auth: PluginAuthDefinition) => Promise<void>
  beginAuth: (pluginId: string, auth: PluginAuthDefinition) => Promise<void>
  ensureAccessToken: (pluginId: string, auth: PluginAuthDefinition) => Promise<string | null>
  disconnect: (pluginId: string) => Promise<void>
  handleCallbackPath: (path: string) => Promise<void>
}

type PluginAuthStore = PluginAuthState & PluginAuthActions

const TOKEN_KEY = (pluginId: string) => `plugin-auth-token:${pluginId}`
async function getPlatform() {
  const mod = await import('../platform/index.js')
  return mod.default
}

const PENDING_KEY = (state: string) => `plugin-auth-pending:${state}`

async function getSecret(key: string): Promise<string | null> {
  if (typeof window !== 'undefined' && window.electronAPI?.invoke) {
    return window.electronAPI.invoke('plugin-auth:get-secret', key)
  }
  return (await getPlatform()).getStoreBlob(key)
}

async function setSecret(key: string, value: string): Promise<void> {
  if (typeof window !== 'undefined' && window.electronAPI?.invoke) {
    await window.electronAPI.invoke('plugin-auth:set-secret', key, value)
    return
  }
  await (await getPlatform()).setStoreBlob(key, value)
}

async function delSecret(key: string): Promise<void> {
  if (typeof window !== 'undefined' && window.electronAPI?.invoke) {
    await window.electronAPI.invoke('plugin-auth:delete-secret', key)
    return
  }
  await (await getPlatform()).delStoreBlob(key)
}

function getRedirectUri(): string {
  const scheme = process.env.NODE_ENV === 'development' ? 'chatbox-dev' : 'chatbox'
  return `${scheme}://plugin-auth/callback`
}

async function readStoredToken(pluginId: string): Promise<StoredToken | null> {
  const raw = await getSecret(TOKEN_KEY(pluginId))
  if (!raw) return null
  return JSON.parse(raw) as StoredToken
}

async function writeStoredToken(pluginId: string, token: StoredToken): Promise<void> {
  await setSecret(TOKEN_KEY(pluginId), JSON.stringify(token))
}

async function refreshOAuthToken(
  pluginId: string,
  auth: PluginAuthDefinition,
  refreshToken: string
): Promise<StoredToken> {
  if (!auth.clientId || !auth.tokenUrl) {
    throw new Error('Missing OAuth client configuration')
  }
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: auth.clientId,
  })
  const response = await fetch(auth.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })
  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`)
  }
  const json = (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    scope?: string
    token_type?: string
  }
  const token: StoredToken = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || refreshToken,
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
    scope: json.scope,
    tokenType: json.token_type,
  }
  await writeStoredToken(pluginId, token)
  return token
}

function upsertSession(set: (fn: (draft: PluginAuthStore) => void) => void, session: PluginAuthSession): void {
  set((draft) => {
    draft.sessions[session.pluginId] = {
      ...draft.sessions[session.pluginId],
      ...session,
    }
  })
}

export function createPluginAuthStore() {
  return createStore<PluginAuthStore>()(
    immer((set, get) => ({
      sessions: {},

      hydrate: async (pluginId, auth) => {
        const token = await readStoredToken(pluginId)
        if (!token) {
          upsertSession(set, { pluginId, authType: auth.type, status: 'required' })
          return
        }
        const expiresSoon = token.expiresAt ? token.expiresAt <= Date.now() + 60_000 : false
        let nextToken = token
        if (expiresSoon && token.refreshToken && auth.type === 'oauth2-pkce') {
          try {
            nextToken = await refreshOAuthToken(pluginId, auth, token.refreshToken)
          } catch (error) {
            upsertSession(set, {
              pluginId,
              authType: auth.type,
              status: 'expired',
              error: error instanceof Error ? error.message : String(error),
            })
            return
          }
        }
        upsertSession(set, {
          pluginId,
          authType: auth.type,
          status: nextToken.expiresAt && nextToken.expiresAt <= Date.now() ? 'expired' : 'connected',
          accessToken: nextToken.accessToken,
          expiresAt: nextToken.expiresAt,
        })
      },

      beginAuth: async (pluginId, auth) => {
        try {
          if (!auth.clientId) {
            upsertSession(set, { pluginId, authType: auth.type, status: 'error', error: 'Missing client id' })
            return
          }

          upsertSession(set, { pluginId, authType: auth.type, status: 'authorizing', error: undefined })

          if (auth.type === 'oauth2-pkce') {
            if (!auth.authorizationUrl || !auth.tokenUrl) {
              upsertSession(set, { pluginId, authType: auth.type, status: 'error', error: 'Missing OAuth URLs' })
              return
            }
            const redirectUri = getRedirectUri()
            const state = randomBase64Url(24)
            const { verifier, challenge } = await createPkcePair()
            await setSecret(
              PENDING_KEY(state),
              JSON.stringify({ pluginId, verifier, redirectUri } satisfies PendingPkceState)
            )
            const authorizationUrl = new URL(auth.authorizationUrl)
            authorizationUrl.searchParams.set('client_id', auth.clientId)
            authorizationUrl.searchParams.set('response_type', 'code')
            authorizationUrl.searchParams.set('redirect_uri', redirectUri)
            authorizationUrl.searchParams.set('code_challenge_method', 'S256')
            authorizationUrl.searchParams.set('code_challenge', challenge)
            authorizationUrl.searchParams.set('state', state)
            if (auth.scopes?.length) {
              authorizationUrl.searchParams.set('scope', auth.scopes.join(' '))
            }
            await (await getPlatform()).openLink(authorizationUrl.toString())
            return
          }

          if (auth.type === 'device-flow') {
            if (!auth.deviceAuthorizationUrl || !auth.tokenUrl) {
              upsertSession(set, { pluginId, authType: auth.type, status: 'error', error: 'Missing device flow URLs' })
              return
            }
            const started = await startDeviceFlow({
              deviceAuthorizationUrl: auth.deviceAuthorizationUrl,
              clientId: auth.clientId,
              scopes: auth.scopes,
            })
            upsertSession(set, {
              pluginId,
              authType: auth.type,
              status: 'authorizing',
              userCode: started.user_code,
              verificationUri: started.verification_uri,
              verificationUriComplete: started.verification_uri_complete,
            })
            await (await getPlatform()).openLink(started.verification_uri_complete || started.verification_uri)
            const startedAt = Date.now()
            const maxUntil = startedAt + started.expires_in * 1000
            const intervalMs = (started.interval || 5) * 1000
            while (Date.now() < maxUntil) {
              await new Promise((resolve) => setTimeout(resolve, intervalMs))
              const body = new URLSearchParams({
                client_id: auth.clientId,
                device_code: started.device_code,
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
              })
              const response = await fetch(auth.tokenUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  Accept: 'application/json',
                },
                body,
              })
              const json = (await response.json()) as {
                access_token?: string
                refresh_token?: string
                expires_in?: number
                error?: string
              }
              if (json.error === 'authorization_pending') {
                continue
              }
              if (json.error === 'slow_down') {
                await new Promise((resolve) => setTimeout(resolve, intervalMs))
                continue
              }
              if (!response.ok || !json.access_token) {
                throw new Error(json.error || `Device flow failed: ${response.status}`)
              }
              const token: StoredToken = {
                accessToken: json.access_token,
                refreshToken: json.refresh_token,
                expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
              }
              await writeStoredToken(pluginId, token)
              upsertSession(set, {
                pluginId,
                authType: auth.type,
                status: 'connected',
                accessToken: token.accessToken,
                expiresAt: token.expiresAt,
                userCode: undefined,
                verificationUri: undefined,
                verificationUriComplete: undefined,
              })
              return
            }
            upsertSession(set, { pluginId, authType: auth.type, status: 'expired', error: 'Device flow expired' })
          }
        } catch (error) {
          upsertSession(set, {
            pluginId,
            authType: auth.type,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
          })
        }
      },

      ensureAccessToken: async (pluginId, auth) => {
        await get().hydrate(pluginId, auth)
        const session = get().sessions[pluginId]
        return session?.accessToken || null
      },

      disconnect: async (pluginId) => {
        await delSecret(TOKEN_KEY(pluginId))
        set((draft) => {
          const existing = draft.sessions[pluginId]
          draft.sessions[pluginId] = {
            pluginId,
            authType: existing?.authType || 'none',
            status: 'required',
          }
        })
      },

      handleCallbackPath: async (path) => {
        const url = new URL(path, 'https://chatbox.local')
        const state = url.searchParams.get('state') || ''
        const code = url.searchParams.get('code') || ''
        const error = url.searchParams.get('error') || ''
        if (!state) return
        const pendingRaw = await getSecret(PENDING_KEY(state))
        await delSecret(PENDING_KEY(state))
        if (!pendingRaw) return
        const pending = JSON.parse(pendingRaw) as PendingPkceState
        if (error) {
          upsertSession(set, {
            pluginId: pending.pluginId,
            authType: 'oauth2-pkce',
            status: 'error',
            error,
          })
          return
        }
        if (!get().sessions[pending.pluginId]) {
          upsertSession(set, { pluginId: pending.pluginId, authType: 'oauth2-pkce', status: 'authorizing' })
        }
        const manifestAuth = authDefinitions.get(pending.pluginId)
        if (!manifestAuth?.clientId || !manifestAuth.tokenUrl) {
          upsertSession(set, {
            pluginId: pending.pluginId,
            authType: 'oauth2-pkce',
            status: 'error',
            error: 'Missing OAuth configuration',
          })
          return
        }
        const body = new URLSearchParams({
          client_id: manifestAuth.clientId,
          grant_type: 'authorization_code',
          code,
          redirect_uri: pending.redirectUri,
          code_verifier: pending.verifier,
        })
        const response = await fetch(manifestAuth.tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body,
        })
        if (!response.ok) {
          upsertSession(set, {
            pluginId: pending.pluginId,
            authType: 'oauth2-pkce',
            status: 'error',
            error: `Token exchange failed: ${response.status}`,
          })
          return
        }
        const json = (await response.json()) as {
          access_token: string
          refresh_token?: string
          expires_in?: number
          scope?: string
          token_type?: string
        }
        const token: StoredToken = {
          accessToken: json.access_token,
          refreshToken: json.refresh_token,
          expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
          scope: json.scope,
          tokenType: json.token_type,
        }
        await writeStoredToken(pending.pluginId, token)
        upsertSession(set, {
          pluginId: pending.pluginId,
          authType: 'oauth2-pkce',
          status: 'connected',
          accessToken: token.accessToken,
          expiresAt: token.expiresAt,
          error: undefined,
        })
      },
    }))
  )
}

const authDefinitions = new Map<string, PluginAuthDefinition>()
let brokerInitialized = false

export const pluginAuthStore = createPluginAuthStore()

export function registerPluginAuth(pluginId: string, auth: PluginAuthDefinition | undefined): void {
  if (!auth || auth.type === 'none') return
  authDefinitions.set(pluginId, auth)
}

export function initPluginAuthBroker(): void {
  if (brokerInitialized || typeof window === 'undefined') return
  brokerInitialized = true
  window.addEventListener('plugin-auth-callback', (event) => {
    const path = (event as CustomEvent<{ path: string }>).detail?.path
    if (!path) return
    void pluginAuthStore.getState().handleCallbackPath(path)
  })
}

export function usePluginAuth<T>(selector: (state: PluginAuthStore) => T): T {
  return useStore(pluginAuthStore, selector)
}
