/**
 * @vitest-environment jsdom
 */

import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  navigateSpy,
  mockK12State,
  mockRegistryState,
  mockPlatformProxyState,
  mockK12StoreApi,
  hideBuiltinPlugin,
  unregisterPluginHtml,
  removeManifest,
  reviewPluginRequestInTellMe,
  setPluginEnabledForCurrentScopeInTellMe,
} = vi.hoisted(() => ({
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
    setApiKey: vi.fn(),
  },
  mockK12StoreApi: {
    district: { settings: { autoApproveThreshold: 90 } },
    activatePluginForCurrentScope: vi.fn(),
    deactivatePluginForCurrentScope: vi.fn(),
  },
  hideBuiltinPlugin: vi.fn(),
  unregisterPluginHtml: vi.fn(),
  removeManifest: vi.fn(),
  reviewPluginRequestInTellMe: vi.fn(async () => {}),
  setPluginEnabledForCurrentScopeInTellMe: vi.fn(async () => {}),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  createRootRoute: () => ({}),
  useNavigate: () => navigateSpy,
}))

vi.mock('@/modals/Settings', () => ({
  navigateToSettings: vi.fn(),
}))

vi.mock('@/stores/droppedPluginsStore', async () => {
  const { createStore } = await import('zustand/vanilla')

  const droppedPluginsStore = createStore<{
    packages: Record<string, { manifest: unknown; uiHtml: string; sourceName?: string; installedAt: number }>
    stagedPackages: Record<string, unknown>
    installPackage: (pkg: { manifest: { id: string }; uiHtml: string; sourceName?: string }) => void
    clearAll: () => void
    hydrateIntoRuntime: () => void
  }>((set) => ({
    packages: {},
    stagedPackages: {},
    installPackage: (pkg) =>
      set((state) => ({
        packages: {
          ...state.packages,
          [pkg.manifest.id]: {
            ...pkg,
            installedAt: Date.now(),
          },
        },
      })),
    clearAll: () => set({ packages: {}, stagedPackages: {} }),
    hydrateIntoRuntime: () => {},
  }))

  return { droppedPluginsStore }
})

vi.mock('@/stores/k12Store', () => ({
  useK12: (selector: (state: typeof mockK12State) => unknown) => selector(mockK12State),
  k12Store: {
    getState: () => mockK12StoreApi,
  },
}))

vi.mock('@/stores/hiddenBuiltinPluginsStore', () => ({
  hiddenBuiltinPluginsStore: {
    getState: () => ({
      hidePlugin: hideBuiltinPlugin,
      showPlugin: vi.fn(),
      isHidden: vi.fn(() => false),
    }),
  },
}))

vi.mock('@/plugins/resolve', () => ({
  unregisterPluginHtml,
}))

vi.mock('@/packages/tellme/k12', () => ({
  initTellMeK12AuthSync: vi.fn(),
  reviewPluginRequestInTellMe,
  setPluginEnabledForCurrentScopeInTellMe,
}))

vi.mock('@/stores/pluginRegistry', () => ({
  usePluginRegistry: (selector: (state: typeof mockRegistryState) => unknown) => selector(mockRegistryState),
  pluginRegistryStore: {
    getState: () => ({
      loadBuiltins: vi.fn(),
      registerManifest: vi.fn(),
      removeManifest,
    }),
  },
}))

vi.mock('@/stores/platformProxyStore', () => ({
  usePlatformProxy: (selector: (state: typeof mockPlatformProxyState) => unknown) => selector(mockPlatformProxyState),
  platformProxyStore: {
    getState: () => mockPlatformProxyState,
  },
}))

