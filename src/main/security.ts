import { safeStorage } from 'electron'
import type Database from 'better-sqlite3'

// ─── Sensitive key names ──────────────────────────────────────────────────────

export const SENSITIVE_KEYS = new Set([
  'anthropic_api_key',
  'provider_key_openrouter',
  'provider_key_openai',
  'provider_key_groq',
  'github_token',
])

// ─── safeStorage wrappers ─────────────────────────────────────────────────────

/**
 * Encrypt a plaintext value using the OS keychain (macOS Keychain / Windows DPAPI).
 * Returns `enc:<base64>` on success, or the original plaintext if encryption is
 * unavailable on this platform.
 */
export function encryptValue(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) return plaintext
  const encrypted = safeStorage.encryptString(plaintext)
  return `enc:${encrypted.toString('base64')}`
}

/**
 * Decrypt a value that was stored with encryptValue.
 * - If the value starts with `enc:`, strips the prefix and decrypts.
 * - If decryption is unavailable (e.g. different machine / unsigned build),
 *   returns '' so the key appears "not configured" — the user must re-enter it.
 * - If the value does NOT start with `enc:`, it is a legacy plaintext value
 *   that hasn't been migrated yet — returns it as-is.
 */
export function decryptValue(stored: string | null): string {
  if (!stored) return ''
  if (!stored.startsWith('enc:')) return stored // legacy plaintext — migration will upgrade it
  if (!safeStorage.isEncryptionAvailable()) return '' // encrypted on a different OS session
  try {
    const buf = Buffer.from(stored.slice(4), 'base64')
    return safeStorage.decryptString(buf)
  } catch {
    return '' // corrupted or from a different keychain — user must re-enter
  }
}

// ─── One-time migration ───────────────────────────────────────────────────────

/**
 * Called once at startup (inside initDb) to re-encrypt any sensitive settings
 * that are still stored as plaintext. Safe to call on every launch — no-op if
 * all keys already have the `enc:` prefix or if encryption is unavailable.
 */
export function migrateToSecureSettings(db: Database.Database): void {
  if (!safeStorage.isEncryptionAvailable()) return

  const getStmt = db.prepare<[string], { value: string }>('SELECT value FROM settings WHERE key = ?')
  const setStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
  const now = new Date().toISOString()

  for (const key of SENSITIVE_KEYS) {
    const row = getStmt.get(key)
    if (!row) continue
    if (row.value.startsWith('enc:')) continue // already encrypted
    // Re-encrypt the plaintext value in place
    setStmt.run(key, encryptValue(row.value), now)
  }
}
