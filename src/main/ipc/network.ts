/**
 * Phase 16 — Network / Server Mode IPC handlers.
 * Exposes all network:* channels to the renderer via ipcMain.handle.
 * Handles host mode (HTTP RPC server), client mode (proxy bridge),
 * Tailscale detection, and pairing flows.
 */

import { ipcMain, BrowserWindow, shell } from 'electron'
import { getDb } from '../db/schema'
import {
  getLanIp,
  getTailscaleIp,
  getTailscalePeers,
  startHostServer,
  stopHostServer,
  isHostServerRunning,
  getConnectedClients,
} from '../network/host'
import {
  activateClientMode,
  deactivateClientMode,
  isClientActive,
  getHostIp,
  pairWithHost,
  checkHostReachable,
} from '../network/client'
import {
  generatePairingCode,
  generateSalt,
  derivePairingToken,
} from '../network/pairing'
import type { NetworkStatus, PeerInfo } from '../network/types'

// ── DB helpers ─────────────────────────────────────────────────────────────────

function getNetworkConfig(key: string): string | null {
  const row = getDb()
    .prepare('SELECT value FROM network_config WHERE key = ?')
    .get(key) as { value: string } | undefined
  return row?.value ?? null
}

function setNetworkConfig(key: string, value: string): void {
  const now = new Date().toISOString()
  getDb()
    .prepare('INSERT OR REPLACE INTO network_config (key, value, updated_at) VALUES (?, ?, ?)')
    .run(key, value, now)
}

// ── Status builder ─────────────────────────────────────────────────────────────

function buildStatus(): NetworkStatus {
  const mode = (getNetworkConfig('network_mode') ?? 'standalone') as NetworkStatus['mode']
  return {
    mode,
    lanIp: getLanIp(),
    tailscaleIp: getTailscaleIp(),
    pairingCode: mode === 'host' ? (getNetworkConfig('host_pairing_code') ?? null) : null,
    connectedClients: getConnectedClients(),
    hostServerRunning: isHostServerRunning(),
  }
}

// ── Health polling (client mode only) ─────────────────────────────────────────

let pollTimer: ReturnType<typeof setInterval> | null = null

function startClientHealthPoll(win: BrowserWindow): void {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    const ip = getHostIp()
    if (!ip) return
    checkHostReachable(ip)
      .then((connected) => {
        if (!win.isDestroyed()) {
          win.webContents.send('network:connectionStatus', { connected })
        }
      })
      .catch(() => {
        if (!win.isDestroyed()) {
          win.webContents.send('network:connectionStatus', { connected: false })
        }
      })
  }, 5_000)
}

function stopClientHealthPoll(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// ── Handler registration ───────────────────────────────────────────────────────

export function registerNetworkHandlers(win: BrowserWindow): void {

  // ── Status ────────────────────────────────────────────────────────────────

  ipcMain.handle('network:getStatus', (): NetworkStatus => {
    return buildStatus()
  })

  // ── Host mode ─────────────────────────────────────────────────────────────

  ipcMain.handle('network:enableHostMode', (): { ok: boolean; pairingCode: string } => {
    const code = generatePairingCode()
    const salt = generateSalt()
    const token = derivePairingToken(code, salt)

    setNetworkConfig('network_mode', 'host')
    setNetworkConfig('host_pairing_code', code)
    setNetworkConfig('host_pairing_salt', salt)
    setNetworkConfig('host_pairing_token', token)

    startHostServer(token)

    if (!win.isDestroyed()) {
      win.webContents.send('network:statusChange', buildStatus())
    }

    return { ok: true, pairingCode: code }
  })

  ipcMain.handle('network:disableHostMode', (): { ok: boolean } => {
    stopHostServer()
    setNetworkConfig('network_mode', 'standalone')
    setNetworkConfig('host_pairing_code', '')

    if (!win.isDestroyed()) {
      win.webContents.send('network:statusChange', buildStatus())
    }

    return { ok: true }
  })

  ipcMain.handle('network:regeneratePairingCode', (): { pairingCode: string } => {
    const code = generatePairingCode()
    const salt = generateSalt()
    const token = derivePairingToken(code, salt)

    setNetworkConfig('host_pairing_code', code)
    setNetworkConfig('host_pairing_salt', salt)
    setNetworkConfig('host_pairing_token', token)

    // Restart server with new token
    if (isHostServerRunning()) {
      stopHostServer()
      startHostServer(token)
    }

    if (!win.isDestroyed()) {
      win.webContents.send('network:statusChange', buildStatus())
    }

    return { pairingCode: code }
  })

  // ── Client mode ───────────────────────────────────────────────────────────

  ipcMain.handle('network:connectToHost', async (
    _e,
    hostIp: string,
    pairingCode: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    // 1. Exchange pairing code for auth token
    const pairResult = await pairWithHost(hostIp, pairingCode)
    if (!pairResult.ok || !pairResult.token) {
      return { ok: false, error: pairResult.error ?? 'Pairing failed' }
    }

    // 2. Persist and activate
    setNetworkConfig('network_mode', 'client')
    setNetworkConfig('client_host_ip', hostIp)
    setNetworkConfig('client_host_token', pairResult.token)

    activateClientMode(hostIp, pairResult.token)
    startClientHealthPoll(win)

    if (!win.isDestroyed()) {
      win.webContents.send('network:statusChange', buildStatus())
      win.webContents.send('network:connected', { hostIp })
    }

    return { ok: true }
  })

  ipcMain.handle('network:disconnectFromHost', (): { ok: boolean } => {
    deactivateClientMode()
    stopClientHealthPoll()
    setNetworkConfig('network_mode', 'standalone')

    if (!win.isDestroyed()) {
      win.webContents.send('network:statusChange', buildStatus())
    }

    return { ok: true }
  })

  // ── Tailscale ─────────────────────────────────────────────────────────────

  ipcMain.handle('network:getTailscalePeers', (): PeerInfo[] => {
    return getTailscalePeers()
  })

  ipcMain.handle('network:installTailscale', async (): Promise<{ ok: boolean }> => {
    await shell.openExternal('https://tailscale.com/download')
    return { ok: true }
  })

  // ── Client active-check ───────────────────────────────────────────────────

  ipcMain.handle('network:isClientActive', (): boolean => {
    return isClientActive()
  })

  // ── Resume client mode from a previous session ────────────────────────────
  const savedMode = getNetworkConfig('network_mode')
  if (savedMode === 'client') {
    const ip = getNetworkConfig('client_host_ip')
    const token = getNetworkConfig('client_host_token')
    if (ip && token) {
      activateClientMode(ip, token)
      startClientHealthPoll(win)
    }
  } else if (savedMode === 'host') {
    const token = getNetworkConfig('host_pairing_token')
    if (token) {
      startHostServer(token)
    }
  }
}

export function cleanupNetworkHandlers(): void {
  stopHostServer()
  deactivateClientMode()
  stopClientHealthPoll()
}
