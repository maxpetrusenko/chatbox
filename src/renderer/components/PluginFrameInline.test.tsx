/**
 * @vitest-environment jsdom
 */

import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pluginFrameMock, setPluginEnabledMock, useLoginState, state } = vi.hoisted(() => ({
  pluginFrameMock: vi.fn(() => <div data-testid="plugin-frame">frame</div>),
  setPluginEnabledMock: vi.fn(async () => undefined),
  useLoginState: {
    handleLogin: vi.fn(),
    loginError: '',
    loginState: 'idle',
    loginUrl: 'https://chatboxai.app/login',
  },
  state: {
    manifest: {
      id: 'chess',
      name: 'Chess',
      widget: { entrypoint: 'ui.html', defaultHeight: 400 },
      appAuth: { type: 'chatbox-ai-login' as const },
    } as any,
    instance: { instanceId: 'inst-1' },
    chatboxAuthStatus: 'signed_out' as 'signed_out' | 'checking' | 'signed_in',
    k12Authenticated: false,
    currentUser: null as null | {
      id: string
      email: string
      name: string
      role: 'teacher' | 'student' | 'school-admin' | 'district-admin'
      districtId: string
      schoolId?: string
      classId?: string
    },
    pluginAllowed: true,
    pluginActive: true,
  },
}))

vi.mock('@/plugins/resolve', () => ({
  resolvePluginEntrypoint: vi.fn(() => 'blob:chess'),
}))

vi.mock('@/packages/tellme/k12', () => ({
  K12_LOGIN_PRESETS: [
    { alias: 'teacher', email: 'teacher@westfield.edu', name: 'Teacher', role: 'teacher', schoolName: 'Lincoln' },
    { alias: 'student', email: 'student@westfield.edu', name: 'Student', role: 'student', schoolName: 'Lincoln' },
  ],
  setPluginEnabledForCurrentScopeInTellMe: setPluginEnabledMock,
  signInToTellMe: vi.fn(async () => undefined),
}))

vi.mock('@/packages/tellme/supabase', () => ({
  hasTellMeSupabaseConfig: vi.fn(() => false),
}))

vi.mock('@/platform', () => ({
  default: {
    type: 'desktop',
    openLink: vi.fn(),
  },
}))

vi.mock('@/routes/settings/provider/chatbox-ai/-components/useAuthTokens', () => ({
  useAuthTokens: () => ({
    saveAuthTokens: vi.fn(async () => undefined),
  }),
}))

vi.mock('@/routes/settings/provider/chatbox-ai/-components/useLogin', () => ({
  useLogin: () => useLoginState,
}))

vi.mock('@/stores/settingsStore', () => ({
  useLanguage: () => 'en',
}))

vi.mock('@/stores/pluginRegistry', () => ({
  usePluginRegistry: (selector: any) =>
    selector({
      getManifest: () => state.manifest,
      getInstance: (id: string) => (state.instance?.instanceId === id ? state.instance : undefined),
      updateInstanceAuth: vi.fn(),
    }),
}))

vi.mock('@/stores/pluginAuthStore', () => ({
  getPluginAuthSetupError: vi.fn(() => null),
  usePluginAuth: (selector: any) =>
    selector({
      sessions: {},
      hydrate: vi.fn(async () => undefined),
      beginAuth: vi.fn(async () => undefined),
    }),
}))

vi.mock('@/stores/chatboxAuthStore', () => ({
  chatboxAuthStore: {
    getState: () => ({
      status: state.chatboxAuthStatus,
    }),
  },
  useChatboxAuthStore: (selector: any) =>
    selector({
      status: state.chatboxAuthStatus,
      validate: vi.fn(async () => undefined),
    }),
}))

vi.mock('@/stores/k12Store', () => ({
  k12Store: {
    getState: () => ({
      currentUser: state.currentUser,
      isAuthenticated: state.k12Authenticated,
      district: {
        id: 'district-1',
        name: 'District',
        allowedPlugins: ['chess'],
        blockedPlugins: [],
        settings: { autoApproveThreshold: 90, requireDpa: true, defaultContentSafetyLevel: 'strict' },
      },
      schools: [{ id: 'school-1', districtId: 'district-1', name: 'Lincoln', pluginOverrides: [] }],
      classes: [],
      installRecords: [],
      hasPermission: (permission: string) => permission === 'plugin.install' && state.currentUser?.role !== 'student',
      isPluginAllowed: () => state.pluginAllowed,
      isPluginActiveForCurrentScope: () => state.pluginActive,
    }),
  },
  useK12: (selector: any) =>
    selector({
      currentUser: state.currentUser,
      isAuthenticated: state.k12Authenticated,
      district: {
        id: 'district-1',
        name: 'District',
        allowedPlugins: ['chess'],
        blockedPlugins: [],
        settings: { autoApproveThreshold: 90, requireDpa: true, defaultContentSafetyLevel: 'strict' },
      },
      schools: [{ id: 'school-1', districtId: 'district-1', name: 'Lincoln', pluginOverrides: [] }],
      classes: [],
      installRecords: [],
      hasPermission: (permission: string) => permission === 'plugin.install' && state.currentUser?.role !== 'student',
      isPluginAllowed: () => state.pluginAllowed,
      isPluginActiveForCurrentScope: () => state.pluginActive,
    }),
}))

