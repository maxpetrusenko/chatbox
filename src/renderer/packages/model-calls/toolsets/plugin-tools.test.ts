/**
 * @vitest-environment jsdom
 */

import type { PluginManifest } from '@shared/plugin-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authInfoStore } from '@/stores/authInfoStore'
import { chatboxAuthStore } from '@/stores/chatboxAuthStore'
import { k12Store } from '@/stores/k12Store'
import { pluginRegistryStore } from '@/stores/pluginRegistry'
import { consumeQueuedPluginToolInvocations, getPluginToolSet, isPluginMountToolResult } from './plugin-tools'

const chessManifest: PluginManifest = {
  id: 'chess',
  name: 'Chess',
  version: '1.0.0',
  description: 'Play chess inline',
  category: 'internal',
  appAuth: { type: 'chatbox-ai-login' },
  tools: [{ name: 'start_game', description: 'Start a new game', parameters: [] }],
  widget: { entrypoint: 'ui.html' },
}

const weatherManifest: PluginManifest = {
  id: 'weather',
  name: 'Weather',
  version: '1.0.0',
  description: 'Check the weather',
  category: 'internal',
  tools: [
    {
      name: 'get_forecast',
      description: 'Get weather forecast',
      parameters: [{ name: 'city', type: 'string', description: 'City name', required: true }],
    },
  ],
  widget: { entrypoint: 'weather.html' },
}

describe('plugin-tools', () => {
  beforeEach(() => {
    authInfoStore.getState().clearTokens()
    authInfoStore.getState().setTokens({ accessToken: 'access', refreshToken: 'refresh' })
    chatboxAuthStore.setState({
      status: 'signed_in',
      profile: { id: 'user-1', email: 'max@example.com', created_at: new Date().toISOString() },
      initialized: true,
    })
    k12Store.setState((state) => ({
      ...state,
      isAuthenticated: false,
      currentUser: null,
    }))
    pluginRegistryStore.setState({ manifests: [], instances: [] })
    pluginRegistryStore.getState().registerManifest(chessManifest)
  })

  it('returns immediate mount result and queues initial invocation for a new instance', async () => {
    const tools = getPluginToolSet('session-1')
    const startGame = tools['plugin__chess__start_game']
    expect(startGame).toBeDefined()

    const result = await startGame.execute({})
    expect(isPluginMountToolResult(result)).toBe(true)
    if (!isPluginMountToolResult(result)) return

    const queued = consumeQueuedPluginToolInvocations(result.pluginMount.instanceId)
    expect(queued).toHaveLength(1)
    expect(queued[0]?.toolName).toBe('start_game')
  })

  it('dispatches live tool-invoke events for active instances', async () => {
    const instance = pluginRegistryStore.getState().createInstance('chess', 'session-1')
    expect(instance).toBeTruthy()
    pluginRegistryStore.getState().updateInstanceStatus(instance!.instanceId, 'active')

    const tools = getPluginToolSet('session-1')
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    const executePromise = tools['plugin__chess__start_game'].execute({})

    expect(dispatchSpy).toHaveBeenCalledOnce()

    dispatchSpy.mockRestore()
    executePromise.catch(() => undefined)
  })

  it('does not expose chess tools when Chatbox AI is signed out', () => {
    authInfoStore.getState().clearTokens()
    chatboxAuthStore.setState({ status: 'signed_out', profile: null, initialized: true })

    const tools = getPluginToolSet('session-1')
    expect(tools['plugin__chess__start_game']).toBeUndefined()
  })

  it('rejects stale tool executions after a teacher disables the app scope', async () => {
    const tools = getPluginToolSet('session-1')
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

    await expect(tools['plugin__chess__start_game'].execute({})).rejects.toThrow(
      'Chess is disabled for the current scope.'
    )
  })
})

