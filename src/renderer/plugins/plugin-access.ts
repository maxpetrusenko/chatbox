import type { K12Role, PluginManifest } from '@shared/plugin-types'
import { chatboxAuthStore } from '@/stores/chatboxAuthStore'
import { k12Store } from '@/stores/k12Store'

export type PluginScopeBlockedReason = 'policy' | 'disabled'

export interface PluginScopeAccessState {
  role: K12Role | null
  managed: boolean
  isAllowed: boolean
  isActive: boolean
  blockedReason: PluginScopeBlockedReason | null
  blockedMessage: string | null
  canManage: boolean
  isStudent: boolean
}

export interface PluginAccessState {
  appAuthStatus: 'none' | 'required' | 'connected'
  appAuthMessage: string | null
  scope: PluginScopeAccessState
  launchBlockedReason: 'app-auth' | PluginScopeBlockedReason | null
  launchBlockedMessage: string | null
  canRenderWidget: boolean
  canExposeTools: boolean
}

function isChatboxAiSignedIn(): boolean {
  return chatboxAuthStore.getState().status === 'signed_in'
}

function isK12SignedIn(): boolean {
  return k12Store.getState().isAuthenticated
}

export function hasRequiredAppAuth(manifest: Pick<PluginManifest, 'appAuth'>): boolean {
  if (!manifest.appAuth) return true

  switch (manifest.appAuth.type) {
    case 'chatbox-ai-login':
      return isChatboxAiSignedIn()
    case 'k12-login':
      return isK12SignedIn()
    default:
      return true
  }
}

export function getPluginAppAuthStatus(manifest: Pick<PluginManifest, 'appAuth'>): 'none' | 'required' | 'connected' {
  if (!manifest.appAuth) return 'none'
  return hasRequiredAppAuth(manifest) ? 'connected' : 'required'
}

export function getPluginAppAuthBlockedMessage(manifest: Pick<PluginManifest, 'name' | 'appAuth'>): string | null {
  if (!manifest.appAuth) return null

  switch (manifest.appAuth.type) {
    case 'chatbox-ai-login':
      return `Sign in to Chatbox AI before using ${manifest.name}.`
    case 'k12-login':
      return `Sign in via K12 Login before using ${manifest.name}.`
    default:
      return null
  }
}

function getPluginPolicyBlockedMessage(manifest: Pick<PluginManifest, 'id' | 'name'>): string {
  const k12State = k12Store.getState()
  const currentUser = k12State.currentUser
  const district = k12State.district

  if (district?.blockedPlugins.includes(manifest.id)) {
    return `${manifest.name} is blocked by district policy.`
  }

  if (district && district.allowedPlugins.length > 0 && !district.allowedPlugins.includes(manifest.id)) {
    const approvedInstall = k12State.installRecords.some(
      (record) =>
        record.pluginId === manifest.id &&
        (record.status === 'approved' || record.status === 'active') &&
        (!currentUser?.schoolId || record.schoolId === currentUser.schoolId)
    )
    if (!approvedInstall) {
      return `${manifest.name} is not approved for the current school.`
    }
  }

  if (currentUser?.schoolId) {
    const school = k12State.schools.find((entry) => entry.id === currentUser.schoolId)
    const override = school?.pluginOverrides.find((entry) => entry.pluginId === manifest.id)
    if (override?.action === 'block') {
      return `${manifest.name} is blocked by school policy.`
    }
  }

  return `${manifest.name} is not available for the current scope.`
}

export function getPluginScopeAccessState(manifest: Pick<PluginManifest, 'id' | 'name'>): PluginScopeAccessState {
  const k12State = k12Store.getState()
  const currentUser = k12State.currentUser

  if (!k12State.isAuthenticated || !currentUser) {
    return {
      role: null,
      managed: false,
      isAllowed: true,
      isActive: true,
      blockedReason: null,
      blockedMessage: null,
      canManage: false,
      isStudent: false,
    }
  }

  const isAllowed = k12State.isPluginAllowed(manifest.id, currentUser.schoolId)
  const isActive = isAllowed ? k12State.isPluginActiveForCurrentScope(manifest.id) : false
  const blockedReason: PluginScopeBlockedReason | null = !isAllowed ? 'policy' : !isActive ? 'disabled' : null
  const isStudent = currentUser.role === 'student'

  return {
    role: currentUser.role,
    managed: true,
    isAllowed,
    isActive,
    blockedReason,
    blockedMessage:
      blockedReason === 'policy'
        ? getPluginPolicyBlockedMessage(manifest)
        : blockedReason === 'disabled'
          ? `${manifest.name} is disabled for the current scope.`
          : null,
    canManage: !isStudent && k12State.hasPermission('plugin.install'),
    isStudent,
  }
}

export function getPluginAccessState(manifest: Pick<PluginManifest, 'id' | 'name' | 'appAuth'>): PluginAccessState {
  const appAuthStatus = getPluginAppAuthStatus(manifest)
  const appAuthMessage = getPluginAppAuthBlockedMessage(manifest)
  const scope = getPluginScopeAccessState(manifest)

  if (appAuthStatus === 'required') {
    return {
      appAuthStatus,
      appAuthMessage,
      scope,
      launchBlockedReason: 'app-auth',
      launchBlockedMessage: appAuthMessage,
      canRenderWidget: false,
      canExposeTools: false,
    }
  }

  if (scope.blockedReason) {
    return {
      appAuthStatus,
      appAuthMessage,
      scope,
      launchBlockedReason: scope.blockedReason,
      launchBlockedMessage: scope.blockedMessage,
      canRenderWidget: false,
      canExposeTools: false,
    }
  }

  return {
    appAuthStatus,
    appAuthMessage,
    scope,
    launchBlockedReason: null,
    launchBlockedMessage: null,
    canRenderWidget: true,
    canExposeTools: true,
  }
}

export function buildPluginAvailabilityPrompt(manifests: PluginManifest[]): string {
  const lines = ['Plugin availability notes:']
  for (const manifest of manifests) {
    const access = getPluginAccessState(manifest)

    if (access.launchBlockedReason === 'app-auth' && access.launchBlockedMessage) {
      lines.push(
        `- ${manifest.name}: sign in required. ${access.launchBlockedMessage} Do not start the app, do not mount its UI, and do not call its tools while signed out. Reply with the sign in requirement instead.`
      )
      continue
    }

    if (access.launchBlockedReason && access.launchBlockedMessage) {
      lines.push(
        `- ${manifest.name}: unavailable right now. ${access.launchBlockedMessage} Do not start the app, do not mount its UI, and do not call its tools until it is enabled again.`
      )
      continue
    }

    if (manifest.appAuth) {
      lines.push(
        manifest.appAuth.type === 'k12-login'
          ? `- ${manifest.name}: available. User is signed in via K12 Login.`
          : `- ${manifest.name}: available. User is signed in to Chatbox AI.`
      )
    }
  }

  return lines.length > 1 ? lines.join('\n') : ''
}
