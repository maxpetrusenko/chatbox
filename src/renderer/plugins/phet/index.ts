/// <reference types="vite/client" />
import { registerBuiltinManifest } from '@/plugins'
import { registerPluginHtml } from '@/plugins/resolve'
import { phetManifest } from './manifest'
import phetUiHtml from './ui.html?raw'

export function registerPhETPlugin(): void {
  registerBuiltinManifest(phetManifest)
  registerPluginHtml('phet', phetUiHtml)
}
