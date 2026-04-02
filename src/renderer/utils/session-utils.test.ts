import { createMessage, type Session } from '@shared/types'
import { describe, expect, it } from 'vitest'
import { migrateSession } from './session-utils'

describe('migrateSession', () => {
  it('backfills old plugin intent metadata from session settings', () => {
    const pluginMessage = createMessage('assistant', 'Opening GeoGebra.')
    pluginMessage.contentParts.push({
      type: 'plugin',
      pluginId: 'geogebra',
      instanceId: 'inst-1',
      toolCallId: 'tool-1',
    })

    const session: Session = {
      id: 'session-1',
      type: 'chat',
      name: 'Test',
      settings: {
        provider: 'openai',
        modelId: 'gpt-5.3',
      },
      messages: [pluginMessage],
    }

    const migrated = migrateSession(session)

    expect(migrated.messages[0].aiProvider).toBe('openai')
    expect(migrated.messages[0].model).toBe('gpt-5.3')
    expect(migrated.messages[0].tokensUsed).toBe(0)
    expect(migrated.messages[0].usage?.totalTokens).toBe(0)
  })

  it('keeps existing plugin metadata untouched', () => {
    const pluginMessage = {
      ...createMessage('assistant', 'Opening GeoGebra.'),
      aiProvider: 'anthropic',
      model: 'Claude Opus',
      tokensUsed: 12,
      usage: { totalTokens: 12 },
    }
    pluginMessage.contentParts.push({
      type: 'plugin',
      pluginId: 'geogebra',
      instanceId: 'inst-1',
      toolCallId: 'tool-1',
    })

    const session: Session = {
      id: 'session-1',
      type: 'chat',
      name: 'Test',
      settings: {
        provider: 'openai',
        modelId: 'gpt-5.3',
      },
      messages: [pluginMessage],
    }

    const migrated = migrateSession(session)

    expect(migrated.messages[0].aiProvider).toBe('anthropic')
    expect(migrated.messages[0].model).toBe('Claude Opus')
    expect(migrated.messages[0].tokensUsed).toBe(12)
    expect(migrated.messages[0].usage?.totalTokens).toBe(12)
  })
})
