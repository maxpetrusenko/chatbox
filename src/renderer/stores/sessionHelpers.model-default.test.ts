/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from 'vitest'
import { initEmptyChatSession } from './sessionHelpers'
import { lastUsedModelStore } from './lastUsedModelStore'
import { settingsStore } from './settingsStore'

describe('initEmptyChatSession model defaults', () => {
  afterEach(() => {
    settingsStore.setState((state) => ({
      ...state,
      defaultChatModel: undefined,
      providers: undefined,
    }))
    lastUsedModelStore.setState({ chat: undefined, picture: undefined })
  })

  it('prefers last selected model for new chats', () => {
    lastUsedModelStore.setState({
      chat: { provider: 'openai', modelId: 'gpt-4o-mini' },
      picture: undefined,
    })

    const session = initEmptyChatSession()

    expect(session.settings.provider).toBe('openai')
    expect(session.settings.modelId).toBe('gpt-4o-mini')
  })

  it('falls back to gpt-5-mini when openai key is available and nothing is selected', () => {
    settingsStore.setState((state) => ({
      ...state,
      providers: {
        ...(state.providers || {}),
        openai: {},
      },
    }))

    const session = initEmptyChatSession()

    if (process.env.OPENAI_API_KEY) {
      expect(session.settings.provider).toBe('openai')
      expect(session.settings.modelId).toBe('gpt-5-mini')
    } else {
      expect(session.settings.provider).toBeUndefined()
      expect(session.settings.modelId).toBeUndefined()
    }
  })
})
