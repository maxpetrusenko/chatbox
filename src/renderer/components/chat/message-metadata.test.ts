import { createMessage } from '@shared/types'
import { describe, expect, it } from 'vitest'
import { getMessageModelName, getMessageTokensUsed } from './message-metadata'

describe('message metadata helpers', () => {
  it('keeps zero token usage visible', () => {
    const message = {
      ...createMessage('assistant', 'Opened GeoGebra.'),
      usage: { totalTokens: 0 },
      tokensUsed: 0,
    }

    expect(getMessageTokensUsed(message)).toBe(0)
  })

  it('falls back to unknown model when absent', () => {
    const message = createMessage('assistant', 'Opened GeoGebra.')

    expect(getMessageModelName(message)).toBe('unknown')
  })
})
