import type {
  PlatformProxyDashboard,
  PlatformProxyQuotaStatus,
  PlatformProxyUsageEntry,
  PluginProxyConfig,
} from '@shared/platform-proxy'
import { buildProxyDashboard, evaluateProxyQuota, getEffectiveProxyRateLimits } from '@shared/platform-proxy'
import { v4 as uuidv4 } from 'uuid'
import {
  appendPlatformProxyUsageEntry,
  deletePlatformProxyApiKey,
  getPlatformProxyApiKey,
  getPlatformProxyApiKeySource,
  getPlatformProxyUsageEntries,
  setPlatformProxyApiKey,
} from './platform-proxy-store'

interface RecordUsageInput {
  pluginId: string
  action: PlatformProxyUsageEntry['action']
  trackingPattern: PlatformProxyUsageEntry['trackingPattern']
  userId: string
  classId?: string
  schoolId?: string
  districtId: string
  timestamp?: number
  toolName?: string
  paramsSummary?: string
  durationMs?: number
  estimatedCostUsd?: number
  proxyConfig?: PluginProxyConfig
}

function createEntry(input: RecordUsageInput): PlatformProxyUsageEntry {
  return {
    id: uuidv4(),
    pluginId: input.pluginId,
    action: input.action,
    trackingPattern: input.trackingPattern,
    userId: input.userId,
    classId: input.classId,
    schoolId: input.schoolId,
    districtId: input.districtId,
    timestamp: input.timestamp || Date.now(),
    toolName: input.toolName,
    paramsSummary: input.paramsSummary,
    durationMs: input.durationMs,
    estimatedCostUsd: input.estimatedCostUsd,
  }
}

export async function recordPlatformProxyUsage(input: RecordUsageInput): Promise<PlatformProxyQuotaStatus> {
  const entries = await getPlatformProxyUsageEntries()
  const entry = createEntry(input)
  const quota = evaluateProxyQuota(entries, entry, getEffectiveProxyRateLimits(input.proxyConfig))
  if (!quota.allowed) {
    return quota
  }
  await appendPlatformProxyUsageEntry(entry)
  return { allowed: true }
}

export async function getPlatformProxyDashboard(
  configs: Record<string, PluginProxyConfig | undefined>
): Promise<PlatformProxyDashboard> {
  const entries = await getPlatformProxyUsageEntries()
  return buildProxyDashboard(entries, configs)
}

export function listPlatformProxyApiKeyMetadata(districtId: string, pluginIds: string[]) {
  return Promise.all(
    pluginIds.map(async (pluginId) => {
      const value = await getPlatformProxyApiKey(districtId, pluginId)
      const source = await getPlatformProxyApiKeySource(districtId, pluginId)
      return {
        pluginId,
        configured: !!value,
        maskedValue: value ? `${value.slice(0, 4)}••••${value.slice(-2)}` : null,
        source,
      }
    })
  )
}

export async function savePlatformProxyApiKey(districtId: string, pluginId: string, value: string) {
  await setPlatformProxyApiKey(districtId, pluginId, value)
}

export async function removePlatformProxyApiKey(districtId: string, pluginId: string) {
  await deletePlatformProxyApiKey(districtId, pluginId)
}

interface InvokeRestRequest {
  districtId: string
  pluginId: string
  userId: string
  classId?: string
  schoolId?: string
  endpoint: string
  method?: 'GET' | 'POST'
  keyLocation?: 'header' | 'query'
  keyName?: string
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: Record<string, unknown>
  toolName?: string
  proxyConfig?: PluginProxyConfig
  estimatedCostUsd?: number
}

export async function invokePlatformProxyRest(request: InvokeRestRequest) {
  const apiKey = await getPlatformProxyApiKey(request.districtId, request.pluginId)
  if (!apiKey) {
    throw new Error(`Missing district API key for ${request.pluginId}`)
  }

  const url = new URL(request.endpoint)
  if (url.protocol !== 'https:') {
    throw new Error('Platform proxy only allows HTTPS endpoints')
  }
  for (const [key, value] of Object.entries(request.query || {})) {
    url.searchParams.set(key, value)
  }
  if (request.keyLocation === 'query') {
    url.searchParams.set(request.keyName || 'key', apiKey)
  }

  const headers = new Headers(request.headers || {})
  if (request.keyLocation !== 'query') {
    headers.set(request.keyName || 'x-api-key', apiKey)
  }
  if (request.body) {
    headers.set('Content-Type', 'application/json')
  }

  const quota = await recordPlatformProxyUsage({
    pluginId: request.pluginId,
    action: 'rest-api-call',
    trackingPattern: 'rest-api',
    userId: request.userId,
    classId: request.classId,
    schoolId: request.schoolId,
    districtId: request.districtId,
    toolName: request.toolName,
    paramsSummary: JSON.stringify(request.query || request.body || {}).slice(0, 300),
    proxyConfig: request.proxyConfig,
    estimatedCostUsd: request.estimatedCostUsd,
  })
  if (!quota.allowed) {
    return quota
  }

  const response = await fetch(url, {
    method: request.method || 'GET',
    headers,
    body: request.body ? JSON.stringify(request.body) : undefined,
  })
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()
  return {
    ok: response.ok,
    status: response.status,
    data,
  }
}
