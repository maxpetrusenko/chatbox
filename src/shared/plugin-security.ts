export type PluginSecuritySeverity = 'info' | 'warning' | 'critical'

export interface PluginSecurityFinding {
  code: string
  severity: PluginSecuritySeverity
  message: string
  evidence?: string[]
}

export interface PluginSecurityCapabilities {
  usesInlineScripts: boolean
  usesNetworkApis: boolean
  usesDynamicCode: boolean
  usesStorage: boolean
  usesForms: boolean
  usesWorkers: boolean
  usesNavigation: boolean
  usesPostMessage: boolean
}

export interface PluginPackageAudit {
  passed: boolean
  findings: PluginSecurityFinding[]
  fileCount: number
  totalBytes: number
  entrypoint: string | null
  detectedDomains: string[]
  allowedDomains: string[]
  capabilities: PluginSecurityCapabilities
}

export interface PluginRuntimeValidation {
  passed: boolean
  ready: boolean
  findings: PluginSecurityFinding[]
  durationMs: number
}
