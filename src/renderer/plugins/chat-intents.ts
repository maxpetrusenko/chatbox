import { createMessage, type Message } from '@shared/types'
import { isPluginMountToolResult, getPluginToolSet } from '@/packages/model-calls/toolsets/plugin-tools'
import { pluginRegistryStore } from '@/stores/pluginRegistry'

export interface PluginChatIntent {
  pluginId: 'chess' | 'weather' | 'spotify' | 'github'
  assistantText: string
  toolName?: string
  parameters?: Record<string, unknown>
  requiresActiveInstance?: boolean
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
  const escapedPhrase = phrase.replace(/[-/\^$*+?.()|[\]{}]/g, '\\$&')
  return new RegExp(`(?:^|\\b)${escapedPhrase}(?:\\b|$)`).test(text)
}

function resolveExplicitAppAlias(text: string): PluginChatIntent['pluginId'] | null {
  const normalized = normalize(text)
  const aliases: Array<[PluginChatIntent['pluginId'], string[]]> = [
    ['chess', ['chess', 'chess game']],
    ['weather', ['weather', 'weather lab', 'forecast']],
    ['spotify', ['spotify', 'spotify study dj', 'study dj']],
    ['github', ['github', 'github repo coach', 'repo coach']],
  ]

  for (const [pluginId, names] of aliases) {
    if (
      names.some(
        (name) =>
          normalized === name ||
          normalized.includes(`"${name}"`) ||
          normalized.includes(`'${name}'`) ||
          hasWholePhrase(normalized, name),
      )
    ) {
      return pluginId
    }
  }

  return null
}

function getPluginDisplayName(pluginId: PluginChatIntent['pluginId']): string {
  switch (pluginId) {
    case 'chess':
      return 'Chess'
    case 'weather':
      return 'Weather Lab'
    case 'spotify':
      return 'Spotify Study DJ'
    case 'github':
      return 'GitHub Repo Coach'
  }
}

function getPluginCloseIntent(pluginId: PluginChatIntent['pluginId']): PluginChatIntent {
  if (pluginId === 'chess') {
    return {
      pluginId,
      assistantText: 'Closing Chess.',
      toolName: 'finish_game',
      parameters: { reason: 'Closed from chat command' },
      requiresActiveInstance: true,
    }
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

  if (/(^|\b)(let'?s play|lets play|play|start|open)(?: .*?)?\bchess\b/.test(normalized) || /\bchess game\b/.test(normalized)) {
    return {
      pluginId: 'chess',
      assistantText: 'Starting Chess.',
      toolName: 'start_game',
      parameters: difficulty ? { difficulty } : {},
    }
  }

  const weatherMatch = normalized.match(/(?:^|\b)(?:what(?:'s| is) the weather|show weather|weather|forecast)(?:\s+(?:in|for))\s+(.+)$/)
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

  const spotifySearchMatch = normalized.match(/(?:^|\b)(?:find|search|show)(?: me)?\s+(.+?)\s+playlists?(?:\s+on\s+spotify|\s+in\s+spotify|\s+spotify)?$/)
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

  if (/(^|\b)(open|launch|start|use|chat with|let'?s chat with)\s+.*\b(spotify|weather|weather lab|github|github repo coach)\b/.test(normalized)) {
    const pluginId = resolveExplicitAppAlias(normalized)
    if (pluginId) {
      return {
        pluginId,
        assistantText:
          pluginId === 'spotify'
            ? 'Opening Spotify Study DJ.'
            : pluginId === 'weather'
              ? 'Opening Weather Lab.'
              : 'Opening GitHub Repo Coach.',
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

export async function executePluginChatIntent(sessionId: string, intent: PluginChatIntent): Promise<Message> {
  const store = pluginRegistryStore.getState()
  const activeInstance = store.getActiveInstanceForPlugin(intent.pluginId, sessionId)

  if (intent.requiresActiveInstance && !activeInstance) {
    const subject = intent.pluginId === 'chess' ? 'Chess game' : getPluginDisplayName(intent.pluginId)
    return createMessage('assistant', `No active ${subject} to close.`)
  }

  if (intent.toolName) {
    const tools = getPluginToolSet(sessionId)
    const namespacedName = `plugin__${intent.pluginId}__${intent.toolName}`
    const pluginTool = tools[namespacedName]
    const execute = (pluginTool as { execute?: (input: Record<string, unknown>) => Promise<unknown> } | undefined)?.execute
    if (execute) {
      const result = await execute(intent.parameters || {})
      if (isPluginMountToolResult(result)) {
        return buildPluginAssistantMessage(intent.pluginId, result.pluginMount.instanceId, intent.assistantText)
      }
      return createMessage('assistant', intent.assistantText)
    }
  }

  let instance = activeInstance ?? null
  if (!instance) {
    instance = store.createInstance(intent.pluginId, sessionId)
  }
  if (!instance) {
    throw new Error(`Failed to open plugin: ${intent.pluginId}`)
  }

  return buildPluginAssistantMessage(intent.pluginId, instance.instanceId, intent.assistantText)
}
