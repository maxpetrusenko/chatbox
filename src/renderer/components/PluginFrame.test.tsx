/**
 * @vitest-environment jsdom
 */

import { render, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { act } from 'react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  invokePluginToolSpy,
  sendAuthStatusSpy,
  resolvePluginToolCallSpy,
  consumeQueuedPluginToolInvocationsSpy,
  channelOptionsRef,
  storeState,
} = vi.hoisted(() => ({
  invokePluginToolSpy: vi.fn(),
  sendAuthStatusSpy: vi.fn(),
  resolvePluginToolCallSpy: vi.fn(),
  consumeQueuedPluginToolInvocationsSpy: vi.fn(() => []),
  channelOptionsRef: { current: null as any },
  storeState: {
    getManifest: vi.fn(() => ({ name: 'Chess' })),
    getInstance: vi.fn(() => undefined),
    updateInstanceStatus: vi.fn(),
    updateInstanceState: vi.fn(),
    updateInstanceCompletion: vi.fn(),
  },
}))

vi.mock('@/hooks/usePluginChannel', () => ({
  usePluginChannel: (options: any) => {
    channelOptionsRef.current = options
    return {
      invokePluginTool: invokePluginToolSpy,
      sendAuthStatus: sendAuthStatusSpy,
      isCompleted: () => false,
    }
  },
}))

vi.mock('@/stores/pluginRegistry', () => ({
  usePluginRegistry: (selector: any) => selector(storeState),
}))

vi.mock('@/packages/model-calls/toolsets/plugin-tools', () => ({
  resolvePluginToolCall: resolvePluginToolCallSpy,
  consumeQueuedPluginToolInvocations: consumeQueuedPluginToolInvocationsSpy,
}))

import PluginFrame from './PluginFrame'

function renderWithMantine(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>)
}

