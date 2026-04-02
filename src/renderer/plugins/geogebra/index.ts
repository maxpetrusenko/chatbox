/// <reference types="vite/client" />
import { registerBuiltinManifest } from '@/plugins'
import { registerPluginHtml } from '@/plugins/resolve'
import { geogebraManifest } from './manifest'
import geogebraUiHtml from './ui.html?raw'

export function registerGeoGebraPlugin(): void {
  registerBuiltinManifest(geogebraManifest)
  registerPluginHtml('geogebra', geogebraUiHtml)
}
