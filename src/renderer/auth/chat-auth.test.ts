/**
 * @vitest-environment jsdom
 */

import type { PluginManifest } from '@shared/plugin-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authInfoStore } from '@/stores/authInfoStore'
import { chatboxAuthStore } from '@/stores/chatboxAuthStore'
import { k12Store } from '@/stores/k12Store'
import { pluginRegistryStore } from '@/stores/pluginRegistry'
import { settingsStore } from '@/stores/settingsStore'
import { executeChatAuthIntent, resolveChatAuthIntent, runChatAuthAction } from './chat-auth'

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

const classroomManifest: PluginManifest = {
  id: 'classroom-tools',
  name: 'Classroom Tools',
  version: '1.0.0',
  description: 'Teacher tools inline',
  category: 'internal',
  appAuth: { type: 'k12-login' },
  tools: [{ name: 'open_home', description: 'Open home', parameters: [] }],
  widget: { entrypoint: 'ui.html' },
}

describe('chat auth', () => {
  beforeEach(() => {
    startChatboxLoginFlowMock.mockClear()
    authInfoStore.getState().clearTokens()
    chatboxAuthStore.setState({ status: 'signed_out', profile: null, initialized: true })
    k12Store.setState((state) => ({
      ...state,
      isAuthenticated: false,
      currentUser: null,
    }))
    settingsStore.setState({ language: 'en' })
    pluginRegistryStore.setState({ manifests: [], instances: [] })
    pluginRegistryStore.getState().registerManifest(chessManifest)
    pluginRegistryStore.getState().registerManifest(classroomManifest)
  })

  it('parses sign-in and forgot-password requests', () => {
    expect(resolveChatAuthIntent('sign me in')).toMatchObject({ action: 'sign_in', provider: 'auto' })
    expect(resolveChatAuthIntent('reset my password')).toMatchObject({ action: 'forgot_password' })
    expect(resolveChatAuthIntent('log out')).toMatchObject({ action: 'sign_out', provider: 'all' })
  })

  it('reopens the latest blocked app inline for sign-in', async () => {
    const instance = pluginRegistryStore.getState().createInstance('chess', 'session-1')
    if (!instance) throw new Error('failed to create instance')

    const message = await executeChatAuthIntent('session-1', { action: 'sign_in', provider: 'auto' })

    expect(message.contentParts[0]).toEqual({ type: 'text', text: 'Sign in to continue with Chess.' })
    expect(message.contentParts.some((part) => part.type === 'plugin' && part.pluginId === 'chess')).toBe(true)
    expect(startChatboxLoginFlowMock).not.toHaveBeenCalled()
  })

  it('starts Chatbox AI login when no blocked app is present', async () => {
    const result = await runChatAuthAction('session-1', { action: 'sign_in', provider: 'chatbox-ai' })

    expect(result.message).toBe('Opened Chatbox AI sign-in in your browser.')
    expect(result.loginUrl).toContain('ticket-123')
    expect(startChatboxLoginFlowMock).toHaveBeenCalledWith('en', { openInBrowser: true })
  })

  it('prefers K12 sign-in for plain sign-in requests', async () => {
    const message = await executeChatAuthIntent('session-1', { action: 'sign_in', provider: 'auto' })

    expect(message.contentParts[0]).toEqual({ type: 'text', text: 'Sign in with your school account here.' })
    expect(message.contentParts.some((part) => part.type === 'plugin' && part.pluginId === '__k12_auth__')).toBe(true)
    expect(startChatboxLoginFlowMock).not.toHaveBeenCalled()
  })

  it('signs out both Chatbox AI and K12 sessions', async () => {
    authInfoStore.getState().setTokens({ accessToken: 'access', refreshToken: 'refresh' })
    chatboxAuthStore.setState({
      status: 'signed_in',
      profile: { id: 'user-1', email: 'max@example.com', created_at: new Date().toISOString() },
      initialized: true,
    })
    k12Store.setState((state) => ({
      ...state,
      isAuthenticated: true,
      currentUser: {
        id: 'teacher-1',
        email: 'teacher@example.com',
        name: 'Teacher Demo',
        role: 'teacher',
        districtId: 'district-1',
        schoolId: 'school-1',
      },
    }))

    const result = await runChatAuthAction('session-1', { action: 'sign_out', provider: 'all' })

    expect(result.message).toBe('Signed out of Chatbox AI and school account.')
    expect(authInfoStore.getState().getTokens()).toBeNull()
    expect(k12Store.getState().isAuthenticated).toBe(false)
  })

  it('keeps inline school auth visible for forgot-password on K12 apps', async () => {
    const instance = pluginRegistryStore.getState().createInstance('classroom-tools', 'session-1')
    if (!instance) throw new Error('failed to create instance')

    const message = await executeChatAuthIntent('session-1', { action: 'forgot_password', provider: 'auto' })

    expect(message.contentParts[0]).toEqual({
      type: 'text',
      text: 'Password resets for school accounts are handled by your school. Once you have new credentials, sign in to continue with Classroom Tools.',
    })
    expect(message.contentParts.some((part) => part.type === 'plugin' && part.pluginId === 'classroom-tools')).toBe(true)
    expect(startChatboxLoginFlowMock).not.toHaveBeenCalled()
  })
})
