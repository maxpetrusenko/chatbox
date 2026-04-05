/**
 * @vitest-environment jsdom
 */

import type { PluginManifest } from '@shared/plugin-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authInfoStore } from '@/stores/authInfoStore'
import { chatboxAuthStore } from '@/stores/chatboxAuthStore'
import { pluginRegistryStore } from '@/stores/pluginRegistry'
import { getAuthToolSet } from './auth-tools'

const { startChatboxLoginFlowMock } = vi.hoisted(() => ({
  startChatboxLoginFlowMock: vi.fn(async () => ({
    loginUrl: 'https://chatboxai.app/en/authorize?ticket_id=ticket-123',
    ticketId: 'ticket-123',
  })),
}))

vi.mock('@/routes/settings/provider/chatbox-ai/-components/useLogin', () => ({
  startChatboxLoginFlow: startChatboxLoginFlowMock,
}))

const chessManifest: PluginManifest = {
  id: 'chess',
  name: 'Chess',
  version: '1.0.0',
  description: 'Play chess inline',
  category: 'internal',
  appAuth: { type: 'chatbox-ai-login' },
  tools: [{ name: 'start_game', description: 'Start a new game', parameters: [] }],
  widget: { entrypoint: 'ui.html' },
}

describe('auth-tools', () => {
  beforeEach(() => {
    startChatboxLoginFlowMock.mockClear()
    authInfoStore.getState().clearTokens()
    chatboxAuthStore.setState({ status: 'signed_out', profile: null, initialized: true })
    pluginRegistryStore.setState({ manifests: [], instances: [] })
    pluginRegistryStore.getState().registerManifest(chessManifest)
  })

  it('returns a plugin mount result for sign_in when an app is auth-blocked', async () => {
    const instance = pluginRegistryStore.getState().createInstance('chess', 'session-1')
    if (!instance) throw new Error('failed to create instance')

    const tools = getAuthToolSet('session-1')
    const executeSignIn = (tools.sign_in as { execute: (input: { service: 'auto' }) => Promise<unknown> }).execute
    const result = await executeSignIn({ service: 'auto' })

    expect(result).toMatchObject({
      message: 'Sign in to continue with Chess.',
      pluginMount: {
        pluginId: 'chess',
        instanceId: instance.instanceId,
      },
    })
    expect(startChatboxLoginFlowMock).not.toHaveBeenCalled()
  })

  it('starts browser login for forgot_password when no inline app target exists', async () => {
    const tools = getAuthToolSet('session-1')
    const executeForgotPassword = (tools.forgot_password as {
      execute: (input: { service: 'auto' }) => Promise<unknown>
    }).execute
    const result = await executeForgotPassword({ service: 'auto' })

    expect(result).toMatchObject({
      message: 'Opened Chatbox AI sign-in in your browser. Use Forgot password there.',
      loginUrl: 'https://chatboxai.app/en/authorize?ticket_id=ticket-123',
    })
    expect(startChatboxLoginFlowMock).toHaveBeenCalledTimes(1)
  })
})
