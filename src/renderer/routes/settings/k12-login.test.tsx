/**
 * @vitest-environment jsdom
 */

import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { navigateSpy, mockAuthState, signInToTellMe, hasTellMeSupabaseConfig } = vi.hoisted(() => ({
  navigateSpy: vi.fn(),
  mockAuthState: {
    isAuthenticated: false,
    user: null,
    role: null,
    login: vi.fn(),
    logout: vi.fn(),
    hasPermission: vi.fn(() => false),
  },
  signInToTellMe: vi.fn(async () => ({ user: { role: 'teacher' } })),
  hasTellMeSupabaseConfig: vi.fn(() => false),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  useNavigate: () => navigateSpy,
}))

vi.mock('@/stores/k12Store', () => ({
  useK12Auth: () => mockAuthState,
  useK12: (selector: (state: { schools: never[] }) => unknown) => selector({ schools: [] }),
}))

vi.mock('@/stores/k12-auth', () => ({
  getK12HomePath: (role: string) => (role === 'teacher' ? '/settings/plugins' : '/'),
  normalizeK12Email: (login: string) => login,
}))

vi.mock('@/packages/tellme/k12', () => ({
  K12_LOGIN_PRESETS: [
    {
      alias: 'teacher',
      email: 'teacher@westfield.edu',
      name: 'Teacher Demo',
      role: 'teacher',
      schoolName: 'Lincoln Elementary',
    },
    {
      alias: 'student',
      email: 'student@westfield.edu',
      name: 'Student Demo',
      role: 'student',
      schoolName: 'Lincoln Elementary',
    },
  ],
  resolveK12LoginEmail: (login: string) => login,
  signInToTellMe,
  signOutFromTellMe: vi.fn(),
}))

vi.mock('@/packages/tellme/supabase', () => ({
  hasTellMeSupabaseConfig,
}))

import { RouteComponent } from './k12-login'

function renderWithMantine(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>)
}

describe('k12 login route', () => {
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
    signInToTellMe.mockReset()
    signInToTellMe.mockResolvedValue({ user: { role: 'teacher' } })
    hasTellMeSupabaseConfig.mockReset()
    hasTellMeSupabaseConfig.mockReturnValue(false)
    mockAuthState.isAuthenticated = false
    mockAuthState.user = null
    mockAuthState.role = null
  })

  it('allows demo teacher login without Supabase config', async () => {
    renderWithMantine(<RouteComponent />)

    const teacherButton = screen.getByRole('button', { name: 'Login as Teacher' })
    const signInButton = screen.getByRole('button', { name: 'Sign in' })

    expect(teacherButton.getAttribute('disabled')).toBeNull()
    expect(signInButton.getAttribute('disabled')).toBeNull()

    fireEvent.click(teacherButton)

    await waitFor(() => {
      expect(signInToTellMe).toHaveBeenCalledWith('teacher', 'password')
      expect(navigateSpy).toHaveBeenCalledWith({ to: '/settings/plugins' })
    })
  })
})
