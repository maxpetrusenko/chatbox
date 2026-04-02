/**
 * Static plugin manifest registry.
 *
 * For now every plugin is declared here as a literal manifest.
 * When remote/zip install lands this becomes the loader entrypoint.
 */

import type { PluginManifest } from '@shared/plugin-types'
import { registerPluginAuth } from '@/stores/pluginAuthStore'
import { registerChessPlugin } from './chess'
import { chessManifest } from './chess/manifest'
import { registerGitHubPlugin } from './github'
import { githubManifest } from './github/manifest'
import { registerSpotifyPlugin } from './spotify'
import { spotifyManifest } from './spotify/manifest'
import { registerWeatherPlugin } from './weather'
import { weatherManifest } from './weather/manifest'
import { registerGeoGebraPlugin } from './geogebra'
import { geogebraManifest } from './geogebra/manifest'
import { registerPhETPlugin } from './phet'
import { phetManifest } from './phet/manifest'
import { registerGoogleMapsPlugin } from './google-maps'
import { googleMapsManifest } from './google-maps/manifest'
import { registerWolframPlugin } from './wolfram'
import { wolframManifest } from './wolfram/manifest'

const builtinManifests: PluginManifest[] = [
  chessManifest,
  weatherManifest,
  spotifyManifest,
  githubManifest,
  geogebraManifest,
  phetManifest,
  googleMapsManifest,
  wolframManifest,
]

let initialized = false

export function initPlugins(): void {
  if (initialized) return
  initialized = true
  registerChessPlugin()
  registerWeatherPlugin()
  registerSpotifyPlugin()
  registerGitHubPlugin()
  registerGeoGebraPlugin()
  registerPhETPlugin()
  registerGoogleMapsPlugin()
  registerWolframPlugin()
}

export function getBuiltinManifests(): PluginManifest[] {
  return builtinManifests
}

export function registerBuiltinManifest(manifest: PluginManifest): void {
  const existing = builtinManifests.findIndex((m) => m.id === manifest.id)
  if (existing !== -1) {
    builtinManifests[existing] = manifest
  } else {
    builtinManifests.push(manifest)
  }
  if (manifest.auth) {
    registerPluginAuth(manifest.id, manifest.auth)
  }
}
