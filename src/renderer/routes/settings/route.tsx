import { ActionIcon, Box, Flex, Indicator, Stack, Text } from '@mantine/core'
import {
  IconAdjustmentsHorizontal,
  IconBook,
  IconBox,
  IconCategory,
  IconChevronLeft,
  IconChevronRight,
  IconCircleDottedLetterM,
  IconFileText,
  IconKeyboard,
  IconMessages,
  IconPuzzle,
  IconShieldCheck,
  IconSparkles,
  IconUpload,
  IconUser,
  IconWorldWww,
} from '@tabler/icons-react'
import { createFileRoute, Link, Outlet, useCanGoBack, useRouter, useRouterState } from '@tanstack/react-router'
import clsx from 'clsx'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'
import Divider from '@/components/common/Divider'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import Page from '@/components/layout/Page'
import { useProviders } from '@/hooks/useProviders'
import { useIsSmallScreen } from '@/hooks/useScreenChange'
import platform from '@/platform'
import { isStudentSettingsKeyAllowed } from '@/stores/k12-auth'
import { useK12 } from '@/stores/k12Store'
import { featureFlags } from '@/utils/feature-flags'

const ITEMS = [
  {
    key: 'chatbox-ai',
    label: 'Chatbox AI',
    icon: <IconSparkles className="w-full h-full" />,
  },
  {
    key: 'provider',
    label: 'Model Provider',
    icon: <IconCategory className="w-full h-full" />,
  },
  {
    key: 'default-models',
    label: 'Default Models',
    icon: <IconBox className="w-full h-full" />,
  },
  {
    key: 'web-search',
    label: 'Web Search',
    icon: <IconWorldWww className="w-full h-full" />,
  },
  ...(featureFlags.mcp
    ? [
        {
          key: 'mcp',
          label: 'MCP',
          icon: <IconCircleDottedLetterM className="w-full h-full" />,
        },
      ]
    : []),
  ...(featureFlags.knowledgeBase
    ? [
        {
          key: 'knowledge-base',
          label: 'Knowledge Base',
          icon: <IconBook className="w-full h-full" />,
        },
      ]
    : []),
  {
    key: 'k12-login',
    label: 'K12 Login',
    icon: <IconUser className="w-full h-full" />,
  },
  {
    key: 'plugins',
    label: 'Plugin Marketplace',
    icon: <IconPuzzle className="w-full h-full" />,
  },
  {
    key: 'plugins-drop',
    label: 'Plugin Drop',
    icon: <IconUpload className="w-full h-full" />,
  },
  {
    key: 'k12-admin',
    label: 'K12 Admin',
    icon: <IconShieldCheck className="w-full h-full" />,
  },
  {
    key: 'document-parser',
    label: 'Document Parser',
    icon: <IconFileText className="w-full h-full" />,
  },
  {
    key: 'chat',
    label: 'Chat Settings',
    icon: <IconMessages className="w-full h-full" />,
  },
  ...(platform.type === 'mobile'
    ? []
    : [
        {
          key: 'hotkeys',
          label: 'Keyboard Shortcuts',
          icon: <IconKeyboard className="w-full h-full" />,
        },
      ]),
  {
    key: 'general',
    label: 'General Settings',
    icon: <IconAdjustmentsHorizontal className="w-full h-full" />,
  },
]

function getSettingsRoutePath(key: string) {
  switch (key) {
    case 'chatbox-ai':
      return '/settings/chatbox-ai'
    case 'provider':
      return '/settings/provider'
    case 'default-models':
      return '/settings/default-models'
    case 'web-search':
      return '/settings/web-search'
    case 'mcp':
      return '/settings/mcp'
    case 'knowledge-base':
      return '/settings/knowledge-base'
    case 'k12-login':
      return '/settings/k12-login'
    case 'plugins':
      return '/settings/plugins'
    case 'plugins-drop':
      return '/settings/plugins-drop'
    case 'k12-admin':
      return '/settings/k12-admin'
    case 'document-parser':
      return '/settings/document-parser'
    case 'chat':
      return '/settings/chat'
    case 'hotkeys':
      return '/settings/hotkeys'
    case 'general':
      return '/settings/general'
    default:
      return '/settings/general'
  }
}

