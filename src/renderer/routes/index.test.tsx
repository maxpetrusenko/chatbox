/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import type { ReactNode } from 'react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { navigateSpy, createSessionSpy } = vi.hoisted(() => ({
  navigateSpy: vi.fn(),
  createSessionSpy: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  useNavigate: () => navigateSpy,
  useRouterState: () => ({ location: { search: {} } }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

vi.mock('@/components/InputBox/InputBox', () => ({
  default: ({ onSubmit }: { onSubmit: (payload: unknown) => Promise<void> | void }) => (
    <button
      type="button"
      onClick={() =>
        onSubmit({
          constructedMessage: {
            contentParts: [{ type: 'text', text: 'play chess with me' }],
          },
        })
      }
    >
      submit
    </button>
  ),
}))

vi.mock('@/components/common/ScalableIcon', () => ({
  ScalableIcon: () => null,
}))

vi.mock('@/components/icons/HomepageIcon', () => ({
  default: () => null,
}))

vi.mock('@/components/layout/Page', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/hooks/useCopilots', () => ({
  useMyCopilots: () => ({ copilots: [] }),
  useRemoteCopilots: () => ({ copilots: [] }),
}))

vi.mock('@/hooks/useProviders', () => ({
  useProviders: () => ({ providers: [] }),
}))

vi.mock('@/hooks/useScreenChange', () => ({
  useIsSmallScreen: () => false,
}))

vi.mock('@/router', () => ({
  router: { navigate: vi.fn() },
}))

vi.mock('@/stores/chatStore', () => ({
  createSession: createSessionSpy,
}))

vi.mock('@/stores/sessionActions', () => ({
  submitNewUserMessage: vi.fn(),
  switchCurrentSession: vi.fn(),
}))

vi.mock('@/stores/sessionHelpers', () => ({
  initEmptyChatSession: () => ({
    name: 'Untitled',
    type: 'chat',
    messages: [],
    settings: {},
  }),
}))

vi.mock('@/stores/uiStore', () => {
  const state = {
    newSessionState: {},
    setNewSessionState: vi.fn(),
    addSessionKnowledgeBase: vi.fn(),
    showCopilotsInNewSession: false,
    widthFull: false,
    sessionWebBrowsingMap: {},
    setSessionWebBrowsing: vi.fn(),
    clearSessionWebBrowsing: vi.fn(),
  }

  return {
    useUIStore: (selector: (store: typeof state) => unknown) => selector(state),
  }
})

import { Index } from './index'

describe('Index chess submit flow', () => {
  beforeAll(() => {
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
  })

  beforeEach(() => {
    navigateSpy.mockReset()
    createSessionSpy.mockReset()
  })

  it('navigates to chess instead of creating a chat session', async () => {
    render(
      <MantineProvider>
        <Index />
      </MantineProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'submit' }))

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith({
        to: '/chess',
        search: { prompt: 'play chess with me', autostart: true },
      })
    })

    expect(createSessionSpy).not.toHaveBeenCalled()
  })
})
