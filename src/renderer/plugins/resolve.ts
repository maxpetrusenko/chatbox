/**
 * Resolve plugin entrypoint URLs.
 *
 * For bundled plugins, the entrypoint is a static asset served from the
 * renderer's public directory. For remote plugins (future), this would
 * return a sandboxed URL.
 */

// Map of pluginId → base URL for bundled plugins.
// Populated at registration time or derived from conventions.
const pluginBaseUrls = new Map<string, string>()

export function registerPluginBaseUrl(pluginId: string, baseUrl: string): void {
  pluginBaseUrls.set(pluginId, baseUrl)
}

export function resolvePluginEntrypoint(pluginId: string, entrypoint: string): string | null {
  const base = pluginBaseUrls.get(pluginId)
  if (base) {
    return `${base}/${entrypoint}`
  }
  // Convention: bundled plugins are served from /plugins/<pluginId>/
  return `/plugins/${pluginId}/${entrypoint}`
}
