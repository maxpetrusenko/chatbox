import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Group,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import type { PluginManifest } from '@shared/plugin-types'
import {
  IconCheck,
  IconDownload,
  IconLock,
  IconPlugConnected,
  IconPlugConnectedX,
  IconPuzzle,
  IconSearch,
  IconShieldCheck,
  IconX,
} from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { reviewPluginSafety, runApprovalPipeline } from '@/stores/k12Safety'
import { k12Store, useK12 } from '@/stores/k12Store'
import { getPluginAuthSetupError, pluginAuthStore, usePluginAuth } from '@/stores/pluginAuthStore'
import { usePluginRegistry } from '@/stores/pluginRegistry'
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
  const session = usePluginAuth((s) => s.sessions[manifest.id])
  const currentUser = useK12((s) => s.currentUser)
  const hasPermission = useK12((s) => s.hasPermission)
  const needsAuth = manifest.auth && manifest.auth.type !== 'none'
  const setupError = manifest.auth ? getPluginAuthSetupError(manifest.id, manifest.auth) : null
  const authStatus = session?.status || (setupError ? 'error' : needsAuth ? 'required' : 'none')

  useEffect(() => {
    if (!manifest.auth) return
    void pluginAuthStore.getState().hydrate(manifest.id, manifest.auth)
  }, [manifest])

  const canInstall = hasPermission('plugin.install')
  const canManageAuth = hasPermission('plugin.manage-auth')
  const isStudent = currentUser?.role === 'student'
  const isApiKeyPlugin = manifest.auth?.type === 'api-key' || manifest.proxy?.requiresDistrictKey === true

  const isPluginAllowed = useK12((s) => s.isPluginAllowed)
  const isAllowed = isPluginAllowed(manifest.id, currentUser?.schoolId)

  const handleConnect = () => {
    if (!manifest.auth) return
    void pluginAuthStore.getState().beginAuth(manifest.id, manifest.auth)
  }

  const handleDisconnect = () => {
    void pluginAuthStore.getState().disconnect(manifest.id)
  }

  const handleEnablePlugin = () => {
    if (!currentUser) return
    const record = k12Store.getState().requestPlugin(manifest, currentUser.schoolId ?? 'school-1')
    // Auto-run safety pipeline
    const pipeline = runApprovalPipeline(manifest, k12Store.getState().district?.settings.autoApproveThreshold)
    k12Store.getState().updateInstallStatus(record.id, pipeline.status, {
      safetyScore: pipeline.result.score,
      safetyFindings: pipeline.result.findings,
      reviewedBy: pipeline.status === 'approved' ? 'ai-auto' : undefined,
    })
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
          {/* Auth controls for authenticated plugins */}
          {needsAuth && !isApiKeyPlugin && canManageAuth && (
            <>
              {authStatus === 'connected' ? (
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
              )}
            </>
          )}

          {/* Enable approved plugin for current scope */}
          {!needsAuth && !isApiKeyPlugin && canInstall && isAllowed && (
            <Button
              size="xs"
              variant="light"
              color="green"
              leftSection={<IconDownload size={14} />}
              onClick={handleEnablePlugin}
            >
              Enable
            </Button>
          )}

          {isApiKeyPlugin && currentUser?.role === 'student' && (
            <Badge size="xs" variant="light" color="gray">
              Zero config
            </Badge>
          )}

          {isApiKeyPlugin && currentUser?.role === 'teacher' && (
            <Badge size="xs" variant="light" color="blue">
              Uses district key
            </Badge>
          )}

          {isApiKeyPlugin && canManageAuth && (
            <Badge size="xs" variant="light" color="orange">
              Configure in K12 Admin
            </Badge>
          )}

          {/* Student: just show active badge */}
          {isStudent && isAllowed && (
            <Badge size="sm" variant="light" color="green" leftSection={<IconCheck size={12} />}>
              Available
            </Badge>
          )}

          {/* No auth, not student: active */}
          {!needsAuth && !canInstall && !isStudent && (
            <Badge size="sm" variant="light" color="green">
              Active
            </Badge>
          )}

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

function RouteComponent() {
  const allManifests = usePluginRegistry((s) => s.manifests)
  const currentUser = useK12((s) => s.currentUser)
  const isAuthenticated = useK12((s) => s.isAuthenticated)
  const hasPermission = useK12((s) => s.hasPermission)
  const getAvailablePlugins = useK12((s) => s.getAvailablePlugins)
  const installRecords = useK12((s) => s.installRecords)

  const [search, setSearch] = useState('')
  const [view, setView] = useState<string>('all')

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
          <Title order={5}>Plugin Drop</Title>
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
      {isAuthenticated && hasPermission('plugin.request') && <PluginDropForm />}

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
