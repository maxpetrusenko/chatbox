import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Code,
  Group,
  PasswordInput,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import type { K12User } from '@shared/plugin-types'
import {
  IconBrandGoogle,
  IconInfoCircle,
  IconLock,
  IconLogin2,
  IconLogout,
  IconSchool,
  IconUser,
} from '@tabler/icons-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  authenticateDemoGoogle,
  authenticateDemoPassword,
  DEMO_LOGIN_PASSWORD,
  getK12HomePath,
  normalizeK12Email,
} from '@/stores/k12-auth'
import { DEMO_USERS, useK12Auth } from '@/stores/k12Store'

export const Route = createFileRoute('/settings/k12-login')({
  component: RouteComponent,
})

const ROLE_COLORS: Record<string, string> = {
  'district-admin': 'red',
  'school-admin': 'violet',
  teacher: 'teal',
  student: 'blue',
}

const ROLE_LABELS: Record<string, string> = {
  'district-admin': 'District Admin',
  'school-admin': 'School Admin',
  teacher: 'Teacher',
  student: 'Student',
}

const SCHOOL_NAMES: Record<string, string> = {
  'school-1': 'Lincoln Elementary',
  'school-2': 'Washington Middle School',
}

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'district-admin':
    'Full access. Manage all schools, approve/reject plugins, set global policies, view all audit logs.',
  'school-admin': "Manage your school's plugins. Approve requests, view school audit logs, override plugin settings.",
  teacher: 'Install from approved catalog, request new plugins, manage class plugin assignments.',
  student: 'Use plugins assigned to your class. No install or admin permissions.',
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

