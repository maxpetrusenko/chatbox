import { describe, expect, it } from 'vitest'
import {
  buildProxyDashboard,
  evaluateProxyQuota,
  getEffectiveProxyRateLimits,
  type PlatformProxyUsageEntry,
} from './platform-proxy'

const now = Date.now()

function entry(overrides: Partial<PlatformProxyUsageEntry> = {}): PlatformProxyUsageEntry {
  return {
    id: 'entry-1',
    pluginId: 'chess',
    action: 'tool-invoke',
    trackingPattern: 'js-api',
    userId: 'user-student',
    classId: 'class-1',
    schoolId: 'school-1',
    districtId: 'district-1',
    timestamp: now,
    ...overrides,
  }
}

describe('platform-proxy utils', () => {
  it('merges explicit limits over defaults', () => {
    expect(getEffectiveProxyRateLimits({ trackingPattern: 'rest-api', rateLimits: { perStudentDay: 12 } })).toEqual({
      perStudentHour: 25,
      perStudentDay: 12,
      perDistrictMonth: 3000,
    })
  })

  it('blocks when hourly quota is exceeded', () => {
    const entries = Array.from({ length: 2 }, (_, index) => entry({ id: `e-${index}`, timestamp: now - 1000 * index }))
    const quota = evaluateProxyQuota(entries, entry({ id: 'next' }), { perStudentHour: 2 })
    expect(quota.allowed).toBe(false)
    expect(quota.window).toBe('hour')
  })

  it('treats zero quotas as unlimited', () => {
    const entries = Array.from({ length: 3 }, (_, index) => entry({ id: `e-${index}`, timestamp: now - 1000 * index }))
    const quota = evaluateProxyQuota(entries, entry({ id: 'next' }), {
      perStudentHour: 0,
      perStudentDay: 0,
      perDistrictMonth: 0,
    })
    expect(quota.allowed).toBe(true)
  })

  it('builds dashboard totals and alerts', () => {
    const dashboard = buildProxyDashboard(
      [entry({ id: 'a', estimatedCostUsd: 0.01 }), entry({ id: 'b', estimatedCostUsd: 0.02, pluginId: 'weather' })],
      {
        chess: { trackingPattern: 'js-api', rateLimits: { perDistrictMonth: 1 } },
        weather: { trackingPattern: 'rest-api', rateLimits: { perDistrictMonth: 10 } },
      }
    )

    expect(dashboard.totalEvents).toBe(2)
    expect(dashboard.totalEstimatedCostUsd).toBeCloseTo(0.03)
    expect(dashboard.pluginTotals.find((item) => item.pluginId === 'chess')?.events).toBe(1)
    expect(dashboard.alerts.some((alert) => alert.pluginId === 'chess')).toBe(true)
  })
})
