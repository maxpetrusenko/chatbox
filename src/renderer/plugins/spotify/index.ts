/// <reference types="vite/client" />

import { registerBuiltinManifest } from '@/plugins'
import { registerPluginHtml } from '@/plugins/resolve'
import { spotifyManifest } from './manifest'
import spotifyUiHtml from './ui.html?raw'

export function registerSpotifyPlugin(): void {
  registerBuiltinManifest(spotifyManifest)
  registerPluginHtml('spotify', spotifyUiHtml)
}
