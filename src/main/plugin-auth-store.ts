import { app, safeStorage } from 'electron'
import * as fs from 'fs-extra'
import path from 'path'
import sanitizeFilename from 'sanitize-filename'

function getFilename(key: string): string {
  return path.resolve(app.getPath('userData'), 'plugin-auth', sanitizeFilename(key))
}

export async function getPluginAuthSecret(key: string): Promise<string | null> {
  const filename = getFilename(key)
  const exists = await fs.pathExists(filename)
  if (!exists) return null
  const encoded = await fs.readFile(filename, 'utf8')
  if (!encoded) return null
  const encrypted = Buffer.from(encoded, 'base64')
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(encrypted)
  }
  return encrypted.toString('utf8')
}

export async function setPluginAuthSecret(key: string, value: string): Promise<void> {
  const filename = getFilename(key)
  await fs.ensureDir(path.dirname(filename))
  const raw = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(value) : Buffer.from(value, 'utf8')
  await fs.writeFile(filename, raw.toString('base64'), 'utf8')
}

export async function deletePluginAuthSecret(key: string): Promise<void> {
  const filename = getFilename(key)
  const exists = await fs.pathExists(filename)
  if (!exists) return
  await fs.remove(filename)
}
