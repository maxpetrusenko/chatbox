/**
 * Static plugin manifest registry.
 *
 * For now every plugin is declared here as a literal manifest.
 * When remote/zip install lands this becomes the loader entrypoint.
 */

import type { PluginManifest } from '@shared/plugin-types'

// Manifests will be added as plugins are built (chess, weather, spotify, etc.)
// Each plugin folder will also have its own plugin.json; these literals are the
// authoritative runtime source until we add dynamic loading.

const builtinManifests: PluginManifest[] = []

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