describe('multi-plugin coexistence in same session', () => {
  const sessionId = 'session-multi'

  beforeEach(() => {
    authInfoStore.getState().clearTokens()
    authInfoStore.getState().setTokens({ accessToken: 'access', refreshToken: 'refresh' })
    chatboxAuthStore.setState({
      status: 'signed_in',
      profile: { id: 'user-1', email: 'max@example.com', created_at: new Date().toISOString() },
      initialized: true,
    })
    k12Store.setState((state) => ({
      ...state,
      isAuthenticated: false,
      currentUser: null,
    }))
    pluginRegistryStore.setState({ manifests: [], instances: [] })
    pluginRegistryStore.getState().registerManifest(chessManifest)
    pluginRegistryStore.getState().registerManifest(weatherManifest)
  })

  it('exposes tools from both plugins in the same tool set', () => {
    const tools = getPluginToolSet(sessionId)
    expect(tools['plugin__chess__start_game']).toBeDefined()
    expect(tools['plugin__weather__get_forecast']).toBeDefined()
  })

  it('creates independent instances for each plugin in the same session', async () => {
    const tools = getPluginToolSet(sessionId)

    // Invoke chess tool — creates first instance
    const chessResult = await tools['plugin__chess__start_game'].execute({})
    expect(isPluginMountToolResult(chessResult)).toBe(true)
    const chessMount = (chessResult as any).pluginMount

    // Invoke weather tool — creates second instance
    const weatherResult = await tools['plugin__weather__get_forecast'].execute({ city: 'Seattle' })
    expect(isPluginMountToolResult(weatherResult)).toBe(true)
    const weatherMount = (weatherResult as any).pluginMount

    // Both instances exist in the same session
    const instances = pluginRegistryStore.getState().getInstancesForSession(sessionId)
    expect(instances).toHaveLength(2)

    // Instance IDs are distinct
    expect(chessMount.instanceId).not.toBe(weatherMount.instanceId)

    // Each instance points to its own plugin
    expect(chessMount.pluginId).toBe('chess')
    expect(weatherMount.pluginId).toBe('weather')
  })

  it('maintains independent state per plugin instance', () => {
    const store = pluginRegistryStore.getState()
    const chessInst = store.createInstance('chess', sessionId)!
    const weatherInst = store.createInstance('weather', sessionId)!

    // Update each instance with different state
    store.updateInstanceState(chessInst.instanceId, { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR' })
    store.updateInstanceState(weatherInst.instanceId, { temp: 72, condition: 'sunny' })

    // Verify states are isolated
    const chess = pluginRegistryStore.getState().getInstance(chessInst.instanceId)!
    const weather = pluginRegistryStore.getState().getInstance(weatherInst.instanceId)!

    expect(chess.lastState).toEqual({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR' })
    expect(weather.lastState).toEqual({ temp: 72, condition: 'sunny' })

    // Updating one does not affect the other
    store.updateInstanceState(chessInst.instanceId, { fen: 'new-fen' })
    expect(pluginRegistryStore.getState().getInstance(weatherInst.instanceId)!.lastState).toEqual({
      temp: 72,
      condition: 'sunny',
    })
  })

  it('maintains independent status per plugin instance', () => {
    const store = pluginRegistryStore.getState()
    const chessInst = store.createInstance('chess', sessionId)!
    const weatherInst = store.createInstance('weather', sessionId)!

    store.updateInstanceStatus(chessInst.instanceId, 'active')
    store.updateInstanceStatus(weatherInst.instanceId, 'ready')

    expect(pluginRegistryStore.getState().getInstance(chessInst.instanceId)!.status).toBe('active')
    expect(pluginRegistryStore.getState().getInstance(weatherInst.instanceId)!.status).toBe('ready')

    // Completing chess does not affect weather
    store.updateInstanceCompletion(chessInst.instanceId, {
      pluginId: 'chess',
      instanceId: chessInst.instanceId,
      summary: 'Checkmate',
    })

    expect(pluginRegistryStore.getState().getInstance(chessInst.instanceId)!.status).toBe('completed')
    expect(pluginRegistryStore.getState().getInstance(weatherInst.instanceId)!.status).toBe('ready')
  })

  it('queues tool invocations independently per instance', async () => {
    const tools = getPluginToolSet(sessionId)

    const chessResult = await tools['plugin__chess__start_game'].execute({})
    const weatherResult = await tools['plugin__weather__get_forecast'].execute({ city: 'Portland' })

    const chessId = (chessResult as any).pluginMount.instanceId
    const weatherId = (weatherResult as any).pluginMount.instanceId

    const chessQueued = consumeQueuedPluginToolInvocations(chessId)
    const weatherQueued = consumeQueuedPluginToolInvocations(weatherId)

    expect(chessQueued).toHaveLength(1)
    expect(chessQueued[0]?.toolName).toBe('start_game')

    expect(weatherQueued).toHaveLength(1)
    expect(weatherQueued[0]?.toolName).toBe('get_forecast')
    expect(weatherQueued[0]?.parameters).toEqual({ city: 'Portland' })
  })
})
