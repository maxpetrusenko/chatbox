import type { PluginManifest } from '@shared/plugin-types'
import { beforeEach, describe, expect, it } from 'vitest'
import { authInfoStore } from '@/stores/authInfoStore'
import { chatboxAuthStore } from '@/stores/chatboxAuthStore'
import { k12Store } from '@/stores/k12Store'
import { createPluginRegistryStore, type PluginRegistryStore } from './pluginRegistry'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const chessManifest: PluginManifest = {
  id: 'chess',
  name: 'Chess',
  version: '1.0.0',
  description: 'Play chess inline',
  category: 'internal',
  tools: [
    { name: 'start_game', description: 'Start a new game', parameters: [] },
    {
      name: 'apply_move',
      description: 'Apply a move',
      parameters: [{ name: 'move', type: 'string', description: 'SAN move', required: true }],
    },
    { name: 'get_position', description: 'Get current position', parameters: [] },
  ],
  widget: { entrypoint: 'ui.html' },
}

const weatherManifest: PluginManifest = {
  id: 'weather',
  name: 'Weather Lab',
  version: '1.0.0',
  description: 'Weather forecasts',
  category: 'external-public',
  tools: [
    {
      name: 'lookup_forecast',
      description: 'Get forecast',
      parameters: [{ name: 'city', type: 'string', description: 'City name', required: true }],
    },
  ],
  widget: { entrypoint: 'ui.html' },
}

const spotifyManifest: PluginManifest = {
  id: 'spotify',
  name: 'Spotify Study DJ',
  version: '1.0.0',
  description: 'Study playlists',
  category: 'external-authenticated',
  tools: [{ name: 'search_playlist', description: 'Search playlists', parameters: [] }],
  widget: { entrypoint: 'ui.html' },
  auth: {
    type: 'oauth2-pkce',
    authorizationUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    scopes: ['playlist-read-private'],
  },
}

const wolframManifest: PluginManifest = {
  id: 'wolfram',
  name: 'Wolfram Alpha',
  version: '1.0.0',
  description: 'Computational knowledge engine',
  category: 'external-public',
  tools: [{ name: 'compute', description: 'Compute a query', parameters: [] }],
  widget: { entrypoint: 'ui.html' },
  auth: { type: 'api-key' },
}

