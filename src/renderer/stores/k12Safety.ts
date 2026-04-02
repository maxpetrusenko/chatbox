/**
 * K12 Safety Pipeline
 *
 * Plugin manifest validation, content safety scoring, and approval automation.
 * Runs locally for demo purposes; production would call external APIs
 * (OpenAI Moderation, Azure Content Safety, etc.).
 */

import type { PluginManifest } from '@shared/plugin-types'

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export interface SafetyResult {
  score: number // 0-100
  passed: boolean
  findings: string[]
  details: {
    manifestValid: boolean
    scopesReasonable: boolean
    contentSafe: boolean
    noExfiltrationRisk: boolean
    ageAppropriate: boolean
  }
}

// ---------------------------------------------------------------------------
// Manifest validation (static checks)
// ---------------------------------------------------------------------------

function validateManifestSchema(manifest: PluginManifest): string[] {
  const findings: string[] = []

  if (!manifest.id || manifest.id.length < 2) findings.push('Plugin ID is missing or too short')
  if (!manifest.name || manifest.name.length < 2) findings.push('Plugin name is missing or too short')
  if (!manifest.version) findings.push('Version is missing')
  if (!manifest.description) findings.push('Description is missing')
  if (!manifest.tools || manifest.tools.length === 0) findings.push('No tools declared')
  if (!manifest.widget?.entrypoint) findings.push('Widget entrypoint is missing')

  // Check tool definitions
  for (const tool of manifest.tools ?? []) {
    if (!tool.name) findings.push(`Tool missing name`)
    if (!tool.description) findings.push(`Tool "${tool.name}" missing description`)
  }

  return findings
}

// ---------------------------------------------------------------------------
// Scope audit
// ---------------------------------------------------------------------------

const DANGEROUS_SCOPES = ['admin', 'write:all', 'delete', 'user:admin', 'repo:delete']

function auditScopes(manifest: PluginManifest): string[] {
  const findings: string[] = []
  const scopes = manifest.auth?.scopes ?? []

  for (const scope of scopes) {
    const lower = scope.toLowerCase()
    if (DANGEROUS_SCOPES.some((d) => lower.includes(d))) {
      findings.push(`Potentially dangerous scope: "${scope}"`)
    }
  }

  // Check declared domains
  if (manifest.allowedDomains) {
    for (const domain of manifest.allowedDomains) {
      if (domain === '*' || domain === '*.com') {
        findings.push(`Wildcard domain "${domain}" is too broad`)
      }
    }
  }

  // Auth apps without declared domains are suspicious
  if (manifest.category === 'external-authenticated' && (!manifest.allowedDomains || manifest.allowedDomains.length === 0)) {
    findings.push('Authenticated plugin has no declared allowedDomains')
  }

  return findings
}

// ---------------------------------------------------------------------------
// Content safety (keyword-based for demo; production uses API)
// ---------------------------------------------------------------------------

const UNSAFE_PATTERNS = [
  /\b(gambling|casino|betting|poker)\b/i,
  /\b(alcohol|beer|wine|liquor|vodka)\b/i,
  /\b(tobacco|smoking|vaping|cigarette)\b/i,
  /\b(weapon|gun|firearm|ammunition)\b/i,
  /\b(drug|narcotic|marijuana|cocaine)\b/i,
  /\b(explicit|pornograph|nsfw|adult\s+content)\b/i,
  /\b(cryptocurrency|crypto\s+mining|bitcoin\s+mining)\b/i,
]

function checkContentSafety(manifest: PluginManifest): string[] {
  const findings: string[] = []
  const text = [manifest.name, manifest.description, ...manifest.tools.map((t) => t.name + ' ' + t.description)].join(
    ' ',
  )

  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern)
      findings.push(`Content flag: "${match?.[0] ?? 'restricted'}" term detected in manifest text`)
    }
  }

  return findings
}

