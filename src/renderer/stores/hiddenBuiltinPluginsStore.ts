import { createStore } from 'zustand'
import { combine, persist } from 'zustand/middleware'
import { safeStorage } from './safeStorage'

interface HiddenBuiltinPluginsState {
  hiddenPluginIds: string[]
}

export const hiddenBuiltinPluginsStore = createStore(
  persist(
    combine(
      {
        hiddenPluginIds: [],
      } as HiddenBuiltinPluginsState,
      (set, get) => ({
        hidePlugin: (pluginId: string) => {
          if (get().hiddenPluginIds.includes(pluginId)) return
          set((state) => ({
            hiddenPluginIds: [...state.hiddenPluginIds, pluginId],
          }))
        },
        showPlugin: (pluginId: string) => {
          set((state) => ({
            hiddenPluginIds: state.hiddenPluginIds.filter((id) => id !== pluginId),
          }))
        },
        isHidden: (pluginId: string) => get().hiddenPluginIds.includes(pluginId),
      })
    ),
    {
      name: 'hidden-builtin-plugins',
      version: 1,
      storage: safeStorage,
    }
  )
)