vi.mock('./PluginFrame', () => ({
  default: (props: any) => {
    pluginFrameMock(props)
    return <div data-testid="plugin-frame">frame</div>
  },
}))

import PluginFrameInline from './PluginFrameInline'

function renderWithMantine(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>)
}

describe('PluginFrameInline', () => {
  beforeEach(() => {
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

    pluginFrameMock.mockClear()
    setPluginEnabledMock.mockReset()
    useLoginState.handleLogin.mockReset()
    state.manifest = {
      id: 'chess',
      name: 'Chess',
      widget: { entrypoint: 'ui.html', defaultHeight: 400 },
      appAuth: { type: 'chatbox-ai-login' },
    } as any
    state.instance = { instanceId: 'inst-1' }
    state.chatboxAuthStatus = 'signed_out'
    state.k12Authenticated = false
    state.currentUser = null
    state.pluginAllowed = true
    state.pluginActive = true
  })

  it('shows inline sign-in for auth-gated launch and unlocks the app in place after auth', async () => {
    const view = renderWithMantine(<PluginFrameInline pluginId="chess" instanceId="inst-1" />)

    expect(screen.getByText('Sign in to use Chess')).toBeTruthy()
    expect(screen.queryByTestId('plugin-frame')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Finish Chatbox AI sign-in here, then the app will continue automatically.')).toBeTruthy()

    state.chatboxAuthStatus = 'signed_in'
    view.unmount()
    renderWithMantine(<PluginFrameInline pluginId="chess" instanceId="inst-1" />)

    await waitFor(() => {
      expect(screen.getByTestId('plugin-frame')).toBeTruthy()
    })
  })

  it('shows a blocked inline state for disabled apps and lets teachers toggle inline', async () => {
    state.manifest = {
      id: 'chess',
      name: 'Chess',
      widget: { entrypoint: 'ui.html', defaultHeight: 400 },
    } as any
    state.k12Authenticated = true
    state.currentUser = {
      id: 'user-teacher',
      email: 'teacher@westfield.edu',
      name: 'Teacher Demo',
      role: 'teacher',
      districtId: 'district-1',
      schoolId: 'school-1',
    }
    state.pluginActive = false

    const view = renderWithMantine(<PluginFrameInline pluginId="chess" instanceId="inst-1" />)

    expect(screen.getByText('Chess unavailable')).toBeTruthy()
    expect(screen.getByText('Chess is disabled for the current scope.')).toBeTruthy()
    expect(screen.queryByTestId('plugin-frame')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Enable app' }))
    await waitFor(() => {
      expect(setPluginEnabledMock).toHaveBeenCalledWith('chess', true)
    })

    state.pluginActive = true
    view.unmount()
    renderWithMantine(<PluginFrameInline pluginId="chess" instanceId="inst-1" />)

    await waitFor(() => {
      expect(screen.getByTestId('plugin-frame')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Disable app' }))
    await waitFor(() => {
      expect(setPluginEnabledMock).toHaveBeenLastCalledWith('chess', false)
    })
  })

  it('shows student read-only messaging for disabled apps', () => {
    state.manifest = {
      id: 'chess',
      name: 'Chess',
      widget: { entrypoint: 'ui.html', defaultHeight: 400 },
    } as any
    state.k12Authenticated = true
    state.currentUser = {
      id: 'user-student',
      email: 'student@westfield.edu',
      name: 'Student Demo',
      role: 'student',
      districtId: 'district-1',
      schoolId: 'school-1',
      classId: 'class-1',
    }
    state.pluginActive = false

    renderWithMantine(<PluginFrameInline pluginId="chess" instanceId="inst-1" />)

    expect(screen.getByText('Chess is disabled for the current scope.')).toBeTruthy()
    expect(screen.getByText('Your teacher or admin controls app access for this scope.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Enable app' })).toBeNull()
  })

  it('shows an archived card instead of remounting when instance is missing after refresh', () => {
    state.chatboxAuthStatus = 'signed_in'
    state.instance = undefined as any

    renderWithMantine(<PluginFrameInline pluginId="chess" instanceId="inst-missing" />)

    expect(screen.getByText('Chess session archived')).toBeTruthy()
    expect(screen.getByText(/Ask Chatbox to reopen Chess/i)).toBeTruthy()
    expect(screen.queryByTestId('plugin-frame')).toBeNull()
  })

  it('renders a standalone inline K12 auth widget for generic sign-in', () => {
    renderWithMantine(<PluginFrameInline pluginId="__k12_auth__" instanceId="k12-auth-1" />)

    expect(screen.getByText('Sign in to use your school account')).toBeTruthy()
    expect(screen.getByText('Sign in with your school account here, then the app will continue automatically.')).toBeTruthy()
    expect(screen.queryByTestId('plugin-frame')).toBeNull()
  })
})
