export type ProxyTrackingPattern = 'js-api' | 'iframe-display' | 'rest-api'

export interface PluginProxyRateLimits {
  perStudentHour?: number
  perStudentDay?: number
  perDistrictMonth?: number
}

export interface PluginProxyConfig {
  trackingPattern: ProxyTrackingPattern
  requiresDistrictKey?: boolean
  setupLabel?: string
  usageUnit?: 'call' | 'session' | 'minute'
  embedKeyParam?: string
  rateLimits?: PluginProxyRateLimits
}

export interface PlatformProxyUsageEntry {
  id: string
  pluginId: string
  action: 'tool-invoke' | 'iframe-open' | 'iframe-close' | 'rest-api-call'
  trackingPattern: ProxyTrackingPattern
  userId: string
  classId?: string
  schoolId?: string
  districtId: string
  timestamp: number
  toolName?: string
  paramsSummary?: string
  durationMs?: number
  estimatedCostUsd?: number
}

export interface PlatformProxyQuotaStatus {
  allowed: boolean
  reason?: string
  window?: 'hour' | 'day' | 'month'
  used?: number
  limit?: number
}

function hasQuota(limit: number | undefined): limit is number {
  return typeof limit === 'number' && limit > 0
}

export interface PlatformProxyDashboard {
  totalEvents: number
  totalEstimatedCostUsd: number
  pluginTotals: Array<{ pluginId: string; events: number; estimatedCostUsd: number }>
  schoolTotals: Array<{ schoolId: string; events: number }>
  studentTotals: Array<{ userId: string; events: number }>
  alerts: Array<{ pluginId: string; message: string; severity: 'info' | 'warning' | 'critical' }>
  recentEntries: PlatformProxyUsageEntry[]
}

export const DEFAULT_PROXY_RATE_LIMITS: Record<ProxyTrackingPattern, Required<PluginProxyRateLimits>> = {
  'js-api': {
    perStudentHour: 100,
    perStudentDay: 400,
    perDistrictMonth: 10_000,
  },
  'iframe-display': {
    perStudentHour: 25,
    perStudentDay: 100,
    perDistrictMonth: 5_000,
  },
  'rest-api': {
    perStudentHour: 25,
    perStudentDay: 50,
    perDistrictMonth: 3_000,
  },
}

export function getEffectiveProxyRateLimits(config?: PluginProxyConfig): Required<PluginProxyRateLimits> {
  const defaults = DEFAULT_PROXY_RATE_LIMITS[config?.trackingPattern || 'js-api']
  return {
    perStudentHour: config?.rateLimits?.perStudentHour ?? defaults.perStudentHour,
    perStudentDay: config?.rateLimits?.perStudentDay ?? defaults.perStudentDay,
    perDistrictMonth: config?.rateLimits?.perDistrictMonth ?? defaults.perDistrictMonth,
  }
}

function countSince(
  entries: PlatformProxyUsageEntry[],
  predicate: (entry: PlatformProxyUsageEntry) => boolean,
  sinceMs: number
): number {
  return entries.filter((entry) => entry.timestamp >= sinceMs && predicate(entry)).length
}

export function evaluateProxyQuota(
  entries: PlatformProxyUsageEntry[],
  nextEntry: Omit<PlatformProxyUsageEntry, 'id'>,
  limits: PluginProxyRateLimits
): PlatformProxyQuotaStatus {
  const now = nextEntry.timestamp
  const perStudentHour = limits.perStudentHour
  if (hasQuota(perStudentHour)) {
    const used = countSince(
      entries,
      (entry) => entry.pluginId === nextEntry.pluginId && entry.userId === nextEntry.userId,
      now - 60 * 60 * 1000
    )
    if (used >= perStudentHour) {
      return {
        allowed: false,
        reason: `Per-student hourly limit reached for ${nextEntry.pluginId}`,
        window: 'hour',
        used,
        limit: perStudentHour,
      }
    }
  }

  const perStudentDay = limits.perStudentDay
  if (hasQuota(perStudentDay)) {
    const used = countSince(
      entries,
      (entry) => entry.pluginId === nextEntry.pluginId && entry.userId === nextEntry.userId,
      now - 24 * 60 * 60 * 1000
    )
    if (used >= perStudentDay) {
      return {
        allowed: false,
        reason: `Per-student daily limit reached for ${nextEntry.pluginId}`,
        window: 'day',
        used,
        limit: perStudentDay,
      }
    }
  }

  const perDistrictMonth = limits.perDistrictMonth
  if (hasQuota(perDistrictMonth)) {
    const used = countSince(
      entries,
      (entry) => entry.pluginId === nextEntry.pluginId && entry.districtId === nextEntry.districtId,
      now - 30 * 24 * 60 * 60 * 1000
    )
    if (used >= perDistrictMonth) {
      return {
        allowed: false,
        reason: `District monthly limit reached for ${nextEntry.pluginId}`,
        window: 'month',
        used,
        limit: perDistrictMonth,
      }
    }
  }

  return { allowed: true }
}

function summarizeCounts(
  entries: PlatformProxyUsageEntry[],
  keyOf: (entry: PlatformProxyUsageEntry) => string | undefined
) {
  const map = new Map<string, { events: number; estimatedCostUsd: number }>()
  for (const entry of entries) {
    const key = keyOf(entry)
    if (!key) continue
    const next = map.get(key) || { events: 0, estimatedCostUsd: 0 }
    next.events += 1
    next.estimatedCostUsd += entry.estimatedCostUsd || 0
    map.set(key, next)
  }
  return Array.from(map.entries()).map(([key, value]) => ({
    key,
    events: value.events,
    estimatedCostUsd: value.estimatedCostUsd,
  }))
}

export function buildProxyDashboard(
  entries: PlatformProxyUsageEntry[],
  configs: Record<string, PluginProxyConfig | undefined> = {}
): PlatformProxyDashboard {
  const pluginTotals = summarizeCounts(entries, (entry) => entry.pluginId).map((item) => ({
    pluginId: item.key,
    events: item.events,
    estimatedCostUsd: item.estimatedCostUsd,
  }))
  const schoolTotals = summarizeCounts(entries, (entry) => entry.schoolId).map((item) => ({
    schoolId: item.key,
    events: item.events,
  }))
  const studentTotals = summarizeCounts(entries, (entry) => entry.userId).map((item) => ({
    userId: item.key,
    events: item.events,
  }))

  const alerts = pluginTotals.flatMap((pluginTotal) => {
    const config = configs[pluginTotal.pluginId]
    const limits = getEffectiveProxyRateLimits(config)
    const districtLimit = limits.perDistrictMonth
    if (!hasQuota(districtLimit)) return []
    const usagePercent = pluginTotal.events / districtLimit
    if (usagePercent < 0.8) return []
    return [
      {
        pluginId: pluginTotal.pluginId,
        message: `${pluginTotal.pluginId} is at ${Math.round(usagePercent * 100)}% of district monthly quota`,
        severity: usagePercent >= 1 ? ('critical' as const) : ('warning' as const),
      },
    ]
  })

  return {
    totalEvents: entries.length,
    totalEstimatedCostUsd: entries.reduce((sum, entry) => sum + (entry.estimatedCostUsd || 0), 0),
    pluginTotals,
    schoolTotals,
    studentTotals,
    alerts,
    recentEntries: entries.slice(0, 200),
  }
}
