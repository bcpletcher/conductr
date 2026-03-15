/**
 * Phase 16 — Client bridge.
 * HTTP client that proxies IPC calls to the host's Conductr server.
 * Used when this instance is running in "client" mode.
 */

import * as http from 'http'
import { HOST_PORT } from './host'

// ── State ─────────────────────────────────────────────────────────────────────

let _hostIp: string | null = null
let _hostToken: string | null = null
let _clientActive = false

// ── HTTP helper ───────────────────────────────────────────────────────────────

interface RpcResponse {
  result?: unknown
  error?: string
  ok?: boolean
  token?: string
}

function httpPost(hostIp: string, path: string, data: unknown): Promise<RpcResponse> {
  return new Promise((resolve) => {
    const body = JSON.stringify(data)
    const options: http.RequestOptions = {
      hostname: hostIp,
      port: HOST_PORT,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = http.request(options, (res) => {
      let respBody = ''
      res.on('data', (chunk) => { respBody += chunk as string })
      res.on('end', () => {
        try {
          resolve(JSON.parse(respBody) as RpcResponse)
        } catch {
          resolve({ error: 'Invalid response from host' })
        }
      })
    })

    req.on('error', (err) => {
      resolve({ error: err.message })
    })

    req.setTimeout(10_000, () => {
      req.destroy()
      resolve({ error: 'Request timeout' })
    })

    req.write(body)
    req.end()
  })
}

// ── Pairing ───────────────────────────────────────────────────────────────────

/**
 * Attempt to pair with a host.
 * Returns the auth token on success, which the client persists in its DB.
 */
export async function pairWithHost(
  ip: string,
  code: string,
): Promise<{ ok: boolean; token?: string; error?: string }> {
  try {
    const result = await httpPost(ip, '/pair', { code })
    if (result.error && !result.ok) return { ok: false, error: result.error }
    if (result.ok && result.token) return { ok: true, token: result.token }
    return { ok: false, error: 'Unexpected response from host' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' }
  }
}

/** Quick health probe — resolves true if the host is reachable. */
export async function checkHostReachable(ip: string): Promise<boolean> {
  try {
    const result = await httpPost(ip, '/health', {})
    return Boolean(result.ok)
  } catch {
    return false
  }
}

// ── RPC call ──────────────────────────────────────────────────────────────────

/**
 * Call an IPC channel on the host and return the result.
 * Throws if not connected or if the host returns an error.
 */
export async function callHostRpc(channel: string, args: unknown[]): Promise<unknown> {
  if (!_hostIp || !_hostToken) throw new Error('Not connected to host')
  const result = await httpPost(_hostIp, '/rpc', {
    channel,
    args,
    auth: _hostToken,
  })
  if (result.error) throw new Error(result.error)
  return result.result
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

export function activateClientMode(ip: string, token: string): void {
  _hostIp = ip
  _hostToken = token
  _clientActive = true
}

export function deactivateClientMode(): void {
  _hostIp = null
  _hostToken = null
  _clientActive = false
}

export function isClientActive(): boolean {
  return _clientActive
}

export function getHostIp(): string | null {
  return _hostIp
}
