/**
 * @vitest-environment jsdom
 */

import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { navigateToSettingsMock, authState } = vi.hoisted(() => ({
  navigateToSettingsMock: vi.fn(),
  authState: {
    status: 'signed_out' as 'signed_out' | 'checking' | 'signed_in',
  },
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({
    useSearch: () => ({}),
  }),
}))

vi.mock('@tanstack/zod-adapter', () => ({
  zodValidator: (value: unknown) => value,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

vi.mock('react-chessboard', () => ({
  Chessboard: () => <div data-testid="chessboard" />,
}))

vi.mock('@/components/common/ScalableIcon', () => ({
  ScalableIcon: () => null,
}))

vi.mock('@/components/layout/Page', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/hooks/useScreenChange', () => ({
  useIsSmallScreen: () => false,
}))

vi.mock('@/modals/Settings', () => ({
  navigateToSettings: navigateToSettingsMock,
}))

vi.mock('@/stores/chatboxAuthStore', () => ({
  useChatboxAuthStore: (selector: any) =>
    selector({
      status: authState.status,
      validate: vi.fn(async () => undefined),
    }),
}))

vi.mock('@/stores/k12Store', () => ({
  useK12: (selector: any) =>
    selector({
      isAuthenticated: authState.status === 'signed_in',
    }),
}))

import { ChessPage } from './index'

describe('ChessPage auth gate', () => {
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
    Object.defineProperty(window, 'ResizeObserver', {
      writable: true,
      value: ResizeObserverMock,
    })
    Object.defineProperty(globalThis, 'ResizeObserver', {
      writable: true,
      value: ResizeObserverMock,
    })
    navigateToSettingsMock.mockReset()
    authState.status = 'signed_out'
  })

  it('blocks the standalone chess page while signed out', () => {
    render(
      <MantineProvider>
        <ChessPage />
      </MantineProvider>
    )

    expect(screen.getByText('Sign in to use Chess')).toBeTruthy()
    expect(screen.queryByTestId('chessboard')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(navigateToSettingsMock).toHaveBeenCalledWith('/settings/k12-login')
  })

  it('renders the chess page when signed in', () => {
    authState.status = 'signed_in'

    render(
      <MantineProvider>
        <ChessPage />
      </MantineProvider>
    )

    expect(screen.getByTestId('chessboard')).toBeTruthy()
    expect(screen.queryByText('Sign in to use Chess')).toBeNull()
  })
})
