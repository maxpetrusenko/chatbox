import type { PluginManifest } from '@shared/plugin-types'
import { createStore } from 'zustand'
import { combine, persist } from 'zustand/middleware'
import { registerPluginHtml, unregisterPluginHtml } from '@/plugins/resolve'
import { hiddenBuiltinPluginsStore } from '@/stores/hiddenBuiltinPluginsStore'
import { pluginRegistryStore } from '@/stores/pluginRegistry'
import { safeStorage } from './safeStorage'

function registerInstalledPackage(pkg: DroppedPluginPackage): void {
  hiddenBuiltinPluginsStore.getState().showPlugin(pkg.manifest.id)
  registerPluginHtml(pkg.manifest.id, pkg.uiHtml)
  pluginRegistryStore.getState().registerManifest(pkg.manifest)
}

function unregisterInstalledPackage(pluginId: string): void {
  unregisterPluginHtml(pluginId)
  pluginRegistryStore.getState().removeManifest(pluginId)
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
          unregisterInstalledPackage(pluginId)
          set((state) => {
            const next = { ...state.packages }
            delete next[pluginId]
            return { packages: next }
          })
        },
        replaceRemoteState: ({
          packages,
          stagedPackages,
        }: {
          packages: Record<string, DroppedPluginPackage>
          stagedPackages: Record<string, DroppedPluginPackage>
        }) => {
          const currentIds = new Set(Object.keys(get().packages))
          const nextIds = new Set(Object.keys(packages))

          for (const pluginId of currentIds) {
            if (!nextIds.has(pluginId)) {
              unregisterInstalledPackage(pluginId)
            }
          }

          for (const pkg of Object.values(packages)) {
            registerInstalledPackage(pkg)
          }

          set({ packages, stagedPackages })
        },
        clearAll: () => {
          for (const pluginId of Object.keys(get().packages)) {
            unregisterInstalledPackage(pluginId)
          }
          set({ packages: {}, stagedPackages: {} })
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
