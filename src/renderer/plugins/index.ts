/**
 * Static plugin manifest registry.
 *
 * For now every plugin is declared here as a literal manifest.
 * When remote/zip install lands this becomes the loader entrypoint.
 */

import type { PluginManifest } from '@shared/plugin-types'
import { hiddenBuiltinPluginsStore } from '@/stores/hiddenBuiltinPluginsStore'
import { registerPluginAuth } from '@/stores/pluginAuthStore'
import { registerChessPlugin } from './chess'
import { chessManifest } from './chess/manifest'
import { registerGeoGebraPlugin } from './geogebra'
import { geogebraManifest } from './geogebra/manifest'
import { registerGitHubPlugin } from './github'
import { githubManifest } from './github/manifest'
import { registerGoogleMapsPlugin } from './google-maps'
import { googleMapsManifest } from './google-maps/manifest'
import { registerPhETPlugin } from './phet'
import { phetManifest } from './phet/manifest'
import { registerSpotifyPlugin } from './spotify'
import { spotifyManifest } from './spotify/manifest'
import { registerWeatherPlugin } from './weather'
import { weatherManifest } from './weather/manifest'
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

const originalBuiltinIds = new Set(builtinManifests.map((manifest) => manifest.id))

let initialized = false

export function initPlugins(): void {
  if (initialized) return
  initialized = true
  if (!hiddenBuiltinPluginsStore.getState().isHidden('chess')) registerChessPlugin()
  if (!hiddenBuiltinPluginsStore.getState().isHidden('weather')) registerWeatherPlugin()
  if (!hiddenBuiltinPluginsStore.getState().isHidden('spotify')) registerSpotifyPlugin()
  if (!hiddenBuiltinPluginsStore.getState().isHidden('github')) registerGitHubPlugin()
  if (!hiddenBuiltinPluginsStore.getState().isHidden('geogebra')) registerGeoGebraPlugin()
  if (!hiddenBuiltinPluginsStore.getState().isHidden('phet')) registerPhETPlugin()
  if (!hiddenBuiltinPluginsStore.getState().isHidden('google-maps')) registerGoogleMapsPlugin()
  if (!hiddenBuiltinPluginsStore.getState().isHidden('wolfram')) registerWolframPlugin()
}

export function getBuiltinManifests(): PluginManifest[] {
  return builtinManifests.filter((manifest) => !hiddenBuiltinPluginsStore.getState().isHidden(manifest.id))
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

export function unregisterBuiltinManifest(pluginId: string): void {
  if (originalBuiltinIds.has(pluginId)) {
    return
  }
  const existing = builtinManifests.findIndex((manifest) => manifest.id === pluginId)
  if (existing !== -1) {
    builtinManifests.splice(existing, 1)
  }
}
