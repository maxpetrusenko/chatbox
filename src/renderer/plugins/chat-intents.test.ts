/**
 * @vitest-environment jsdom
 */

import type { PluginManifest } from '@shared/plugin-types'
import { beforeEach, describe, expect, it } from 'vitest'
import { resolvePluginToolCall } from '@/packages/model-calls/toolsets/plugin-tools'
import { authInfoStore } from '@/stores/authInfoStore'
import { chatboxAuthStore } from '@/stores/chatboxAuthStore'
import { hiddenBuiltinPluginsStore } from '@/stores/hiddenBuiltinPluginsStore'
import { k12Store } from '@/stores/k12Store'
import { pluginRegistryStore } from '@/stores/pluginRegistry'
import {
  executePluginChatIntent,
  resolvePluginChatIntent,
  resolvePluginDiscoveryMessage,
  shouldEnablePluginTools,
} from './chat-intents'

const chessManifest: PluginManifest = {
  id: 'chess',
  name: 'Chess',
  version: '1.0.0',
  description: 'Play chess inline',
  category: 'internal',
  appAuth: { type: 'chatbox-ai-login' },
  tools: [
    { name: 'start_game', description: 'Start a new game', parameters: [] },
    {
      name: 'finish_game',
      description: 'Finish the current game',
      parameters: [{ name: 'reason', type: 'string', description: 'Reason', required: false }],
    },
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
      parameters: [{ name: 'city', type: 'string', description: 'City', required: true }],
    },
    {
      name: 'finish',
      description: 'Close weather',
      parameters: [{ name: 'summary', type: 'string', description: 'Summary', required: false }],
    },
  ],
  widget: { entrypoint: 'ui.html' },
}

const spotifyManifest: PluginManifest = {
  id: 'spotify',
  name: 'Spotify Study DJ',
  version: '1.0.0',
  description: 'Spotify playlists',
  category: 'external-authenticated',
  tools: [
    {
      name: 'search_playlists',
      description: 'Search playlists',
      parameters: [{ name: 'query', type: 'string', description: 'Query', required: true }],
    },
    {
      name: 'finish',
      description: 'Close spotify',
      parameters: [{ name: 'summary', type: 'string', description: 'Summary', required: false }],
    },
  ],
  widget: { entrypoint: 'ui.html' },
}

const githubManifest: PluginManifest = {
  id: 'github',
  name: 'GitHub Repo Coach',
  version: '1.0.0',
  description: 'GitHub repos',
  category: 'external-authenticated',
  tools: [
    { name: 'list_my_repos', description: 'List repos', parameters: [] },
    {
      name: 'finish',
      description: 'Close github',
      parameters: [{ name: 'summary', type: 'string', description: 'Summary', required: false }],
    },
  ],
  widget: { entrypoint: 'ui.html' },
}

const geogebraManifest: PluginManifest = {
  id: 'geogebra',
  name: 'GeoGebra',
  version: '1.0.0',
  description: 'Interactive graphing calculator',
  category: 'external-public',
  tools: [
    {
      name: 'plot_equation',
      description: 'Plot equation',
      parameters: [{ name: 'equation', type: 'string', description: 'Equation', required: true }],
    },
    {
      name: 'finish',
      description: 'Close GeoGebra',
      parameters: [{ name: 'summary', type: 'string', description: 'Summary', required: false }],
    },
  ],
  widget: { entrypoint: 'ui.html' },
}

const phetManifest: PluginManifest = {
  id: 'phet',
  name: 'PhET Simulations',
  version: '1.0.0',
  description: 'Interactive science simulations',
  category: 'external-public',
  tools: [
    {
      name: 'launch_sim',
      description: 'Launch simulation',
      parameters: [{ name: 'simId', type: 'string', description: 'Simulation', required: true }],
    },
    {
      name: 'finish',
      description: 'Close PhET',
      parameters: [{ name: 'summary', type: 'string', description: 'Summary', required: false }],
    },
  ],
  widget: { entrypoint: 'ui.html' },
}