const gatedChessManifest: PluginManifest = {
  ...chessManifest,
  appAuth: { type: 'chatbox-ai-login' },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pluginRegistry', () => {
  let store: ReturnType<typeof createPluginRegistryStore>
  let get: () => PluginRegistryStore

  beforeEach(() => {
    store = createPluginRegistryStore()
    get = store.getState
    authInfoStore.getState().clearTokens()
    chatboxAuthStore.setState({ status: 'signed_out', profile: null, initialized: true })
    k12Store.setState((state) => ({
      ...state,
      isAuthenticated: false,
      currentUser: null,
    }))
  })

  // -- Manifest registration --

  describe('registerManifest', () => {
    it('registers a manifest', () => {
      expect(get().registerManifest(chessManifest)).toBe(true)
      expect(get().manifests).toHaveLength(1)
      expect(get().manifests[0].id).toBe('chess')
    })

    it('rejects duplicate plugin ids', () => {
      get().registerManifest(chessManifest)
      expect(get().registerManifest(chessManifest)).toBe(false)
      expect(get().manifests).toHaveLength(1)
    })

    it('registers multiple distinct manifests', () => {
      get().registerManifest(chessManifest)
      get().registerManifest(weatherManifest)
      expect(get().manifests).toHaveLength(2)
    })
  })

  // -- Tool set derivation --

  describe('getToolSet', () => {
    it('exposes namespaced tools from all registered manifests', () => {
      get().registerManifest(chessManifest)
      get().registerManifest(weatherManifest)

      const tools = get().getToolSet('session-1')
      expect(tools).toHaveLength(4) // 3 chess + 1 weather
      expect(tools.map((t) => t.namespacedName)).toContain('plugin__chess__start_game')
      expect(tools.map((t) => t.namespacedName)).toContain('plugin__weather__lookup_forecast')
    })

    it('returns empty array with no manifests', () => {
      expect(get().getToolSet('session-1')).toHaveLength(0)
    })

    it('keeps district-key tools visible to students without per-student auth', () => {
      get().registerManifest(wolframManifest)
      k12Store.setState((state) => ({
        ...state,
        isAuthenticated: true,
        classes: state.classes.map((cls) =>
          cls.id === 'class-1' ? { ...cls, activePlugins: [...cls.activePlugins, 'wolfram'] } : cls
        ),
        currentUser: {
          id: 'student-1',
          email: 'student@example.edu',
          name: 'Student',
          role: 'student',
          districtId: 'district-1',
          schoolId: 'school-1',
          classId: 'class-1',
        },
      }))

      const tools = get().getToolSet('session-1')
      expect(tools.map((tool) => tool.namespacedName)).toContain('plugin__wolfram__compute')
    })

    it('hides teacher tools when a plugin is disabled for the current scope', () => {
      get().registerManifest(chessManifest)
      k12Store.setState((state) => ({
        ...state,
        isAuthenticated: true,
        currentUser: {
          id: 'user-teacher',
          email: 'teacher@westfield.edu',
          name: 'Teacher Demo',
          role: 'teacher',
          districtId: 'district-1',
          schoolId: 'school-1',
        },
        classes: state.classes.map((cls) =>
          cls.teacherId === 'user-teacher'
            ? { ...cls, activePlugins: cls.activePlugins.filter((pluginId) => pluginId !== 'chess') }
            : cls
        ),
      }))

      const tools = get().getToolSet('session-1')
      expect(tools.map((tool) => tool.namespacedName)).not.toContain('plugin__chess__start_game')
    })

    it('hides app-auth tools when Chatbox AI is signed out', () => {
      get().registerManifest(gatedChessManifest)

      const tools = get().getToolSet('session-1')
      expect(tools.map((tool) => tool.namespacedName)).not.toContain('plugin__chess__start_game')
    })

    it('shows app-auth tools when Chatbox AI is signed in', () => {
      get().registerManifest(gatedChessManifest)
      chatboxAuthStore.setState({
        status: 'signed_in',
        profile: { id: 'user-1', email: 'max@example.com', created_at: new Date().toISOString() },
        initialized: true,
      })

      const tools = get().getToolSet('session-1')
      expect(tools.map((tool) => tool.namespacedName)).toContain('plugin__chess__start_game')
    })
  })

  // -- Tool call resolution --

  describe('resolveToolCall', () => {
    it('resolves a valid namespaced tool', () => {
      get().registerManifest(chessManifest)
      const result = get().resolveToolCall('plugin__chess__start_game')
      expect(result).toEqual({ pluginId: 'chess', toolName: 'start_game' })
    })

    it('returns null for unknown plugin', () => {
      expect(get().resolveToolCall('plugin__unknown__foo')).toBeNull()
    })

    it('returns null for unknown tool on known plugin', () => {
      get().registerManifest(chessManifest)
      expect(get().resolveToolCall('plugin__chess__nonexistent')).toBeNull()
    })

    it('returns null for non-namespaced name', () => {
      expect(get().resolveToolCall('start_game')).toBeNull()
    })
  })

  // -- Instance lifecycle --

  describe('createInstance', () => {
    it('creates an instance with stable instanceId', () => {
      get().registerManifest(chessManifest)
      const inst = get().createInstance('chess', 'session-1')
      expect(inst).not.toBeNull()
      expect(inst!.instanceId).toBeTruthy()
      expect(inst!.pluginId).toBe('chess')
      expect(inst!.sessionId).toBe('session-1')
      expect(inst!.status).toBe('loading')
      expect(inst!.authStatus).toBe('none')
    })

    it('returns null for unknown plugin', () => {
      expect(get().createInstance('unknown', 'session-1')).toBeNull()
    })

    it('sets authStatus to required for authenticated plugins', () => {
      get().registerManifest(spotifyManifest)
      const inst = get().createInstance('spotify', 'session-1')
      expect(inst!.authStatus).toBe('required')
    })

    it('creates app-auth instances in required state when Chatbox AI is signed out', () => {
      get().registerManifest(gatedChessManifest)
      const inst = get().createInstance('chess', 'session-1')
      expect(inst).not.toBeNull()
      expect(inst!.authStatus).toBe('required')
    })

    it('marks app-auth instances connected when Chatbox AI is signed in', () => {
      get().registerManifest(gatedChessManifest)
      chatboxAuthStore.setState({
        status: 'signed_in',
        profile: { id: 'user-1', email: 'max@example.com', created_at: new Date().toISOString() },
        initialized: true,
      })

      const inst = get().createInstance('chess', 'session-1')
      expect(inst!.authStatus).toBe('connected')
    })

    it('keeps app-auth gated when stale tokens exist but auth is signed out', () => {
      get().registerManifest(gatedChessManifest)
      authInfoStore.getState().setTokens({ accessToken: 'stale', refreshToken: 'stale' })

      const tools = get().getToolSet('session-1')
      expect(tools.map((tool) => tool.namespacedName)).not.toContain('plugin__chess__start_game')
    })
  })

  // -- Instance state updates --

  describe('instance state management', () => {
    it('updates instance status', () => {
      get().registerManifest(chessManifest)
      const inst = get().createInstance('chess', 'session-1')!
      get().updateInstanceStatus(inst.instanceId, 'ready')
      expect(get().getInstance(inst.instanceId)!.status).toBe('ready')
    })

    it('persists latest plugin state snapshot', () => {
      get().registerManifest(chessManifest)
      const inst = get().createInstance('chess', 'session-1')!
      const state = { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', moveCount: 1 }
      get().updateInstanceState(inst.instanceId, state)
      expect(get().getInstance(inst.instanceId)!.lastState).toEqual(state)
    })

    it('records completion and marks instance completed', () => {
      get().registerManifest(chessManifest)
      const inst = get().createInstance('chess', 'session-1')!
      const completion = { pluginId: 'chess', instanceId: inst.instanceId, summary: 'Checkmate — white wins' }
      get().updateInstanceCompletion(inst.instanceId, completion)
      const updated = get().getInstance(inst.instanceId)!
      expect(updated.status).toBe('completed')
      expect(updated.lastCompletion).toEqual(completion)
    })

    it('updates auth status', () => {
      get().registerManifest(spotifyManifest)
      const inst = get().createInstance('spotify', 'session-1')!
      get().updateInstanceAuth(inst.instanceId, 'connected')
      expect(get().getInstance(inst.instanceId)!.authStatus).toBe('connected')
    })
  })

  // -- Session queries --

  describe('session queries', () => {
    it('returns instances for a specific session', () => {
      get().registerManifest(chessManifest)
      get().registerManifest(weatherManifest)
      get().createInstance('chess', 'session-1')
      get().createInstance('weather', 'session-1')
      get().createInstance('chess', 'session-2')

      expect(get().getInstancesForSession('session-1')).toHaveLength(2)
      expect(get().getInstancesForSession('session-2')).toHaveLength(1)
    })

    it('finds active instance for plugin in session', () => {
      get().registerManifest(chessManifest)
      const inst = get().createInstance('chess', 'session-1')!
      get().updateInstanceStatus(inst.instanceId, 'active')
      expect(get().getActiveInstanceForPlugin('chess', 'session-1')).toBeDefined()
    })

    it('does not return completed instance as active', () => {
      get().registerManifest(chessManifest)
      const inst = get().createInstance('chess', 'session-1')!
      get().updateInstanceCompletion(inst.instanceId, {
        pluginId: 'chess',
        instanceId: inst.instanceId,
        summary: 'done',
      })
      expect(get().getActiveInstanceForPlugin('chess', 'session-1')).toBeUndefined()
    })
  })
})
