import { getDb } from './schema'
import { encryptValue, decryptValue } from '../security'

export function getSetting(key: string): string | null {
  const row = getDb()
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  const now = new Date().toISOString()
  getDb()
    .prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
    .run(key, value, now)
}

/** Read a sensitive setting and decrypt it. Returns '' if not set or if decryption fails. */
export function getSecureSetting(key: string): string {
  return decryptValue(getSetting(key))
}

/** Encrypt and store a sensitive setting. */
export function setSecureSetting(key: string, value: string): void {
  setSetting(key, encryptValue(value))
}
