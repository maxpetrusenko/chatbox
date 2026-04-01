/**
 * Static plugin manifest registry.
 *
 * For now every plugin is declared here as a literal manifest.
 * When remote/zip install lands this becomes the loader entrypoint.
 */

import type { PluginManifest } from '@shared/plugin-types'
import { chessManifest } from './chess/manifest'
import { registerChessPlugin } from './chess'

const builtinManifests: PluginManifest[] = [
  chessManifest,
]

let initialized = false

export function initPlugins(): void {
  if (initialized) return
  initialized = true
  registerChessPlugin()
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
}