describe('PluginFrame', () => {
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

    invokePluginToolSpy.mockReset()
    sendAuthStatusSpy.mockReset()
    resolvePluginToolCallSpy.mockReset()
    consumeQueuedPluginToolInvocationsSpy.mockReset()
    consumeQueuedPluginToolInvocationsSpy.mockReturnValue([])
    channelOptionsRef.current = null
    storeState.getManifest.mockClear()
    storeState.getInstance.mockReset()
    storeState.getInstance.mockReturnValue(undefined)
    storeState.updateInstanceStatus.mockClear()
    storeState.updateInstanceState.mockClear()
    storeState.updateInstanceCompletion.mockClear()
  })

  it('queues plugin-tool-invoke until the plugin is ready, then flushes it', async () => {
    renderWithMantine(
      <PluginFrame pluginId="chess" instanceId="inst-1" nonce="inst-1" entrypointUrl="/plugins/chess/ui.html" />
    )

    act(() => {
      window.dispatchEvent(
        new CustomEvent('plugin-tool-invoke', {
          detail: {
            pluginId: 'chess',
            instanceId: 'inst-1',
            callId: 'call-1',
            toolName: 'start_game',
            parameters: { difficulty: 'easy' },
          },
        })
      )
    })

    expect(invokePluginToolSpy).not.toHaveBeenCalled()

    await act(async () => {
      channelOptionsRef.current.onReady()
    })

    await waitFor(() => {
      expect(invokePluginToolSpy).toHaveBeenCalledWith('call-1', 'start_game', { difficulty: 'easy' })
    })
  })

  it('forwards auth payloads to the iframe channel after activation', async () => {
    renderWithMantine(
      <PluginFrame
        pluginId="spotify"
        instanceId="inst-2"
        nonce="inst-2"
        entrypointUrl="/plugins/spotify/ui.html"
        authPayload={{
          status: 'authorizing',
          authType: 'oauth2-pkce',
          metadata: { userCode: 'ABCD' },
        }}
      />
    )

    await act(async () => {
      channelOptionsRef.current.onReady()
    })

    await waitFor(() => {
      expect(sendAuthStatusSpy).toHaveBeenCalledWith('authorizing', 'oauth2-pkce', {
        accessToken: undefined,
        expiresAt: undefined,
        metadata: { userCode: 'ABCD' },
      })
    })
  })

  it('forwards AUTH_REQUEST via callback', () => {
    const onAuthRequest = vi.fn()

    renderWithMantine(
      <PluginFrame
        pluginId="spotify"
        instanceId="inst-3"
        nonce="inst-3"
        entrypointUrl="/plugins/spotify/ui.html"
        onAuthRequest={onAuthRequest}
      />
    )

    act(() => {
      channelOptionsRef.current.onAuthRequest()
    })

    expect(onAuthRequest).toHaveBeenCalledOnce()
  })

  it('shows error card with retry button on handshake timeout', async () => {
    vi.useFakeTimers()

    const { container } = renderWithMantine(
      <PluginFrame pluginId="chess" instanceId="inst-t" nonce="inst-t" entrypointUrl="/plugins/chess/ui.html" />
    )

    // Advance past the 10s handshake timeout
    await act(async () => {
      vi.advanceTimersByTime(11_000)
    })

    expect(container.textContent).toContain('Chess failed')
    expect(container.textContent).toContain('Plugin failed to respond within 10 seconds')
    expect(container.textContent).toContain('Retry')
    expect(storeState.updateInstanceStatus).toHaveBeenCalledWith('inst-t', 'error')

    vi.useRealTimers()
  })

  it('shows error card when plugin sends ERROR message', async () => {
    const { container } = renderWithMantine(
      <PluginFrame pluginId="chess" instanceId="inst-e" nonce="inst-e" entrypointUrl="/plugins/chess/ui.html" />
    )

    act(() => {
      channelOptionsRef.current.onError('CRASH', 'Unexpected plugin failure')
    })

    expect(container.textContent).toContain('Chess failed')
    expect(container.textContent).toContain('[CRASH] Unexpected plugin failure')
    expect(container.textContent).toContain('Retry')
    expect(storeState.updateInstanceStatus).toHaveBeenCalledWith('inst-e', 'error')
  })

  it('retry resets status to loading and re-mounts iframe', async () => {
    const { container } = renderWithMantine(
      <PluginFrame pluginId="chess" instanceId="inst-r" nonce="inst-r" entrypointUrl="/plugins/chess/ui.html" />
    )

    // Trigger error
    act(() => {
      channelOptionsRef.current.onError('TIMEOUT', 'Timed out')
    })

    expect(container.textContent).toContain('Chess failed')

    // Click retry
    const retryButton = container.querySelector('button')
    expect(retryButton).toBeTruthy()
    act(() => {
      retryButton!.click()
    })

    // Should be back to loading state with iframe visible
    expect(container.textContent).not.toContain('Chess failed')
    expect(container.querySelector('iframe')).toBeTruthy()
    expect(storeState.updateInstanceStatus).toHaveBeenCalledWith('inst-r', 'loading')
  })

  it('collapses completed plugins back into compact chat history', () => {
    const { container } = renderWithMantine(
      <PluginFrame pluginId="chess" instanceId="inst-c" nonce="inst-c" entrypointUrl="/plugins/chess/ui.html" />
    )

    expect(container.querySelector('iframe')).toBeTruthy()

    act(() => {
      channelOptionsRef.current.onCompletion({
        pluginId: 'chess',
        instanceId: 'inst-c',
        summary: 'Game exited early',
      })
    })

    expect(container.querySelector('iframe')).toBeNull()
    expect(container.textContent).toContain('Chess — completed')
  })

  it('stays collapsed on remount when the instance was already completed', () => {
    storeState.getInstance.mockReturnValue({
      instanceId: 'inst-done',
      pluginId: 'chess',
      sessionId: 'session-1',
      status: 'completed',
      lastState: null,
      lastCompletion: {
        pluginId: 'chess',
        instanceId: 'inst-done',
        summary: 'Closed from chat command',
      },
      authStatus: 'connected',
      createdAt: Date.now(),
    })

    const { container } = renderWithMantine(
      <PluginFrame pluginId="chess" instanceId="inst-done" nonce="inst-done" entrypointUrl="/plugins/chess/ui.html" />
    )

    expect(container.querySelector('iframe')).toBeNull()
    expect(container.textContent).toContain('Chess — completed')
  })

  it('resolves TOOL_RESULT through resolvePluginToolCall and forwards outer callback', () => {
    const onToolResult = vi.fn()

    renderWithMantine(
      <PluginFrame
        pluginId="chess"
        instanceId="inst-1"
        nonce="inst-1"
        entrypointUrl="/plugins/chess/ui.html"
        onToolResult={onToolResult}
      />
    )

    act(() => {
      channelOptionsRef.current.onToolResult('call-2', { fen: 'some-fen' }, undefined)
    })

    expect(resolvePluginToolCallSpy).toHaveBeenCalledWith('call-2', { fen: 'some-fen' }, undefined)
    expect(onToolResult).toHaveBeenCalledWith('call-2', { fen: 'some-fen' }, undefined)
  })
})
