/**
 * PluginFrame — renders a plugin inside a sandboxed iframe inline in the chat.
 *
 * Lifecycle:
 * 1. Iframe loads the plugin's entrypoint HTML
 * 2. Plugin posts PLUGIN_READY with the nonce
 * 3. Host replies with PLUGIN_INIT (config, instanceId)
 * 4. Plugin is now active — receives TOOL_INVOKE, sends STATE_UPDATE / COMPLETION
 * 5. On COMPLETION the frame stays visible but stops accepting new messages
 */

import { Alert, Loader, Paper, Text } from '@mantine/core'
import { IconAlertCircle, IconPuzzle } from '@tabler/icons-react'
import { type FC, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PluginCompletionPayload } from '@shared/plugin-types'
import { usePluginChannel } from '@/hooks/usePluginChannel'
import { usePluginRegistry } from '@/stores/pluginRegistry'

interface PluginFrameProps {
  pluginId: string
  instanceId: string
  nonce: string
  /** Resolved URL to the plugin's HTML entrypoint */
  entrypointUrl: string
  config?: Record<string, unknown>
  width?: number
  height?: number
  onToolResult?: (callId: string, result: unknown, error?: string) => void
  onAuthRequest?: () => void
}

const HANDSHAKE_TIMEOUT_MS = 10_000

const PluginFrame: FC<PluginFrameProps> = ({
  pluginId,
  instanceId,
  nonce,
  entrypointUrl,
  config = {},
  width,
  height = 400,
  onToolResult,
  onAuthRequest,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'active' | 'completed' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const manifest = usePluginRegistry((s) => s.getManifest(pluginId))
  const updateInstanceStatus = usePluginRegistry((s) => s.updateInstanceStatus)
  const updateInstanceState = usePluginRegistry((s) => s.updateInstanceState)
  const updateInstanceCompletion = usePluginRegistry((s) => s.updateInstanceCompletion)

  const handleReady = useCallback(() => {
    setStatus('active')
    updateInstanceStatus(instanceId, 'ready')
  }, [instanceId, updateInstanceStatus])

  const handleStateUpdate = useCallback(
    (state: Record<string, unknown>) => {
      updateInstanceState(instanceId, state)
    },
    [instanceId, updateInstanceState],
  )

  const handleCompletion = useCallback(
    (payload: PluginCompletionPayload) => {
      setStatus('completed')
      updateInstanceCompletion(instanceId, payload)
    },
    [instanceId, updateInstanceCompletion],
  )

  const handleError = useCallback(
    (code: string, message: string) => {
      setStatus('error')
      setErrorMessage(`[${code}] ${message}`)
      updateInstanceStatus(instanceId, 'error')
    },
    [instanceId, updateInstanceStatus],
  )

  const channel = usePluginChannel({
    instanceId,
    nonce,
    iframeRef,
    config,
    onReady: handleReady,
    onStateUpdate: handleStateUpdate,
    onCompletion: handleCompletion,
    onToolResult,
    onError: handleError,
    onAuthRequest,
  })

  // Handshake timeout
  useEffect(() => {
    if (status !== 'loading') return
    const timer = setTimeout(() => {
      if (status === 'loading') {
        setStatus('error')
        setErrorMessage('Plugin failed to respond within 10 seconds')
        updateInstanceStatus(instanceId, 'error')
      }
    }, HANDSHAKE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [status, instanceId, updateInstanceStatus])

  // Expose channel to parent for tool invocation
  const frameRef = useRef<{ invokePluginTool: typeof channel.invokePluginTool; sendAuthStatus: typeof channel.sendAuthStatus } | null>(null)
  frameRef.current = { invokePluginTool: channel.invokePluginTool, sendAuthStatus: channel.sendAuthStatus }

  // Store the channel ref on the iframe element for external access
  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe) {
      ;(iframe as any).__pluginChannel = frameRef.current
    }
  })

  const sandboxAttrs = 'allow-scripts allow-forms'

  if (errorMessage) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        color="red"
        title={`Plugin error: ${manifest?.name || pluginId}`}
        className="my-2"
      >
        {errorMessage}
      </Alert>
    )
  }

  return (
    <Paper shadow="xs" radius="md" className="my-2 overflow-hidden" withBorder>
      {status === 'loading' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">
            Loading {manifest?.name || pluginId}...
          </Text>
        </div>
      )}
      {status === 'completed' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20">
          <IconPuzzle size={14} />
          <Text size="xs" c="dimmed">
            {manifest?.name || pluginId} — completed
          </Text>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={entrypointUrl}
        sandbox={sandboxAttrs}
        style={{
          width: width || '100%',
          height,
          border: 'none',
          display: 'block',
        }}
        title={manifest?.name || pluginId}
      />
    </Paper>
  )
}

export default memo(PluginFrame)

/**
 * Get the plugin channel from an iframe element (set by PluginFrame).
 * Used by the tool routing layer to invoke tools on active plugins.
 */
export function getPluginChannelFromIframe(iframe: HTMLIFrameElement) {
  return (iframe as any).__pluginChannel as {
    invokePluginTool: (callId: string, toolName: string, parameters: Record<string, unknown>) => void
    sendAuthStatus: (status: 'connected' | 'expired' | 'revoked', authType: 'none' | 'oauth2-pkce' | 'device-flow') => void
  } | null
}
