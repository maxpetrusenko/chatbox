import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Flex,
  Group,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import type { PluginManifest } from '@shared/plugin-types'
import {
  IconCheck,
  IconLock,
  IconPlugConnected,
  IconPlugConnectedX,
  IconPuzzle,
  IconSearch,
  IconShieldCheck,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { navigateToSettings } from '@/modals/Settings'
import { reviewPluginRequestInTellMe, setPluginEnabledForCurrentScopeInTellMe } from '@/packages/tellme/k12'
import { getPluginAppAuthBlockedMessage, getPluginAppAuthStatus } from '@/plugins/plugin-access'
import { unregisterPluginHtml } from '@/plugins/resolve'
import { useChatboxAuthStore } from '@/stores/chatboxAuthStore'
import { droppedPluginsStore } from '@/stores/droppedPluginsStore'
import { hiddenBuiltinPluginsStore } from '@/stores/hiddenBuiltinPluginsStore'
import { reviewPluginSafety } from '@/stores/k12Safety'
import { k12Store, useK12 } from '@/stores/k12Store'
import { usePlatformProxy } from '@/stores/platformProxyStore'
import { getPluginAuthSetupError, pluginAuthStore, usePluginAuth } from '@/stores/pluginAuthStore'
import { pluginRegistryStore, usePluginRegistry } from '@/stores/pluginRegistry'
import { PluginDropForm } from './plugins-drop'

export const Route = createFileRoute('/settings/plugins')({
  component: RouteComponent,
})

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  internal: 'Internal',
  'external-public': 'Public',
  'external-authenticated': 'Authenticated',
}

const CATEGORY_COLORS: Record<string, string> = {
  internal: 'gray',
  'external-public': 'teal',
  'external-authenticated': 'violet',
}

const ROLE_LABELS: Record<string, string> = {
  'district-admin': 'District Admin',
  'school-admin': 'School Admin',
  teacher: 'Teacher',
  student: 'Student',
}

// ---------------------------------------------------------------------------
// Safety badge
// ---------------------------------------------------------------------------

