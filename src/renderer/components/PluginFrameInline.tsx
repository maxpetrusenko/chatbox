/**
 * PluginFrameInline — thin wrapper that resolves manifest data and renders PluginFrame.
 *
 * Used inside chat Message rendering when a `plugin` content part is encountered.
 */

import { Alert, Text } from '@mantine/core'
import type { AuthStatusMessage } from '@shared/plugin-protocol'
import { IconAlertCircle } from '@tabler/icons-react'
import { type FC, memo, useCallback, useEffect, useMemo } from 'react'
import { resolvePluginEntrypoint } from '@/plugins/resolve'
import { getPluginAuthSetupError, usePluginAuth } from '@/stores/pluginAuthStore'
import { usePluginRegistry } from '@/stores/pluginRegistry'
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

  const entrypointUrl = useMemo(() => {
    if (!manifest) return null
    return resolvePluginEntrypoint(pluginId, manifest.widget.entrypoint)
  }, [pluginId, manifest])

  useEffect(() => {
    if (!manifest?.auth || manifest.auth.type === 'api-key') return
    void hydrateAuth(pluginId, manifest.auth)
  }, [pluginId, manifest?.auth, hydrateAuth])

  useEffect(() => {
    if (!manifest?.auth || !instance) return
    const mappedStatus =
      authSession?.status === 'connected' ? 'connected' : authSession?.status === 'expired' ? 'expired' : 'required'
    updateInstanceAuth(instance.instanceId, mappedStatus)
  }, [authSession?.status, instance, manifest?.auth, updateInstanceAuth])

  const handleAuthRequest = useCallback(() => {
    if (!manifest?.auth || manifest.auth.type === 'api-key') return
    void beginAuth(pluginId, manifest.auth)
  }, [beginAuth, pluginId, manifest?.auth])

  if (!manifest) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="orange" className="my-2">
        <Text size="sm">Unknown plugin: {pluginId}</Text>
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
      : undefined

  return (
    <PluginFrame
      pluginId={pluginId}
      instanceId={instanceId}
      nonce={instanceId}
      entrypointUrl={entrypointUrl}
      config={authConfig}
      authPayload={authPayload}
      height={manifest.widget.defaultHeight || 400}
      width={manifest.widget.defaultWidth}
      onAuthRequest={manifest.auth ? handleAuthRequest : undefined}
    />
  )
}

export default memo(PluginFrameInline)
