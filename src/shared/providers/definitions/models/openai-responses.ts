import { createOpenAI } from '@ai-sdk/openai'
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai'
import AbstractAISDKModel from '../../../models/abstract-ai-sdk'
import { getEnvApiKeyForProvider } from '../../env'
import { fetchRemoteModels } from '../../../models/openai-compatible'
import type { CallChatCompletionOptions } from '../../../models/types'
import { createFetchWithProxy } from '../../../models/utils/fetch-proxy'
import type { ProviderModelInfo } from '../../../types'
import type { ModelDependencies } from '../../../types/adapters'
import { normalizeOpenAIResponsesHostAndPath } from '../../../utils/llm_utils'

interface Options {
  apiKey: string
  apiHost: string
  apiPath: string
  model: ProviderModelInfo
  temperature?: number
  topP?: number
  maxOutputTokens?: number
  stream?: boolean
  useProxy?: boolean
}

type FetchFunction = typeof globalThis.fetch

export default class OpenAIResponses extends AbstractAISDKModel {
  public name = 'OpenAI Responses'

  constructor(
    public options: Options,
    dependencies: ModelDependencies
  ) {
    super(options, dependencies)
    const { apiHost, apiPath } = normalizeOpenAIResponsesHostAndPath(options)
    this.options = { ...options, apiHost, apiPath }
  }

  protected getCallSettings() {
    return {
      temperature: this.options.temperature,
      topP: this.options.topP,
      maxOutputTokens: this.options.maxOutputTokens,
      stream: this.options.stream,
    }
  }

  static isSupportTextEmbedding() {
    return true
  }

  private buildProvider(apiKey: string, fetchFunction?: FetchFunction) {
    return createOpenAI({
      apiKey,
      baseURL: this.options.apiHost,
      fetch: fetchFunction,
      headers: this.options.apiHost.includes('openrouter.ai')
        ? {
            'HTTP-Referer': 'https://chatboxai.app',
            'X-Title': 'Chatbox AI',
          }
        : this.options.apiHost.includes('aihubmix.com')
          ? {
              'APP-Code': 'VAFU9221',
            }
          : undefined,
    })
  }

  protected getProvider(_options: CallChatCompletionOptions, fetchFunction?: FetchFunction) {
    return this.buildProvider(this.options.apiKey, fetchFunction)
  }

  private buildChatModel(apiKey: string, options: CallChatCompletionOptions) {
    const { apiHost, apiPath } = this.options
    const provider = this.buildProvider(apiKey, (_input, init) =>
      createFetchWithProxy(this.options.useProxy, this.dependencies)(`${apiHost}${apiPath}`, init)
    )
    return wrapLanguageModel({
      model: provider.responses(this.options.model.modelId),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    })
  }

  protected getChatModel(options: CallChatCompletionOptions) {
    return this.buildChatModel(this.options.apiKey, options)
  }

  protected getAuthFallbackModel(options: CallChatCompletionOptions) {
    const envApiKey = getEnvApiKeyForProvider('openai-responses')
    if (!envApiKey || envApiKey === this.options.apiKey) {
      return null
    }
    return this.buildChatModel(envApiKey, options)
  }

  public listModels() {
    return fetchRemoteModels(
      {
        apiHost: this.options.apiHost,
        apiKey: this.options.apiKey,
        useProxy: this.options.useProxy,
      },
      this.dependencies
    )
  }

  protected getImageModel() {
    return null
  }
}
