import { describe, expect, it } from 'vitest'
import { getEnvApiKeyForProvider, getProviderSettingsWithEnvFallback, hasProviderApiKey } from './env'

describe('provider env fallback', () => {
  it('reads openai api key from env', () => {
    expect(getEnvApiKeyForProvider('openai')).toBe(process.env.OPENAI_API_KEY || undefined)
  })

  it('prefers ui key over env key', () => {
    expect(getProviderSettingsWithEnvFallback('openai', { apiKey: 'ui-key' }).apiKey).toBe('ui-key')
  })

  it('uses env key when ui key is missing', () => {
    expect(getProviderSettingsWithEnvFallback('openai', {}).apiKey).toBe(process.env.OPENAI_API_KEY || undefined)
  })

  it('reports provider key when env fallback exists', () => {
    expect(hasProviderApiKey('openai', {})).toBe(Boolean(process.env.OPENAI_API_KEY))
  })
})
