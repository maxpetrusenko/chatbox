import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hasTellMeSupabaseConfig: vi.fn(() => false),
  activatePluginForCurrentScope: vi.fn(),
  setState: vi.fn(),
}))

vi.mock('@/stores/droppedPluginsStore', () => ({
  droppedPluginsStore: {
    getState: () => ({
      removePackage: vi.fn(),
      clearStagedPackage: vi.fn(),
    }),
  },
}))

vi.mock('@/stores/k12-auth', () => ({
  authenticateDemoPassword: vi.fn(() => true),
}))

vi.mock('@/stores/k12Store', () => ({
  DEMO_CLASSES: [],
  DEMO_DISTRICT: null,
  DEMO_SCHOOLS: [],
  DEMO_USERS: [],
  k12Store: {
    getState: () => ({
      activatePluginForCurrentScope: mocks.activatePluginForCurrentScope,
      installRecords: [],
    }),
    setState: mocks.setState,
  },
}))

vi.mock('./supabase', () => ({
  getTellMeClient: vi.fn(() => {
    throw new Error('should not hit supabase client in local fallback test')
  }),
  hasTellMeSupabaseConfig: mocks.hasTellMeSupabaseConfig,
}))

import { getDroppedPackageHydrationTarget, submitPluginRequestToTellMe } from './k12'

describe('getDroppedPackageHydrationTarget', () => {
  it('installs approved and active packages into runtime', () => {
    expect(getDroppedPackageHydrationTarget('approved')).toBe('installed')
    expect(getDroppedPackageHydrationTarget('active')).toBe('installed')
  })

  it('stages packages that still need review or activation', () => {
    expect(getDroppedPackageHydrationTarget('pending')).toBe('staged')
    expect(getDroppedPackageHydrationTarget('validating')).toBe('staged')
    expect(getDroppedPackageHydrationTarget('ai-review')).toBe('staged')
    expect(getDroppedPackageHydrationTarget('quarantined')).toBe('staged')
  })

  it('skips rejected and revoked packages', () => {
    expect(getDroppedPackageHydrationTarget('rejected')).toBe('skip')
    expect(getDroppedPackageHydrationTarget('revoked')).toBe('skip')
  })
})

describe('submitPluginRequestToTellMe', () => {
  beforeEach(() => {
    mocks.hasTellMeSupabaseConfig.mockReturnValue(false)
    mocks.activatePluginForCurrentScope.mockReset()
    mocks.setState.mockReset()
  })

  it('falls back to local store activation when Supabase is absent', async () => {
    const result = await submitPluginRequestToTellMe({
      manifest: {
        id: 'weather',
        name: 'Weather Lab',
        version: '1.0.0',
        description: 'Weather',
        category: 'external-public',
        tools: [],
        widget: { entrypoint: 'ui.html' },
      },
      schoolId: 'school-1',
      chatboxStatus: 'active',
      enableForCurrentScope: true,
      currentUser: {
        id: 'teacher-1',
        email: 'teacher@westfield.edu',
        name: 'Teacher Demo',
        role: 'teacher',
        districtId: 'district-1',
        schoolId: 'school-1',
      },
    })

    expect(result.status).toBe('active')
    expect(mocks.setState).toHaveBeenCalledOnce()
    expect(mocks.activatePluginForCurrentScope).toHaveBeenCalledWith('weather')
  })
})
