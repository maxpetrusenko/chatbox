import { createMessage, type Message } from '@shared/types'
import { getPluginToolSet, isPluginMountToolResult } from '@/packages/model-calls/toolsets/plugin-tools'
import { pluginRegistryStore } from '@/stores/pluginRegistry'

const DEFAULT_PLUGIN_ALIASES: Array<{ pluginId: string; aliases: string[] }> = [
  { pluginId: 'chess', aliases: ['chess', 'chess game'] },
  { pluginId: 'weather', aliases: ['weather', 'weather lab', 'forecast'] },
  { pluginId: 'spotify', aliases: ['spotify', 'spotify study dj', 'study dj'] },
  { pluginId: 'github', aliases: ['github', 'github repo coach', 'repo coach'] },
]

export interface PluginChatIntent {
  pluginId: string
  assistantText: string
  toolName?: string
  parameters?: Record<string, unknown>
  requiresActiveInstance?: boolean
}

export interface PluginIntentMessageMetadata {
  aiProvider?: string
  model?: string
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

function extractDifficulty(text: string): 'easy' | 'medium' | 'hard' | undefined {
  if (/\beasy\b/i.test(text)) return 'easy'
  if (/\bhard\b/i.test(text)) return 'hard'
  if (/\bmedium\b/i.test(text)) return 'medium'
  return undefined
}

function hasWholePhrase(text: string, phrase: string): boolean {
  const escapedPhrase = phrase.replace(/[-/^$*+?.()|[\]{}]/g, '\\$&')
  return new RegExp(`(?:^|\\b)${escapedPhrase}(?:\\b|$)`).test(text)
}

function getPluginAliasEntries(): Array<{ pluginId: string; aliases: string[] }> {
  const entries = new Map<string, Set<string>>()

  for (const { pluginId, aliases } of DEFAULT_PLUGIN_ALIASES) {
    entries.set(pluginId, new Set(aliases.map(normalize)))
  }

  for (const manifest of pluginRegistryStore.getState().manifests) {
    const aliasSet = entries.get(manifest.id) || new Set<string>()
    aliasSet.add(normalize(manifest.id))
    aliasSet.add(normalize(manifest.name))
    entries.set(manifest.id, aliasSet)
  }

  return Array.from(entries.entries()).map(([pluginId, aliases]) => ({ pluginId, aliases: Array.from(aliases) }))
}

function resolveExplicitAppAlias(text: string): string | null {
  const normalized = normalize(text)

  for (const { pluginId, aliases } of getPluginAliasEntries()) {
    if (
      aliases.some(
        (name) =>
          normalized === name ||
          normalized.includes(`"${name}"`) ||
          normalized.includes(`'${name}'`) ||
          hasWholePhrase(normalized, name)
      )
    ) {
      return pluginId
    }
  }

  return null
}

function applyPluginIntentMessageMetadata(message: Message, metadata?: PluginIntentMessageMetadata): Message {
  const totalTokens = message.usage?.totalTokens ?? message.tokensUsed ?? 0

  return {
    ...message,
    aiProvider: metadata?.aiProvider ?? message.aiProvider,
    model: metadata?.model ?? message.model,
    tokensUsed: totalTokens,
    usage: {
      ...message.usage,
      totalTokens,
    },
  }
}

function getPluginDisplayName(pluginId: string): string {
  const manifest = pluginRegistryStore.getState().getManifest(pluginId)
  if (manifest?.name) return manifest.name

  switch (pluginId) {
    case 'chess':
      return 'Chess'
    case 'weather':
      return 'Weather Lab'
    case 'spotify':
      return 'Spotify Study DJ'
    case 'github':
      return 'GitHub Repo Coach'
    default:
      return pluginId
        .split('-')
        .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
        .join(' ')
  }
}

function getPluginCloseIntent(pluginId: string): PluginChatIntent | null {
  if (pluginId === 'chess') {
    return {
      pluginId,
      assistantText: 'Closing Chess.',
      toolName: 'finish_game',
      parameters: { reason: 'Closed from chat command' },
      requiresActiveInstance: true,
    }
  }

  const manifest = pluginRegistryStore.getState().getManifest(pluginId)
  if (!manifest?.tools.some((tool) => tool.name === 'finish')) {
    return null
  }

  return {
    pluginId,
    assistantText: `Closing ${getPluginDisplayName(pluginId)}.`,
    toolName: 'finish',
    parameters: { summary: 'Closed from chat command' },
    requiresActiveInstance: true,
  }
}

function resolveCloseIntent(text: string): PluginChatIntent | null {
  const normalized = normalize(text)
  const closeVerb = /(^|\b)(close|exit|quit|finish|end|stop)(?:\b|$)/
  if (!closeVerb.test(normalized)) return null

  const explicitPluginId = resolveExplicitAppAlias(normalized)
  if (explicitPluginId) {
    return getPluginCloseIntent(explicitPluginId)
  }

  if (/\b(game|board|match|chess app|game app)\b/.test(normalized)) {
    return getPluginCloseIntent('chess')
  }

  return null
}

export function resolvePluginChatIntent(text: string): PluginChatIntent | null {
  const normalized = normalize(text)
  if (!normalized) return null

  const difficulty = extractDifficulty(normalized)
  const closeIntent = resolveCloseIntent(normalized)
  if (closeIntent) return closeIntent

  if (
    /(^|\b)(let'?s play|lets play|play|start|open)(?: .*?)?\bchess\b/.test(normalized) ||
    /\bchess game\b/.test(normalized)
  ) {
    return {
      pluginId: 'chess',
      assistantText: 'Starting Chess.',
      toolName: 'start_game',
      parameters: difficulty ? { difficulty } : {},
    }
  }

  const weatherMatch = normalized.match(
    /(?:^|\b)(?:what(?:'s| is) the weather|show weather|weather|forecast)(?:\s+(?:in|for))\s+(.+)$/
  )
  if (weatherMatch?.[1]) {
    const city = weatherMatch[1].trim().replace(/[?.!]+$/, '')
    if (city) {
      return {
        pluginId: 'weather',
        assistantText: `Opening Weather Lab for ${city}.`,
        toolName: 'lookup_forecast',
        parameters: { city },
      }
    }
  }

  const spotifySearchMatch = normalized.match(
    /(?:^|\b)(?:find|search|show)(?: me)?\s+(.+?)\s+playlists?(?:\s+on\s+spotify|\s+in\s+spotify|\s+spotify)?$/
  )
  if (spotifySearchMatch?.[1] && normalized.includes('spotify')) {
    const query = spotifySearchMatch[1].trim()
    return {
      pluginId: 'spotify',
      assistantText: `Opening Spotify Study DJ for ${query} playlists.`,
      toolName: 'search_playlists',
      parameters: { query },
    }
  }

  if (/\b(?:my repos|my repositories|github repos|github repositories|show my github)\b/.test(normalized)) {
    return {
      pluginId: 'github',
      assistantText: 'Opening GitHub Repo Coach.',
      toolName: 'list_my_repos',
      parameters: {},
    }
  }

  if (/(^|\b)(open|launch|start|use|chat with|let'?s chat with)(?:\b|\s)/.test(normalized)) {
    const pluginId = resolveExplicitAppAlias(normalized)
    if (pluginId) {
      return {
        pluginId,
        assistantText: `Opening ${getPluginDisplayName(pluginId)}.`,
      }
    }
  }

  return null
}

function buildPluginAssistantMessage(pluginId: string, instanceId: string, assistantText: string): Message {
  const message = createMessage('assistant', assistantText)
  message.contentParts.push({
    type: 'plugin',
    pluginId,
    instanceId,
    toolCallId: `plugin-intent-${pluginId}-${Date.now()}`,
  })
  return message
}

export async function executePluginChatIntent(
  sessionId: string,
  intent: PluginChatIntent,
  metadata?: PluginIntentMessageMetadata
): Promise<Message> {
  const store = pluginRegistryStore.getState()
  const activeInstance = store.getActiveInstanceForPlugin(intent.pluginId, sessionId)

  if (intent.requiresActiveInstance && !activeInstance) {
    const subject = intent.pluginId === 'chess' ? 'Chess game' : getPluginDisplayName(intent.pluginId)
    return applyPluginIntentMessageMetadata(createMessage('assistant', `No active ${subject} to close.`), metadata)
  }

  if (intent.toolName) {
    const tools = getPluginToolSet(sessionId)
    const namespacedName = `plugin__${intent.pluginId}__${intent.toolName}`
    const pluginTool = tools[namespacedName]
    const execute = (pluginTool as { execute?: (input: Record<string, unknown>) => Promise<unknown> } | undefined)
      ?.execute
    if (execute) {
      const result = await execute(intent.parameters || {})
      if (isPluginMountToolResult(result)) {
        return applyPluginIntentMessageMetadata(
          buildPluginAssistantMessage(intent.pluginId, result.pluginMount.instanceId, intent.assistantText),
          metadata
        )
      }
      return applyPluginIntentMessageMetadata(createMessage('assistant', intent.assistantText), metadata)
    }
  }

  let instance = activeInstance ?? null
  if (!instance) {
    instance = store.createInstance(intent.pluginId, sessionId)
  }
  if (!instance) {
    throw new Error(`Failed to open plugin: ${intent.pluginId}`)
  }

  return applyPluginIntentMessageMetadata(
    buildPluginAssistantMessage(intent.pluginId, instance.instanceId, intent.assistantText),
    metadata
  )
}
