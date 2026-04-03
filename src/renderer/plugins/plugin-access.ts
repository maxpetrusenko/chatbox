import type { PluginManifest } from '@shared/plugin-types'
import { chatboxAuthStore } from '@/stores/chatboxAuthStore'
import { k12Store } from '@/stores/k12Store'

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

export function buildPluginAvailabilityPrompt(manifests: PluginManifest[]): string {
  const gatedManifests = manifests.filter((manifest) => manifest.appAuth)
  if (gatedManifests.length === 0) return ''

  const lines = ['Plugin availability notes:']
  for (const manifest of gatedManifests) {
    if (hasRequiredAppAuth(manifest)) {
      lines.push(
        manifest.appAuth?.type === 'k12-login'
          ? `- ${manifest.name}: available. User is signed in via K12 Login.`
          : `- ${manifest.name}: available. User is signed in to Chatbox AI.`
      )
      continue
    }

    const blockedMessage = getPluginAppAuthBlockedMessage(manifest)
    if (blockedMessage) {
      lines.push(
        `- ${manifest.name}: sign in required. ${blockedMessage} Do not start the app, do not mount its UI, and do not call its tools while signed out. Reply with the sign in requirement instead.`
      )
    }
  }

  return lines.length > 1 ? lines.join('\n') : ''
}
