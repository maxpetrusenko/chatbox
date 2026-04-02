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

import type { PluginProxyConfig } from './platform-proxy'

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

export type PluginAuthType = 'none' | 'oauth2-pkce' | 'device-flow' | 'api-key'

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

// ---------------------------------------------------------------------------
// K12 Safety & Compliance — data profile every plugin should declare
// ---------------------------------------------------------------------------

export interface PluginDataProfile {
  collectsPii: boolean
  persistentIdentifiers: boolean
  dataCategories: string[]
  retentionDays: number
  thirdPartySharing: string[]
  aiTrainingUse: boolean
}

export type CoppaScope = 'none' | 'limited' | 'full'
export type ContentSafetyLevel = 'strict' | 'standard' | 'relaxed'
export type PluginSignatureType = 'community' | 'verified' | 'district'
/** How much the platform trusts this plugin — drives review depth */
export type PluginTrustLevel = 'untrusted' | 'community' | 'verified' | 'district' | 'builtin'

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  category: 'internal' | 'external-public' | 'external-authenticated'
  tools: PluginToolDefinition[]
  widget: PluginWidgetDefinition
  auth?: PluginAuthDefinition
  proxy?: PluginProxyConfig
  // K12 fields (optional for backwards compat with existing plugins)
  trustLevel?: PluginTrustLevel
  dataProfile?: PluginDataProfile
  coppaScope?: CoppaScope
  dpaRequired?: boolean
  targetGrades?: string[]
  contentSafetyLevel?: ContentSafetyLevel
  allowedDomains?: string[]
  signatureType?: PluginSignatureType
}

// ---------------------------------------------------------------------------
// K12 Platform — roles, tenants, plugin governance
// ---------------------------------------------------------------------------

export type K12Role = 'district-admin' | 'school-admin' | 'teacher' | 'student'

export interface K12User {
  id: string
  email: string
  name: string
  role: K12Role
  districtId: string
  schoolId?: string
  classId?: string
  avatarUrl?: string
}

export interface K12District {
  id: string
  name: string
  allowedPlugins: string[]
  blockedPlugins: string[]
  settings: {
    autoApproveThreshold: number // 0-100, AI safety score above which auto-approve
    requireDpa: boolean
    defaultContentSafetyLevel: ContentSafetyLevel
  }
}

export interface K12School {
  id: string
  districtId: string
  name: string
  pluginOverrides: Array<{ pluginId: string; action: 'allow' | 'block' }>
}

export interface K12Class {
  id: string
  schoolId: string
  teacherId: string
  name: string
  gradeLevel: string
  activePlugins: string[]
}

export type PluginApprovalStatus =
  | 'pending'
  | 'validating'
  | 'ai-review'
  | 'quarantined'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'revoked'

export interface PluginInstallRecord {
  id: string
  pluginId: string
  manifestSnapshot: PluginManifest
  schoolId: string
  districtId: string
  status: PluginApprovalStatus
  requestedBy: string
  requestedAt: number
  reviewedBy?: string
  reviewedAt?: number
  safetyScore?: number
  safetyFindings?: string[]
  rejectionReason?: string
}

export type AuditAction =
  | 'plugin.requested'
  | 'plugin.validated'
  | 'plugin.ai-reviewed'
  | 'plugin.approved'
  | 'plugin.rejected'
  | 'plugin.revoked'
  | 'plugin.installed'
  | 'plugin.used'
  | 'safety.flagged'
  | 'safety.blocked'
  | 'auth.login'
  | 'auth.logout'
  | 'admin.policy-changed'

export interface AuditLogEntry {
  id: string
  timestamp: number
  action: AuditAction
  actorId: string
  actorRole: K12Role
  pluginId?: string
  schoolId?: string
  districtId: string
  details: Record<string, unknown>
  severity: 'info' | 'warning' | 'critical'
}

// ---------------------------------------------------------------------------
// Runtime state kept by the platform per active plugin instance
// ---------------------------------------------------------------------------

export type PluginInstanceStatus = 'loading' | 'ready' | 'active' | 'completed' | 'error'

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