function SafetyBadge({ manifest }: { manifest: PluginManifest }) {
  const result = reviewPluginSafety(manifest)
  const color = result.score >= 90 ? 'green' : result.score >= 60 ? 'yellow' : 'red'

  return (
    <Tooltip
      label={result.findings.length > 0 ? result.findings.slice(0, 3).join('\n') : 'All safety checks passed'}
      multiline
      w={300}
    >
      <Badge size="xs" variant="light" color={color} leftSection={<IconShieldCheck size={10} />}>
        Safety: {result.score}
      </Badge>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Plugin card — K12 plugin access
// ---------------------------------------------------------------------------

function PluginCard({ manifest }: { manifest: PluginManifest }) {
  const navigate = useNavigate()
  const session = usePluginAuth((s) => s.sessions[manifest.id])
  const chatboxAuthStatus = useChatboxAuthStore((state) => state.status)
  const validateChatboxAuth = useChatboxAuthStore((state) => state.validate)
  const currentUser = useK12((s) => s.currentUser)
  const isK12Authenticated = useK12((s) => s.isAuthenticated)
  const hasPermission = useK12((s) => s.hasPermission)
  const needsAuth = manifest.auth && manifest.auth.type !== 'none'
  const needsAppAuth = !!manifest.appAuth
  const isAppAuthSatisfied = getPluginAppAuthStatus(manifest) === 'connected'
  const setupError = manifest.auth ? getPluginAuthSetupError(manifest.id, manifest.auth) : null
  const authStatus = session?.status || (setupError ? 'error' : needsAuth ? 'required' : 'none')

  useEffect(() => {
    if (manifest.appAuth?.type !== 'chatbox-ai-login') return
    void validateChatboxAuth()
  }, [manifest.appAuth?.type, validateChatboxAuth])

  useEffect(() => {
    if (!manifest.auth) return
    void pluginAuthStore.getState().hydrate(manifest.id, manifest.auth)
  }, [manifest])

  const canInstall = hasPermission('plugin.install')
  const canManageAuth = hasPermission('plugin.manage-auth')
  const isStudent = currentUser?.role === 'student'
  const isApiKeyPlugin = manifest.auth?.type === 'api-key' || manifest.proxy?.requiresDistrictKey === true
  const apiKeyMetadata = usePlatformProxy((s) => s.apiKeyMetadata[manifest.id])
  const hydrateApiKeyMetadata = usePlatformProxy((s) => s.hydrateApiKeyMetadata)

  const installRecord = useK12(
    (s) => s.installRecords.find((record) => record.pluginId === manifest.id && record.status !== 'revoked') ?? null
  )
  const isAllowed = useK12((s) => s.isPluginAllowed(manifest.id, s.currentUser?.schoolId))
  const isActive = useK12((s) => s.isPluginActiveForCurrentScope(manifest.id))
  const droppedPackage = useStore(droppedPluginsStore, (state) => state.packages[manifest.id])
  const districtKeyConfigured = !!apiKeyMetadata?.configured
  const districtKeyMissing = isApiKeyPlugin && !districtKeyConfigured
  const showManagedToggle = canInstall && isAllowed
  const showReadOnlyToggle = !needsAuth && !isStudent && isAllowed && !showManagedToggle
  const canDeleteDroppedPlugin = canInstall && !!installRecord && !!droppedPackage
  const canDeleteBuiltinPlugin = canInstall && (manifest.trustLevel === 'builtin' || manifest.trustLevel === 'verified')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!isApiKeyPlugin || !currentUser?.districtId) return
    void hydrateApiKeyMetadata(currentUser.districtId, [manifest.id])
  }, [currentUser?.districtId, hydrateApiKeyMetadata, isApiKeyPlugin, manifest.id])

  const handleConnect = () => {
    if (!manifest.auth) return
    void pluginAuthStore.getState().beginAuth(manifest.id, manifest.auth)
  }

  const handleDisconnect = () => {
    void pluginAuthStore.getState().disconnect(manifest.id)
  }

  const handleAppSignIn = () => {
    if (manifest.appAuth?.type === 'k12-login') {
      void navigate({ to: '/settings/k12-login' })
      return
    }

    navigateToSettings('/provider/chatbox-ai')
  }

  const handleSetPluginEnabled = (enabled: boolean) => {
    void (async () => {
      try {
        await setPluginEnabledForCurrentScopeInTellMe(manifest.id, enabled)
      } catch {
        if (!enabled) {
          k12Store.getState().deactivatePluginForCurrentScope(manifest.id)
          return
        }

        k12Store.getState().activatePluginForCurrentScope(manifest.id)
      }
    })()
  }

  const handleTogglePlugin = () => {
    handleSetPluginEnabled(!isActive)
  }

  const handleReadOnlyToggle = () => {
    if (!currentUser) {
      void navigate({ to: '/settings/k12-login' })
    }
  }

  const handleDeletePlugin = () => {
    if (canDeleteBuiltinPlugin) {
      const confirmed = window.confirm(
        `Uninstall built-in ${manifest.name}? This removes it from Marketplace so you can install your own version.`
      )
      if (!confirmed) return

      hiddenBuiltinPluginsStore.getState().hidePlugin(manifest.id)
      unregisterPluginHtml(manifest.id)
      pluginRegistryStore.getState().removeManifest(manifest.id)
      k12Store.getState().deactivatePluginForCurrentScope(manifest.id)
      return
    }

    if (!currentUser || !installRecord || !droppedPackage || isDeleting) return
    const confirmed = window.confirm(`Delete ${manifest.name} from this school? Students will lose access immediately.`)
    if (!confirmed) return

    setIsDeleting(true)
    void (async () => {
      try {
        await reviewPluginRequestInTellMe({
          recordId: installRecord.id,
          status: 'revoked',
          reviewedBy: currentUser.id,
        })
      } finally {
        setIsDeleting(false)
      }
    })()
  }

  return (
    <Card padding="md" radius="md" withBorder style={{ opacity: isAllowed ? 1 : 0.5 }}>
      <Flex justify="space-between" align="flex-start" gap="md">
        <Box flex={1}>
          <Group gap="xs" mb={4}>
            <Text fw={600} size="sm">
              {manifest.name}
            </Text>
            <Badge size="xs" variant="light" color={CATEGORY_COLORS[manifest.category] || 'gray'}>
              {CATEGORY_LABELS[manifest.category] || manifest.category}
            </Badge>
            <Badge size="xs" variant="outline" color="dimmed">
              v{manifest.version}
            </Badge>
            <SafetyBadge manifest={manifest} />
            {!isAllowed && (
              <Badge size="xs" variant="filled" color="red">
                Blocked
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed" mb="xs">
            {manifest.description}
          </Text>
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              {manifest.tools.length} tool{manifest.tools.length !== 1 ? 's' : ''}:{' '}
              {manifest.tools.map((t) => t.name).join(', ')}
            </Text>
          </Group>
          {needsAppAuth && !isAppAuthSatisfied && (
            <Flex
              mt="sm"
              p="sm"
              gap="sm"
              align="center"
              justify="space-between"
              style={{ border: '1px solid var(--mantine-color-dark-4)', borderRadius: 10 }}
            >
              <Box>
                <Text size="xs" fw={700}>
                  Sign in to use {manifest.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {manifest.appAuth?.type === 'chatbox-ai-login'
                    ? chatboxAuthStatus === 'checking'
                      ? 'Checking your Chatbox AI session.'
                      : 'Open Chatbox AI login to unlock this app.'
                    : isK12Authenticated
                      ? 'K12 session ready.'
                      : getPluginAppAuthBlockedMessage(manifest)}
                </Text>
              </Box>
              <Button size="xs" variant="filled" onClick={handleAppSignIn}>
                {chatboxAuthStatus === 'checking' ? 'Checking…' : 'Sign in'}
              </Button>
            </Flex>
          )}
          {manifest.dataProfile && (
            <Group gap="xs" mt={4}>
              {manifest.dataProfile.collectsPii && (
                <Badge size="xs" variant="outline" color="orange">
                  Collects PII
                </Badge>
              )}
              {manifest.coppaScope && manifest.coppaScope !== 'none' && (
                <Badge size="xs" variant="outline" color="orange">
                  COPPA: {manifest.coppaScope}
                </Badge>
              )}
              {manifest.targetGrades && (
                <Badge size="xs" variant="outline" color="blue">
                  Grades: {manifest.targetGrades.join(', ')}
                </Badge>
              )}
            </Group>
          )}
        </Box>

        <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
          {needsAppAuth &&
            (isAppAuthSatisfied ? (
              <Badge size="xs" variant="light" color="green" leftSection={<IconCheck size={10} />}>
                {manifest.appAuth?.type === 'k12-login' ? 'K12 signed in' : 'Chatbox AI signed in'}
              </Badge>
            ) : (
              <Button size="xs" variant="filled" onClick={handleAppSignIn}>
                {chatboxAuthStatus === 'checking' ? 'Checking…' : 'Sign in'}
              </Button>
            ))}

          {/* Auth controls for authenticated plugins */}
          {needsAuth &&
            !isApiKeyPlugin &&
            canManageAuth &&
            (authStatus === 'connected' ? (
              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<IconPlugConnectedX size={14} />}
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            ) : authStatus === 'authorizing' ? (
              <Button size="xs" variant="light" color="yellow" loading>
                Connecting
              </Button>
            ) : (
              <Button
                size="xs"
                variant="filled"
                leftSection={<IconPlugConnected size={14} />}
                onClick={handleConnect}
                disabled={!!setupError}
              >
                Connect
              </Button>
            ))}

          {/* Enable approved plugin for current scope */}
          {showManagedToggle && (
            <Stack gap={2} align="flex-end">
              <Text size="xs" fw={700} tt="uppercase" c={isActive ? 'green' : 'dimmed'}>
                {isActive ? 'Enabled' : 'Available'}
              </Text>
              <Switch
                size="md"
                color="green"
                checked={isActive}
                onChange={() => handleTogglePlugin()}
                aria-label={`${isActive ? 'Disable' : 'Enable'} ${manifest.name}`}
                onLabel={<IconCheck size={12} stroke={2.5} />}
                offLabel={<IconX size={12} stroke={2.5} />}
                disabled={authStatus === 'authorizing' || !!setupError || districtKeyMissing}
              />
              {!isActive && (
                <Button size="xs" variant="light" color="green" onClick={() => handleSetPluginEnabled(true)}>
                  Enable
                </Button>
              )}
              {canDeleteBuiltinPlugin && (
                <Button size="xs" variant="subtle" color="red" onClick={handleDeletePlugin}>
                  Delete
                </Button>
              )}
            </Stack>
          )}

          {showReadOnlyToggle && (
            <Stack gap={2} align="flex-end">
              <Text size="xs" fw={700} tt="uppercase" c={isActive ? 'green' : 'dimmed'}>
                {isActive ? 'Enabled' : 'Available'}
              </Text>
              <Switch
                size="md"
                color="green"
                checked={isActive}
                aria-label={`${isActive ? 'Disable' : 'Enable'} ${manifest.name}`}
                onLabel={<IconCheck size={12} stroke={2.5} />}
                offLabel={<IconX size={12} stroke={2.5} />}
                onChange={handleReadOnlyToggle}
              />
              {!currentUser && (
                <>
                  <Button size="xs" variant="light" onClick={handleReadOnlyToggle}>
                    Enable
                  </Button>
                  <Text size="xs" c="dimmed">
                    Sign in as teacher or admin to manage apps.
                  </Text>
                </>
              )}
            </Stack>
          )}

          {isApiKeyPlugin && (
            <Badge size="xs" variant="light" color={districtKeyConfigured ? 'green' : 'orange'}>
              {districtKeyConfigured
                ? 'District key ready'
                : currentUser?.role === 'teacher'
                  ? 'Admin config required'
                  : 'Configure in K12 Admin'}
            </Badge>
          )}

          {/* Student: just show active badge */}
          {isStudent && isAllowed && (
            <Badge size="sm" variant="light" color="green" leftSection={<IconCheck size={12} />}>
              Available
            </Badge>
          )}

          {/* No auth, not student: active */}
          {/* Auth status messages */}
          {needsAuth && !canManageAuth && (
            <Badge size="xs" variant="light" color="gray" leftSection={<IconLock size={10} />}>
              Requires auth
            </Badge>
          )}
          {authStatus === 'error' && session?.error && (
            <Text size="xs" c="red">
              {session.error}
            </Text>
          )}
          {authStatus === 'expired' && (
            <Text size="xs" c="orange">
              Token expired
            </Text>
          )}
          {districtKeyMissing && (
            <Text size="xs" c="orange">
              Enable after district key setup.
            </Text>
          )}
          {canDeleteDroppedPlugin && (
            <Button
              size="xs"
              color="red"
              variant="light"
              leftSection={<IconTrash size={14} />}
              onClick={handleDeletePlugin}
              loading={isDeleting}
            >
              Delete Plugin
            </Button>
          )}
        </Stack>
      </Flex>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Upload plugin form (teacher request flow)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function RouteComponent() {
  const navigate = useNavigate()
  const allManifests = usePluginRegistry((s) => s.manifests)
  const currentUser = useK12((s) => s.currentUser)
  const isAuthenticated = useK12((s) => s.isAuthenticated)
  const hasPermission = useK12((s) => s.hasPermission)
  const getAvailablePlugins = useK12((s) => s.getAvailablePlugins)
  const installRecords = useK12((s) => s.installRecords)

  const [search, setSearch] = useState('')
  const [view, setView] = useState<string>('all')
  const uploadRef = useRef<HTMLDivElement | null>(null)

  // Filter plugins based on role
  const availableManifests = isAuthenticated ? getAvailablePlugins(allManifests) : allManifests
  const filteredManifests = availableManifests.filter((m) => {
    if (
      search &&
      !m.name.toLowerCase().includes(search.toLowerCase()) &&
      !m.description.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }
    if (view === 'internal') return m.category === 'internal'
    if (view === 'public') return m.category === 'external-public'
    if (view === 'auth') return m.category === 'external-authenticated'
    return true
  })

  const internal = filteredManifests.filter((m) => m.category === 'internal')
  const publicApps = filteredManifests.filter((m) => m.category === 'external-public')
  const authenticated = filteredManifests.filter((m) => m.category === 'external-authenticated')

  const pendingCount = installRecords.filter(
    (r) => r.status === 'pending' || r.status === 'ai-review' || r.status === 'quarantined'
  ).length

  return (
    <Stack p="md" gap="lg">
      {/* Header */}
      <Flex align="center" justify="space-between" gap="xs">
        <Group gap="xs">
          <IconPuzzle size={20} />
          <Title order={5}>Installed Plugins</Title>
          {isAuthenticated && currentUser && (
            <Badge size="sm" variant="light" color="blue">
              {ROLE_LABELS[currentUser.role] || currentUser.role}
            </Badge>
          )}
        </Group>
        {pendingCount > 0 && hasPermission('plugin.approve') && (
          <Badge size="sm" variant="filled" color="orange">
            {pendingCount} pending
          </Badge>
        )}
      </Flex>

      {/* Description based on role */}
      <Text size="sm" c="dimmed">
        {!isAuthenticated
          ? 'Plugins extend the chat with interactive tools. Log in via K12 Login to see role-specific access controls.'
          : currentUser?.role === 'student'
            ? 'These are the plugins your teacher has enabled for your class.'
            : currentUser?.role === 'teacher'
              ? 'Drop plugin packages for your class, or submit manifests for review.'
              : 'Manage dropped plugins for your organization. Approve, reject, or configure plugin access.'}
      </Text>

      {!isAuthenticated && (
        <Card padding="lg" radius="md" withBorder>
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start">
              <Box>
                <Text fw={700} size="lg">
                  Demo path
                </Text>
                <Text size="sm" c="dimmed">
                  Login as teacher. Then upload a <Code>.zip</Code> plugin package for AI review.
                </Text>
              </Box>
              <Badge size="sm" variant="light" color="teal">
                Best demo: Teacher
              </Badge>
            </Group>
            <Group>
              <Button size="sm" onClick={() => void navigate({ to: '/settings/k12-login' })}>
                Open K12 Login
              </Button>
              <Button size="sm" variant="light" onClick={() => void navigate({ to: '/settings/plugins-drop' })}>
                Open Plugin Drop
              </Button>
            </Group>
            <Text size="xs" c="dimmed">
              Accepted files: <Code>.zip</Code>, <Code>.cbplugin</Code>, <Code>.json</Code>.
            </Text>
          </Stack>
        </Card>
      )}

      {isAuthenticated && hasPermission('plugin.request') && (
        <Card padding="lg" radius="md" withBorder>
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start">
              <Box>
                <Text fw={700} size="lg">
                  Upload your game plugin
                </Text>
                <Text size="sm" c="dimmed">
                  Drop a <Code>.zip</Code> plugin package below. AI reviews safety, then you enable it for class scope.
                </Text>
              </Box>
              <Badge size="sm" variant="light" color="green">
                AI review ready
              </Badge>
            </Group>
            <Group>
              <Button
                size="sm"
                onClick={() => uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                Jump to uploader
              </Button>
              <Button size="sm" variant="light" onClick={() => void navigate({ to: '/settings/plugins-drop' })}>
                Open full upload page
              </Button>
            </Group>
            <Text size="xs" c="dimmed">
              After review, the plugin shows up here and can be enabled or disabled.
            </Text>
          </Stack>
        </Card>
      )}

      {/* Search + filter */}
      <Group gap="xs">
        <TextInput
          placeholder="Search plugins..."
          leftSection={<IconSearch size={14} />}
          size="xs"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <SegmentedControl
          size="xs"
          value={view}
          onChange={setView}
          data={[
            { label: 'All', value: 'all' },
            { label: 'Internal', value: 'internal' },
            { label: 'Public', value: 'public' },
            { label: 'Auth', value: 'auth' },
          ]}
        />
      </Group>

      {/* Upload form for teacher+ */}
      {isAuthenticated && hasPermission('plugin.request') && (
        <Box ref={uploadRef}>
          <Text fw={600} size="sm" mb="xs">
            Plugin Package Upload
          </Text>
          <PluginDropForm />
        </Box>
      )}

      {/* Available plugins */}
      {internal.length > 0 && (
        <Box>
          <Text fw={600} size="sm" mb="xs">
            Internal
          </Text>
          <Stack gap="xs">
            {internal.map((m) => (
              <PluginCard key={m.id} manifest={m} />
            ))}
          </Stack>
        </Box>
      )}

      {publicApps.length > 0 && (
        <Box>
          <Text fw={600} size="sm" mb="xs">
            Public APIs
          </Text>
          <Stack gap="xs">
            {publicApps.map((m) => (
              <PluginCard key={m.id} manifest={m} />
            ))}
          </Stack>
        </Box>
      )}

      {authenticated.length > 0 && (
        <Box>
          <Text fw={600} size="sm" mb="xs">
            Authenticated
          </Text>
          <Stack gap="xs">
            {authenticated.map((m) => (
              <PluginCard key={m.id} manifest={m} />
            ))}
          </Stack>
        </Box>
      )}

      {filteredManifests.length === 0 && (
        <Text size="sm" c="dimmed">
          {search ? 'No plugins match your search.' : 'No plugins available for your role.'}
        </Text>
      )}

      {/* Safety info for admins */}
      {isAuthenticated && hasPermission('audit.view-safety') && (
        <Alert variant="light" color="blue" title="Safety Pipeline Active">
          <Text size="xs">
            All plugin submissions are automatically screened for content safety, scope abuse, data exfiltration risk,
            and age-appropriateness. Plugins scoring above the auto-approve threshold (
            {k12Store.getState().district?.settings.autoApproveThreshold ?? 90}/100) are approved automatically. Others
            are held for manual review.
          </Text>
        </Alert>
      )}
    </Stack>
  )
}
