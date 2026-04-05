import { createMessage, type Message } from '@shared/types'
import { getPluginAccessState } from '@/plugins/plugin-access'
import { signOutFromTellMe } from '@/packages/tellme/k12'
import { clearChatboxAuthTokens } from '@/routes/settings/provider/chatbox-ai/-components/useAuthTokens'
import { startChatboxLoginFlow } from '@/routes/settings/provider/chatbox-ai/-components/useLogin'
import { chatboxAuthStore } from '@/stores/chatboxAuthStore'
import { k12Store } from '@/stores/k12Store'
import { pluginRegistryStore } from '@/stores/pluginRegistry'
import { settingsStore } from '@/stores/settingsStore'

export type ChatAuthIntentAction = 'sign_in' | 'sign_out' | 'forgot_password'
export type ChatAuthProvider = 'auto' | 'chatbox-ai' | 'k12' | 'all'

export interface ChatAuthIntent {
  action: ChatAuthIntentAction
  provider: ChatAuthProvider
  pluginId?: string
}

export interface ChatAuthMessageMetadata {
  aiProvider?: string
  model?: string
}

const K12_AUTH_WIDGET_PLUGIN_ID = '__k12_auth__'

interface ChatAuthActionResult {
  action: ChatAuthIntentAction
  provider: Exclude<ChatAuthProvider, 'auto'>
  message: string
  loginUrl?: string
  pluginMount?: {
    pluginId: string
    instanceId: string
  }
}

const SIGN_IN_PATTERN =
  /(?:^|\b)(?:login|log in|signin|sign in|authenticate|auth)(?:\b|$)|\b(?:sign|log)\s+me\s+in\b/i
const SIGN_OUT_PATTERN = /(?:^|\b)(?:logout|log out|sign out)(?:\b|$)|\b(?:sign|log)\s+me\s+out\b/i
const FORGOT_PASSWORD_PATTERN =
  /\b(?:forgot|forget|reset|recover|change)\b(?:.*?\b)?password\b|\bpassword\b(?:.*?\b)?(?:reset|recovery|recovery link)\b/i
const K12_PROVIDER_PATTERN = /\b(?:k12|school|student|teacher|class|classroom|district)\b/i
const CHATBOX_PROVIDER_PATTERN = /\b(?:chatbox|license|account)\b/i

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

