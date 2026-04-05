/**
 * PluginFrameInline — thin wrapper that resolves manifest data and renders PluginFrame.
 *
 * Used inside chat Message rendering when a `plugin` content part is encountered.
 */

import { Alert, Badge, Button, Group, Stack, Text } from '@mantine/core'
import type { AuthStatusMessage } from '@shared/plugin-protocol'
import { IconAlertCircle, IconLock } from '@tabler/icons-react'
import { type FC, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { setPluginEnabledForCurrentScopeInTellMe } from '@/packages/tellme/k12'
import { getPluginAccessState } from '@/plugins/plugin-access'
import { resolvePluginEntrypoint } from '@/plugins/resolve'
import { useK12 } from '@/stores/k12Store'
import { getPluginAuthSetupError, usePluginAuth } from '@/stores/pluginAuthStore'
import { usePluginRegistry } from '@/stores/pluginRegistry'
import ChatboxAuthGate from './ChatboxAuthGate'
import PluginFrame from './PluginFrame'

interface Props {
  pluginId: string
  instanceId: string
}

const K12_AUTH_WIDGET_PLUGIN_ID = '__k12_auth__'

const GenericK12AuthInline: FC = () => {
  const isAuthenticated = useK12((state) => state.isAuthenticated)

  return (
    <ChatboxAuthGate
      authType="k12-login"
      appName="your school account"
      message="Sign in with your school account here."
      defaultExpanded
    >
      <Alert color="teal" className="my-2">
        <Text size="sm">{isAuthenticated ? 'School account signed in.' : 'School account ready.'}</Text>
      </Alert>
    </ChatboxAuthGate>
  )
}

const PluginFrameInline: FC<Props> = ({ pluginId, instanceId }) => {
  if (pluginId === K12_AUTH_WIDGET_PLUGIN_ID) {
    return <GenericK12AuthInline />
  }

  const manifest = usePluginRegistry((s) => s.getManifest(pluginId))
  const instance = usePluginRegistry((s) => s.getInstance(instanceId))
  const updateInstanceAuth = usePluginRegistry((s) => s.updateInstanceAuth)

  const authSession = usePluginAuth((s) => s.sessions[pluginId])
  const hydrateAuth = usePluginAuth((s) => s.hydrate)
  const beginAuth = usePluginAuth((s) => s.beginAuth)
  useK12((state) => ({
    currentUser: state.currentUser,
    isAuthenticated: state.isAuthenticated,
    classes: state.classes,
    schools: state.schools,
    district: state.district,
    installRecords: state.installRecords,
  }))
  const [isUpdatingScope, setIsUpdatingScope] = useState(false)

  const entrypointUrl = useMemo(() => {
    if (!manifest) return null
    return resolvePluginEntrypoint(pluginId, manifest.widget.entrypoint)
  }, [pluginId, manifest])

  const access = manifest ? getPluginAccessState(manifest) : null
  const appAuthStatus = access?.appAuthStatus ?? 'none'

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
    if (!manifest?.auth || manifest.auth.type === 'api-key') return
    void beginAuth(pluginId, manifest.auth)
  }, [beginAuth, pluginId, manifest?.auth])

  const handleSetPluginEnabled = useCallback(
    async (enabled: boolean) => {
      if (!manifest) return
      try {
        setIsUpdatingScope(true)
        await setPluginEnabledForCurrentScopeInTellMe(manifest.id, enabled)
      } finally {
        setIsUpdatingScope(false)
      }
    },
    [manifest]
  )

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
            This app session ended or was cleared after refresh. Ask Chatbox to reopen {manifest.name} if you want to
            use it again.
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
            message: access?.appAuthMessage,
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
              message: access?.appAuthMessage || undefined,
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

  const managedScope = access?.scope.managed && access.scope.isAllowed
  const canManageScope = managedScope && access?.scope.canManage

  if (access?.scope.blockedReason) {
    return (
      <Alert
        icon={<IconLock size={16} />}
        color={access.scope.blockedReason === 'disabled' ? 'yellow' : 'red'}
        className="my-2"
      >
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Text size="sm" fw={700}>
                {manifest.name} unavailable
              </Text>
              <Text size="sm" c="dimmed">
                {access.scope.blockedMessage}
              </Text>
            </Stack>
            <Badge size="xs" variant="light" color={access.scope.blockedReason === 'disabled' ? 'yellow' : 'red'}>
              {access.scope.blockedReason === 'disabled' ? 'Disabled' : 'Blocked'}
            </Badge>
          </Group>
          {access.scope.blockedReason === 'disabled' && access.scope.canManage && (
            <Button size="xs" onClick={() => void handleSetPluginEnabled(true)} loading={isUpdatingScope}>
              Enable app
            </Button>
          )}
          {access.scope.blockedReason === 'disabled' && access.scope.isStudent && (
            <Text size="xs" c="dimmed">
              Your teacher or admin controls app access for this scope.
            </Text>
          )}
        </Stack>
      </Alert>
    )
  }

  const frameContent = canManageScope ? (
    <Stack gap="xs" className="my-2">
      <Group justify="space-between" align="center">
        <Text size="xs" c="dimmed">
          Enabled for the current scope
        </Text>
        <Button
          size="compact-xs"
          variant="subtle"
          color="red"
          onClick={() => void handleSetPluginEnabled(false)}
          loading={isUpdatingScope}
        >
          Disable app
        </Button>
      </Group>
      {frame}
    </Stack>
  ) : (
    frame
  )

  if (manifest.appAuth) {
    return (
      <ChatboxAuthGate
        authType={manifest.appAuth.type}
        appName={manifest.name}
        message={access?.appAuthMessage || undefined}
      >
        {frameContent}
      </ChatboxAuthGate>
    )
  }

  return frameContent
}

export default memo(PluginFrameInline)
