import { Badge, Box, Button, Card, Flex, Group, Stack, Text, Title } from '@mantine/core'
import { IconPlugConnected, IconPlugConnectedX, IconPuzzle } from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'
import { usePluginAuth, pluginAuthStore } from '@/stores/pluginAuthStore'
import { usePluginRegistry } from '@/stores/pluginRegistry'
import type { PluginManifest } from '@shared/plugin-types'

export const Route = createFileRoute('/settings/plugins')({
  component: RouteComponent,
})

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

function PluginCard({ manifest }: { manifest: PluginManifest }) {
  const session = usePluginAuth((s) => s.sessions[manifest.id])
  const needsAuth = manifest.auth && manifest.auth.type !== 'none'
  const authStatus = session?.status || (needsAuth ? 'required' : 'none')

  const handleConnect = () => {
    if (!manifest.auth) return
    void pluginAuthStore.getState().beginAuth(manifest.id, manifest.auth)
  }

  const handleDisconnect = () => {
    void pluginAuthStore.getState().disconnect(manifest.id)
  }

  return (
    <Card padding="md" radius="md" withBorder>
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
          </Group>
          <Text size="xs" c="dimmed" mb="xs">
            {manifest.description}
          </Text>
          <Text size="xs" c="dimmed">
            {manifest.tools.length} tool{manifest.tools.length !== 1 ? 's' : ''}:{' '}
            {manifest.tools.map((t) => t.name).join(', ')}
          </Text>
        </Box>

        {needsAuth && (
          <Box style={{ flexShrink: 0 }}>
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
              >
                Connect
              </Button>
            )}
            {authStatus === 'error' && session?.error && (
              <Text size="xs" c="red" mt={4}>
                {session.error}
              </Text>
            )}
            {authStatus === 'expired' && (
              <Text size="xs" c="orange" mt={4}>
                Token expired. Reconnect to refresh.
              </Text>
            )}
          </Box>
        )}

        {!needsAuth && (
          <Badge size="sm" variant="light" color="green">
            Active
          </Badge>
        )}
      </Flex>
    </Card>
  )
}

function RouteComponent() {
  const manifests = usePluginRegistry((s) => s.manifests)

  const internal = manifests.filter((m) => m.category === 'internal')
  const publicApps = manifests.filter((m) => m.category === 'external-public')
  const authenticated = manifests.filter((m) => m.category === 'external-authenticated')

  return (
    <Stack p="md" gap="lg">
      <Flex align="center" gap="xs">
        <IconPuzzle size={20} />
        <Title order={5}>Plugins</Title>
      </Flex>
      <Text size="sm" c="dimmed">
        Plugins extend the chat with interactive tools. The AI automatically discovers and invokes
        plugin tools during conversation. Authenticated plugins require you to connect your account
        before first use.
      </Text>

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

      {manifests.length === 0 && (
        <Text size="sm" c="dimmed">
          No plugins registered.
        </Text>
      )}
    </Stack>
  )
}
