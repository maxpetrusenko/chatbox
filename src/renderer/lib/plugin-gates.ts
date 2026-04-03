import type { PluginManifest } from '@shared/plugin-types'

export interface PluginToolVisibility {
  label: string
  description: string
}

export function getPluginToolVisibility(manifest: Pick<PluginManifest, 'name' | 'tools'>): PluginToolVisibility | null {
  if (manifest.tools.length === 0) {
    return null
  }

  const toolCount = manifest.tools.length

  return {
    label: 'AI intent gated',
    description: `${manifest.name} ${toolCount === 1 ? 'tool appears' : 'tools appear'} to the model only when chat intent or active-app follow-up matches.`,
  }
}
