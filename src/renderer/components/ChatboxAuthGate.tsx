import {
  Alert,
  Badge,
  Button,
  Center,
  Code,
  Group,
  Loader,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import type { PluginAppAuthType } from '@shared/plugin-types'
import { IconAlertCircle, IconLock } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { K12_LOGIN_PRESETS, signInToTellMe } from '@/packages/tellme/k12'
import { hasTellMeSupabaseConfig } from '@/packages/tellme/supabase'
import platform from '@/platform'
import { useAuthTokens } from '@/routes/settings/provider/chatbox-ai/-components/useAuthTokens'
import { useLogin } from '@/routes/settings/provider/chatbox-ai/-components/useLogin'
import { useChatboxAuthStore } from '@/stores/chatboxAuthStore'
import { useK12 } from '@/stores/k12Store'
import { useLanguage } from '@/stores/settingsStore'

interface ChatboxAuthGateProps {
  appName: string
  authType?: PluginAppAuthType
  message?: string
  mode?: 'inline' | 'page'
  defaultExpanded?: boolean
  children?: ReactNode
}

function InlineChatboxAiLogin() {
  const language = useLanguage()
  const { saveAuthTokens } = useAuthTokens()
  const { handleLogin, loginError, loginState, loginUrl } = useLogin({
    language,
    onLoginSuccess: saveAuthTokens,
  })

  const isBusy = loginState === 'requesting' || loginState === 'polling'

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Finish Chatbox AI sign-in here, then the app will continue automatically.
      </Text>
      <Button size="sm" onClick={() => handleLogin()} disabled={loginState === 'success'} loading={isBusy}>
        {loginState === 'polling'
          ? 'Waiting for sign-in…'
          : loginState === 'success'
            ? 'Signed in'
            : 'Continue with Chatbox AI'}
      </Button>
      {loginState === 'polling' && loginUrl && (
        <Alert color="blue" variant="light">
          <Stack gap={6}>
            <Text size="sm">Complete sign-in in your browser. If it did not open, use the link below.</Text>
            <Button size="xs" variant="subtle" onClick={() => platform.openLink(loginUrl)}>
              Open sign-in link
            </Button>
          </Stack>
        </Alert>
      )}
      {loginError && (
        <Alert color="red" variant="light">
          <Text size="sm">{loginError}</Text>
        </Alert>
      )}
    </Stack>
  )
}

function InlineK12Login() {
  const configured = hasTellMeSupabaseConfig()
  const [login, setLogin] = useState(configured ? '' : 'teacher')
  const [password, setPassword] = useState(configured ? '' : 'password')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const presets = useMemo(() => K12_LOGIN_PRESETS.slice(0, 4), [])

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)
      await signInToTellMe(login, password)
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : String(authError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Sign in with your school account here, then the app will continue automatically.
      </Text>
      {!configured && (
        <Alert color="blue" variant="light">
          <Text size="sm">
            Demo login works inline. Try <Code>teacher</Code>, <Code>school-admin</Code>, <Code>district-admin</Code>,
            or <Code>student</Code> with password <Code>password</Code>.
          </Text>
        </Alert>
      )}
      <Group gap="xs">
        {presets.map((preset) => (
          <Button
            key={preset.alias}
            size="compact-xs"
            variant="light"
            onClick={() => {
              setLogin(preset.alias)
              setPassword(configured ? password : 'password')
              setError(null)
            }}
          >
            {preset.alias}
          </Button>
        ))}
      </Group>
      <TextInput
        label="School login"
        value={login}
        onChange={(event) => setLogin(event.currentTarget.value)}
        placeholder={configured ? 'teacher@school.edu' : 'teacher'}
      />
      <PasswordInput
        label="Password"
        value={password}
        onChange={(event) => setPassword(event.currentTarget.value)}
        placeholder="password"
      />
      <Button size="sm" onClick={() => void handleSubmit()} loading={submitting} disabled={!login || !password}>
        Sign in to school account
      </Button>
      {error && (
        <Alert color="red" variant="light">
          <Text size="sm">{error}</Text>
        </Alert>
      )}
    </Stack>
  )
}

export default function ChatboxAuthGate({
  appName,
  authType = 'chatbox-ai-login',
  message,
  mode = 'inline',
  defaultExpanded = false,
  children,
}: ChatboxAuthGateProps) {
  const chatboxStatus = useChatboxAuthStore((state) => state.status)
  const validate = useChatboxAuthStore((state) => state.validate)
  const isK12Authenticated = useK12((state) => state.isAuthenticated)
  const [expanded, setExpanded] = useState(defaultExpanded)

  useEffect(() => {
    if (authType !== 'chatbox-ai-login') return
    void validate()
  }, [authType, validate])

  const status = authType === 'k12-login' ? (isK12Authenticated ? 'signed_in' : 'signed_out') : chatboxStatus

  useEffect(() => {
    if (status === 'signed_in') {
      setExpanded(false)
    }
  }, [status])

  if (status === 'signed_in') {
    return <>{children}</>
  }

  const checking = status === 'checking'
  const body = (
    <Stack gap="sm" align={mode === 'page' ? 'center' : 'flex-start'}>
      <Center
        w={mode === 'page' ? 44 : undefined}
        h={mode === 'page' ? 44 : undefined}
        style={mode === 'page' ? { borderRadius: '50%', background: 'var(--mantine-color-dark-6)' } : undefined}
      >
        <IconLock size={mode === 'page' ? 20 : 16} />
      </Center>
      <Stack gap={4} align={mode === 'page' ? 'center' : 'flex-start'}>
        <Group gap="xs">
          <Text size={mode === 'page' ? 'lg' : 'sm'} fw={700} ta={mode === 'page' ? 'center' : 'left'}>
            Sign in to use {appName}
          </Text>
          <Badge size="xs" variant="light" color={authType === 'k12-login' ? 'teal' : 'blue'}>
            {authType === 'k12-login' ? 'K12 login' : 'Chatbox AI'}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed" ta={mode === 'page' ? 'center' : 'left'} maw={mode === 'page' ? 420 : undefined}>
          {checking ? 'Checking your Chatbox AI session.' : message || `Sign in before using ${appName}.`}
        </Text>
      </Stack>
      <Button size={mode === 'page' ? 'sm' : 'xs'} onClick={() => setExpanded((value) => !value)} disabled={checking}>
        {checking ? <Loader size={14} color="currentColor" /> : expanded ? 'Hide sign-in' : 'Sign in'}
      </Button>
      {expanded && (authType === 'k12-login' ? <InlineK12Login /> : <InlineChatboxAiLogin />)}
    </Stack>
  )

  if (mode === 'page') {
    return (
      <Paper withBorder radius="lg" p="xl">
        <Stack gap="md" align="center" py="xl">
          {body}
        </Stack>
      </Paper>
    )
  }

  return (
    <Alert icon={<IconAlertCircle size={16} />} color="blue" className="my-2">
      {body}
    </Alert>
  )
}