function applyMetadata(message: Message, metadata?: ChatAuthMessageMetadata): Message {
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

function buildPluginAssistantMessage(pluginId: string, instanceId: string, assistantText: string): Message {
  const message = createMessage('assistant', assistantText)
  message.contentParts.push({
    type: 'plugin',
    pluginId,
    instanceId,
    toolCallId: `auth-intent-${pluginId}-${Date.now()}`,
  })
  return message
}

function getPluginDisplayName(pluginId: string): string {
  const manifest = pluginRegistryStore.getState().getManifest(pluginId)
  return manifest?.name || pluginId
}

function resolvePreferredProvider(text: string): ChatAuthProvider {
  if (K12_PROVIDER_PATTERN.test(text)) return 'k12'
  if (CHATBOX_PROVIDER_PATTERN.test(text)) return 'chatbox-ai'
  return 'auto'
}

function resolvePluginTargetId(input?: string): string | undefined {
  if (!input) return undefined
  const normalized = normalize(input)
  const manifests = pluginRegistryStore.getState().manifests

  for (const manifest of manifests) {
    const names = [manifest.id, manifest.name].map((value) => normalize(value))
    if (names.some((name) => normalized === name || normalized.includes(name))) {
      return manifest.id
    }
  }

  return undefined
}

function getRecentAuthBlockedTarget(sessionId: string, pluginId?: string) {
  const manifests = pluginRegistryStore.getState()
  return manifests
    .getInstancesForSession(sessionId)
    .filter((instance) => instance.status !== 'completed' && instance.status !== 'error')
    .sort((left, right) => right.createdAt - left.createdAt)
    .find((instance) => {
      if (pluginId && instance.pluginId !== pluginId) return false
      const manifest = manifests.getManifest(instance.pluginId)
      return manifest ? getPluginAccessState(manifest).launchBlockedReason === 'app-auth' : false
    })
}

export function resolveChatAuthIntent(text: string): ChatAuthIntent | null {
  const normalized = normalize(text)
  if (!normalized) return null

  const provider = resolvePreferredProvider(normalized)
  const pluginId = resolvePluginTargetId(normalized)

  if (FORGOT_PASSWORD_PATTERN.test(normalized)) {
    return { action: 'forgot_password', provider, pluginId }
  }
  if (SIGN_OUT_PATTERN.test(normalized)) {
    return { action: 'sign_out', provider: provider === 'auto' ? 'all' : provider, pluginId }
  }
  if (SIGN_IN_PATTERN.test(normalized)) {
    return { action: 'sign_in', provider, pluginId }
  }

  return null
}

async function runSignIn(sessionId: string, intent: ChatAuthIntent): Promise<ChatAuthActionResult> {
  const blockedInstance = getRecentAuthBlockedTarget(sessionId, intent.pluginId)
  if (blockedInstance) {
    return {
      action: 'sign_in',
      provider: 'all',
      message: `Sign in to continue with ${getPluginDisplayName(blockedInstance.pluginId)}.`,
      pluginMount: {
        pluginId: blockedInstance.pluginId,
        instanceId: blockedInstance.instanceId,
      },
    }
  }

  const preferK12 = intent.provider === 'k12' || (intent.provider === 'auto' && !k12Store.getState().isAuthenticated)

  if (preferK12) {
    if (k12Store.getState().isAuthenticated) {
      return {
        action: 'sign_in',
        provider: 'k12',
        message: 'School account already signed in.',
      }
    }

    return {
      action: 'sign_in',
      provider: 'k12',
      message: 'Sign in with your school account here.',
      pluginMount: {
        pluginId: K12_AUTH_WIDGET_PLUGIN_ID,
        instanceId: `k12-auth-${Date.now()}`,
      },
    }
  }

  if (chatboxAuthStore.getState().status === 'signed_in') {
    return {
      action: 'sign_in',
      provider: 'chatbox-ai',
      message: 'Chatbox AI already signed in.',
    }
  }

  const language = settingsStore.getState().language || 'en'
  const { loginUrl } = await startChatboxLoginFlow(language, { openInBrowser: true })
  return {
    action: 'sign_in',
    provider: 'chatbox-ai',
    message: 'Opened Chatbox AI sign-in in your browser.',
    loginUrl,
  }
}

async function runSignOut(intent: ChatAuthIntent): Promise<ChatAuthActionResult> {
  const shouldSignOutK12 = intent.provider === 'all' || intent.provider === 'k12'
  const shouldSignOutChatbox = intent.provider === 'all' || intent.provider === 'chatbox-ai'

  const signedOut: string[] = []

  if (shouldSignOutChatbox && chatboxAuthStore.getState().status === 'signed_in') {
    await clearChatboxAuthTokens()
    signedOut.push('Chatbox AI')
  }

  if (shouldSignOutK12 && k12Store.getState().isAuthenticated) {
    await signOutFromTellMe()
    signedOut.push('school account')
  }

  return {
    action: 'sign_out',
    provider: intent.provider === 'auto' ? 'all' : intent.provider,
    message: signedOut.length > 0 ? `Signed out of ${signedOut.join(' and ')}.` : 'Already signed out.',
  }
}

async function runForgotPassword(sessionId: string, intent: ChatAuthIntent): Promise<ChatAuthActionResult> {
  const blockedInstance = getRecentAuthBlockedTarget(sessionId, intent.pluginId)
  if (blockedInstance) {
    const manifest = pluginRegistryStore.getState().getManifest(blockedInstance.pluginId)
    if (manifest?.appAuth?.type === 'k12-login') {
      return {
        action: 'forgot_password',
        provider: 'k12',
        message: `Password resets for school accounts are handled by your school. Once you have new credentials, sign in to continue with ${manifest.name}.`,
        pluginMount: {
          pluginId: blockedInstance.pluginId,
          instanceId: blockedInstance.instanceId,
        },
      }
    }

    const language = settingsStore.getState().language || 'en'
    const { loginUrl: resetUrl } = await startChatboxLoginFlow(language, { openInBrowser: true })
    return {
      action: 'forgot_password',
      provider: 'chatbox-ai',
      message: `Opened Chatbox AI sign-in in your browser. Use Forgot password there, then continue with ${manifest?.name || blockedInstance.pluginId}.`,
      loginUrl: resetUrl,
      pluginMount: {
        pluginId: blockedInstance.pluginId,
        instanceId: blockedInstance.instanceId,
      },
    }
  }

  if (intent.provider === 'k12') {
    return {
      action: 'forgot_password',
      provider: 'k12',
      message: 'School password resets are handled by your teacher or administrator.',
    }
  }

  const language = settingsStore.getState().language || 'en'
  const { loginUrl: resetUrl } = await startChatboxLoginFlow(language, { openInBrowser: true })
  return {
    action: 'forgot_password',
    provider: 'chatbox-ai',
    message: 'Opened Chatbox AI sign-in in your browser. Use Forgot password there.',
    loginUrl: resetUrl,
  }
}

export async function runChatAuthAction(sessionId: string, intent: ChatAuthIntent): Promise<ChatAuthActionResult> {
  const normalizedIntent = {
    ...intent,
    pluginId: resolvePluginTargetId(intent.pluginId),
  }

  switch (intent.action) {
    case 'sign_in':
      return await runSignIn(sessionId, normalizedIntent)
    case 'sign_out':
      return await runSignOut(normalizedIntent)
    case 'forgot_password':
      return await runForgotPassword(sessionId, normalizedIntent)
  }
}

export async function executeChatAuthIntent(
  sessionId: string,
  intent: ChatAuthIntent,
  metadata?: ChatAuthMessageMetadata
): Promise<Message> {
  const result = await runChatAuthAction(sessionId, intent)
  const message = result.pluginMount
    ? buildPluginAssistantMessage(result.pluginMount.pluginId, result.pluginMount.instanceId, result.message)
    : createMessage('assistant', result.message)
  return applyMetadata(message, metadata)
}
