/**
 * @vitest-environment jsdom
 */

import { createMemoryHistory } from '@tanstack/react-router'
import { describe, expect, it, vi } from 'vitest'

function stubRouteComponent(label: string) {
  return { RouteComponent: () => label }
}

vi.mock('@/components/knowledge-base/KnowledgeBase', () => ({
  default: () => 'knowledge-base',
}))
vi.mock('@/components/layout/Overlay', () => ({
  Modal: ({ children }: { children: unknown }) => children,
}))
vi.mock('@/components/common/ScalableIcon', () => ({
  ScalableIcon: () => null,
}))
vi.mock('@/hooks/useAppTheme', () => ({
  getThemeDesign: () => ({ breakpoints: { values: { sm: 640 } } }),
}))
vi.mock('@/hooks/useNeedRoomForWinControls', () => ({
  default: () => ({ needRoomForMacWindowControls: false }),
}))
vi.mock('@/router', () => ({
  router: {
    state: { location: { pathname: '/', search: {} } },
    navigate: vi.fn(),
  },
}))
vi.mock('@/routes/settings/chat', () => stubRouteComponent('chat'))
vi.mock('@/routes/settings/chatbox-ai', () => stubRouteComponent('chatbox-ai'))
vi.mock('@/routes/settings/default-models', () => stubRouteComponent('default-models'))
vi.mock('@/routes/settings/document-parser', () => stubRouteComponent('document-parser'))
vi.mock('@/routes/settings/general', () => stubRouteComponent('general'))
vi.mock('@/routes/settings/hotkeys', () => stubRouteComponent('hotkeys'))
vi.mock('@/routes/settings/index', () => stubRouteComponent('index'))
vi.mock('@/routes/settings/k12-admin', () => stubRouteComponent('k12-admin'))
vi.mock('@/routes/settings/k12-login', () => stubRouteComponent('k12-login'))
vi.mock('@/routes/settings/mcp', () => stubRouteComponent('mcp'))
vi.mock('@/routes/settings/plugins-drop', () => stubRouteComponent('plugins-drop'))
vi.mock('@/routes/settings/plugins', () => stubRouteComponent('plugins'))
vi.mock('@/routes/settings/provider/$providerId', () => stubRouteComponent('provider-id'))
vi.mock('@/routes/settings/provider/chatbox-ai', () => stubRouteComponent('provider-chatbox-ai'))
vi.mock('@/routes/settings/provider/index', () => stubRouteComponent('provider-index'))
vi.mock('@/routes/settings/provider/route', () => stubRouteComponent('provider-route'))
vi.mock('@/routes/settings/web-search', () => stubRouteComponent('web-search'))
vi.mock('@/routes/settings/route', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')
  return {
    SettingsRoot: () => actual.Outlet(),
  }
})

import { createSettingsModalRouter } from './Settings'

describe('settings modal router', () => {
  it('registers plugin and k12 settings routes', () => {
    const router = createSettingsModalRouter(createMemoryHistory({ initialEntries: ['/settings/plugins'] }))

    expect(() => router.buildLocation({ to: '/settings/plugins' })).not.toThrow()
    expect(() => router.buildLocation({ to: '/settings/plugins-drop' })).not.toThrow()
    expect(() => router.buildLocation({ to: '/settings/k12-login' })).not.toThrow()
    expect(() => router.buildLocation({ to: '/settings/k12-admin' })).not.toThrow()
  })
})