vi.mock('@/stores/pluginAuthStore', () => ({
  initPluginAuthBroker: vi.fn(),
  usePluginAuth: () => undefined,
  getPluginAuthSetupError: () => null,
  registerPluginAuth: vi.fn(),
  unregisterPluginAuth: vi.fn(),
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

vi.mock('@/packages/plugin-runtime-validation', () => ({
  validatePluginRuntime: vi.fn(async () => ({
    passed: true,
    ready: true,
    findings: [],
    durationMs: 5,
  })),
}))

import { droppedPluginsStore } from '@/stores/droppedPluginsStore'
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
    mockPlatformProxyState.setApiKey.mockReset()
    mockK12StoreApi.activatePluginForCurrentScope.mockReset()
    mockK12StoreApi.deactivatePluginForCurrentScope.mockReset()
    hideBuiltinPlugin.mockReset()
    unregisterPluginHtml.mockReset()
    removeManifest.mockReset()
    reviewPluginRequestInTellMe.mockReset()
    reviewPluginRequestInTellMe.mockResolvedValue(undefined)
    setPluginEnabledForCurrentScopeInTellMe.mockReset()
    setPluginEnabledForCurrentScopeInTellMe.mockResolvedValue(undefined)
    mockK12State.isPluginAllowed.mockImplementation(() => true)
    mockK12State.isPluginActiveForCurrentScope.mockImplementation(() => false)
    droppedPluginsStore.getState().clearAll()
    Object.defineProperty(window, 'electronAPI', {
      writable: true,
      value: {
        invoke: vi.fn(),
      },
    })
  })

  it('renders marketplace CTAs and navigates from the demo card', () => {
    renderWithMantine(<RouteComponent />)

    expect(screen.getByRole('heading', { name: 'Installed Plugins' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Open K12 Login' }))
    expect(navigateSpy).toHaveBeenCalledWith({ to: '/settings/k12-login' })

    fireEvent.click(screen.getByRole('button', { name: 'Open Plugin Drop' }))
    expect(navigateSpy).toHaveBeenCalledWith({ to: '/settings/plugins-drop' })
  })

  it('shows a disabled Chess toggle while logged out', () => {
    mockRegistryState.manifests = [
      {
        id: 'chess',
        name: 'Chess',
        version: '1.0.0',
        description: 'Play chess with an AI opponent inline in the chat.',
        category: 'internal',
        trustLevel: 'builtin',
        tools: [
          { name: 'start_game', description: 'Start a new game', parameters: [] },
          { name: 'apply_move', description: 'Apply a move', parameters: [] },
          { name: 'get_position', description: 'Get current position', parameters: [] },
          { name: 'finish_game', description: 'End the game', parameters: [] },
        ],
        widget: { entrypoint: 'ui.html' },
      },
    ]

    renderWithMantine(<RouteComponent />)

    expect(screen.getByText('AI intent gated')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enable' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }))

    expect(navigateSpy).toHaveBeenCalledWith({ to: '/settings/k12-login' })
    expect(screen.getByText('Sign in as teacher or admin to manage apps.')).toBeTruthy()
  })

  it('renders plugin drop fallback CTAs when logged out', () => {
    renderWithMantine(<PluginDropForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Open K12 Login' }))
    expect(navigateSpy).toHaveBeenCalledWith({ to: '/settings/k12-login' })

    fireEvent.click(screen.getByRole('button', { name: 'Open Installed Plugins' }))
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
    expect(screen.getByRole('switch', { name: 'Enable Map Explorer' }).getAttribute('disabled')).not.toBeNull()
  })

  it('renders Chess with an availability switch and toggles it', async () => {
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
        id: 'chess',
        name: 'Chess',
        version: '1.0.0',
        description: 'Play chess with an AI opponent inline in the chat.',
        category: 'internal',
        trustLevel: 'builtin',
        tools: [
          { name: 'start_game', description: 'Start a new game', parameters: [] },
          { name: 'apply_move', description: 'Apply a move', parameters: [] },
          { name: 'get_position', description: 'Get current position', parameters: [] },
          { name: 'finish_game', description: 'End the game', parameters: [] },
        ],
        widget: { entrypoint: 'ui.html' },
      },
    ]

    renderWithMantine(<RouteComponent />)

    expect(screen.getByText('Available')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enable' })).toBeTruthy()

    fireEvent.click(screen.getByRole('switch', { name: 'Enable Chess' }))

    await waitFor(() => {
      expect(setPluginEnabledForCurrentScopeInTellMe).toHaveBeenCalledWith('chess', true)
    })
  })

  it('uninstalls built-in Chess from Marketplace', async () => {
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
    mockK12State.isPluginActiveForCurrentScope.mockImplementation((pluginId: string) => pluginId === 'chess')
    mockRegistryState.manifests = [
      {
        id: 'chess',
        name: 'Chess',
        version: '1.0.0',
        description: 'Play chess with an AI opponent inline in the chat.',
        category: 'internal',
        trustLevel: 'builtin',
        tools: [
          { name: 'start_game', description: 'Start a new game', parameters: [] },
          { name: 'apply_move', description: 'Apply a move', parameters: [] },
          { name: 'get_position', description: 'Get current position', parameters: [] },
          { name: 'finish_game', description: 'End the game', parameters: [] },
        ],
        widget: { entrypoint: 'ui.html' },
      },
    ]

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderWithMantine(<RouteComponent />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(hideBuiltinPlugin).toHaveBeenCalledWith('chess')
      expect(unregisterPluginHtml).toHaveBeenCalledWith('chess')
      expect(removeManifest).toHaveBeenCalledWith('chess')
      expect(mockK12StoreApi.deactivatePluginForCurrentScope).toHaveBeenCalledWith('chess')
    })

    confirmSpy.mockRestore()
  })

  it('shows delete for dropped plugins and revokes them', async () => {
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
    mockK12State.installRecords = [
      {
        id: 'record-1',
        pluginId: 'focus-timer-lite',
        manifestSnapshot: null,
        schoolId: 'school-1',
        districtId: 'district-1',
        status: 'active',
        requestedBy: 'teacher-1',
        requestedAt: Date.now(),
      },
    ]
    mockRegistryState.manifests = [
      {
        id: 'focus-timer-lite',
        name: 'Focus Timer Lite',
        version: '1.0.0',
        description: 'Dropped timer plugin',
        category: 'external-public',
        trustLevel: 'community',
        tools: [{ name: 'start_timer', description: 'Start timer', parameters: [] }],
        widget: { entrypoint: 'ui.html' },
      },
    ]
    droppedPluginsStore.getState().installPackage({
      manifest: mockRegistryState.manifests[0] as never,
      uiHtml: '<html><body>timer</body></html>',
      sourceName: 'focus-timer-lite.cbplugin',
    })

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderWithMantine(<RouteComponent />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete Plugin' }))

    await waitFor(() => {
      expect(reviewPluginRequestInTellMe).toHaveBeenCalledWith({
        recordId: 'record-1',
        status: 'revoked',
        reviewedBy: 'teacher-1',
      })
    })

    confirmSpy.mockRestore()
  })
})
