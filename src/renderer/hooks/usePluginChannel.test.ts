/**
 * @vitest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePluginChannel } from './usePluginChannel'

describe('usePluginChannel', () => {
  const nonce = 'test-nonce-123'
  const instanceId = 'test-instance-456'
  let mockIframe: { contentWindow: { postMessage: ReturnType<typeof vi.fn> } }
  let iframeRef: { current: any }

  beforeEach(() => {
    mockIframe = {
      contentWindow: { postMessage: vi.fn() },
    }
    iframeRef = { current: mockIframe }
  })

  function firePluginMessage(data: any, source?: WindowProxy | MessageEventSource | null) {
    const event = new MessageEvent('message', { data, source: source ?? (mockIframe.contentWindow as unknown as MessageEventSource) })
    window.dispatchEvent(event)
  }

  it('sends PLUGIN_INIT when plugin posts PLUGIN_READY', () => {
    const onReady = vi.fn()
    renderHook(() =>
      usePluginChannel({
        instanceId,
        nonce,
        iframeRef,
        config: { difficulty: 'hard' },
        onReady,
      }),
    )

    act(() => {
      firePluginMessage({ type: 'PLUGIN_READY', nonce })
    })

    expect(onReady).toHaveBeenCalledOnce()
    expect(mockIframe.contentWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PLUGIN_INIT',
        nonce,
        instanceId,
        config: { difficulty: 'hard' },
      }),
      '*',
    )
  })

  it('accepts initial PLUGIN_READY from the iframe before nonce is established', () => {
    const onReady = vi.fn()
    renderHook(() =>
      usePluginChannel({
        instanceId,
        nonce,
        iframeRef,
        onReady,
      }),
    )

    act(() => {
      firePluginMessage({ type: 'PLUGIN_READY', nonce: '' })
    })

    expect(onReady).toHaveBeenCalledOnce()
    expect(mockIframe.contentWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PLUGIN_INIT',
        nonce,
        instanceId,
      }),
      '*',
    )
  })

  it('ignores messages with wrong nonce', () => {
    const onReady = vi.fn()
    renderHook(() =>
      usePluginChannel({
        instanceId,
        nonce,
        iframeRef,
        onReady,
      }),
    )

    act(() => {
      firePluginMessage({ type: 'PLUGIN_READY', nonce: 'wrong-nonce' }, window)
    })

    expect(onReady).not.toHaveBeenCalled()
  })

  it('ignores non-plugin messages', () => {
    const onReady = vi.fn()
    renderHook(() =>
      usePluginChannel({
        instanceId,
        nonce,
        iframeRef,
        onReady,
      }),
    )

    act(() => {
      firePluginMessage({ type: 'SOME_OTHER_MESSAGE', nonce })
    })
    act(() => {
      firePluginMessage('not an object')
    })
    act(() => {
      firePluginMessage(null)
    })

    expect(onReady).not.toHaveBeenCalled()
  })

  it('forwards STATE_UPDATE to callback', () => {
    const onStateUpdate = vi.fn()
    renderHook(() =>
      usePluginChannel({
        instanceId,
        nonce,
        iframeRef,
        onStateUpdate,
      }),
    )

    act(() => {
      firePluginMessage({
        type: 'STATE_UPDATE',
        nonce,
        state: { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR' },
      })
    })

    expect(onStateUpdate).toHaveBeenCalledWith({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR',
    })
  })

  it('forwards COMPLETION and ignores subsequent messages', () => {
    const onCompletion = vi.fn()
    const onStateUpdate = vi.fn()
    renderHook(() =>
      usePluginChannel({
        instanceId,
        nonce,
        iframeRef,
        onCompletion,
        onStateUpdate,
      }),
    )

    act(() => {
      firePluginMessage({
        type: 'COMPLETION',
        nonce,
        payload: { pluginId: 'chess', instanceId, summary: 'Checkmate' },
      })
    })

    expect(onCompletion).toHaveBeenCalledOnce()

    act(() => {
      firePluginMessage({ type: 'STATE_UPDATE', nonce, state: { late: true } })
    })

    expect(onStateUpdate).not.toHaveBeenCalled()
  })

  it('still processes ERROR after completion', () => {
    const onCompletion = vi.fn()
    const onError = vi.fn()
    renderHook(() =>
      usePluginChannel({
        instanceId,
        nonce,
        iframeRef,
        onCompletion,
        onError,
      }),
    )

    act(() => {
      firePluginMessage({
        type: 'COMPLETION',
        nonce,
        payload: { pluginId: 'chess', instanceId, summary: 'done' },
      })
    })

    act(() => {
      firePluginMessage({ type: 'ERROR', nonce, code: 'LATE_ERROR', message: 'oops' })
    })

    expect(onError).toHaveBeenCalledWith('LATE_ERROR', 'oops')
  })

  it('invokePluginTool sends TOOL_INVOKE message', () => {
    const { result } = renderHook(() =>
      usePluginChannel({
        instanceId,
        nonce,
        iframeRef,
      }),
    )

    act(() => {
      result.current.invokePluginTool('call-1', 'start_game', { difficulty: 'easy' })
    })

    expect(mockIframe.contentWindow.postMessage).toHaveBeenCalledWith(
      {
        type: 'TOOL_INVOKE',
        nonce,
        callId: 'call-1',
        toolName: 'start_game',
        parameters: { difficulty: 'easy' },
      },
      '*',
    )
  })

  it('forwards TOOL_RESULT to callback', () => {
    const onToolResult = vi.fn()
    renderHook(() =>
      usePluginChannel({
        instanceId,
        nonce,
        iframeRef,
        onToolResult,
      }),
    )

    act(() => {
      firePluginMessage({
        type: 'TOOL_RESULT',
        nonce,
        callId: 'call-1',
        result: { fen: 'some-fen' },
      })
    })

    expect(onToolResult).toHaveBeenCalledWith('call-1', { fen: 'some-fen' }, undefined)
  })

  it('forwards AUTH_REQUEST to callback', () => {
    const onAuthRequest = vi.fn()
    renderHook(() =>
      usePluginChannel({
        instanceId,
        nonce,
        iframeRef,
        onAuthRequest,
      }),
    )

    act(() => {
      firePluginMessage({ type: 'AUTH_REQUEST', nonce })
    })

    expect(onAuthRequest).toHaveBeenCalledOnce()
  })

  it('cleans up listener on unmount', () => {
    const onReady = vi.fn()
    const { unmount } = renderHook(() =>
      usePluginChannel({
        instanceId,
        nonce,
        iframeRef,
        onReady,
      }),
    )

    unmount()

    act(() => {
      firePluginMessage({ type: 'PLUGIN_READY', nonce })
    })

    expect(onReady).not.toHaveBeenCalled()
  })
})
