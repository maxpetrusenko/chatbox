/**
 * @vitest-environment jsdom
 */

import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { navigateToSettingsMock, pluginFrameMock, state } = vi.hoisted(() => ({
  navigateToSettingsMock: vi.fn(),
  pluginFrameMock: vi.fn(() => <div data-testid="plugin-frame">frame</div>),
  state: {
    manifest: {
      id: 'chess',
      name: 'Chess',
      widget: { entrypoint: 'ui.html', defaultHeight: 400 },
      appAuth: { type: 'chatbox-ai-login' as const },
    },
    instance: { instanceId: 'inst-1' },
    chatboxAuthStatus: 'signed_out' as 'signed_out' | 'checking' | 'signed_in',
  },
}))

vi.mock('@/plugins/resolve', () => ({
  resolvePluginEntrypoint: vi.fn(() => 'blob:chess'),
}))

vi.mock('@/modals/Settings', () => ({
  navigateToSettings: navigateToSettingsMock,
}))

vi.mock('@/stores/pluginRegistry', () => ({
  usePluginRegistry: (selector: any) =>
    selector({
      getManifest: () => state.manifest,
      getInstance: () => state.instance,
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
  useChatboxAuthStore: (selector: any) =>
    selector({
      status: state.chatboxAuthStatus,
      validate: vi.fn(async () => undefined),
    }),
}))

vi.mock('@/stores/k12Store', () => ({
  useK12: (selector: any) => selector({ isAuthenticated: false }),
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
    navigateToSettingsMock.mockReset()
    pluginFrameMock.mockClear()
    state.chatboxAuthStatus = 'signed_out'
  })

  it('shows sign-in gate for app-auth plugins while signed out', () => {
    renderWithMantine(<PluginFrameInline pluginId="chess" instanceId="inst-1" />)

    expect(screen.getByText('Sign in to use Chess')).toBeTruthy()
    expect(screen.queryByTestId('plugin-frame')).toBeNull()
  })

  it('opens Chatbox AI settings from the sign-in gate', () => {
    renderWithMantine(<PluginFrameInline pluginId="chess" instanceId="inst-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(navigateToSettingsMock).toHaveBeenCalledWith('/provider/chatbox-ai')
  })

  it('renders the plugin frame when signed in', () => {
    state.chatboxAuthStatus = 'signed_in'

    renderWithMantine(<PluginFrameInline pluginId="chess" instanceId="inst-1" />)

    expect(screen.getByTestId('plugin-frame')).toBeTruthy()
  })

  it('shows an archived card instead of remounting when instance is missing after refresh', () => {
    state.chatboxAuthStatus = 'signed_in'
    state.instance = undefined as any

    renderWithMantine(<PluginFrameInline pluginId="chess" instanceId="inst-missing" />)

    expect(screen.getByText('Chess session archived')).toBeTruthy()
    expect(screen.getByText(/Ask Chatbox to reopen Chess/i)).toBeTruthy()
    expect(screen.queryByTestId('plugin-frame')).toBeNull()

    state.instance = { instanceId: 'inst-1' }
  })
})
