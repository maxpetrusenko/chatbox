/// <reference types="vite/client" />

import { registerBuiltinManifest } from '@/plugins'
import { registerPluginHtml } from '@/plugins/resolve'
import { weatherManifest } from './manifest'
import weatherUiHtml from './ui.html?raw'

export function registerWeatherPlugin(): void {
  registerBuiltinManifest(weatherManifest)
  registerPluginHtml('weather', weatherUiHtml)
}
