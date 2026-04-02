/**
 * @vitest-environment jsdom
 */

import type { PluginManifest } from '@shared/plugin-types'
import { beforeEach, describe, expect, it } from 'vitest'
import { resolvePluginToolCall } from '@/packages/model-calls/toolsets/plugin-tools'
import { pluginRegistryStore } from '@/stores/pluginRegistry'
import { executePluginChatIntent, resolvePluginChatIntent } from './chat-intents'

const chessManifest: PluginManifest = {
  id: 'chess',
  name: 'Chess',
  version: '1.0.0',
  description: 'Play chess inline',
  category: 'internal',
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

describe('plugin chat intents', () => {
  beforeEach(() => {
    pluginRegistryStore.setState({ manifests: [], instances: [] })
    const store = pluginRegistryStore.getState()
    store.registerManifest(chessManifest)
    store.registerManifest(weatherManifest)
    store.registerManifest(spotifyManifest)
    store.registerManifest(githubManifest)
    store.registerManifest(geogebraManifest)
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

  it('closes an active chess game without remounting', async () => {
    const store = pluginRegistryStore.getState()
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
    const message = await executePluginChatIntent('session-1', {
      pluginId: 'chess',
      assistantText: 'Closing Chess.',
      toolName: 'finish_game',
      parameters: { reason: 'Closed from chat command' },
      requiresActiveInstance: true,
    })

    expect(message.contentParts).toEqual([{ type: 'text', text: 'No active Chess game to close.' }])
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
})