export const Route = createFileRoute('/settings')({
  component: RouteComponent,
})

export function RouteComponent() {
  const { t } = useTranslation()
  const router = useRouter()
  const routerState = useRouterState()
  const canGoBack = useCanGoBack()
  const isSmallScreen = useIsSmallScreen()

  return (
    <Page
      title={t('Settings')}
      left={
        isSmallScreen && routerState.location.pathname !== '/settings' && canGoBack ? (
          <ActionIcon
            className="controls"
            variant="subtle"
            size={28}
            color="chatbox-secondary"
            mr="sm"
            onClick={() => router.history.back()}
          >
            <IconChevronLeft />
          </ActionIcon>
        ) : undefined
      }
    >
      <SettingsRoot />
      <Toaster richColors position="bottom-center" />
    </Page>
  )
}

export function SettingsRoot() {
  const { t } = useTranslation()
  const router = useRouter()
  const routerState = useRouterState()
  const key = routerState.location.pathname.split('/')[2]
  const isSmallScreen = useIsSmallScreen()
  const { providers: availableProviders } = useProviders()
  const isChatboxAIActivated = availableProviders.some((p) => p.id === 'chatbox-ai')
  const k12Role = useK12((s) => s.currentUser?.role ?? null)

  useEffect(() => {
    if (k12Role === 'student' && !isStudentSettingsKeyAllowed(key)) {
      void router.navigate({ to: '/settings/plugins', replace: true })
    }
  }, [key, k12Role, router])

  const visibleItems = ITEMS.filter((item) => {
    if (k12Role === 'student') {
      return isStudentSettingsKeyAllowed(item.key)
    }
    if (item.key === 'k12-admin') {
      return !!k12Role
    }
    return true
  })

  return (
    <Flex flex={1} h="100%" miw={isSmallScreen ? undefined : 800}>
      {(!isSmallScreen || routerState.location.pathname === '/settings') && (
        <Stack
          p={isSmallScreen ? 0 : 'xs'}
          gap={isSmallScreen ? 0 : 'xs'}
          maw={isSmallScreen ? undefined : 256}
          className={clsx(
            'border-solid border-0 border-r overflow-auto border-chatbox-border-primary',
            isSmallScreen ? 'w-full border-r-0' : 'flex-[1_0_auto]'
          )}
        >
          {visibleItems.map((item) => (
            <Link
              disabled={
                routerState.location.pathname === `/settings/${item.key}` ||
                routerState.location.pathname.startsWith(`/settings/${item.key}/`)
              }
              key={item.key}
              to={getSettingsRoutePath(item.key)}
              className={'block no-underline w-full'}
            >
              <Flex
                component="span"
                gap="xs"
                p="md"
                pr="xl"
                py={isSmallScreen ? 'sm' : undefined}
                align="center"
                c={item.key === key ? 'chatbox-brand' : 'chatbox-secondary'}
                bg={item.key === key ? 'var(--chatbox-background-brand-secondary)' : 'transparent'}
                className={clsx(
                  ' cursor-pointer select-none rounded-md',
                  item.key === key ? '' : 'hover:!bg-chatbox-background-gray-secondary'
                )}
              >
                <Box component="span" flex="0 0 auto" w={20} h={20} mr="xs">
                  {item.icon}
                </Box>
                <Text
                  flex={1}
                  lineClamp={1}
                  span={true}
                  className={`!text-inherit ${isSmallScreen ? 'min-h-[32px] leading-[32px]' : ''}`}
                >
                  {t(item.label)}
                </Text>
                {item.key === 'chatbox-ai' && isChatboxAIActivated && (
                  <Indicator size={8} color="chatbox-success" className="ml-auto" />
                )}
                {isSmallScreen && (
                  <ScalableIcon icon={IconChevronRight} size={20} className="!text-chatbox-tint-tertiary" />
                )}
              </Flex>

              {isSmallScreen && <Divider />}
            </Link>
          ))}
        </Stack>
      )}
      {!(isSmallScreen && routerState.location.pathname === '/settings') && (
        <Box flex="1 1 80%" className="overflow-auto">
          <Outlet />
        </Box>
      )}
    </Flex>
  )
}
