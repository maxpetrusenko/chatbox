/// <reference types="vite/client" />
import { registerBuiltinManifest } from '@/plugins'
import { registerPluginHtml } from '@/plugins/resolve'
import { wolframManifest } from './manifest'
import wolframUiHtml from './ui.html?raw'

export function registerWolframPlugin(): void {
  registerBuiltinManifest(wolframManifest)
  registerPluginHtml('wolfram', wolframUiHtml)
}
