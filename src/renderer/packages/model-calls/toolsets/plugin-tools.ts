/**
 * Plugin tool set — converts plugin manifest tools into AI SDK tools
 * that route invocations through the plugin bridge protocol.
 */

import { tool } from 'ai'
import z from 'zod'
import type { PluginToolParameter } from '@shared/plugin-types'
import { pluginRegistryStore } from '@/stores/pluginRegistry'

export interface QueuedPluginToolInvocation {
  callId: string
  toolName: string
  parameters: Record<string, unknown>
}

export interface PluginMountDescriptor {
  pluginId: string
  instanceId: string
}

export interface PluginMountToolResult {
  pluginMount: PluginMountDescriptor
  status: 'mounted'
  message: string
}

// Pending tool call resolvers — keyed by callId
const pendingCalls = new Map<string, { resolve: (result: unknown) => void; reject: (error: Error) => void }>()
const queuedInvocationsByInstance = new Map<string, QueuedPluginToolInvocation[]>()

export function isPluginMountToolResult(value: unknown): value is PluginMountToolResult {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  const pluginMount = record.pluginMount
  if (!pluginMount || typeof pluginMount !== 'object') return false
  const mountRecord = pluginMount as Record<string, unknown>
  return typeof mountRecord.pluginId === 'string' && typeof mountRecord.instanceId === 'string'
}

function queuePluginToolInvocation(instanceId: string, invocation: QueuedPluginToolInvocation): void {
  const existing = queuedInvocationsByInstance.get(instanceId) || []
  existing.push(invocation)
  queuedInvocationsByInstance.set(instanceId, existing)
}

export function consumeQueuedPluginToolInvocations(instanceId: string): QueuedPluginToolInvocation[] {
  const queued = queuedInvocationsByInstance.get(instanceId) || []
  queuedInvocationsByInstance.delete(instanceId)
  return queued
}

/**
 * Called by the plugin channel when a TOOL_RESULT message arrives.
 * Resolves the corresponding pending tool call promise.
 */
export function resolvePluginToolCall(callId: string, result: unknown, error?: string): void {
  const pending = pendingCalls.get(callId)
  if (!pending) return
  pendingCalls.delete(callId)
  if (error) {
    pending.reject(new Error(error))
  } else {
    pending.resolve(result)
  }
}

/**
 * Convert a plugin parameter type to a Zod schema.
 */
function paramToZod(param: PluginToolParameter): z.ZodTypeAny {
  let schema: z.ZodTypeAny
  switch (param.type) {
    case 'string':
      schema = z.string().describe(param.description)
      break
    case 'number':
      schema = z.number().describe(param.description)
      break
    case 'boolean':
      schema = z.boolean().describe(param.description)
      break
    case 'object':
      schema = z.record(z.unknown()).describe(param.description)
      break
    case 'array':
      schema = z.array(z.unknown()).describe(param.description)
      break
    default:
      schema = z.unknown().describe(param.description)
  }
  return param.required ? schema : schema.optional()
}

/**
 * Build AI SDK tools from all registered plugin manifests.
 * Returns a record of namespaced tool names → AI SDK tool objects.
 */
export function getPluginToolSet(sessionId: string): Record<string, ReturnType<typeof tool>> {
  const store = pluginRegistryStore.getState()
  const pluginTools = store.getToolSet(sessionId)
  const tools: Record<string, ReturnType<typeof tool>> = {}

  for (const pt of pluginTools) {
    const manifest = store.getManifest(pt.pluginId)
    if (!manifest) continue

    const shape: Record<string, z.ZodTypeAny> = {}
    for (const param of pt.tool.parameters) {
      shape[param.name] = paramToZod(param)
    }
    const inputSchema = z.object(shape)

    tools[pt.namespacedName] = tool({
      description: `[${manifest.name}] ${pt.tool.description}`,
      inputSchema,
      execute: async (input: Record<string, unknown>) => {
        const callId = `${pt.namespacedName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        let instance = store.getActiveInstanceForPlugin(pt.pluginId, sessionId)
        const isNewInstance = !instance
        if (!instance) {
          instance = store.createInstance(pt.pluginId, sessionId)
        }
        if (!instance) {
          throw new Error(`Failed to create plugin instance for ${pt.pluginId}`)
        }

        if (isNewInstance) {
          queuePluginToolInvocation(instance.instanceId, {
            callId,
            toolName: pt.tool.name,
            parameters: input,
          })
          return {
            pluginMount: {
              pluginId: pt.pluginId,
              instanceId: instance.instanceId,
            },
            status: 'mounted',
            message: `Mounted ${manifest.name}. Continue through the inline app.`,
          } satisfies PluginMountToolResult
        }

        const resultPromise = new Promise<unknown>((resolve, reject) => {
          pendingCalls.set(callId, { resolve, reject })
          setTimeout(() => {
            if (pendingCalls.has(callId)) {
              pendingCalls.delete(callId)
              reject(new Error(`Plugin tool call timed out: ${pt.tool.name}`))
            }
          }, 30_000)
        })

        window.dispatchEvent(
          new CustomEvent('plugin-tool-invoke', {
            detail: {
              pluginId: pt.pluginId,
              instanceId: instance.instanceId,
              callId,
              toolName: pt.tool.name,
              parameters: input,
            },
          }),
        )

        return await resultPromise
      },
    })
  }

  return tools
}

/**
 * Tool set description for system prompt injection.
 */
export function getPluginToolSetDescription(sessionId: string): string {
  const store = pluginRegistryStore.getState()
  const pluginTools = store.getToolSet(sessionId)
  if (pluginTools.length === 0) return ''

  const lines = ['Use these tools to interact with embedded apps:']
  const byPlugin = new Map<string, typeof pluginTools>()
  for (const pt of pluginTools) {
    const list = byPlugin.get(pt.pluginId) || []
    list.push(pt)
    byPlugin.set(pt.pluginId, list)
  }

  for (const [pluginId, tools] of byPlugin) {
    const manifest = store.getManifest(pluginId)
    if (!manifest) continue
    lines.push(`\n## ${manifest.name}`)
    lines.push(manifest.description)
    for (const t of tools) {
      lines.push(`- **${t.namespacedName}**: ${t.tool.description}`)
    }
  }

  return lines.join('\n')
}
