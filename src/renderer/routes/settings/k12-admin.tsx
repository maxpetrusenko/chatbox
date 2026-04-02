import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Group,
  NumberInput,
  Progress,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import type { AuditLogEntry, K12District, PluginInstallRecord } from '@shared/plugin-types'
import {
  IconBuilding,
  IconChartBar,
  IconCheck,
  IconClipboardList,
  IconSettings,
  IconShieldCheck,
  IconX,
} from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import PlatformProxyAdminPanel from '@/components/settings/k12/PlatformProxyAdminPanel'
import { reviewPluginRequestInTellMe } from '@/packages/tellme/k12'
import { droppedPluginsStore } from '@/stores/droppedPluginsStore'
import { k12Store, useK12 } from '@/stores/k12Store'

export const Route = createFileRoute('/settings/k12-admin')({
  component: K12AdminPanel,
})

// ---------------------------------------------------------------------------
// Status / severity badge colors
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  validating: 'blue',
  'ai-review': 'blue',
  quarantined: 'orange',
  approved: 'green',
  rejected: 'red',
  active: 'teal',
  revoked: 'gray',
}

const SEVERITY_COLORS: Record<string, string> = {
  info: 'blue',
  warning: 'orange',
  critical: 'red',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ---------------------------------------------------------------------------
// Approval Queue Tab
// ---------------------------------------------------------------------------

function ApprovalQueueTab() {
  const pending = useK12((s) => s.getPendingApprovals())
  const currentUser = useK12((s) => s.currentUser)
  const schools = useK12((s) => s.schools)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const schoolMap = useMemo(() => Object.fromEntries(schools.map((s) => [s.id, s.name])), [schools])

  const handleApprove = useCallback(
    (record: PluginInstallRecord) => {
      if (!currentUser) return
      void (async () => {
        const staged = droppedPluginsStore.getState().getStagedPackage(record.id)
        const nextStatus = staged ? 'active' : 'approved'
        await reviewPluginRequestInTellMe({
          recordId: record.id,
          status: nextStatus,
          reviewedBy: currentUser.id,
        })
        if (staged) {
          droppedPluginsStore.getState().installStagedPackage(record.id)
        }
      })()
    },
    [currentUser]
  )

  const handleReject = useCallback(
    (id: string) => {
      if (!currentUser) return
      void (async () => {
        await reviewPluginRequestInTellMe({
          recordId: id,
          status: 'rejected',
          reviewedBy: currentUser.id,
          rejectionReason: rejectReason || undefined,
        })
        setRejectId(null)
        setRejectReason('')
      })()
    },
    [currentUser, rejectReason]
  )

  if (pending.length === 0) {
    return (
      <Text size="sm" c="dimmed" p="md">
        No pending approval requests.
      </Text>
    )
  }

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Plugin Name</Table.Th>
          <Table.Th>Requested By</Table.Th>
          <Table.Th>School</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>Safety Score</Table.Th>
          <Table.Th>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {pending.map((record) => (
          <Table.Tr key={record.id}>
            <Table.Td>
              <Stack gap={2}>
                <Text size="sm" fw={500}>
                  {record.manifestSnapshot?.name ?? record.pluginId}
                </Text>
                {record.safetyFindings?.[0] && (
                  <Text size="xs" c="dimmed">
                    {record.safetyFindings[0]}
                  </Text>
                )}
              </Stack>
            </Table.Td>
            <Table.Td>
              <Text size="sm">{record.requestedBy}</Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm">{schoolMap[record.schoolId] ?? record.schoolId}</Text>
            </Table.Td>
            <Table.Td>
              <Stack gap={4}>
                <Badge size="sm" color={STATUS_COLORS[record.status] ?? 'gray'}>
                  {record.status}
                </Badge>
                {droppedPluginsStore.getState().getStagedPackage(record.id) && (
                  <Badge size="xs" variant="light" color="teal">
                    package ready
                  </Badge>
                )}
              </Stack>
            </Table.Td>
            <Table.Td>
              {record.safetyScore != null ? (
                <Group gap="xs">
                  <Progress
                    value={record.safetyScore}
                    size="sm"
                    w={60}
                    color={record.safetyScore >= 80 ? 'green' : record.safetyScore >= 50 ? 'yellow' : 'red'}
                  />
                  <Text size="xs">{record.safetyScore}</Text>
                </Group>
              ) : (
                <Text size="xs" c="dimmed">
                  N/A
                </Text>
              )}
            </Table.Td>
            <Table.Td>
              {rejectId === record.id ? (
                <Group gap="xs">
                  <TextInput
                    size="xs"
                    placeholder="Rejection reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.currentTarget.value)}
                    style={{ width: 160 }}
                  />
                  <Button size="xs" color="red" onClick={() => handleReject(record.id)}>
                    Confirm
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => {
                      setRejectId(null)
                      setRejectReason('')
                    }}
                  >
                    Cancel
                  </Button>
                </Group>
              ) : (
                <Group gap="xs">
                  <Button
                    size="xs"
                    color="green"
                    leftSection={<IconCheck size={14} />}
                    onClick={() => handleApprove(record)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    leftSection={<IconX size={14} />}
                    onClick={() => setRejectId(record.id)}
                  >
                    Reject
                  </Button>
                </Group>
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}

// ---------------------------------------------------------------------------
// Audit Log Tab
// ---------------------------------------------------------------------------

function AuditLogTab() {
  const auditLog = useK12((s) => s.auditLog)
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    let entries = auditLog.slice(0, 50)
    if (severityFilter !== 'all') {
      entries = entries.filter((e) => e.severity === severityFilter)
    }
    return entries
  }, [auditLog, severityFilter])

  return (
    <Stack gap="sm">
      <SegmentedControl
        size="xs"
        value={severityFilter}
        onChange={setSeverityFilter}
        data={[
          { label: 'All', value: 'all' },
          { label: 'Info', value: 'info' },
          { label: 'Warning', value: 'warning' },
          { label: 'Critical', value: 'critical' },
        ]}
      />

      {filtered.length === 0 ? (
        <Text size="sm" c="dimmed">
          No audit log entries.
        </Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Time</Table.Th>
              <Table.Th>Action</Table.Th>
              <Table.Th>Actor</Table.Th>
              <Table.Th>Plugin</Table.Th>
              <Table.Th>Severity</Table.Th>
              <Table.Th>Details</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((entry) => (
              <Table.Tr key={entry.id}>
                <Table.Td>
                  <Text size="xs">{relativeTime(entry.timestamp)}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge size="xs" variant="light">
                    {entry.action}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">{entry.actorId}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">{entry.pluginId ?? '-'}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge size="xs" variant="dot" color={SEVERITY_COLORS[entry.severity] ?? 'gray'}>
                    {entry.severity}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" lineClamp={1} maw={200}>
                    {JSON.stringify(entry.details)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// District Policy Tab
// ---------------------------------------------------------------------------

function DistrictPolicyTab() {
  const district = useK12((s) => s.district)
  const [draft, setDraft] = useState<K12District | null>(district)

  // Re-sync draft when store changes externally
  useEffect(() => {
    if (district) setDraft(district)
  }, [district])

  if (!draft) {
    return (
      <Text size="sm" c="dimmed" p="md">
        No district configured.
      </Text>
    )
  }

  const handleSave = () => {
    k12Store.getState().setDistrict(draft)
    k12Store.getState().logAction('admin.policy-changed', { districtId: draft.id }, 'info')
  }

  return (
    <Stack gap="md" p="xs">
      <TextInput
        label="District Name"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.currentTarget.value })}
      />

      <TextInput
        label="Allowed Plugins (comma-separated IDs)"
        value={draft.allowedPlugins.join(', ')}
        onChange={(e) =>
          setDraft({
            ...draft,
            allowedPlugins: e.currentTarget.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />

      <TextInput
        label="Blocked Plugins (comma-separated IDs)"
        value={draft.blockedPlugins.join(', ')}
        onChange={(e) =>
          setDraft({
            ...draft,
            blockedPlugins: e.currentTarget.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />

      <Box>
        <Text size="sm" fw={500} mb={4}>
          Auto-Approve Threshold: {draft.settings.autoApproveThreshold}
        </Text>
        <NumberInput
          min={0}
          max={100}
          step={5}
          value={draft.settings.autoApproveThreshold}
          onChange={(val) =>
            setDraft({
              ...draft,
              settings: {
                ...draft.settings,
                autoApproveThreshold: typeof val === 'number' ? val : draft.settings.autoApproveThreshold,
              },
            })
          }
        />
      </Box>

      <Switch
        label="Require DPA (Data Processing Agreement)"
        checked={draft.settings.requireDpa}
        onChange={(e) =>
          setDraft({
            ...draft,
            settings: { ...draft.settings, requireDpa: e.currentTarget.checked },
          })
        }
      />

      <Select
        label="Default Content Safety Level"
        value={draft.settings.defaultContentSafetyLevel}
        data={[
          { value: 'strict', label: 'Strict' },
          { value: 'standard', label: 'Standard' },
          { value: 'relaxed', label: 'Relaxed' },
        ]}
        onChange={(val) =>
          setDraft({
            ...draft,
            settings: {
              ...draft.settings,
              defaultContentSafetyLevel:
                (val as 'strict' | 'standard' | 'relaxed') ?? draft.settings.defaultContentSafetyLevel,
            },
          })
        }
      />

      <Button onClick={handleSave} leftSection={<IconCheck size={16} />}>
        Save Policy
      </Button>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Schools & Classes Tab
// ---------------------------------------------------------------------------

function SchoolsClassesTab() {
  const schools = useK12((s) => s.schools)
  const classes = useK12((s) => s.classes)
  const district = useK12((s) => s.district)
  const currentUser = useK12((s) => s.currentUser)
  const role = currentUser?.role

  const canToggle = role === 'teacher' || role === 'school-admin' || role === 'district-admin'

  const filteredSchools = useMemo(() => {
    if (role === 'school-admin' || role === 'teacher') {
      return schools.filter((s) => s.id === currentUser?.schoolId)
    }
    return schools
  }, [schools, role, currentUser])

  const handleTogglePlugin = useCallback(
    (classId: string, pluginId: string, active: boolean) => {
      const cls = classes.find((c) => c.id === classId)
      if (!cls) return
      const updated = active ? [...cls.activePlugins, pluginId] : cls.activePlugins.filter((p) => p !== pluginId)
      k12Store.getState().updateClassPlugins(classId, updated)
      k12Store
        .getState()
        .logAction(
          active ? 'plugin.installed' : 'plugin.revoked',
          { classId, pluginId, active, scope: 'class' },
          'info',
          pluginId
        )
    },
    [classes]
  )

  const allowedPlugins = district?.allowedPlugins ?? []

  return (
    <Stack gap="lg">
      {filteredSchools.map((school) => {
        const schoolClasses = classes.filter((c) => c.schoolId === school.id)
        return (
          <Box key={school.id}>
            <Group gap="xs" mb="xs">
              <IconBuilding size={16} />
              <Text fw={600} size="sm">
                {school.name}
              </Text>
            </Group>

            {schoolClasses.length === 0 ? (
              <Text size="xs" c="dimmed" ml="md">
                No classes.
              </Text>
            ) : (
              <Stack gap="xs" ml="md">
                {schoolClasses.map((cls) => (
                  <Box
                    key={cls.id}
                    p="xs"
                    style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 6 }}
                  >
                    <Group gap="xs" mb={4}>
                      <Text size="sm" fw={500}>
                        {cls.name}
                      </Text>
                      <Badge size="xs" variant="light">
                        {cls.gradeLevel}
                      </Badge>
                      <Badge size="xs" variant="outline" color="teal">
                        {cls.activePlugins.length} active
                      </Badge>
                    </Group>
                    <Group gap="sm">
                      {allowedPlugins.map((pluginId) => (
                        <Checkbox
                          key={pluginId}
                          label={pluginId}
                          size="xs"
                          checked={cls.activePlugins.includes(pluginId)}
                          disabled={!canToggle}
                          onChange={(e) => handleTogglePlugin(cls.id, pluginId, e.currentTarget.checked)}
                        />
                      ))}
                    </Group>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        )
      })}

      {filteredSchools.length === 0 && (
        <Text size="sm" c="dimmed">
          No schools available.
        </Text>
      )}
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function K12AdminPanel() {
  const currentUser = useK12((s) => s.currentUser)
  const isAuthenticated = useK12((s) => s.isAuthenticated)
  const role = currentUser?.role ?? null

  // Access gate: must be logged in and not a student
  if (!isAuthenticated || !currentUser || role === 'student') {
    return (
      <Stack p="md">
        <Alert color="red" title="Access Denied" icon={<IconShieldCheck size={18} />}>
          Admin access required. Log in as a teacher, school admin, or district admin.
        </Alert>
      </Stack>
    )
  }

  const isDistrictAdmin = role === 'district-admin'
  const isSchoolAdmin = role === 'school-admin'

  // Determine default tab based on role
  const defaultTab = isDistrictAdmin || isSchoolAdmin ? 'approvals' : 'audit'

  return (
    <Stack p="md" gap="lg">
      <Flex align="center" gap="xs">
        <IconShieldCheck size={20} />
        <Title order={5}>K12 Admin Panel</Title>
        <Badge size="sm" variant="light" ml="auto">
          {currentUser.name} ({currentUser.role})
        </Badge>
      </Flex>

      <Tabs defaultValue={defaultTab}>
        <Tabs.List>
          {(isDistrictAdmin || isSchoolAdmin) && (
            <Tabs.Tab value="approvals" leftSection={<IconClipboardList size={14} />}>
              Approval Queue
            </Tabs.Tab>
          )}
          <Tabs.Tab value="audit" leftSection={<IconClipboardList size={14} />}>
            Audit Log
          </Tabs.Tab>
          <Tabs.Tab value="proxy" leftSection={<IconChartBar size={14} />}>
            Platform Proxy
          </Tabs.Tab>
          {isDistrictAdmin && (
            <Tabs.Tab value="policy" leftSection={<IconSettings size={14} />}>
              District Policy
            </Tabs.Tab>
          )}
          {(isDistrictAdmin || isSchoolAdmin) && (
            <Tabs.Tab value="schools" leftSection={<IconBuilding size={14} />}>
              Schools &amp; Classes
            </Tabs.Tab>
          )}
        </Tabs.List>

        {(isDistrictAdmin || isSchoolAdmin) && (
          <Tabs.Panel value="approvals" pt="md">
            <ApprovalQueueTab />
          </Tabs.Panel>
        )}

        <Tabs.Panel value="audit" pt="md">
          <AuditLogTab />
        </Tabs.Panel>

        <Tabs.Panel value="proxy" pt="md">
          <PlatformProxyAdminPanel districtId={currentUser.districtId} role={role as 'district-admin' | 'school-admin' | 'teacher'} />
        </Tabs.Panel>

        {isDistrictAdmin && (
          <Tabs.Panel value="policy" pt="md">
            <DistrictPolicyTab />
          </Tabs.Panel>
        )}

        {(isDistrictAdmin || isSchoolAdmin) && (
          <Tabs.Panel value="schools" pt="md">
            <SchoolsClassesTab />
          </Tabs.Panel>
        )}
      </Tabs>
    </Stack>
  )
}
