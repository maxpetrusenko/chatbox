/**
 * @vitest-environment jsdom
 */

import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { navigateSpy, mockK12State, mockRegistryState, mockPlatformProxyState } = vi.hoisted(() => ({
  navigateSpy: vi.fn(),
  mockK12State: {
    currentUser: null,
    isAuthenticated: false,
    hasPermission: vi.fn(() => false),
    getAvailablePlugins: vi.fn((manifests: unknown[]) => manifests),
    isPluginAllowed: vi.fn(() => true),
    isPluginActiveForCurrentScope: vi.fn(() => false),
    installRecords: [],
  },
  mockRegistryState: {
    manifests: [],
  },
  mockPlatformProxyState: {
    apiKeyMetadata: {},
    hydrateApiKeyMetadata: vi.fn(),
  },
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  useNavigate: () => navigateSpy,
}))

vi.mock('@/stores/k12Store', () => ({
  useK12: (selector: (state: typeof mockK12State) => unknown) => selector(mockK12State),
  k12Store: {
    getState: () => ({
      district: { settings: { autoApproveThreshold: 90 } },
    }),
  },
}))

vi.mock('@/stores/pluginRegistry', () => ({
  usePluginRegistry: (selector: (state: typeof mockRegistryState) => unknown) => selector(mockRegistryState),
}))

vi.mock('@/stores/platformProxyStore', () => ({
  usePlatformProxy: (selector: (state: { apiKeyMetadata: Record<string, unknown>; hydrateApiKeyMetadata: ReturnType<typeof vi.fn> }) => unknown) =>
    selector(mockPlatformProxyState),
}))

vi.mock('@/stores/pluginAuthStore', () => ({
  usePluginAuth: () => undefined,
  getPluginAuthSetupError: () => null,
  pluginAuthStore: {
    getState: () => ({
      hydrate: vi.fn(),
      beginAuth: vi.fn(),
      disconnect: vi.fn(),
    }),
  },
}))

vi.mock('@/stores/k12Safety', () => ({
  reviewPluginSafety: () => ({
    score: 95,
    findings: [],
  }),
  runApprovalPipeline: () => ({ status: 'approved' }),
}))

import { RouteComponent } from './plugins'
import { PluginDropForm } from './plugins-drop'

function renderWithMantine(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>)
}

describe('plugin settings routes', () => {
  beforeEach(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    navigateSpy.mockReset()
    mockK12State.currentUser = null
    mockK12State.isAuthenticated = false
    mockK12State.installRecords = []
    mockK12State.hasPermission.mockImplementation(() => false)
    mockRegistryState.manifests = []
    mockPlatformProxyState.apiKeyMetadata = {}
    mockPlatformProxyState.hydrateApiKeyMetadata.mockReset()
    mockK12State.isPluginAllowed.mockImplementation(() => true)
    mockK12State.isPluginActiveForCurrentScope.mockImplementation(() => false)
  })

  it('renders marketplace CTAs and navigates from the demo card', () => {
    renderWithMantine(<RouteComponent />)

    expect(screen.getByRole('heading', { name: 'Plugin Marketplace' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Open K12 Login' }))
    expect(navigateSpy).toHaveBeenCalledWith({ to: '/settings/k12-login' })

    fireEvent.click(screen.getByRole('button', { name: 'Open Plugin Drop' }))
    expect(navigateSpy).toHaveBeenCalledWith({ to: '/settings/plugins-drop' })
  })

  it('renders plugin drop fallback CTAs when logged out', () => {
    renderWithMantine(<PluginDropForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Open K12 Login' }))
    expect(navigateSpy).toHaveBeenCalledWith({ to: '/settings/k12-login' })

    fireEvent.click(screen.getByRole('button', { name: 'Open Plugin Marketplace' }))
    expect(navigateSpy).toHaveBeenCalledWith({ to: '/settings/plugins' })
  })

  it('disables api-key plugin enable button until district key exists', () => {
    mockK12State.currentUser = {
      id: 'teacher-1',
      name: 'Teacher Demo',
      email: 'teacher@westfield.edu',
      role: 'teacher',
      districtId: 'district-1',
      schoolId: 'school-1',
    }
    mockK12State.isAuthenticated = true
    mockK12State.hasPermission.mockImplementation((permission: string) => permission === 'plugin.install')
    mockRegistryState.manifests = [
      {
        id: 'google-maps',
        name: 'Map Explorer',
        version: '1.0.0',
        description: 'Needs district key',
        category: 'external-public',
        trustLevel: 'verified',
        targetGrades: ['6-8'],
        contentSafetyLevel: 'strict',
        coppaScope: 'none',
        dataProfile: {
          collectsPii: false,
          persistentIdentifiers: false,
          dataCategories: [],
          retentionDays: 0,
          thirdPartySharing: [],
          aiTrainingUse: false,
        },
        tools: [{ name: 'show_location', description: 'Show map', parameters: [] }],
        widget: { entrypoint: 'ui.html' },
        auth: { type: 'api-key' },
        proxy: { trackingPattern: 'iframe-display', requiresDistrictKey: true, setupLabel: 'Google Maps API key' },
      },
    ]

    renderWithMantine(<RouteComponent />)

    expect(screen.getByText('Admin config required')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enable' }).getAttribute('disabled')).not.toBeNull()
  })
})
