import type { ProviderSettings } from '../types'
import { ModelProviderEnum } from '../types'

const providerEnvKeyMap: Partial<Record<string, string[]>> = {
  [ModelProviderEnum.OpenAI]: ['OPENAI_API_KEY'],
  [ModelProviderEnum.OpenAIResponses]: ['OPENAI_API_KEY'],
  [ModelProviderEnum.Claude]: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
  [ModelProviderEnum.Gemini]: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
  [ModelProviderEnum.DeepSeek]: ['DEEPSEEK_API_KEY'],
  [ModelProviderEnum.SiliconFlow]: ['SILICONFLOW_API_KEY', 'SILICON_CLOUD_API_KEY'],
  [ModelProviderEnum.OpenRouter]: ['OPENROUTER_API_KEY'],
  [ModelProviderEnum.Groq]: ['GROQ_API_KEY'],
  [ModelProviderEnum.XAI]: ['XAI_API_KEY'],
  [ModelProviderEnum.Perplexity]: ['PERPLEXITY_API_KEY'],
  [ModelProviderEnum.MistralAI]: ['MISTRAL_API_KEY'],
  [ModelProviderEnum.VolcEngine]: ['VOLCENGINE_API_KEY'],
  [ModelProviderEnum.ChatGLM6B]: ['CHATGLM_API_KEY'],
  [ModelProviderEnum.Azure]: ['AZURE_API_KEY'],
}

export function getEnvApiKeyForProvider(providerId: string): string | undefined {
  const candidates = providerEnvKeyMap[providerId] || []
  for (const envKey of candidates) {
    const value = process.env[envKey]
    if (value) return value
  }
  return undefined
}

export function getProviderSettingsWithEnvFallback(providerId: string, providerSettings?: ProviderSettings): ProviderSettings {
  if (providerSettings?.apiKey) {
    return providerSettings
  }

  const envApiKey = getEnvApiKeyForProvider(providerId)
  if (!envApiKey) {
    return providerSettings || {}
  }

  return {
    ...(providerSettings || {}),
    apiKey: envApiKey,
  }
}

export function hasProviderApiKey(providerId: string, providerSettings?: ProviderSettings): boolean {
  return !!getProviderSettingsWithEnvFallback(providerId, providerSettings).apiKey
}
