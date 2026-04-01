/**
 * Plugin ↔ Host postMessage protocol for ChatBridge.
 *
 * All messages are JSON-serializable and carry a `type` discriminator.
 * The `nonce` field ties every message to a specific plugin instance
 * so the host can ignore stale or spoofed frames.
 */

import type {
  PluginAuthType,
  PluginCompletionPayload,
  PluginManifest,
} from './plugin-types'

// ---------------------------------------------------------------------------
// Host → Plugin messages
// ---------------------------------------------------------------------------

export interface PluginInitMessage {
  type: 'PLUGIN_INIT'
  nonce: string
  instanceId: string
  config: Record<string, unknown>
}

export interface ToolInvokeMessage {
  type: 'TOOL_INVOKE'
  nonce: string
  callId: string
  toolName: string
  parameters: Record<string, unknown>
}

export interface AuthStatusMessage {
  type: 'AUTH_STATUS'
  nonce: string
  status: 'connected' | 'expired' | 'revoked'
  authType: PluginAuthType
}

export type HostToPluginMessage =
  | PluginInitMessage
  | ToolInvokeMessage
  | AuthStatusMessage

// ---------------------------------------------------------------------------
// Plugin → Host messages
// ---------------------------------------------------------------------------

export interface PluginReadyMessage {
  type: 'PLUGIN_READY'
  nonce: string
}

export interface StateUpdateMessage {
  type: 'STATE_UPDATE'
  nonce: string
  state: Record<string, unknown>
}

export interface CompletionMessage {
  type: 'COMPLETION'
  nonce: string
  payload: PluginCompletionPayload
}

export interface ToolResultMessage {
  type: 'TOOL_RESULT'
  nonce: string
  callId: string
  result: unknown
  error?: string
}

export interface PluginErrorMessage {
  type: 'ERROR'
  nonce: string
  code: string
  message: string
}

export interface AuthRequestMessage {
  type: 'AUTH_REQUEST'
  nonce: string
}

export type PluginToHostMessage =
  | PluginReadyMessage
  | StateUpdateMessage
  | CompletionMessage
  | ToolResultMessage
  | PluginErrorMessage
  | AuthRequestMessage

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

const HOST_MESSAGE_TYPES = new Set<string>([
  'PLUGIN_INIT',
  'TOOL_INVOKE',
  'AUTH_STATUS',
])

const PLUGIN_MESSAGE_TYPES = new Set<string>([
  'PLUGIN_READY',
  'STATE_UPDATE',
  'COMPLETION',
  'TOOL_RESULT',
  'ERROR',
  'AUTH_REQUEST',
])

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function hasStringField(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === 'string' && obj[key] !== ''
}

export function isHostToPluginMessage(v: unknown): v is HostToPluginMessage {
  if (!isObject(v)) return false
  if (!hasStringField(v, 'type')) return false
  if (!hasStringField(v, 'nonce')) return false
  return HOST_MESSAGE_TYPES.has(v.type as string)
}

export function isPluginToHostMessage(v: unknown): v is PluginToHostMessage {
  if (!isObject(v)) return false
  if (!hasStringField(v, 'type')) return false
  if (!hasStringField(v, 'nonce')) return false
  if (!PLUGIN_MESSAGE_TYPES.has(v.type as string)) return false

  // Extra validation for STATE_UPDATE: state must be an object
  if (v.type === 'STATE_UPDATE') {
    return isObject(v.state)
  }

  // Extra validation for COMPLETION: payload must be an object with required fields
  if (v.type === 'COMPLETION') {
    if (!isObject(v.payload)) return false
    const p = v.payload as Record<string, unknown>
    return hasStringField(p, 'pluginId') && hasStringField(p, 'instanceId') && hasStringField(p, 'summary')
  }

  return true
}

export function isPluginManifest(v: unknown): v is PluginManifest {
  if (!isObject(v)) return false
  if (!hasStringField(v, 'id')) return false
  if (!hasStringField(v, 'name')) return false
  if (!hasStringField(v, 'version')) return false
  if (!hasStringField(v, 'description')) return false

  const validCategories = ['internal', 'external-public', 'external-authenticated']
  if (!validCategories.includes(v.category as string)) return false

  if (!Array.isArray(v.tools)) return false
  for (const tool of v.tools) {
    if (!isObject(tool)) return false
    if (!hasStringField(tool, 'name')) return false
    if (!hasStringField(tool, 'description')) return false
    if (!Array.isArray(tool.parameters)) return false
  }

  if (!isObject(v.widget)) return false
  if (!hasStringField(v.widget, 'entrypoint')) return false

  return true
}
