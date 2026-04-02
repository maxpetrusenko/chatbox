import type { PluginManifest } from '@shared/plugin-types'
import { createStore } from 'zustand'
import { combine, persist } from 'zustand/middleware'
import { registerBuiltinManifest } from '@/plugins'
import { registerPluginHtml } from '@/plugins/resolve'
import { pluginRegistryStore } from '@/stores/pluginRegistry'
import { safeStorage } from './safeStorage'

function registerInstalledPackage(pkg: DroppedPluginPackage): void {
  registerBuiltinManifest(pkg.manifest)
  registerPluginHtml(pkg.manifest.id, pkg.uiHtml)
  pluginRegistryStore.getState().registerManifest(pkg.manifest)
}

export interface DroppedPluginPackage {
  manifest: PluginManifest
  uiHtml: string
  sourceName?: string
  installedAt: number
}

interface DroppedPluginState {
  packages: Record<string, DroppedPluginPackage>
  stagedPackages: Record<string, DroppedPluginPackage>
}

export const droppedPluginsStore = createStore(
  persist(
    combine(
      {
        packages: {},
        stagedPackages: {},
      } as DroppedPluginState,
      (set, get) => ({
        installPackage: (pkg: Omit<DroppedPluginPackage, 'installedAt'> & { installedAt?: number }) => {
          const next: DroppedPluginPackage = {
            ...pkg,
            installedAt: pkg.installedAt || Date.now(),
          }
          registerInstalledPackage(next)
          set((state) => ({
            packages: {
              ...state.packages,
              [next.manifest.id]: next,
            },
          }))
        },
        stagePackage: (recordId: string, pkg: Omit<DroppedPluginPackage, 'installedAt'> & { installedAt?: number }) => {
          const next: DroppedPluginPackage = {
            ...pkg,
            installedAt: pkg.installedAt || Date.now(),
          }
          set((state) => ({
            stagedPackages: {
              ...state.stagedPackages,
              [recordId]: next,
            },
          }))
        },
        getStagedPackage: (recordId: string) => get().stagedPackages[recordId],
        installStagedPackage: (recordId: string) => {
          const staged = get().stagedPackages[recordId]
          if (!staged) return null
          registerInstalledPackage(staged)
          set((state) => ({
            packages: {
              ...state.packages,
              [staged.manifest.id]: staged,
            },
          }))
          set((state) => {
            const next = { ...state.stagedPackages }
            delete next[recordId]
            return { stagedPackages: next }
          })
          return staged
        },
        clearStagedPackage: (recordId: string) => {
          set((state) => {
            const next = { ...state.stagedPackages }
            delete next[recordId]
            return { stagedPackages: next }
          })
        },
        removePackage: (pluginId: string) => {
          set((state) => {
            const next = { ...state.packages }
            delete next[pluginId]
            return { packages: next }
          })
        },
        hydrateIntoRuntime: () => {
          const packages = Object.values(get().packages)
          for (const pkg of packages) {
            registerInstalledPackage(pkg)
          }
        },
      })
    ),
    {
      name: 'dropped-plugins',
      version: 2,
      storage: safeStorage,
    }
  )
)
