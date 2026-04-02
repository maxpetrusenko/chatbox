import type {
  PlatformProxyDashboard,
  PlatformProxyQuotaStatus,
  PluginProxyConfig,
  ProxyTrackingPattern,
} from '@shared/platform-proxy'
import { createStore, useStore } from 'zustand'

interface ApiKeyMetadata {
  pluginId: string
  configured: boolean
  maskedValue: string | null
  source?: 'district' | 'platform-default' | null
}

interface RecordUsagePayload {
  pluginId: string
  action: 'tool-invoke' | 'iframe-open' | 'iframe-close' | 'rest-api-call'
  trackingPattern: ProxyTrackingPattern
  userId: string
  districtId: string
  classId?: string
  schoolId?: string
  toolName?: string
  paramsSummary?: string
  durationMs?: number
  estimatedCostUsd?: number
  proxyConfig?: PluginProxyConfig
}

interface PlatformProxyState {
  dashboard: PlatformProxyDashboard | null
  apiKeyMetadata: Record<string, ApiKeyMetadata>
}

interface PlatformProxyActions {
  hydrateDashboard: (configs: Record<string, PluginProxyConfig | undefined>) => Promise<void>
  hydrateApiKeyMetadata: (districtId: string, pluginIds: string[]) => Promise<void>
  setApiKey: (districtId: string, pluginId: string, apiKey: string) => Promise<void>
  deleteApiKey: (districtId: string, pluginId: string) => Promise<void>
  recordUsage: (payload: RecordUsagePayload) => Promise<PlatformProxyQuotaStatus>
}

type PlatformProxyStore = PlatformProxyState & PlatformProxyActions

function invoke<T>(channel: string, payload: unknown): Promise<T> {
  if (typeof window === 'undefined' || !window.electronAPI) {
    throw new Error('Platform proxy requires desktop Electron environment')
  }
  return window.electronAPI.invoke(channel, JSON.stringify(payload)) as Promise<T>
}

export const platformProxyStore = createStore<PlatformProxyStore>()((set) => ({
  dashboard: null,
  apiKeyMetadata: {},

  hydrateDashboard: async (configs) => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      set({
        dashboard: {
          totalEvents: 0,
          totalEstimatedCostUsd: 0,
          pluginTotals: [],
          schoolTotals: [],
          studentTotals: [],
          alerts: [],
          recentEntries: [],
        },
      })
      return
    }
    const dashboard = await invoke<PlatformProxyDashboard>('platform-proxy:get-dashboard', { configs })
    set({ dashboard })
  },

  hydrateApiKeyMetadata: async (districtId, pluginIds) => {
    if (typeof window === 'undefined' || !window.electronAPI || pluginIds.length === 0) {
      set({ apiKeyMetadata: {} })
      return
    }
    const records = await invoke<ApiKeyMetadata[]>('platform-proxy:list-api-key-metadata', { districtId, pluginIds })
    set({ apiKeyMetadata: Object.fromEntries(records.map((record) => [record.pluginId, record])) })
  },

  setApiKey: async (districtId, pluginId, apiKey) => {
    await invoke('platform-proxy:set-api-key', { districtId, pluginId, apiKey })
    set((state) => ({
      apiKeyMetadata: {
        ...state.apiKeyMetadata,
        [pluginId]: {
          pluginId,
          configured: true,
          maskedValue: `${apiKey.slice(0, 4)}••••${apiKey.slice(-2)}`,
        },
      },
    }))
  },

  deleteApiKey: async (districtId, pluginId) => {
    await invoke('platform-proxy:delete-api-key', { districtId, pluginId })
    set((state) => ({
      apiKeyMetadata: {
        ...state.apiKeyMetadata,
        [pluginId]: {
          pluginId,
          configured: false,
          maskedValue: null,
        },
      },
    }))
  },

  recordUsage: (payload) => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      return { allowed: true }
    }
    return invoke<PlatformProxyQuotaStatus>('platform-proxy:record-usage', payload)
  },
}))

export function usePlatformProxy<T>(selector: (state: PlatformProxyStore) => T): T {
  return useStore(platformProxyStore, selector)
}
