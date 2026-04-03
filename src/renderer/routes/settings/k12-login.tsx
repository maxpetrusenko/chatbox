import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Group,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import type { K12Role } from '@shared/plugin-types'
import { IconInfoCircle, IconLogin2, IconLogout, IconSchool, IconUser } from '@tabler/icons-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { K12_LOGIN_PRESETS, resolveK12LoginEmail, signInToTellMe, signOutFromTellMe } from '@/packages/tellme/k12'
import { hasTellMeSupabaseConfig } from '@/packages/tellme/supabase'
import { getK12HomePath, normalizeK12Email } from '@/stores/k12-auth'
import { useK12, useK12Auth } from '@/stores/k12Store'

export const Route = createFileRoute('/settings/k12-login')({
  component: RouteComponent,
})

const ROLE_COLORS: Record<K12Role, string> = {
  'district-admin': 'red',
  'school-admin': 'violet',
  teacher: 'teal',
  student: 'blue',
}

const ROLE_LABELS: Record<K12Role, string> = {
  'district-admin': 'District Admin',
  'school-admin': 'School Admin',
  teacher: 'Teacher',
  student: 'Student',
}

const PERMISSION_DESCRIPTIONS: Record<K12Role, string> = {
  'district-admin': 'Full access. Manage all schools, approve plugins, set policy, and review safety logs.',
  'school-admin': "Manage your school's plugins, approvals, and school-level controls.",
  teacher: 'Request plugins, drop packages, configure class tools, and connect approved apps.',
  student: 'Use approved class plugins only. No install or admin controls.',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function PresetCard({
  alias,
  email,
  name,
  role,
  schoolName,
  onUse,
}: {
  alias: string
  email: string
  name: string
  role: K12Role
  schoolName: string
  onUse: (alias: string) => void
}) {
  return (
    <Card padding="sm" radius="md" withBorder>
      <Stack gap={6}>
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Text size="sm" fw={600}>
              {name}
            </Text>
            <Text size="xs" c="dimmed">
              {email}
            </Text>
          </Stack>
          <Badge size="xs" variant="light" color={ROLE_COLORS[role]}>
            {ROLE_LABELS[role]}
          </Badge>
        </Group>
        <Group gap={4}>
          <IconSchool size={12} style={{ opacity: 0.5 }} />
          <Text size="xs" c="dimmed">
            {schoolName}
          </Text>
        </Group>
        <Button size="xs" variant="light" onClick={() => onUse(alias)}>
          Use account
        </Button>
      </Stack>
    </Card>
  )
}

function LoggedInView() {
  const navigate = useNavigate()
  const { user, role } = useK12Auth()
  const schools = useK12((state) => state.schools)

  if (!user || !role) {
    return null
  }

  const schoolName = schools.find((school) => school.id === user.schoolId)?.name ?? 'District scope'
  const destination = getK12HomePath(role)

  return (
    <Stack gap="lg">
      <Title order={5}>Logged in as</Title>

      <Card padding="lg" radius="md" withBorder>
        <Group justify="space-between" wrap="nowrap">
          <Group gap="md" wrap="nowrap">
            <Avatar size="xl" radius="xl" color={ROLE_COLORS[role]}>
              {getInitials(user.name)}
            </Avatar>
            <Stack gap={4}>
              <Text fw={600}>{user.name}</Text>
              <Text size="sm" c="dimmed">
                {user.email}
              </Text>
              <Badge size="sm" variant="filled" color={ROLE_COLORS[role]}>
                {ROLE_LABELS[role]}
              </Badge>
              <Group gap={4}>
                <IconSchool size={14} style={{ opacity: 0.5 }} />
                <Text size="sm" c="dimmed">
                  {schoolName}
                </Text>
              </Group>
            </Stack>
          </Group>
          <Button
            variant="light"
            color="red"
            leftSection={<IconLogout size={16} />}
            onClick={() => void signOutFromTellMe()}
          >
            Logout
          </Button>
        </Group>
      </Card>

      <Alert
        variant="light"
        color={ROLE_COLORS[role]}
        title={`${ROLE_LABELS[role]} permissions`}
        icon={<IconInfoCircle size={18} />}
      >
        {PERMISSION_DESCRIPTIONS[role]}
      </Alert>

      <Group>
        <Button
          leftSection={<IconLogin2 size={16} />}
          onClick={() => {
            if (destination === '/') {
              void navigate({ to: '/' })
              return
            }
            if (destination === '/settings/plugins') {
              void navigate({ to: '/settings/plugins' })
              return
            }
            void navigate({ to: '/settings/k12-admin' })
          }}
        >
          {role === 'student' ? 'Open Student Chat' : 'Open K12 Workspace'}
        </Button>
      </Group>
    </Stack>
  )
}

export function RouteComponent() {
  const navigate = useNavigate()
  const { isAuthenticated } = useK12Auth()
  const [login, setLogin] = useState('teacher')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const configured = hasTellMeSupabaseConfig()
  const teacherPreset = useMemo(() => K12_LOGIN_PRESETS.find((entry) => entry.alias === 'teacher'), [])
  const studentPreset = useMemo(() => K12_LOGIN_PRESETS.find((entry) => entry.alias === 'student'), [])

  const completeLogin = async (nextLogin: string, nextPassword: string) => {
    try {
      setSubmitting(true)
      const snapshot = await signInToTellMe(nextLogin, nextPassword)
      const role = snapshot?.user.role
      if (!role) {
        setError('Login succeeded, but no K12 role was found for this account.')
        return
      }
      setError(null)
      const destination = getK12HomePath(role)
      if (destination === '/') {
        void navigate({ to: '/' })
        return
      }
      if (destination === '/settings/plugins') {
        void navigate({ to: '/settings/plugins' })
        return
      }
      void navigate({ to: '/settings/k12-admin' })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : String(loginError))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUseAlias = (alias: string) => {
    setLogin(alias)
    setPassword('password')
    setError(null)
  }

  if (isAuthenticated) {
    return (
      <Stack p="md" gap="lg">
        <Group gap="xs">
          <IconUser size={20} />
          <Title order={5}>K12 School Login</Title>
        </Group>
        <LoggedInView />
      </Stack>
    )
  }

  return (
    <Stack p="md" gap="lg">
      <Group gap="xs">
        <IconUser size={20} />
        <Title order={5}>K12 School Login</Title>
      </Group>

      <Text size="sm" c="dimmed">
        Real teacher and student auth lives in TellMe Supabase. Alias login still works: <Code>teacher</Code> /{' '}
        <Code>password</Code> and <Code>student</Code> / <Code>password</Code>.
      </Text>

      {!configured && (
        <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
          TellMe auth is not configured. Demo login still works with <Code>teacher</Code>, <Code>student</Code>,{' '}
          <Code>school-admin</Code>, or <Code>district-admin</Code> and password <Code>password</Code>.
        </Alert>
      )}

      <Card padding="lg" radius="md" withBorder>
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text fw={700} size="lg">
                Fastest path
              </Text>
              <Text size="sm" c="dimmed">
                Login as teacher. Then open Plugin Drop and upload your <Code>.zip</Code> or <Code>.cbplugin</Code>{' '}
                package.
              </Text>
            </Box>
            <Badge size="sm" variant="light" color="teal">
              Teacher demo
            </Badge>
          </Group>
          <Group>
            <Button size="sm" disabled={submitting} onClick={() => void completeLogin('teacher', 'password')}>
              Login as Teacher
            </Button>
            <Button
              size="sm"
              variant="light"
              disabled={submitting}
              onClick={() => void completeLogin('student', 'password')}
            >
              Login as Student
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <TextInput
            label="School Login"
            placeholder="teacher, student, or full school email"
            value={login}
            onChange={(event) => setLogin(event.currentTarget.value)}
            leftSection={<IconUser size={16} />}
          />

          <PasswordInput
            label="Password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            leftSection={<IconLogin2 size={16} />}
          />

          <Group>
            <Button
              leftSection={<IconLogin2 size={16} />}
              disabled={submitting}
              loading={submitting}
              onClick={() => void completeLogin(login, password)}
            >
              Sign in
            </Button>
            <Code>{resolveK12LoginEmail(login)}</Code>
          </Group>

          {error && (
            <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
              {error}
            </Alert>
          )}
        </Stack>
      </Card>

      <Alert variant="light" color="blue" icon={<IconInfoCircle size={18} />}>
        Students land in chat. Teachers land in Plugin settings. Admins land in K12 Admin.
      </Alert>

      <Stack gap="xs">
        <Group justify="space-between">
          <Title order={6}>Demo accounts</Title>
          <Code>teacher / password • student / password</Code>
        </Group>
        <SimpleGrid cols={2} spacing="md">
          {K12_LOGIN_PRESETS.map((preset) => (
            <PresetCard key={preset.alias} {...preset} onUse={handleUseAlias} />
          ))}
        </SimpleGrid>
      </Stack>

      <Stack gap="xs">
        <Title order={6}>Alias shortcuts</Title>
        <Text size="sm" c="dimmed">
          <Code>teacher</Code>, <Code>student</Code>, <Code>school-admin</Code>, and <Code>district-admin</Code> resolve
          to their TellMe accounts. Full emails work too.
        </Text>
        <Text size="xs" c="dimmed">
          Current login input: {normalizeK12Email(login)}
        </Text>
      </Stack>

      <Card padding="sm" radius="md" withBorder>
        <Group justify="space-between" wrap="nowrap">
          <Box>
            <Text fw={600} size="sm">
              Plugin Drop next
            </Text>
            <Text size="xs" c="dimmed">
              Teacher path: login, open Plugin Drop, run AI review, then enable for class scope.
            </Text>
          </Box>
          <Button size="xs" variant="light" onClick={() => void navigate({ to: '/settings/plugins-drop' })}>
            Open Plugin Drop
          </Button>
        </Group>
      </Card>

      {teacherPreset && studentPreset && (
        <Card padding="sm" radius="md" withBorder>
          <Text size="xs" c="dimmed">
            Seeded accounts: {teacherPreset.email} and {studentPreset.email}
          </Text>
        </Card>
      )}
    </Stack>
  )
}
