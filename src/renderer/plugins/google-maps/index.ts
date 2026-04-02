/// <reference types="vite/client" />
import { registerBuiltinManifest } from '@/plugins'
import { registerPluginHtml } from '@/plugins/resolve'
import { googleMapsManifest } from './manifest'
import googleMapsUiHtml from './ui.html?raw'

export function registerGoogleMapsPlugin(): void {
  registerBuiltinManifest(googleMapsManifest)
  registerPluginHtml('google-maps', googleMapsUiHtml)
}
