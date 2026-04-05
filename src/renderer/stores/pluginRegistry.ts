/**
 * Plugin Registry Store
 *
 * Central state for all registered plugin manifests and active plugin instances.
 * Provides tool set derivation for model calls and instance lifecycle management.
 */

import type {
  PluginCompletionPayload,
  PluginInstance,
  PluginInstanceStatus,
  PluginManifest,
  PluginToolDefinition,
} from '@shared/plugin-types'
import { v4 as uuidv4 } from 'uuid'
import { createStore, useStore } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { getBuiltinManifests } from '@/plugins'
import { getPluginAccessState, getPluginAppAuthStatus } from '@/plugins/plugin-access'
import { droppedPluginsStore } from '@/stores/droppedPluginsStore'
import { hiddenBuiltinPluginsStore } from '@/stores/hiddenBuiltinPluginsStore'
import { k12Store } from '@/stores/k12Store'
import { pluginAuthStore } from '@/stores/pluginAuthStore'

// ---------------------------------------------------------------------------
// Derived tool type exposed to model
// ---------------------------------------------------------------------------

export interface PluginTool {
  /** Namespaced name: plugin__<pluginId>__<toolName> */
  namespacedName: string
  pluginId: string
  tool: PluginToolDefinition
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface PluginRegistryState {
  manifests: PluginManifest[]
  instances: PluginInstance[]
}

interface PluginRegistryActions {
  loadBuiltins: () => void
  registerManifest: (manifest: PluginManifest) => boolean
  removeManifest: (pluginId: string) => void
  createInstance: (pluginId: string, sessionId: string) => PluginInstance | null
  updateInstanceStatus: (instanceId: string, status: PluginInstanceStatus) => void
  updateInstanceState: (instanceId: string, state: Record<string, unknown>) => void
  updateInstanceCompletion: (instanceId: string, completion: PluginCompletionPayload) => void
  updateInstanceAuth: (instanceId: string, authStatus: PluginInstance['authStatus']) => void
  getManifest: (pluginId: string) => PluginManifest | undefined
  getInstance: (instanceId: string) => PluginInstance | undefined
  getInstancesForSession: (sessionId: string) => PluginInstance[]
  getActiveInstanceForPlugin: (pluginId: string, sessionId: string) => PluginInstance | undefined
  getToolSet: (sessionId: string) => PluginTool[]
  resolveToolCall: (namespacedName: string) => { pluginId: string; toolName: string } | null
}

export type PluginRegistryStore = PluginRegistryState & PluginRegistryActions

// ---------------------------------------------------------------------------
// Store factory (exported for testing with fresh instances)
// ---------------------------------------------------------------------------

function isHiddenManifest(manifest: PluginManifest | undefined): boolean {
  if (!manifest) return false
  if (droppedPluginsStore.getState().packages[manifest.id]) return false
  if (manifest.trustLevel !== 'builtin' && manifest.trustLevel !== 'verified') return false
  return hiddenBuiltinPluginsStore.getState().isHidden(manifest.id)
}

export function createPluginRegistryStore() {
  return createStore<PluginRegistryStore>()(
    immer((set, get) => ({
      manifests: [],
      instances: [],

      loadBuiltins: () => {
        const builtins = getBuiltinManifests()
        set((s) => {
          for (const m of builtins) {
            if (!s.manifests.some((existing) => existing.id === m.id)) {
              s.manifests.push(m)
            }
          }
        })
      },

      registerManifest: (manifest) => {
        const state = get()
        if (state.manifests.some((m) => m.id === manifest.id)) {
          return false // duplicate
        }
        set((s) => {
          s.manifests.push(manifest)
        })
        return true
      },

      removeManifest: (pluginId) => {
        set((s) => {
          s.manifests = s.manifests.filter((manifest) => manifest.id !== pluginId)
        })
      },

      createInstance: (pluginId, sessionId) => {
        const state = get()
        const manifest = state.getManifest(pluginId)
        if (!manifest) return null

        const instance: PluginInstance = {
          instanceId: uuidv4(),
          pluginId,
          sessionId,
          status: 'loading',
          lastState: null,
          lastCompletion: null,
          authStatus: manifest.auth && manifest.auth.type !== 'none' ? 'required' : getPluginAppAuthStatus(manifest),
          createdAt: Date.now(),
        }

        set((s) => {
          s.instances.push(instance)
        })
        return instance
      },

      updateInstanceStatus: (instanceId, status) => {
        set((s) => {
          const inst = s.instances.find((i) => i.instanceId === instanceId)
          if (inst) inst.status = status
        })
      },

      updateInstanceState: (instanceId, state) => {
        set((s) => {
          const inst = s.instances.find((i) => i.instanceId === instanceId)
          if (inst) inst.lastState = state
        })
      },

      updateInstanceCompletion: (instanceId, completion) => {
        set((s) => {
          const inst = s.instances.find((i) => i.instanceId === instanceId)
          if (inst) {
            inst.lastCompletion = completion
            inst.status = 'completed'
          }
        })
      },

      updateInstanceAuth: (instanceId, authStatus) => {
        set((s) => {
          const inst = s.instances.find((i) => i.instanceId === instanceId)
          if (!inst || inst.authStatus === authStatus) return
          inst.authStatus = authStatus
        })
      },

      getManifest: (pluginId) => {
        const manifest = get().manifests.find((m) => m.id === pluginId)
        return isHiddenManifest(manifest) ? undefined : manifest
      },

      getInstance: (instanceId) => {
        return get().instances.find((i) => i.instanceId === instanceId)
      },

      getInstancesForSession: (sessionId) => {
        return get().instances.filter((i) => i.sessionId === sessionId)
      },

      getActiveInstanceForPlugin: (pluginId, sessionId) => {
        return get().instances.find(
          (i) =>
            i.pluginId === pluginId && i.sessionId === sessionId && i.status !== 'completed' && i.status !== 'error'
        )
      },

      getToolSet: (_sessionId) => {
        const state = get()
        const tools: PluginTool[] = []

        const visibleManifests = state.manifests.filter((manifest) => !isHiddenManifest(manifest))

        // Filter manifests by K12 role if authenticated
        const k12State = k12Store.getState()
        const allowedManifests =
          k12State.isAuthenticated && k12State.currentUser
            ? visibleManifests.filter(
                (manifest) =>
                  k12State.isPluginAllowed(manifest.id, k12State.currentUser?.schoolId) &&
                  k12State.isPluginActiveForCurrentScope(manifest.id)
              )
            : visibleManifests

        for (const manifest of allowedManifests) {
          const access = getPluginAccessState(manifest)
          if (!access.canExposeTools) {
            continue
          }
          if (
            k12State.currentUser?.role === 'student' &&
            manifest.auth?.type !== undefined &&
            manifest.auth.type !== 'api-key' &&
            manifest.auth.type !== 'none' &&
            pluginAuthStore.getState().sessions[manifest.id]?.status !== 'connected'
          ) {
            continue
          }
          for (const tool of manifest.tools) {
            tools.push({
              namespacedName: `plugin__${manifest.id}__${tool.name}`,
              pluginId: manifest.id,
              tool,
            })
          }
        }

        return tools
      },

      resolveToolCall: (namespacedName) => {
        const match = namespacedName.match(/^plugin__([^_]+)__(.+)$/)
        if (!match) return null
        const [, pluginId, toolName] = match
        const manifest = get().getManifest(pluginId)
        if (!manifest) return null
        if (!manifest.tools.some((t) => t.name === toolName)) return null
        return { pluginId, toolName }
      },
    }))
  )
}

// ---------------------------------------------------------------------------
// Singleton for app use
// ---------------------------------------------------------------------------

export const pluginRegistryStore = createPluginRegistryStore()

export function usePluginRegistry<T>(selector: (state: PluginRegistryStore) => T): T {
  return useStore(pluginRegistryStore, selector)
}
