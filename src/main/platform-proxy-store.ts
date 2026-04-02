import path from 'node:path'
import type { PlatformProxyUsageEntry } from '@shared/platform-proxy'
import { app, safeStorage } from 'electron'
import * as fs from 'fs-extra'
import sanitizeFilename from 'sanitize-filename'
import { getStoreBlob, setStoreBlob } from './store-node'

const API_KEY_DIR = path.resolve(app.getPath('userData'), 'platform-proxy-keys')
const USAGE_LOG_KEY = 'platform-proxy-usage-log'

function getPlatformDefaultApiKey(pluginId: string): string | null {
  switch (pluginId) {
    case 'google-maps':
      return process.env.GOOGLE_MAPS_API_KEY || null
    case 'wolfram':
      return process.env.WOLFRAM_APP_ID || null
    default:
      return null
  }
}

function getApiKeyFilename(districtId: string, pluginId: string): string {
  return path.resolve(API_KEY_DIR, sanitizeFilename(`${districtId}__${pluginId}`))
}

export async function getPlatformProxyApiKey(districtId: string, pluginId: string): Promise<string | null> {
  const filename = getApiKeyFilename(districtId, pluginId)
  if (!(await fs.pathExists(filename))) {
    return getPlatformDefaultApiKey(pluginId)
  }
  const encoded = await fs.readFile(filename, 'utf8')
  const encrypted = Buffer.from(encoded, 'base64')
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(encrypted)
  }
  return encrypted.toString('utf8')
}

export async function getPlatformProxyApiKeySource(
  districtId: string,
  pluginId: string
): Promise<'district' | 'platform-default' | null> {
  const filename = getApiKeyFilename(districtId, pluginId)
  if (await fs.pathExists(filename)) {
    return 'district'
  }
  return getPlatformDefaultApiKey(pluginId) ? 'platform-default' : null
}

export async function setPlatformProxyApiKey(districtId: string, pluginId: string, value: string): Promise<void> {
  await fs.ensureDir(API_KEY_DIR)
  const raw = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(value) : Buffer.from(value, 'utf8')
  await fs.writeFile(getApiKeyFilename(districtId, pluginId), raw.toString('base64'), 'utf8')
}

export async function deletePlatformProxyApiKey(districtId: string, pluginId: string): Promise<void> {
  const filename = getApiKeyFilename(districtId, pluginId)
  if (await fs.pathExists(filename)) {
    await fs.remove(filename)
  }
}

export async function getPlatformProxyUsageEntries(): Promise<PlatformProxyUsageEntry[]> {
  const raw = await getStoreBlob(USAGE_LOG_KEY)
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw) as PlatformProxyUsageEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function appendPlatformProxyUsageEntry(entry: PlatformProxyUsageEntry): Promise<void> {
  const entries = await getPlatformProxyUsageEntries()
  const nextEntries = [entry, ...entries].slice(0, 5000)
  await setStoreBlob(USAGE_LOG_KEY, JSON.stringify(nextEntries))
}
