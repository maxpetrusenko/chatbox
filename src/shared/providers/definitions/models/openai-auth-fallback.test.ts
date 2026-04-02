import type { ModelDependencies } from 'src/shared/types/adapters'
import type { ProviderModelInfo } from 'src/shared/types/settings'
import type { SentryScope } from 'src/shared/utils/sentry_adapter'
import { afterEach, describe, expect, it, vi } from 'vitest'
import OpenAI from './openai'
import OpenAIResponses from './openai-responses'

function makeDependencies(): ModelDependencies {
  return {
    request: {
      apiRequest: vi.fn(),
      fetchWithOptions: vi.fn(),
    },
    storage: {
      saveImage: vi.fn(),
      getImage: vi.fn(),
    },
    sentry: {
      withScope: vi.fn((callback: (scope: SentryScope) => void) => callback({ setTag: vi.fn(), setExtra: vi.fn() })),
      captureException: vi.fn(),
    },
    getRemoteConfig: vi.fn().mockReturnValue({ setting_chatboxai_first: false }),
  }
}

const model: ProviderModelInfo = {
  modelId: 'gpt-5-mini',
  type: 'chat',
  capabilities: ['tool_use'],
}

describe('OpenAI auth fallback', () => {
  const originalKey = process.env.OPENAI_API_KEY

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalKey
  })

  it('returns a fallback chat model when env key differs', () => {
    process.env.OPENAI_API_KEY = 'env-good-key'
    const openai = new OpenAI(
      {
        apiKey: 'ui-bad-key',
        apiHost: 'https://api.openai.com',
        model,
        dalleStyle: 'vivid',
        injectDefaultMetadata: true,
        useProxy: false,
        stream: false,
      },
      makeDependencies()
    )

    expect((openai as any).getAuthFallbackModel({})).toBeTruthy()
  })

  it('does not return a fallback when env key matches ui key', () => {
    process.env.OPENAI_API_KEY = 'same-key'
    const openai = new OpenAI(
      {
        apiKey: 'same-key',
        apiHost: 'https://api.openai.com',
        model,
        dalleStyle: 'vivid',
        injectDefaultMetadata: true,
        useProxy: false,
        stream: false,
      },
      makeDependencies()
    )

    expect((openai as any).getAuthFallbackModel({})).toBeNull()
  })

  it('returns a fallback for responses provider when env key differs', () => {
    process.env.OPENAI_API_KEY = 'env-good-key'
    const openaiResponses = new OpenAIResponses(
      {
        apiKey: 'ui-bad-key',
        apiHost: 'https://api.openai.com',
        apiPath: '/responses',
        model,
        useProxy: false,
        stream: false,
      },
      makeDependencies()
    )

    expect((openaiResponses as any).getAuthFallbackModel({})).toBeTruthy()
  })
})
