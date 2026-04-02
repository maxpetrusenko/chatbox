import type { Message } from '@shared/types'

export function getMessageTokensUsed(msg: Message): number | 'unknown' {
  return msg.usage?.totalTokens ?? msg.tokensUsed ?? 'unknown'
}

export function getMessageModelName(msg: Message): string {
  return msg.model ?? 'unknown'
}
