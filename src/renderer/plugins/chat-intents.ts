import { createMessage, type Message } from '@shared/types'
import { getPluginToolSet, isPluginMountToolResult } from '@/packages/model-calls/toolsets/plugin-tools'
import { getPluginAppAuthBlockedMessage, hasRequiredAppAuth } from '@/plugins/plugin-access'
import { hiddenBuiltinPluginsStore } from '@/stores/hiddenBuiltinPluginsStore'
import { k12Store } from '@/stores/k12Store'
import { pluginRegistryStore } from '@/stores/pluginRegistry'

const DEFAULT_PLUGIN_ALIASES: Array<{ pluginId: string; aliases: string[] }> = [
  { pluginId: 'chess', aliases: ['chess', 'chess game'] },
  { pluginId: 'weather', aliases: ['weather', 'weather lab', 'forecast'] },
  { pluginId: 'spotify', aliases: ['spotify', 'spotify study dj', 'study dj'] },
  { pluginId: 'github', aliases: ['github', 'github repo coach', 'repo coach'] },
]

interface PluginCatalogSnapshot {
  fingerprint: string
  manifests: ReturnType<typeof pluginRegistryStore.getState>['manifests']
  aliasEntries: Array<{ pluginId: string; aliases: string[] }>
}

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

const GAME_PLUGIN_IDS = new Set(['chess'])
const LEARNING_PLUGIN_IDS = new Set(['geogebra', 'phet'])
const TOOL_TRIGGER_TERMS = [
  'weather',
  'forecast',
  'spotify',
  'playlist',
  'github',
  'repo',
  'graph',
  'equation',
  'map',
  'location',
  'simulation',
  'wolfram',
  'compute',
  'math',
  'geogebra',
  'phet',
  'chess',
]

let cachedCatalogSnapshot: PluginCatalogSnapshot | null = null

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

function isHiddenManifest(pluginId: string): boolean {
  return hiddenBuiltinPluginsStore.getState().isHidden(pluginId)
}

function isInstalledPlugin(pluginId: string): boolean {
  const manifest = pluginRegistryStore.getState().getManifest(pluginId)
  return !!manifest && !isHiddenManifest(pluginId)
}

function getCatalogFingerprint(manifests: ReturnType<typeof pluginRegistryStore.getState>['manifests']): string {
  return manifests
    .map(
      (manifest) =>
        `${manifest.id}:${manifest.version}:${manifest.name}:${manifest.tools.map((tool) => tool.name).join(',')}`
    )
    .sort()
    .join('|')
}

function getCatalogSnapshot(): PluginCatalogSnapshot {
  const manifests = pluginRegistryStore.getState().manifests.filter((manifest) => !isHiddenManifest(manifest.id))
  const fingerprint = getCatalogFingerprint(manifests)
  if (cachedCatalogSnapshot?.fingerprint === fingerprint) {
    return cachedCatalogSnapshot
  }

  const entries = new Map<string, Set<string>>()
  const installedPluginIds = new Set(manifests.map((manifest) => manifest.id))

  for (const { pluginId, aliases } of DEFAULT_PLUGIN_ALIASES) {
    if (!installedPluginIds.has(pluginId)) continue
    entries.set(pluginId, new Set(aliases.map(normalize)))
  }

  for (const manifest of manifests) {
    const aliasSet = entries.get(manifest.id) || new Set<string>()
    aliasSet.add(normalize(manifest.id))
    aliasSet.add(normalize(manifest.name))
    entries.set(manifest.id, aliasSet)
  }

  cachedCatalogSnapshot = {
    fingerprint,
    manifests,
    aliasEntries: Array.from(entries.entries()).map(([pluginId, aliases]) => ({
      pluginId,
      aliases: Array.from(aliases),
    })),
  }

  return cachedCatalogSnapshot
}

