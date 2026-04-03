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

import { Button, Loader, Paper, Stack, Text } from '@mantine/core'
import type { AuthStatusMessage } from '@shared/plugin-protocol'
import type { PluginCompletionPayload } from '@shared/plugin-types'
import { IconAlertCircle, IconPuzzle, IconRefresh } from '@tabler/icons-react'
import { type FC, memo, useCallback, useEffect, useRef, useState } from 'react'
import { usePluginChannel } from '@/hooks/usePluginChannel'
import { consumeQueuedPluginToolInvocations, resolvePluginToolCall } from '@/packages/model-calls/toolsets/plugin-tools'
import { useCurrentUser } from '@/stores/k12Store'
import { platformProxyStore } from '@/stores/platformProxyStore'
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
  authPayload?: Omit<AuthStatusMessage, 'type' | 'nonce'>
}

const HANDSHAKE_TIMEOUT_MS = 10_000

interface PluginToolInvokeDetail {
  pluginId: string
  instanceId?: string
  callId: string
  toolName: string
  parameters: Record<string, unknown>
}

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
  authPayload,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const pendingToolInvocationsRef = useRef<PluginToolInvokeDetail[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'active' | 'completed' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const activeStartRef = useRef<number | null>(null)

  const manifest = usePluginRegistry((s) => s.getManifest(pluginId))
  const instance = usePluginRegistry((s) => s.getInstance(instanceId))
  const updateInstanceStatus = usePluginRegistry((s) => s.updateInstanceStatus)
  const updateInstanceState = usePluginRegistry((s) => s.updateInstanceState)
  const updateInstanceCompletion = usePluginRegistry((s) => s.updateInstanceCompletion)
  const currentUser = useCurrentUser()

  useEffect(() => {
    if (!instance) return
    if (instance.status === 'completed' || instance.lastCompletion) {
      setStatus('completed')
      return
    }
    if (instance.status === 'error') {
      setStatus('error')
    }
  }, [instance])

  const handleReady = useCallback(() => {
    setStatus('active')
    updateInstanceStatus(instanceId, 'ready')
  }, [instanceId, updateInstanceStatus])

  const handleStateUpdate = useCallback(
    (state: Record<string, unknown>) => {
      updateInstanceState(instanceId, state)
    },
    [instanceId, updateInstanceState]
  )

  const handleCompletion = useCallback(
    (payload: PluginCompletionPayload) => {
      setStatus('completed')
      updateInstanceCompletion(instanceId, payload)
    },
    [instanceId, updateInstanceCompletion]
  )

  const handleToolResult = useCallback(
    (callId: string, result: unknown, error?: string) => {
      resolvePluginToolCall(callId, result, error)
      onToolResult?.(callId, result, error)
    },
    [onToolResult]
  )

  const handleError = useCallback(
    (code: string, message: string) => {
      setStatus('error')
      setErrorMessage(`[${code}] ${message}`)
      updateInstanceStatus(instanceId, 'error')
    },
    [instanceId, updateInstanceStatus]
  )

  const handleIframeLoadError = useCallback(() => {
    setStatus('error')
    setErrorMessage('Plugin iframe failed to load')
    updateInstanceStatus(instanceId, 'error')
  }, [instanceId, updateInstanceStatus])

  const handleRetry = useCallback(() => {
    setStatus('loading')
    setErrorMessage(null)
    setRetryCount((c) => c + 1)
    updateInstanceStatus(instanceId, 'loading')
  }, [instanceId, updateInstanceStatus])

  const channel = usePluginChannel({
    instanceId,
    nonce,
    iframeRef,
    config,
    onReady: handleReady,
    onStateUpdate: handleStateUpdate,
    onCompletion: handleCompletion,
    onToolResult: handleToolResult,
    onError: handleError,
    onAuthRequest,
  })

  useEffect(() => {
    if (status !== 'active') return

    const pendingInvocations = [
      ...consumeQueuedPluginToolInvocations(instanceId),
      ...pendingToolInvocationsRef.current.splice(0),
    ]
    for (const invocation of pendingInvocations) {
      channel.invokePluginTool(invocation.callId, invocation.toolName, invocation.parameters || {})
    }
  }, [channel, status])

  useEffect(() => {
    if (status !== 'active' || !authPayload) return
    channel.sendAuthStatus(authPayload.status, authPayload.authType, {
      accessToken: authPayload.accessToken,
      expiresAt: authPayload.expiresAt,
      metadata: authPayload.metadata,
    })
  }, [authPayload, channel, status])

  useEffect(() => {
    if (status !== 'active' || !manifest?.proxy || !currentUser) return
    activeStartRef.current = Date.now()
    void platformProxyStore.getState().recordUsage({
      pluginId,
      action: 'iframe-open',
      trackingPattern: manifest.proxy.trackingPattern,
      userId: currentUser.id,
      classId: currentUser.classId,
      schoolId: currentUser.schoolId,
      districtId: currentUser.districtId,
      proxyConfig: manifest.proxy,
    })

    return () => {
      const startedAt = activeStartRef.current
      if (!startedAt) return
      void platformProxyStore.getState().recordUsage({
        pluginId,
        action: 'iframe-close',
        trackingPattern: manifest.proxy.trackingPattern,
        userId: currentUser.id,
        classId: currentUser.classId,
        schoolId: currentUser.schoolId,
        districtId: currentUser.districtId,
        durationMs: Date.now() - startedAt,
        proxyConfig: manifest.proxy,
      })
    }
  }, [currentUser, manifest?.proxy, pluginId, status])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PluginToolInvokeDetail>).detail
      if (!detail) return
      if (detail.pluginId !== pluginId) return
      if (detail.instanceId && detail.instanceId !== instanceId) return
      if (status === 'completed' || status === 'error') {
        resolvePluginToolCall(detail.callId, null, `Plugin ${pluginId} is not available`)
        return
      }

      if (status === 'loading') {
        pendingToolInvocationsRef.current.push(detail)
        return
      }

      channel.invokePluginTool(detail.callId, detail.toolName, detail.parameters || {})
    }

    window.addEventListener('plugin-tool-invoke', handler as EventListener)
    return () => {
      window.removeEventListener('plugin-tool-invoke', handler as EventListener)
    }
  }, [channel, instanceId, pluginId, status])

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
  const frameRef = useRef<{
    invokePluginTool: typeof channel.invokePluginTool
    sendAuthStatus: typeof channel.sendAuthStatus
  } | null>(null)
  frameRef.current = { invokePluginTool: channel.invokePluginTool, sendAuthStatus: channel.sendAuthStatus }

  // Store the channel ref on the iframe element for external access
  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe) {
      ;(iframe as any).__pluginChannel = frameRef.current
    }
    return () => {
      if (iframe) {
        delete (iframe as any).__pluginChannel
      }
    }
  })

  const sandboxAttrs = 'allow-scripts allow-forms'

  if (errorMessage) {
    return (
      <Paper shadow="xs" radius="md" className="my-2 overflow-hidden" withBorder p="md">
        <Stack gap="xs">
          <div className="flex items-center gap-2">
            <IconAlertCircle size={18} color="var(--mantine-color-red-6)" />
            <Text size="sm" fw={600}>
              {manifest?.name || pluginId} failed
            </Text>
          </div>
          <Text size="xs" c="dimmed">
            {errorMessage}
          </Text>
          <Button
            variant="light"
            color="gray"
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={handleRetry}
            style={{ alignSelf: 'flex-start' }}
          >
            Retry
          </Button>
        </Stack>
      </Paper>
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
      {status !== 'completed' && (
        <iframe
          key={retryCount}
          ref={iframeRef}
          src={entrypointUrl}
          sandbox={sandboxAttrs}
          onError={handleIframeLoadError}
          style={{
            width: width || '100%',
            height,
            border: 'none',
            display: 'block',
          }}
          title={manifest?.name || pluginId}
        />
      )}
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
    sendAuthStatus: (
      status: 'connected' | 'expired' | 'revoked' | 'authorizing' | 'error',
      authType: 'none' | 'oauth2-pkce' | 'device-flow',
      extra?: { accessToken?: string; expiresAt?: number; metadata?: Record<string, unknown> }
    ) => void
  } | null
}
