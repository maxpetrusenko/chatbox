/**
 * Plugin system type definitions for ChatBridge.
 *
 * A plugin is a self-contained app that registers tools the model can invoke,
 * renders its own UI inside a sandboxed iframe, and communicates with the
 * platform via a narrow postMessage protocol.
 */

// ---------------------------------------------------------------------------
// Manifest — the static descriptor every plugin ships as plugin.json
// ---------------------------------------------------------------------------

export interface PluginToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required?: boolean
}

export interface PluginToolDefinition {
  name: string
  description: string
  parameters: PluginToolParameter[]
}

export type PluginAuthType = 'none' | 'oauth2-pkce' | 'device-flow'

export interface PluginAuthDefinition {
  type: PluginAuthType
  authorizationUrl?: string
  tokenUrl?: string
  scopes?: string[]
  clientId?: string
  deviceAuthorizationUrl?: string
}

export interface PluginWidgetDefinition {
  entrypoint: string // relative path to ui.html
  defaultWidth?: number
  defaultHeight?: number
}

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  category: 'internal' | 'external-public' | 'external-authenticated'
  tools: PluginToolDefinition[]
  widget: PluginWidgetDefinition
  auth?: PluginAuthDefinition
}

// ---------------------------------------------------------------------------
// Runtime state kept by the platform per active plugin instance
// ---------------------------------------------------------------------------

export type PluginInstanceStatus =
  | 'loading'
  | 'ready'
  | 'active'
  | 'completed'
  | 'error'

export interface PluginCompletionPayload {
  pluginId: string
  instanceId: string
  summary: string
  data?: Record<string, unknown>
}

export interface PluginInstance {
  instanceId: string
  pluginId: string
  sessionId: string
  status: PluginInstanceStatus
  lastState: Record<string, unknown> | null
  lastCompletion: PluginCompletionPayload | null
  authStatus: 'none' | 'required' | 'connected' | 'expired'
  createdAt: number
}