function getPluginAliasEntries(): Array<{ pluginId: string; aliases: string[] }> {
  return getCatalogSnapshot().aliasEntries
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

function formatNameList(names: string[]): string {
  if (names.length === 0) return 'none yet'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function isGameManifest(pluginId: string, name: string, description: string, toolNames: string[]): boolean {
  if (GAME_PLUGIN_IDS.has(pluginId)) return true
  const haystack = `${pluginId} ${name} ${description} ${toolNames.join(' ')}`.toLowerCase()
  return /\b(game|chess|play)\b/.test(haystack)
}

function buildDiscoveryText(topic: 'games' | 'apps' | 'plugins' | 'tools'): string {
  const manifests = [...getCatalogSnapshot().manifests].sort((left, right) => left.name.localeCompare(right.name))
  const allNames = manifests.map((manifest) => manifest.name)
  const gameNames = manifests
    .filter((manifest) =>
      isGameManifest(
        manifest.id,
        manifest.name,
        manifest.description,
        manifest.tools.map((tool) => tool.name)
      )
    )
    .map((manifest) => manifest.name)
  const learningNames = manifests
    .filter((manifest) => LEARNING_PLUGIN_IDS.has(manifest.id) && !gameNames.includes(manifest.name))
    .map((manifest) => manifest.name)

  if (topic === 'games') {
    const gamesLine =
      gameNames.length > 0 ? `Games right now: ${formatNameList(gameNames)}.` : 'No game plugins installed yet.'
    const learningLine = learningNames.length > 0 ? ` Interactive learning apps: ${formatNameList(learningNames)}.` : ''
    return `${gamesLine}${learningLine} Try “let's play chess” to jump in.`
  }

  const internalNames = manifests
    .filter((manifest) => manifest.category === 'internal')
    .map((manifest) => manifest.name)
  const publicNames = manifests
    .filter((manifest) => manifest.category === 'external-public')
    .map((manifest) => manifest.name)
  const authNames = manifests
    .filter((manifest) => manifest.category === 'external-authenticated')
    .map((manifest) => manifest.name)

  const label = topic === 'tools' ? 'apps' : topic
  return `${label[0].toUpperCase()}${label.slice(1)} available: ${formatNameList(allNames)}. Internal: ${formatNameList(
    internalNames
  )}. Public: ${formatNameList(publicNames)}. Auth: ${formatNameList(authNames)}. Try “open Spotify”, “weather in Kyiv”, or “show my GitHub repos”.`
}

function hasActivePluginInstance(sessionId: string): boolean {
  return pluginRegistryStore
    .getState()
    .getInstancesForSession(sessionId)
    .some((instance) => instance.status !== 'completed' && instance.status !== 'error')
}

export function shouldEnablePluginTools(text: string, sessionId: string): boolean {
  const normalized = normalize(text)
  if (!normalized) return hasActivePluginInstance(sessionId)

  if (resolvePluginDiscoveryMessage(normalized) || resolvePluginChatIntent(normalized)) {
    return true
  }

  if (hasActivePluginInstance(sessionId)) {
    return true
  }

  if (resolveExplicitAppAlias(normalized)) {
    return true
  }

  return TOOL_TRIGGER_TERMS.some((term) => hasWholePhrase(normalized, term))
}

export function resolvePluginDiscoveryMessage(text: string, metadata?: PluginIntentMessageMetadata): Message | null {
  const normalized = normalize(text)
  if (!normalized) return null

  let topic: 'games' | 'apps' | 'plugins' | 'tools' | null = null

  if (
    /(?:^|\b)(?:what|which|show|list)(?: .*?)?\bgames\b(?: .*?)?(?:do we have|are available|available)?/.test(
      normalized
    )
  ) {
    topic = 'games'
  } else if (
    /(?:^|\b)(?:what|which|show|list)(?: .*?)?\b(?:apps|plugins)\b(?: .*?)?(?:do we have|are available|available)?/.test(
      normalized
    )
  ) {
    topic = normalized.includes('plugin') ? 'plugins' : 'apps'
  } else if (
    /(?:^|\b)(?:what|which|show|list)(?: .*?)?\btools\b(?: .*?)?(?:do we have|are available|available)?/.test(
      normalized
    ) ||
    /(?:^|\b)what can you (?:open|launch|use)\b/.test(normalized)
  ) {
    topic = 'tools'
  }

  if (!topic) return null
  return applyPluginIntentMessageMetadata(createMessage('assistant', buildDiscoveryText(topic)), metadata)
}

function getCloseableInstance(pluginId: string, sessionId: string) {
  const instances = pluginRegistryStore
    .getState()
    .getInstancesForSession(sessionId)
    .filter((instance) => instance.pluginId === pluginId && !instance.lastCompletion)

  return instances.sort((left, right) => right.createdAt - left.createdAt)[0] ?? null
}

function completeOutstandingInstances(pluginId: string, sessionId: string, summary: string): void {
  const store = pluginRegistryStore.getState()
  const instances = store
    .getInstancesForSession(sessionId)
    .filter((instance) => instance.pluginId === pluginId && !instance.lastCompletion)

  for (const instance of instances) {
    store.updateInstanceCompletion(instance.instanceId, {
      pluginId,
      instanceId: instance.instanceId,
      summary,
      data: { synthetic: true },
    })
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
    isInstalledPlugin('chess') &&
    (/(^|\b)(let'?s play|lets play|play|start|open)(?: .*?)?\bchess\b/.test(normalized) ||
      /\bchess game\b/.test(normalized))
  ) {
    return {
      pluginId: 'chess',
      assistantText: 'Starting Chess.',
      toolName: 'start_game',
      parameters: difficulty ? { difficulty } : {},
    }
  }

  const weatherMatch = normalized.match(
    /(?:^|\b)(?:what(?:'s| is) the weather|show weather|check weather|weather|forecast)(?:.*?\b(?:in|for)\b\s+)(.+)$/
  )
  if (isInstalledPlugin('weather') && weatherMatch?.[1]) {
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
  if (isInstalledPlugin('spotify') && spotifySearchMatch?.[1] && normalized.includes('spotify')) {
    const query = spotifySearchMatch[1].trim()
    return {
      pluginId: 'spotify',
      assistantText: `Opening Spotify Study DJ for ${query} playlists.`,
      toolName: 'search_playlists',
      parameters: { query },
    }
  }

  if (
    isInstalledPlugin('github') &&
    /\b(?:my repos|my repositories|github repos|github repositories|show my github)\b/.test(normalized)
  ) {
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
  const manifest = isHiddenManifest(intent.pluginId) ? undefined : store.getManifest(intent.pluginId)
  const appAuthBlockedMessage =
    manifest && !hasRequiredAppAuth(manifest) ? getPluginAppAuthBlockedMessage(manifest) : null

  if (!manifest) {
    return applyPluginIntentMessageMetadata(
      createMessage(
        'assistant',
        `${getPluginDisplayName(intent.pluginId)} is not installed. Install it from Plugin Marketplace or Plugin Drop first.`
      ),
      metadata
    )
  }

  if (appAuthBlockedMessage) {
    return applyPluginIntentMessageMetadata(createMessage('assistant', appAuthBlockedMessage), metadata)
  }

  const k12State = k12Store.getState()
  if (
    !intent.requiresActiveInstance &&
    k12State.isAuthenticated &&
    k12State.currentUser &&
    !k12State.isPluginActiveForCurrentScope(intent.pluginId)
  ) {
    return applyPluginIntentMessageMetadata(
      createMessage(
        'assistant',
        `${getPluginDisplayName(intent.pluginId)} is disabled for the current scope. Enable it in Plugin Marketplace first.`
      ),
      metadata
    )
  }

  if (intent.pluginId === 'chess' && intent.toolName === 'start_game') {
    completeOutstandingInstances(intent.pluginId, sessionId, 'Superseded by a new chess game')
  }

  const activeInstance = store.getActiveInstanceForPlugin(intent.pluginId, sessionId)

  if (intent.requiresActiveInstance && !activeInstance) {
    const closeableInstance = getCloseableInstance(intent.pluginId, sessionId)
    if (closeableInstance && intent.toolName && (intent.toolName === 'finish_game' || intent.toolName === 'finish')) {
      store.updateInstanceCompletion(closeableInstance.instanceId, {
        pluginId: intent.pluginId,
        instanceId: closeableInstance.instanceId,
        summary: 'Closed from chat command',
        data: { synthetic: true },
      })
      return applyPluginIntentMessageMetadata(createMessage('assistant', intent.assistantText), metadata)
    }

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
          buildPluginAssistantMessage(
            intent.pluginId,
            result.pluginMount.instanceId,
            appAuthBlockedMessage || intent.assistantText
          ),
          metadata
        )
      }
      return applyPluginIntentMessageMetadata(
        createMessage('assistant', appAuthBlockedMessage || intent.assistantText),
        metadata
      )
    }
  }

  let instance = activeInstance ?? null
  if (!instance) {
    instance = store.createInstance(intent.pluginId, sessionId)
  }
  if (!instance) {
    const blockedMessage = manifest ? getPluginAppAuthBlockedMessage(manifest) : null
    if (blockedMessage) {
      return applyPluginIntentMessageMetadata(createMessage('assistant', blockedMessage), metadata)
    }
    throw new Error(`Failed to open plugin: ${intent.pluginId}`)
  }

  return applyPluginIntentMessageMetadata(
    buildPluginAssistantMessage(intent.pluginId, instance.instanceId, appAuthBlockedMessage || intent.assistantText),
    metadata
  )
}
