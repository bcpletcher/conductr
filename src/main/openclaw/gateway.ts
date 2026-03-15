/**
 * OpenClaw Gateway sidecar manager.
 * Detects, spawns, monitors, and shuts down the OpenClaw Gateway process.
 * Follows the same pattern as Ollama in providers.ts — offline-safe by design.
 */

import { execSync, spawn } from 'child_process'
import type { ChildProcess } from 'child_process'

export interface GatewayStatus {
  installed: boolean
  running: boolean
  version?: string
  pid?: number
  error?: string
}

const GATEWAY_PORT = 18789
const HEALTH_URL   = `http://127.0.0.1:${GATEWAY_PORT}/health`

let gatewayProcess: ChildProcess | null = null

// ── Detection ──────────────────────────────────────────────────────────────

export function detectOpenClaw(): { installed: boolean; version?: string } {
  try {
    const raw = execSync('npm list -g openclaw --json 2>/dev/null', { timeout: 5000, encoding: 'utf8' })
    const json = JSON.parse(raw) as { dependencies?: Record<string, { version?: string }> }
    const version = json.dependencies?.['openclaw']?.version
    return { installed: true, version }
  } catch {
    return { installed: false }
  }
}

// ── Health check ───────────────────────────────────────────────────────────

export async function isGatewayRunning(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

// ── Spawn / kill ───────────────────────────────────────────────────────────

export async function spawnGateway(): Promise<{ ok: boolean; pid?: number; error?: string }> {
  const { installed } = detectOpenClaw()
  if (!installed) return { ok: false, error: 'OpenClaw not installed' }

  // Already running?
  if (await isGatewayRunning()) {
    return { ok: true }
  }

  // Kill any stale managed process first
  if (gatewayProcess && !gatewayProcess.killed) {
    gatewayProcess.kill('SIGTERM')
    gatewayProcess = null
  }

  return new Promise((resolve) => {
    try {
      const child = spawn('openclaw', ['serve'], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      gatewayProcess = child

      child.stderr?.on('data', (chunk: Buffer) => {
        console.error('[OpenClaw Gateway] stderr:', chunk.toString().trim())
      })

      child.on('error', (err) => {
        console.error('[OpenClaw Gateway] spawn error:', err.message)
        gatewayProcess = null
      })

      child.on('exit', (code) => {
        console.log(`[OpenClaw Gateway] exited with code ${code}`)
        if (gatewayProcess === child) gatewayProcess = null
      })

      // Wait briefly for the gateway to come up
      setTimeout(async () => {
        const running = await isGatewayRunning()
        resolve({ ok: running, pid: child.pid })
      }, 2000)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      resolve({ ok: false, error })
    }
  })
}

export async function killGateway(): Promise<void> {
  if (gatewayProcess && !gatewayProcess.killed) {
    gatewayProcess.kill('SIGTERM')
    gatewayProcess = null
  }
}

// ── Full status roll-up ────────────────────────────────────────────────────

export async function getGatewayStatus(): Promise<GatewayStatus> {
  const { installed, version } = detectOpenClaw()
  if (!installed) return { installed: false, running: false }

  const running = await isGatewayRunning()
  const pid = (running && gatewayProcess) ? gatewayProcess.pid : undefined

  return { installed, running, version, pid }
}
