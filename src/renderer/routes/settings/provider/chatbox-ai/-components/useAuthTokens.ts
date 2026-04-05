import { useCallback } from 'react'
import { authInfoStore } from '@/stores/authInfoStore'
import { useChatboxAuthStore } from '@/stores/chatboxAuthStore'
import * as premiumActions from '@/stores/premiumActions'
import queryClient from '@/stores/queryClient'
import { settingsStore } from '@/stores/settingsStore'
import type { AuthTokens } from './types'

export async function saveChatboxAuthTokens(tokens: AuthTokens) {
  try {
    await authInfoStore.getState().setTokens(tokens)
    console.log('✅ Tokens saved to store')
  } catch (error) {
    console.error('❌ Failed to save tokens:', error)
    throw error
  }
}

export async function clearChatboxAuthTokens() {
  try {
    const settings = settingsStore.getState()
    if (settings.licenseActivationMethod === 'login') {
      console.log('🔥 Deactivating login-activated license')
      await premiumActions.deactivate()
    }

    authInfoStore.getState().clearTokens()

    queryClient.removeQueries({ queryKey: ['userProfile'] })
    queryClient.removeQueries({ queryKey: ['userLicenses'] })
    queryClient.removeQueries({ queryKey: ['licenseDetail'] })
    queryClient.removeQueries({ queryKey: ['license-detail'] })

    console.log('✅ Auth tokens and user cache cleared')
  } catch (error) {
    console.error('Failed to clear auth tokens:', error)
  }
}

export function useAuthTokens() {
  const isLoggedIn = useChatboxAuthStore((state) => state.status === 'signed_in')

  const saveAuthTokens = useCallback(async (tokens: AuthTokens) => await saveChatboxAuthTokens(tokens), [])

  const clearAuthTokens = useCallback(async () => await clearChatboxAuthTokens(), [])

  return {
    isLoggedIn,
    clearAuthTokens,
    saveAuthTokens,
  }
}
