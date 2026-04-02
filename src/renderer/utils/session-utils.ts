import type { Session, SessionMeta } from '@shared/types'
import { mapValues } from 'lodash'
import { migrateMessage } from '../../shared/utils/message'

function backfillPluginIntentMessageMetadata(
  message: ReturnType<typeof migrateMessage>,
  defaults: { aiProvider?: string; model?: string }
) {
  const isPluginIntentMessage =
    message.role === 'assistant' && message.contentParts.some((part) => part.type === 'plugin')

  if (!isPluginIntentMessage) {
    return message
  }

  return {
    ...message,
    aiProvider: message.aiProvider ?? defaults.aiProvider,
    model: message.model ?? defaults.model,
    tokensUsed: message.tokensUsed ?? message.usage?.totalTokens ?? 0,
    usage: {
      ...message.usage,
      totalTokens: message.usage?.totalTokens ?? message.tokensUsed ?? 0,
    },
  }
}

function migrateSessionMessages(messages: Session['messages'], defaults: { aiProvider?: string; model?: string }) {
  return messages?.map((message) => backfillPluginIntentMessageMetadata(migrateMessage(message), defaults)) || []
}

export function migrateSession(session: Session): Session {
  const defaults = {
    aiProvider: session.settings?.provider,
    model: session.settings?.modelId,
  }

  return {
    ...session,
    settings: {
      // temperature未设置的时候使用默认值undefined，这样才能覆盖全局设置
      temperature: undefined,
      ...session.settings,
    },
    messages: migrateSessionMessages(session.messages, defaults),
    threads: session.threads?.map((t) => ({
      ...t,
      messages: migrateSessionMessages(t.messages, defaults),
    })),
    messageForksHash: mapValues(session.messageForksHash || {}, (forks) => ({
      ...forks,
      lists:
        forks.lists?.map((list) => ({
          ...list,
          messages: migrateSessionMessages(list.messages, defaults),
        })) || [],
    })),
  }
}

export function sortSessions(sessions: SessionMeta[]): SessionMeta[] {
  const reversed: SessionMeta[] = []
  const pinned: SessionMeta[] = []
  for (const sess of sessions) {
    // Skip hidden sessions (e.g., migrated picture sessions)
    if (sess.hidden) {
      continue
    }
    if (sess.starred) {
      pinned.push(sess)
      continue
    }
    reversed.unshift(sess)
  }
  return pinned.concat(reversed)
}
