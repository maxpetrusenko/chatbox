/**
 * PluginFrameInline — thin wrapper that resolves manifest data and renders PluginFrame.
 *
 * Used inside chat Message rendering when a `plugin` content part is encountered.
 */

import { Alert, Stack, Text } from '@mantine/core'
import type { AuthStatusMessage } from '@shared/plugin-protocol'
import { IconAlertCircle } from '@tabler/icons-react'
import { type FC, memo, useCallback, useEffect, useMemo } from 'react'
import { getPluginAppAuthBlockedMessage } from '@/plugins/plugin-access'
import { resolvePluginEntrypoint } from '@/plugins/resolve'
import { navigateToSettings } from '@/modals/Settings'
import { useChatboxAuthStore } from '@/stores/chatboxAuthStore'
import { getPluginAuthSetupError, usePluginAuth } from '@/stores/pluginAuthStore'
import { usePluginRegistry } from '@/stores/pluginRegistry'
import ChatboxAuthGate from './ChatboxAuthGate'
import PluginFrame from './PluginFrame'

interface Props {
  pluginId: string
  instanceId: string
}

const PluginFrameInline: FC<Props> = ({ pluginId, instanceId }) => {
  const manifest = usePluginRegistry((s) => s.getManifest(pluginId))
  const instance = usePluginRegistry((s) => s.getInstance(instanceId))
  const updateInstanceAuth = usePluginRegistry((s) => s.updateInstanceAuth)

  const authSession = usePluginAuth((s) => s.sessions[pluginId])
  const hydrateAuth = usePluginAuth((s) => s.hydrate)
  const beginAuth = usePluginAuth((s) => s.beginAuth)
  const chatboxAuthStatus = useChatboxAuthStore((state) => state.status)
  const isChatboxAiSignedIn = chatboxAuthStatus === 'signed_in'
  const appAuthStatus = manifest?.appAuth ? (isChatboxAiSignedIn ? 'connected' : 'required') : 'none'

  const entrypointUrl = useMemo(() => {
    if (!manifest) return null
    return resolvePluginEntrypoint(pluginId, manifest.widget.entrypoint)
  }, [pluginId, manifest])

  useEffect(() => {
    if (!manifest?.auth || manifest.auth.type === 'api-key') return
    void hydrateAuth(pluginId, manifest.auth)
  }, [pluginId, manifest?.auth, hydrateAuth])

  useEffect(() => {
    if (!instance) return
    let mappedStatus: 'none' | 'required' | 'connected' | 'expired' = 'none'

    if (manifest?.auth) {
      mappedStatus =
        authSession?.status === 'connected' ? 'connected' : authSession?.status === 'expired' ? 'expired' : 'required'
    } else if (manifest?.appAuth) {
      mappedStatus = appAuthStatus
    } else {
      return
    }

    updateInstanceAuth(instance.instanceId, mappedStatus)
  }, [appAuthStatus, authSession?.status, instance, manifest?.appAuth, manifest?.auth, updateInstanceAuth])

  const handleAuthRequest = useCallback(() => {
    if (manifest?.appAuth?.type === 'chatbox-ai-login') {
      navigateToSettings('/provider/chatbox-ai')
      return
    }

    if (manifest?.appAuth?.type === 'k12-login') {
      navigateToSettings('/settings/k12-login')
      return
    }

    if (!manifest?.auth || manifest.auth.type === 'api-key') return
    void beginAuth(pluginId, manifest.auth)
  }, [beginAuth, pluginId, manifest?.appAuth, manifest?.auth])

  if (!manifest) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="orange" className="my-2">
        <Text size="sm">Unknown plugin: {pluginId}</Text>
      </Alert>
    )
  }

  if (!instance) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="gray" className="my-2">
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            {manifest.name} session archived
          </Text>
          <Text size="sm" c="dimmed">
            This app session ended or was cleared after refresh. Ask Chatbox to reopen {manifest.name} if you want to use it again.
          </Text>
        </Stack>
      </Alert>
    )
  }

  if (!entrypointUrl) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" className="my-2">
        <Text size="sm">Could not resolve entrypoint for {manifest.name}</Text>
      </Alert>
    )
  }

  const setupError = manifest.auth ? getPluginAuthSetupError(pluginId, manifest.auth) : null

  const authConfig = manifest.auth
    ? {
        auth: {
          status: authSession?.status || (setupError ? 'error' : 'required'),
          accessToken: authSession?.accessToken,
          expiresAt: authSession?.expiresAt,
          verificationUri: authSession?.verificationUri,
          userCode: authSession?.userCode,
          error: authSession?.error || setupError,
        },
      }
    : manifest.appAuth
      ? {
          auth: {
            status: appAuthStatus,
            provider: manifest.appAuth.type,
            message: getPluginAppAuthBlockedMessage(manifest),
          },
        }
      : undefined

  const authPayload: AuthStatusMessage | undefined =
    manifest.auth &&
    authSession &&
    (authSession.status === 'connected' ||
      authSession.status === 'expired' ||
      authSession.status === 'authorizing' ||
      authSession.status === 'error')
      ? {
          type: 'AUTH_STATUS',
          nonce: instanceId,
          status:
            authSession.status === 'connected'
              ? 'connected'
              : authSession.status === 'expired'
                ? 'expired'
                : authSession.status === 'error'
                  ? 'error'
                  : 'authorizing',
          authType: manifest.auth.type,
          accessToken: authSession.accessToken,
          expiresAt: authSession.expiresAt,
          metadata: {
            verificationUri: authSession.verificationUri,
            userCode: authSession.userCode,
            error: authSession.error || setupError || undefined,
          },
        }
      : manifest.appAuth
        ? {
            type: 'AUTH_STATUS',
            nonce: instanceId,
            status: appAuthStatus,
            authType: manifest.appAuth.type,
            metadata: {
              message: getPluginAppAuthBlockedMessage(manifest) || undefined,
            },
          }
      : undefined

  const frame = (
    <PluginFrame
      pluginId={pluginId}
      instanceId={instanceId}
      nonce={instanceId}
      entrypointUrl={entrypointUrl}
      config={authConfig}
      authPayload={authPayload}
      height={manifest.widget.defaultHeight || 400}
      width={manifest.widget.defaultWidth}
      onAuthRequest={manifest.auth || manifest.appAuth ? handleAuthRequest : undefined}
    />
  )

  if (manifest.appAuth) {
    return (
      <ChatboxAuthGate authType={manifest.appAuth.type} appName={manifest.name} message={getPluginAppAuthBlockedMessage(manifest) || undefined}>
        {frame}
      </ChatboxAuthGate>
    )
  }

  return frame
}

export default memo(PluginFrameInline)
