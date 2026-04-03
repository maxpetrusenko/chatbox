import { createStore, useStore } from 'zustand'
import { getUserProfile } from '@/packages/remote'
import { authInfoStore } from '@/stores/authInfoStore'

type ChatboxAuthStatus = 'signed_out' | 'checking' | 'signed_in'

interface ChatboxAuthProfile {
  email: string
  id: string
  created_at: string
}

interface ChatboxAuthState {
  status: ChatboxAuthStatus
  profile: ChatboxAuthProfile | null
  initialized: boolean
}

interface ChatboxAuthActions {
  validate: () => Promise<void>
  init: () => void
}

let validatePromise: Promise<void> | null = null
let initialized = false

export const chatboxAuthStore = createStore<ChatboxAuthState & ChatboxAuthActions>()((set, get) => ({
  status: authInfoStore.getState().getTokens() ? 'checking' : 'signed_out',
  profile: null,
  initialized: false,

  validate: async () => {
    const tokens = authInfoStore.getState().getTokens()
    if (!tokens) {
      set({ status: 'signed_out', profile: null, initialized: true })
      return
    }

    if (!validatePromise) {
      set((state) => ({ ...state, status: 'checking' }))
      validatePromise = (async () => {
        try {
          const profile = await getUserProfile()
          set({ status: 'signed_in', profile, initialized: true })
        } catch {
          authInfoStore.getState().clearTokens()
          set({ status: 'signed_out', profile: null, initialized: true })
        } finally {
          validatePromise = null
        }
      })()
    }

    await validatePromise
  },

  init: () => {
    if (initialized) return
    initialized = true
    set((state) => ({ ...state, initialized: true }))

    let previousTokens = authInfoStore.getState().getTokens()
    void get().validate()

    authInfoStore.subscribe((state) => {
      const nextTokens = state.getTokens()
      const tokensChanged =
        previousTokens?.accessToken !== nextTokens?.accessToken || previousTokens?.refreshToken !== nextTokens?.refreshToken

      if (!tokensChanged) return
      previousTokens = nextTokens
      void get().validate()
    })
  },
}))

export function useChatboxAuthStore<T>(selector: (state: ChatboxAuthState & ChatboxAuthActions) => T): T {
  return useStore(chatboxAuthStore, selector)
}