// ---------------------------------------------------------------------------
// Data profile audit
// ---------------------------------------------------------------------------

function auditDataProfile(manifest: PluginManifest): string[] {
  const findings: string[] = []
  const profile = manifest.dataProfile

  if (!profile) {
    findings.push('No data profile declared — cannot assess privacy compliance')
    return findings
  }

  if (profile.collectsPii) {
    findings.push('Plugin declares PII collection — requires parental consent for students under 13')
  }

  if (profile.persistentIdentifiers) {
    findings.push('Plugin uses persistent identifiers — triggers COPPA scope')
  }

  if (profile.aiTrainingUse) {
    findings.push('Plugin uses data for AI training — not permitted for student data under FERPA')
  }

  if (profile.thirdPartySharing.length > 0) {
    findings.push(`Plugin shares data with ${profile.thirdPartySharing.length} third parties — requires separate consent`)
  }

  if (profile.retentionDays > 365) {
    findings.push(`Data retention of ${profile.retentionDays} days exceeds recommended 365-day maximum`)
  }

  return findings
}

// ---------------------------------------------------------------------------
// Composite safety review
// ---------------------------------------------------------------------------

export function reviewPluginSafety(manifest: PluginManifest): SafetyResult {
  // Builtin plugins are pre-trusted — skip full review
  if (manifest.trustLevel === 'builtin') {
    return {
      score: 100,
      passed: true,
      findings: [],
      details: {
        manifestValid: true,
        scopesReasonable: true,
        contentSafe: true,
        noExfiltrationRisk: true,
        ageAppropriate: true,
      },
    }
  }

  const schemaFindings = validateManifestSchema(manifest)
  const scopeFindings = auditScopes(manifest)
  const contentFindings = checkContentSafety(manifest)
  const dataFindings = auditDataProfile(manifest)

  const allFindings = [...schemaFindings, ...scopeFindings, ...contentFindings, ...dataFindings]

  const manifestValid = schemaFindings.length === 0
  const scopesReasonable = scopeFindings.length === 0
  const contentSafe = contentFindings.length === 0
  const noExfiltrationRisk = !scopeFindings.some((f) => f.includes('Wildcard') || f.includes('no declared'))
  const ageAppropriate = contentFindings.length === 0

  // Score: start at 100, deduct per finding type
  let score = 100
  score -= schemaFindings.length * 15
  score -= scopeFindings.length * 10
  score -= contentFindings.length * 20
  score -= dataFindings.length * 5

  // Trust level adjustments — verified gets a boost, untrusted gets a penalty
  const trustLevel = manifest.trustLevel ?? 'untrusted'
  if (trustLevel === 'verified') score += 10
  else if (trustLevel === 'district') score += 15
  else if (trustLevel === 'community') score -= 5
  else if (trustLevel === 'untrusted') score -= 15

  score = Math.max(0, Math.min(100, score))

  // Untrusted plugins with no data profile are automatically flagged
  if (trustLevel === 'untrusted' && !manifest.dataProfile) {
    allFindings.push('Untrusted plugin with no data profile — requires manual review')
  }

  return {
    score,
    passed: score >= 60 && manifestValid && contentSafe,
    findings: allFindings,
    details: {
      manifestValid,
      scopesReasonable,
      contentSafe,
      noExfiltrationRisk,
      ageAppropriate,
    },
  }
}

// ---------------------------------------------------------------------------
// Run full approval pipeline on a manifest
// ---------------------------------------------------------------------------

export function runApprovalPipeline(manifest: PluginManifest, autoApproveThreshold = 90): {
  status: 'approved' | 'quarantined' | 'rejected'
  result: SafetyResult
} {
  const result = reviewPluginSafety(manifest)

  if (!result.passed) {
    return { status: 'rejected', result }
  }

  if (result.score >= autoApproveThreshold) {
    return { status: 'approved', result }
  }

  return { status: 'quarantined', result }
}
