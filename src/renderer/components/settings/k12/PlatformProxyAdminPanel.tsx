import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import type { PluginManifest } from '@shared/plugin-types'
import { IconAlertTriangle, IconChartBar, IconDownload, IconKey, IconUsers } from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePlatformProxy } from '@/stores/platformProxyStore'
import { usePluginRegistry } from '@/stores/pluginRegistry'

interface Props {
  districtId: string
  role: 'district-admin' | 'school-admin' | 'teacher'
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => JSON.stringify(cell ?? '')).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function summaryColor(percent: number): string {
  if (percent >= 100) return 'red'
  if (percent >= 80) return 'yellow'
  return 'green'
}

function setupPlugins(manifests: PluginManifest[]) {
  return manifests.filter((manifest) => manifest.auth?.type === 'api-key' || manifest.proxy?.requiresDistrictKey)
}

function metadataLabel(source?: 'district' | 'platform-default' | null): string {
  if (source === 'platform-default') return 'Platform default'
  if (source === 'district') return 'District key'
  return 'Missing'
}

export default function PlatformProxyAdminPanel({ districtId, role }: Props) {
  const manifests = usePluginRegistry((state) => state.manifests)
  const dashboard = usePlatformProxy((state) => state.dashboard)
  const apiKeyMetadata = usePlatformProxy((state) => state.apiKeyMetadata)
  const hydrateDashboard = usePlatformProxy((state) => state.hydrateDashboard)
  const hydrateApiKeyMetadata = usePlatformProxy((state) => state.hydrateApiKeyMetadata)
  const setApiKey = usePlatformProxy((state) => state.setApiKey)
  const deleteApiKey = usePlatformProxy((state) => state.deleteApiKey)
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({})

  const proxyManifests = useMemo(() => manifests.filter((manifest) => manifest.proxy), [manifests])
  const apiKeyPlugins = useMemo(() => setupPlugins(manifests), [manifests])
  const configMap = useMemo(
    () => Object.fromEntries(proxyManifests.map((manifest) => [manifest.id, manifest.proxy])),
    [proxyManifests]
  )
  const dashboardHydrationKey = useMemo(
    () =>
      proxyManifests
        .map((manifest) => manifest.id)
        .sort()
        .join('|'),
    [proxyManifests]
  )
  const apiKeyHydrationKey = useMemo(
    () =>
      `${districtId}:${apiKeyPlugins
        .map((manifest) => manifest.id)
        .sort()
        .join('|')}`,
    [apiKeyPlugins, districtId]
  )
  const lastDashboardHydrationKeyRef = useRef<string>('')
  const lastApiKeyHydrationKeyRef = useRef<string>('')

  useEffect(() => {
    if (lastDashboardHydrationKeyRef.current === dashboardHydrationKey) return
    lastDashboardHydrationKeyRef.current = dashboardHydrationKey
    void hydrateDashboard(configMap)
  }, [configMap, dashboardHydrationKey, hydrateDashboard])

  useEffect(() => {
    if (lastApiKeyHydrationKeyRef.current === apiKeyHydrationKey) return
    lastApiKeyHydrationKeyRef.current = apiKeyHydrationKey
    void hydrateApiKeyMetadata(
      districtId,
      apiKeyPlugins.map((manifest) => manifest.id)
    )
  }, [apiKeyHydrationKey, apiKeyPlugins, districtId, hydrateApiKeyMetadata])

  const handleSaveKey = async (pluginId: string) => {
    const value = draftKeys[pluginId]?.trim()
    if (!value) return
    await setApiKey(districtId, pluginId, value)
    setDraftKeys((state) => ({ ...state, [pluginId]: '' }))
  }

  return (
    <Stack gap="lg">
      <Card withBorder padding="md">
        <Stack gap="xs">
          <Group gap="xs">
            <IconUsers size={16} />
            <Title order={6}>What Each Role Sees</Title>
          </Group>
          <SimpleGrid cols={3} spacing="md">
            <Card withBorder padding="sm">
              <Text fw={600} size="sm">
                Student
              </Text>
              <Text size="xs" c="dimmed">
                Zero config. Uses teacher-enabled apps in chat only.
              </Text>
            </Card>
            <Card withBorder padding="sm">
              <Text fw={600} size="sm">
                Teacher
              </Text>
              <Text size="xs" c="dimmed">
                Sees usage summaries, plugin availability, no key exposure.
              </Text>
            </Card>
            <Card withBorder padding="sm">
              <Text fw={600} size="sm">
                Admin
              </Text>
              <Text size="xs" c="dimmed">
                Enters district keys, watches quota, exports CSV.
              </Text>
            </Card>
          </SimpleGrid>
        </Stack>
      </Card>

      <Card withBorder padding="md">
        <Stack gap="sm">
          <Group gap="xs">
            <IconChartBar size={16} />
            <Title order={6}>Usage Dashboard</Title>
            <Badge ml="auto" variant="light">
              {dashboard?.totalEvents ?? 0} events
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            Per-school, per-student, per-plugin usage with quota alerts and CSV export.
          </Text>
          <Group>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconDownload size={14} />}
              onClick={() => {
                const rows = [
                  [
                    'timestamp',
                    'pluginId',
                    'action',
                    'userId',
                    'schoolId',
                    'classId',
                    'toolName',
                    'durationMs',
                    'estimatedCostUsd',
                  ],
                  ...(dashboard?.recentEntries || []).map((entry) => [
                    new Date(entry.timestamp).toISOString(),
                    entry.pluginId,
                    entry.action,
                    entry.userId,
                    entry.schoolId || '',
                    entry.classId || '',
                    entry.toolName || '',
                    `${entry.durationMs || ''}`,
                    `${entry.estimatedCostUsd || ''}`,
                  ]),
                ]
                downloadCsv('platform-proxy-usage.csv', rows)
              }}
            >
              Export CSV
            </Button>
            <Button size="xs" variant="subtle" onClick={() => void hydrateDashboard(configMap)}>
              Refresh
            </Button>
          </Group>

          {dashboard?.alerts.length ? (
            <Stack gap="xs">
              {dashboard.alerts.map((alert) => (
                <Alert
                  key={`${alert.pluginId}-${alert.message}`}
                  color={alert.severity === 'critical' ? 'red' : 'yellow'}
                  icon={<IconAlertTriangle size={16} />}
                >
                  {alert.message}
                </Alert>
              ))}
            </Stack>
          ) : (
            <Text size="xs" c="dimmed">
              No quota alerts yet.
            </Text>
          )}

          <SimpleGrid cols={3} spacing="md">
            <Card withBorder padding="sm">
              <Text size="xs" c="dimmed">
                Total cost
              </Text>
              <Text fw={700}>${(dashboard?.totalEstimatedCostUsd || 0).toFixed(2)}</Text>
            </Card>
            <Card withBorder padding="sm">
              <Text size="xs" c="dimmed">
                Top school
              </Text>
              <Text fw={700}>{dashboard?.schoolTotals[0]?.schoolId || 'n/a'}</Text>
            </Card>
            <Card withBorder padding="sm">
              <Text size="xs" c="dimmed">
                Top student
              </Text>
              <Text fw={700}>{dashboard?.studentTotals[0]?.userId || 'n/a'}</Text>
            </Card>
          </SimpleGrid>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Plugin</Table.Th>
                <Table.Th>Events</Table.Th>
                <Table.Th>Monthly quota</Table.Th>
                <Table.Th>Usage</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {proxyManifests.map((manifest) => {
                const total = dashboard?.pluginTotals.find((item) => item.pluginId === manifest.id)?.events || 0
                const limit =
                  manifest.proxy?.rateLimits?.perDistrictMonth || manifest.proxy?.rateLimits?.perStudentDay || 0
                const percent = limit > 0 ? (total / limit) * 100 : 0
                return (
                  <Table.Tr key={manifest.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {manifest.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>{total}</Table.Td>
                    <Table.Td>{limit || '—'}</Table.Td>
                    <Table.Td>
                      {limit ? (
                        <Progress value={Math.min(percent, 100)} color={summaryColor(percent)} />
                      ) : (
                        <Text size="xs" c="dimmed">
                          No cap
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>

      <Card withBorder padding="md">
        <Stack gap="sm">
          <Group gap="xs">
            <IconKey size={16} />
            <Title order={6}>District API Keys</Title>
            <Badge ml="auto" variant="light">
              {role === 'teacher' ? 'read only' : 'admin'}
            </Badge>
          </Group>
          {apiKeyPlugins.length === 0 ? (
            <Text size="xs" c="dimmed">
              No district-key plugins registered yet. Proxy infra is ready for API-key plugins.
            </Text>
          ) : (
            <Stack gap="sm">
              {apiKeyPlugins.map((manifest) => {
                const metadata = apiKeyMetadata[manifest.id]
                return (
                  <Card key={manifest.id} withBorder padding="sm">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <div>
                          <Text fw={600} size="sm">
                            {manifest.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {manifest.proxy?.setupLabel || 'District-managed API key'}
                          </Text>
                        </div>
                        <Badge
                          color={
                            metadata?.configured ? (metadata.source === 'platform-default' ? 'blue' : 'green') : 'gray'
                          }
                        >
                          {metadata?.configured ? metadataLabel(metadata.source) : 'Missing'}
                        </Badge>
                      </Group>
                      {metadata?.source === 'platform-default' && (
                        <Text size="xs" c="dimmed">
                          Using app fallback key. Saving a district key overrides it.
                        </Text>
                      )}
                      <TextInput
                        size="xs"
                        placeholder={metadata?.maskedValue || 'Paste district API key'}
                        value={draftKeys[manifest.id] || ''}
                        onChange={(event) =>
                          setDraftKeys((state) => ({ ...state, [manifest.id]: event.currentTarget.value }))
                        }
                        disabled={role === 'teacher'}
                      />
                      <Group>
                        <Button size="xs" onClick={() => void handleSaveKey(manifest.id)} disabled={role === 'teacher'}>
                          Save key
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          color="red"
                          onClick={() => void deleteApiKey(districtId, manifest.id)}
                          disabled={role === 'teacher' || !metadata?.configured}
                        >
                          Clear
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                )
              })}
            </Stack>
          )}
        </Stack>
      </Card>
    </Stack>
  )
}
