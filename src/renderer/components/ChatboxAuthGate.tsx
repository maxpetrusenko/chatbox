import { Alert, Button, Center, Loader, Paper, Stack, Text } from '@mantine/core'
import type { PluginAppAuthType } from '@shared/plugin-types'
import { IconAlertCircle, IconLock } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { navigateToSettings } from '@/modals/Settings'
import { useChatboxAuthStore } from '@/stores/chatboxAuthStore'
import { useK12 } from '@/stores/k12Store'

interface ChatboxAuthGateProps {
  appName: string
  authType?: PluginAppAuthType
  message?: string
  mode?: 'inline' | 'page'
  children: ReactNode
}

export default function ChatboxAuthGate({
  appName,
  authType = 'chatbox-ai-login',
  message,
  mode = 'inline',
  children,
}: ChatboxAuthGateProps) {
  const chatboxStatus = useChatboxAuthStore((state) => state.status)
  const validate = useChatboxAuthStore((state) => state.validate)
  const isK12Authenticated = useK12((state) => state.isAuthenticated)

  useEffect(() => {
    if (authType !== 'chatbox-ai-login') return
    void validate()
  }, [authType, validate])

  const status = authType === 'k12-login' ? (isK12Authenticated ? 'signed_in' : 'signed_out') : chatboxStatus
  const signInPath = authType === 'k12-login' ? '/settings/k12-login' : '/provider/chatbox-ai'

  if (status === 'signed_in') {
    return <>{children}</>
  }

  const checking = status === 'checking'
  const body = (
    <Stack gap="xs" align={mode === 'page' ? 'center' : 'flex-start'}>
      <Center
        w={mode === 'page' ? 44 : undefined}
        h={mode === 'page' ? 44 : undefined}
        style={mode === 'page' ? { borderRadius: '50%', background: 'var(--mantine-color-dark-6)' } : undefined}
      >
        <IconLock size={mode === 'page' ? 20 : 16} />
      </Center>
      <Stack gap={4} align={mode === 'page' ? 'center' : 'flex-start'}>
        <Text size={mode === 'page' ? 'lg' : 'sm'} fw={700} ta={mode === 'page' ? 'center' : 'left'}>
          Sign in to use {appName}
        </Text>
        <Text size="sm" c="dimmed" ta={mode === 'page' ? 'center' : 'left'} maw={mode === 'page' ? 420 : undefined}>
          {checking ? 'Checking your Chatbox AI session.' : message || `Sign in before using ${appName}.`}
        </Text>
      </Stack>
      <Button size={mode === 'page' ? 'sm' : 'xs'} onClick={() => navigateToSettings(signInPath)} disabled={checking}>
        {checking ? <Loader size={14} color="currentColor" /> : 'Sign in'}
      </Button>
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
