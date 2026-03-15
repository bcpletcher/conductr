/**
 * Phase 16 — Pairing code utilities.
 * Generates the 6-digit code shown to the host user and a derived
 * secret token stored in the DB and used for subsequent RPC auth.
 */

import { createHash, randomBytes } from 'crypto'

/** Generate a random 6-digit numeric pairing code. */
export function generatePairingCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** Generate a random 32-char hex salt. */
export function generateSalt(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Derive the persistent auth token from a pairing code + salt.
 * The token is stored in the host DB; the client stores it after pairing.
 */
export function derivePairingToken(code: string, salt: string): string {
  return createHash('sha256').update(`conductr:${salt}:${code}`).digest('hex')
}
