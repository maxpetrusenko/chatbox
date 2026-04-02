/**
 * usePluginChannel — manages postMessage communication with a plugin iframe.
 *
 * Handles the handshake (PLUGIN_READY → PLUGIN_INIT), nonce validation,
 * state updates, completion signaling, and cleanup on unmount.
 */

import { useCallback, useEffect, useRef } from 'react'
import type { HostToPluginMessage } from '@shared/plugin-protocol'
import { isPluginToHostMessage } from '@shared/plugin-protocol'
import type { PluginCompletionPayload } from '@shared/plugin-types'

export interface UsePluginChannelOptions {
  instanceId: string
  nonce: string
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  config?: Record<string, unknown>
  onReady?: () => void
  onStateUpdate?: (state: Record<string, unknown>) => void
  onCompletion?: (payload: PluginCompletionPayload) => void
  onToolResult?: (callId: string, result: unknown, error?: string) => void
  onError?: (code: string, message: string) => void
  onAuthRequest?: () => void
}

export function usePluginChannel(options: UsePluginChannelOptions) {
  const {
    instanceId,
    nonce,
    iframeRef,
    config = {},
    onReady,
    onStateUpdate,
    onCompletion,
    onToolResult,
    onError,
    onAuthRequest,
  } = options

  const completedRef = useRef(false)

  // Send a message to the plugin iframe
  const postToPlugin = useCallback(
    (message: HostToPluginMessage) => {
      const iframe = iframeRef.current
      if (!iframe?.contentWindow) return
      iframe.contentWindow.postMessage(message, '*')
    },
    [iframeRef],
  )

  // Send a tool invocation to the plugin
  const invokePluginTool = useCallback(
    (callId: string, toolName: string, parameters: Record<string, unknown>) => {
      postToPlugin({
        type: 'TOOL_INVOKE',
        nonce,
        callId,
        toolName,
        parameters,
      })
    },
    [postToPlugin, nonce],
  )

  // Send auth status update
  const sendAuthStatus = useCallback(
    (
      status: 'connected' | 'expired' | 'revoked' | 'authorizing' | 'error',
      authType: 'none' | 'oauth2-pkce' | 'device-flow',
      extra?: { accessToken?: string; expiresAt?: number; metadata?: Record<string, unknown> },
    ) => {
      postToPlugin({
        type: 'AUTH_STATUS',
        nonce,
        status,
        authType,
        accessToken: extra?.accessToken,
        expiresAt: extra?.expiresAt,
        metadata: extra?.metadata,
      })
    },
    [postToPlugin, nonce],
  )

  // Listen for messages from the plugin
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data

      if (
        data &&
        typeof data === 'object' &&
        (data as { type?: string }).type === 'PLUGIN_READY' &&
        event.source === iframeRef.current?.contentWindow
      ) {
        postToPlugin({
          type: 'PLUGIN_INIT',
          nonce,
          instanceId,
          config,
        })
        onReady?.()
        return
      }

      if (!isPluginToHostMessage(data)) return
      if (data.nonce !== nonce) return
      if (completedRef.current && data.type !== 'ERROR') return

      switch (data.type) {
        case 'PLUGIN_READY':
          postToPlugin({
            type: 'PLUGIN_INIT',
            nonce,
            instanceId,
            config,
          })
          onReady?.()
          break

        case 'STATE_UPDATE':
          onStateUpdate?.(data.state)
          break

        case 'COMPLETION':
          completedRef.current = true
          onCompletion?.(data.payload)
          break

        case 'TOOL_RESULT':
          onToolResult?.(data.callId, data.result, data.error)
          break

        case 'ERROR':
          onError?.(data.code, data.message)
          break

        case 'AUTH_REQUEST':
          onAuthRequest?.()
          break
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [nonce, instanceId, config, postToPlugin, onReady, onStateUpdate, onCompletion, onToolResult, onError, onAuthRequest])

  return {
    postToPlugin,
    invokePluginTool,
    sendAuthStatus,
    isCompleted: () => completedRef.current,
  }
}