describe('plugin chat intents', () => {
  beforeEach(() => {
    authInfoStore.getState().clearTokens()
    chatboxAuthStore.setState({ status: 'signed_out', profile: null, initialized: true })
    k12Store.setState((state) => ({
      ...state,
      isAuthenticated: false,
      currentUser: null,
    }))
    hiddenBuiltinPluginsStore.setState((state) => ({ ...state, hiddenPluginIds: [] }))
    pluginRegistryStore.setState({ manifests: [], instances: [] })
    const store = pluginRegistryStore.getState()
    store.registerManifest(chessManifest)
    store.registerManifest(weatherManifest)
    store.registerManifest(spotifyManifest)
    store.registerManifest(githubManifest)
    store.registerManifest(geogebraManifest)
    store.registerManifest(phetManifest)
  })

  it('resolves chess launch phrases', () => {
    expect(resolvePluginChatIntent("let's play chess")).toMatchObject({
      pluginId: 'chess',
      toolName: 'start_game',
    })
  })

  it('resolves weather city phrases', () => {
    expect(resolvePluginChatIntent('weather in kyiv')).toMatchObject({
      pluginId: 'weather',
      toolName: 'lookup_forecast',
      parameters: { city: 'kyiv' },
    })
  })

  it('resolves natural weather phrases that mention using the app', () => {
    expect(resolvePluginChatIntent('hey check weather using our app in london')).toMatchObject({
      pluginId: 'weather',
      toolName: 'lookup_forecast',
      parameters: { city: 'london' },
    })
  })

  it('resolves open spotify phrases', () => {
    expect(resolvePluginChatIntent('open spotify')).toMatchObject({
      pluginId: 'spotify',
      assistantText: 'Opening Spotify Study DJ.',
    })
  })

  it('resolves open geogebra phrases', () => {
    expect(resolvePluginChatIntent('open geogebra')).toMatchObject({
      pluginId: 'geogebra',
      assistantText: 'Opening GeoGebra.',
    })
  })

  it('resolves open phet phrases', () => {
    expect(resolvePluginChatIntent('open phet')).toMatchObject({
      pluginId: 'phet',
      assistantText: 'Opening PhET Simulations.',
    })
  })

  it('resolves new phet phrases as a fresh session', () => {
    expect(resolvePluginChatIntent('new phet')).toMatchObject({
      pluginId: 'phet',
      assistantText: 'Starting a new PhET Simulations session.',
      forceFreshInstance: true,
    })
  })

  it('resolves exit game phrases', () => {
    expect(resolvePluginChatIntent('exit game')).toMatchObject({
      pluginId: 'chess',
      toolName: 'finish_game',
      requiresActiveInstance: true,
    })
  })

  it('resolves close spotify phrases', () => {
    expect(resolvePluginChatIntent('close spotify')).toMatchObject({
      pluginId: 'spotify',
      toolName: 'finish',
      requiresActiveInstance: true,
    })
  })

  it('resolves exit weather phrases', () => {
    expect(resolvePluginChatIntent('exit weather app')).toMatchObject({
      pluginId: 'weather',
      toolName: 'finish',
      requiresActiveInstance: true,
    })
  })

  it('resolves finish github phrases', () => {
    expect(resolvePluginChatIntent('finish github')).toMatchObject({
      pluginId: 'github',
      toolName: 'finish',
      requiresActiveInstance: true,
    })
  })

  it('resolves close geogebra phrases', () => {
    expect(resolvePluginChatIntent('close geogebra')).toMatchObject({
      pluginId: 'geogebra',
      toolName: 'finish',
      requiresActiveInstance: true,
    })
  })

  it('answers game discovery without launching chess', () => {
    const message = resolvePluginDiscoveryMessage('what games do we have?', {
      aiProvider: 'openai',
      model: 'gpt-5-mini',
    })

    expect(message?.contentParts).toEqual([
      {
        type: 'text',
        text: expect.stringContaining('Games right now: Chess.'),
      },
    ])
    expect(message?.contentParts[0]).toEqual({
      type: 'text',
      text: expect.stringContaining('Interactive learning apps: GeoGebra and PhET Simulations.'),
    })
    expect(message?.contentParts.some((part) => part.type === 'plugin')).toBe(false)
    expect(message?.aiProvider).toBe('openai')
    expect(message?.model).toBe('gpt-5-mini')
  })

  it('answers plugin discovery with the available apps', () => {
    const message = resolvePluginDiscoveryMessage('what plugins do we have')
    const text = message?.contentParts[0]

    expect(text).toEqual({
      type: 'text',
      text: expect.stringContaining('Plugins available:'),
    })
    expect((text as { text: string }).text).toContain('Chess')
    expect((text as { text: string }).text).toContain('Spotify Study DJ')
    expect((text as { text: string }).text).toContain('GeoGebra')
  })

  it('does not enable plugin tools for plain greetings', () => {
    expect(shouldEnablePluginTools('hi', 'session-1')).toBe(false)
    expect(shouldEnablePluginTools('how are you?', 'session-1')).toBe(false)
  })

  it('enables plugin tools for discovery and active plugin followups', () => {
    expect(shouldEnablePluginTools('what games do we have?', 'session-1')).toBe(true)

    const store = pluginRegistryStore.getState()
    store.createInstance('weather', 'session-1')

    expect(shouldEnablePluginTools('continue', 'session-1')).toBe(true)
  })

  it('refreshes cached catalog data when plugins are added or removed', () => {
    const before = (resolvePluginDiscoveryMessage('what plugins do we have')?.contentParts[0] as { text: string }).text
    expect(before).not.toContain('Calculator Lab')

    pluginRegistryStore.getState().registerManifest({
      id: 'calculator-lab',
      name: 'Calculator Lab',
      version: '1.0.0',
      description: 'Quick calculations',
      category: 'external-public',
      tools: [{ name: 'compute', description: 'Compute expression', parameters: [] }],
      widget: { entrypoint: 'ui.html' },
    })

    const afterAdd = (resolvePluginDiscoveryMessage('what plugins do we have')?.contentParts[0] as { text: string })
      .text
    expect(afterAdd).toContain('Calculator Lab')

    pluginRegistryStore.getState().removeManifest('calculator-lab')
    const afterRemove = (resolvePluginDiscoveryMessage('what plugins do we have')?.contentParts[0] as { text: string })
      .text
    expect(afterRemove).not.toContain('Calculator Lab')
  })

  it('closes an active chess game without remounting', async () => {
    const store = pluginRegistryStore.getState()
    chatboxAuthStore.setState({
      status: 'signed_in',
      profile: { id: 'user-1', email: 'max@example.com', created_at: new Date().toISOString() },
      initialized: true,
    })
    const instance = store.createInstance('chess', 'session-1')
    if (!instance) throw new Error('failed to create test instance')

    window.addEventListener(
      'plugin-tool-invoke',
      ((event: Event) => {
        const detail = (event as CustomEvent<{ callId: string }>).detail
        resolvePluginToolCall(detail.callId, { message: 'Game finished' })
      }) as EventListener,
      { once: true }
    )

    const message = await executePluginChatIntent('session-1', {
      pluginId: 'chess',
      assistantText: 'Closing Chess.',
      toolName: 'finish_game',
      parameters: { reason: 'Closed from chat command' },
      requiresActiveInstance: true,
    })

    expect(message.role).toBe('assistant')
    expect(message.contentParts).toEqual([{ type: 'text', text: 'Closing Chess.' }])
  })

  it('returns a plain message when no chess game is active to close', async () => {
    chatboxAuthStore.setState({
      status: 'signed_in',
      profile: { id: 'user-1', email: 'max@example.com', created_at: new Date().toISOString() },
      initialized: true,
    })
    const message = await executePluginChatIntent('session-1', {
      pluginId: 'chess',
      assistantText: 'Closing Chess.',
      toolName: 'finish_game',
      parameters: { reason: 'Closed from chat command' },
      requiresActiveInstance: true,
    })

    expect(message.contentParts).toEqual([{ type: 'text', text: 'No active Chess game to close.' }])
  })

  it('closes a stale chess instance without a live frame', async () => {
    const store = pluginRegistryStore.getState()
    chatboxAuthStore.setState({
      status: 'signed_in',
      profile: { id: 'user-1', email: 'max@example.com', created_at: new Date().toISOString() },
      initialized: true,
    })
    const instance = store.createInstance('chess', 'session-1')
    if (!instance) throw new Error('failed to create test instance')

    store.updateInstanceStatus(instance.instanceId, 'error')
    store.updateInstanceState(instance.instanceId, {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
      status: 'in_progress',
      difficulty: 'medium',
    })

    const message = await executePluginChatIntent('session-1', {
      pluginId: 'chess',
      assistantText: 'Closing Chess.',
      toolName: 'finish_game',
      parameters: { reason: 'Closed from chat command' },
      requiresActiveInstance: true,
    })

    expect(message.contentParts).toEqual([{ type: 'text', text: 'Closing Chess.' }])
    expect(store.getInstance(instance.instanceId)?.status).toBe('completed')
    expect(store.getInstance(instance.instanceId)?.lastCompletion?.summary).toBe('Closed from chat command')
  })

  it('blocks chess launch when Chatbox AI is signed out', async () => {
    authInfoStore.getState().setTokens({ accessToken: 'stale', refreshToken: 'stale' })
    const existingInstances = pluginRegistryStore.getState().getInstancesForSession('session-1')

    const message = await executePluginChatIntent('session-1', {
      pluginId: 'chess',
      assistantText: 'Starting Chess.',
      toolName: 'start_game',
    })

    expect(message.contentParts).toEqual([{ type: 'text', text: 'Sign in to Chatbox AI before using Chess.' }])
    expect(pluginRegistryStore.getState().getInstancesForSession('session-1')).toEqual(existingInstances)
  })

  it('does not resolve weather launch when Weather is uninstalled', () => {
    pluginRegistryStore.setState((state) => ({
      ...state,
      manifests: state.manifests.filter((manifest) => manifest.id !== 'weather'),
    }))

    expect(resolvePluginChatIntent('weather in kyiv')).toBeNull()
  })

  it('says a plugin is not installed when an explicit launch reaches a missing manifest', async () => {
    pluginRegistryStore.setState((state) => ({
      ...state,
      manifests: state.manifests.filter((manifest) => manifest.id !== 'weather'),
    }))

    const message = await executePluginChatIntent('session-1', {
      pluginId: 'weather',
      assistantText: 'Opening Weather Lab.',
      toolName: 'lookup_forecast',
      parameters: { city: 'Kyiv' },
    })

    expect(message.contentParts).toEqual([
      { type: 'text', text: 'Weather Lab is not installed. Install it from Plugin Marketplace or Plugin Drop first.' },
    ])
  })

  it('does not resolve weather launch when Weather is uninstalled', () => {
    pluginRegistryStore.setState((state) => ({
      ...state,
      manifests: state.manifests.filter((manifest) => manifest.id !== 'weather'),
    }))

    expect(resolvePluginChatIntent('weather in kyiv')).toBeNull()
  })

  it('says a plugin is not installed when an explicit launch reaches a missing manifest', async () => {
    pluginRegistryStore.setState((state) => ({
      ...state,
      manifests: state.manifests.filter((manifest) => manifest.id !== 'weather'),
    }))

    const message = await executePluginChatIntent('session-1', {
      pluginId: 'weather',
      assistantText: 'Opening Weather Lab.',
      toolName: 'lookup_forecast',
      parameters: { city: 'Kyiv' },
    })

    expect(message.contentParts).toEqual([
      { type: 'text', text: 'Weather Lab is not installed. Install it from Plugin Marketplace or Plugin Drop first.' },
    ])
  })

  it('treats hidden Weather as not installed for chat intents', async () => {
    hiddenBuiltinPluginsStore.setState((state) => ({ ...state, hiddenPluginIds: ['weather'] }))

    expect(resolvePluginChatIntent('weather in kyiv')).toBeNull()

    const message = await executePluginChatIntent('session-1', {
      pluginId: 'weather',
      assistantText: 'Opening Weather Lab.',
      toolName: 'lookup_forecast',
      parameters: { city: 'Kyiv' },
    })

    expect(message.contentParts).toEqual([
      { type: 'text', text: 'Weather Lab is not installed. Install it from Plugin Marketplace or Plugin Drop first.' },
    ])
  })

  it('blocks chess launch when the plugin is disabled for the current scope', async () => {
    chatboxAuthStore.setState({
      status: 'signed_in',
      profile: { id: 'user-1', email: 'max@example.com', created_at: new Date().toISOString() },
      initialized: true,
    })
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

    const message = await executePluginChatIntent('session-1', {
      pluginId: 'chess',
      assistantText: 'Starting Chess.',
      toolName: 'start_game',
    })

    expect(message.contentParts).toEqual([
      { type: 'text', text: 'Chess is disabled for the current scope. Enable it in Plugin Marketplace first.' },
    ])
  })

  it('starts a fresh chess instance instead of reusing stale session state', async () => {
    const store = pluginRegistryStore.getState()
    chatboxAuthStore.setState({
      status: 'signed_in',
      profile: { id: 'user-1', email: 'max@example.com', created_at: new Date().toISOString() },
      initialized: true,
    })

    const stale = store.createInstance('chess', 'session-1')
    if (!stale) throw new Error('failed to create stale instance')
    store.updateInstanceStatus(stale.instanceId, 'ready')
    store.updateInstanceState(stale.instanceId, { isGameOver: true, gameResult: 'Old game' })

    const message = await executePluginChatIntent('session-1', {
      pluginId: 'chess',
      assistantText: 'Starting Chess.',
      toolName: 'start_game',
      parameters: { difficulty: 'medium' },
    })

    const pluginPart = message.contentParts.find((part) => part.type === 'plugin' && part.pluginId === 'chess')
    expect(pluginPart).toBeDefined()
    expect((pluginPart as { instanceId: string }).instanceId).not.toBe(stale.instanceId)
    expect(store.getInstance(stale.instanceId)?.status).toBe('completed')
    expect(store.getInstance(stale.instanceId)?.lastCompletion?.summary).toBe('Superseded by a new chess game')
  })

  it('returns a plain message when no spotify task is active to close', async () => {
    const message = await executePluginChatIntent('session-1', {
      pluginId: 'spotify',
      assistantText: 'Closing Spotify Study DJ.',
      toolName: 'finish',
      parameters: { summary: 'Closed from chat command' },
      requiresActiveInstance: true,
    })

    expect(message.contentParts).toEqual([{ type: 'text', text: 'No active Spotify Study DJ to close.' }])
  })

  it('creates an inline plugin message for direct open intents', async () => {
    const message = await executePluginChatIntent(
      'session-1',
      {
        pluginId: 'spotify',
        assistantText: 'Opening Spotify Study DJ.',
      },
      {
        aiProvider: 'openai',
        model: 'GPT 5.3',
      }
    )

    expect(message.role).toBe('assistant')
    expect(message.contentParts.some((part) => part.type === 'plugin' && part.pluginId === 'spotify')).toBe(true)
    expect(message.aiProvider).toBe('openai')
    expect(message.model).toBe('GPT 5.3')
    expect(message.usage?.totalTokens).toBe(0)
    expect(message.tokensUsed).toBe(0)
  })

  it('does not remount a second live frame when a plugin is already open', async () => {
    const store = pluginRegistryStore.getState()
    const instance = store.createInstance('phet', 'session-1')
    if (!instance) throw new Error('failed to create phet instance')
    store.updateInstanceStatus(instance.instanceId, 'ready')

    const message = await executePluginChatIntent('session-1', {
      pluginId: 'phet',
      assistantText: 'Opening PhET Simulations.',
    })

    expect(message.contentParts).toEqual([
      {
        type: 'text',
        text: 'PhET Simulations is already open. Say "new phet" to start fresh or "close phet" to stop it.',
      },
    ])
    expect(store.getInstancesForSession('session-1').filter((current) => current.pluginId === 'phet')).toHaveLength(1)
  })

  it('starts a fresh non-chess plugin session when asked for a new app session', async () => {
    const store = pluginRegistryStore.getState()
    const stale = store.createInstance('phet', 'session-1')
    if (!stale) throw new Error('failed to create stale phet instance')
    store.updateInstanceStatus(stale.instanceId, 'ready')

    const message = await executePluginChatIntent('session-1', {
      pluginId: 'phet',
      assistantText: 'Starting a new PhET Simulations session.',
      forceFreshInstance: true,
    })

    const pluginPart = message.contentParts.find((part) => part.type === 'plugin' && part.pluginId === 'phet')
    expect(pluginPart).toBeDefined()
    expect((pluginPart as { instanceId: string }).instanceId).not.toBe(stale.instanceId)
    expect(store.getInstance(stale.instanceId)?.status).toBe('completed')
    expect(store.getInstance(stale.instanceId)?.lastCompletion?.summary).toBe('Restarted from chat command')
  })
})
