/// <reference types="vite/client" />

import { registerBuiltinManifest } from '@/plugins'
import { registerPluginHtml } from '@/plugins/resolve'
import { githubManifest } from './manifest'
import githubUiHtml from './ui.html?raw'

export function registerGitHubPlugin(): void {
  registerBuiltinManifest(githubManifest)
  registerPluginHtml('github', githubUiHtml)
}