function UserCard({ user, onClick }: { user: K12User; onClick: () => void }) {
  const schoolName = user.schoolId ? SCHOOL_NAMES[user.schoolId] : 'Westfield Unified'

  return (
    <Card padding="lg" radius="md" withBorder style={{ cursor: 'pointer' }} onClick={onClick}>
      <Group gap="md" wrap="nowrap">
        <Avatar size="lg" radius="xl" color={ROLE_COLORS[user.role]}>
          {getInitials(user.name)}
        </Avatar>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm" truncate>
            {user.name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {user.email}
          </Text>
          <Group gap="xs">
            <Badge size="xs" variant="filled" color={ROLE_COLORS[user.role]}>
              {ROLE_LABELS[user.role]}
            </Badge>
          </Group>
          <Group gap={4}>
            <IconSchool size={12} style={{ opacity: 0.5 }} />
            <Text size="xs" c="dimmed">
              {schoolName}
            </Text>
          </Group>
        </Stack>
      </Group>
    </Card>
  )
}

function LoggedInView() {
  const navigate = useNavigate()
  const { user, logout, role } = useK12Auth()

  if (!user || !role) return null

  const destination = getK12HomePath(role)

  const schoolName = user.schoolId ? SCHOOL_NAMES[user.schoolId] : 'Westfield Unified'

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
              <Group gap="xs">
                <Badge size="sm" variant="filled" color={ROLE_COLORS[role]}>
                  {ROLE_LABELS[role]}
                </Badge>
              </Group>
              <Group gap={4}>
                <IconSchool size={14} style={{ opacity: 0.5 }} />
                <Text size="sm" c="dimmed">
                  {schoolName}
                </Text>
              </Group>
            </Stack>
          </Group>
          <Button variant="light" color="red" leftSection={<IconLogout size={16} />} onClick={logout}>
            Logout
          </Button>
        </Group>
      </Card>

      <Alert
        variant="light"
        color={ROLE_COLORS[role]}
        title={`${ROLE_LABELS[role]} Permissions`}
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

function DemoAccountCard({ user, onUse }: { user: K12User; onUse: (user: K12User) => void }) {
  return (
    <Card padding="sm" radius="md" withBorder>
      <Stack gap={6}>
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Text size="sm" fw={600}>
              {user.name}
            </Text>
            <Text size="xs" c="dimmed">
              {user.email}
            </Text>
          </Stack>
          <Badge size="xs" variant="light" color={ROLE_COLORS[user.role]}>
            {ROLE_LABELS[user.role]}
          </Badge>
        </Group>
        <Button size="xs" variant="light" onClick={() => onUse(user)}>
          Use account
        </Button>
      </Stack>
    </Card>
  )
}

function RouteComponent() {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useK12Auth()
  const [loginMode, setLoginMode] = useState<'google' | 'demo-password'>('google')
  const [email, setEmail] = useState('student')
  const [password, setPassword] = useState(DEMO_LOGIN_PASSWORD)
  const [error, setError] = useState<string | null>(null)

  const demoAccounts = useMemo(() => DEMO_USERS, [])

  const completeLogin = (user: K12User) => {
    const destination = getK12HomePath(user.role)
    login(user)
    setError(null)
    if (destination === '/') {
      void navigate({ to: '/' })
      return
    }
    if (destination === '/settings/plugins') {
      void navigate({ to: '/settings/plugins' })
      return
    }
    void navigate({ to: '/settings/k12-admin' })
  }

  const handleGoogleLogin = () => {
    const user = authenticateDemoGoogle(DEMO_USERS, email)
    if (!user) {
      setError('Use one of the demo school accounts below for the Google school login simulation.')
      return
    }
    completeLogin(user)
  }

  const handlePasswordLogin = () => {
    const user = authenticateDemoPassword(DEMO_USERS, email, password)
    if (!user) {
      setError('Invalid demo login. Use teacher or student with password password, or one of the school emails.')
      return
    }
    completeLogin(user)
  }

  const applyDemoAccount = (user: K12User) => {
    setEmail(user.role === 'teacher' ? 'teacher' : user.role === 'student' ? 'student' : normalizeK12Email(user.email))
    setPassword(DEMO_LOGIN_PASSWORD)
    setError(null)
  }

  if (isAuthenticated) {
    return (
      <Stack p="md" gap="lg">
        <Group gap="xs">
          <IconUser size={20} />
          <Title order={5}>K12 Demo Login</Title>
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
        School sign in for teachers and students. Google is simulated with demo accounts. Demo password works offline.
      </Text>

      <SegmentedControl
        value={loginMode}
        onChange={(value) => setLoginMode(value as 'google' | 'demo-password')}
        data={[
          { label: 'Google School Login', value: 'google' },
          { label: 'Demo Password', value: 'demo-password' },
        ]}
      />

      <Card padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <TextInput
            label="School Email"
            placeholder="student or teacher"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            leftSection={loginMode === 'google' ? <IconBrandGoogle size={16} /> : <IconUser size={16} />}
          />

          {loginMode === 'demo-password' && (
            <PasswordInput
              label="Demo Password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              leftSection={<IconLock size={16} />}
            />
          )}

          <Group>
            <Button
              leftSection={loginMode === 'google' ? <IconBrandGoogle size={16} /> : <IconLogin2 size={16} />}
              onClick={loginMode === 'google' ? handleGoogleLogin : handlePasswordLogin}
            >
              {loginMode === 'google' ? 'Continue with Google' : 'Sign in with Demo Password'}
            </Button>
            {loginMode === 'demo-password' && <Code>password</Code>}
          </Group>

          {error && (
            <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
              {error}
            </Alert>
          )}
        </Stack>
      </Card>

      <Alert variant="light" color="blue" icon={<IconInfoCircle size={18} />}>
        Student accounts land in chat. Teacher and admin accounts land in K12 controls.
      </Alert>

      <Stack gap="xs">
        <Group justify="space-between">
          <Title order={6}>Demo Accounts</Title>
          <Code>teacher / password • student / password</Code>
        </Group>
        <SimpleGrid cols={2} spacing="md">
          {demoAccounts.map((user) => (
            <DemoAccountCard key={user.id} user={user} onUse={applyDemoAccount} />
          ))}
        </SimpleGrid>
      </Stack>

      <Stack gap="xs">
        <Title order={6}>Role Quick View</Title>
        <SimpleGrid cols={2} spacing="md">
          {DEMO_USERS.map((user) => (
            <UserCard key={user.id} user={user} onClick={() => completeLogin(user)} />
          ))}
        </SimpleGrid>
      </Stack>
    </Stack>
  )
}
