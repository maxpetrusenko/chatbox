/**
 * @vitest-environment jsdom
 */

import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  currentUser: {
    id: 'admin-1',
    name: 'School Admin Demo',
    email: 'admin@westfield.edu',
    role: 'school-admin' as const,
    districtId: 'district-1',
    schoolId: 'school-1',
  },
  isAuthenticated: true,
  schools: [{ id: 'school-1', districtId: 'district-1', name: 'Westfield Elementary', pluginOverrides: [] }],
  classes: [],
  district: { id: 'district-1', name: 'Westfield', allowedPlugins: ['chess'], blockedPlugins: [], settings: { autoApproveThreshold: 90, requireDpa: true, defaultContentSafetyLevel: 'strict' as const } },
  installRecords: [
    {
      id: 'record-1',
      pluginId: 'chess',
      manifestSnapshot: { id: 'chess', name: 'Chess', version: '1.0.0', description: 'Play chess', category: 'internal' as const, tools: [], widget: { entrypoint: 'ui.html' } },
      schoolId: 'school-1',
      districtId: 'district-1',
      status: 'pending' as const,
      requestedBy: 'teacher-1',
      requestedAt: Date.now(),
      safetyScore: 96,
      safetyFindings: [],
    },
  ],
  auditLog: [],
  hasPermission: vi.fn((permission: string) => ['plugin.approve', 'plugin.use', 'plugin.manage-auth'].includes(permission)),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
}))

vi.mock('@/components/settings/k12/PlatformProxyAdminPanel', () => ({
  default: () => <div>proxy</div>,
}))

vi.mock('@/packages/tellme/k12', () => ({
  reviewPluginRequestInTellMe: vi.fn(async () => undefined),
}))

vi.mock('@/stores/droppedPluginsStore', () => ({
  droppedPluginsStore: {
    getState: () => ({
      getStagedPackage: () => null,
      installStagedPackage: vi.fn(),
    }),
  },
}))

vi.mock('@/stores/k12Store', () => ({
  useK12: (selector: any) =>
    selector({
      ...state,
      logAction: vi.fn(),
      updateClassPlugins: vi.fn(),
      setDistrict: vi.fn(),
    }),
  k12Store: {
    getState: () => ({
      updateClassPlugins: vi.fn(),
      logAction: vi.fn(),
      setDistrict: vi.fn(),
    }),
  },
}))

import { RouteComponent } from './k12-admin'

function renderWithMantine(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>)
}

describe('k12 admin route', () => {
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
  })

  it('renders approval queue without unstable selector loops', () => {
    renderWithMantine(<RouteComponent />)

    expect(screen.getByText('K12 Admin Panel')).toBeTruthy()
    expect(screen.getByText('Approval Queue')).toBeTruthy()
    expect(screen.getByText('Chess')).toBeTruthy()
  })
})
