import { ipcMain, BrowserWindow, shell } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema'
import {
  detectOpenClaw,
  isGatewayRunning,
  spawnGateway,
  killGateway,
  getGatewayStatus,
} from '../openclaw/gateway'
import type { GatewayStatus } from '../openclaw/gateway'

// ── Types ──────────────────────────────────────────────────────────────────

export interface OpenClawChannel {
  id: string
  name: string
  type: string
  config: Record<string, string>
  routing_agent_id: string
  enabled: boolean
  created_at: string
}

// ── DB helpers ─────────────────────────────────────────────────────────────

function rowToChannel(row: Record<string, unknown>): OpenClawChannel {
  return {
    id:               row.id as string,
    name:             row.name as string,
    type:             row.type as string,
    config:           JSON.parse((row.config as string) || '{}'),
    routing_agent_id: (row.routing_agent_id as string) ?? 'agent-courier',
    enabled:          Boolean(row.enabled),
    created_at:       row.created_at as string,
  }
}

function getAllChannels(): OpenClawChannel[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM openclaw_channels ORDER BY created_at ASC').all() as Record<string, unknown>[]
  return rows.map(rowToChannel)
}

// ── Health polling ─────────────────────────────────────────────────────────

let healthPollTimer: ReturnType<typeof setInterval> | null = null

function startHealthPoll(win: BrowserWindow): void {
  if (healthPollTimer) return
  healthPollTimer = setInterval(async () => {
    try {
      const status = await getGatewayStatus()
      if (!win.isDestroyed()) {
        win.webContents.send('openclaw:statusChange', status)
      }
    } catch {
      // ignore
    }
  }, 10_000)
}

// ── Handler registration ───────────────────────────────────────────────────

export function registerOpenclawHandlers(win: BrowserWindow): void {
  startHealthPoll(win)

  // ── Status & lifecycle ─────────────────────────────────────────────────

  ipcMain.handle('openclaw:getStatus', async (): Promise<GatewayStatus> => {
    return getGatewayStatus()
  })

  ipcMain.handle('openclaw:install', async () => {
    // Open a terminal with the install command
    const cmd = 'npm install -g openclaw && openclaw onboard'
    shell.openExternal(`itermocean://executes?text=${encodeURIComponent(cmd)}`)
      .catch(() => {
        // Fallback: open Terminal.app on macOS
        shell.openExternal(`x-terminal-emulator://`)
          .catch(console.error)
      })
    return { ok: true }
  })

  ipcMain.handle('openclaw:restart', async (): Promise<GatewayStatus> => {
    await killGateway()
    const result = await spawnGateway()
    const status = await getGatewayStatus()
    if (!win.isDestroyed()) {
      win.webContents.send('openclaw:statusChange', status)
    }
    return { ...status, error: result.error }
  })

  ipcMain.handle('openclaw:start', async (): Promise<GatewayStatus> => {
    await spawnGateway()
    const status = await getGatewayStatus()
    if (!win.isDestroyed()) {
      win.webContents.send('openclaw:statusChange', status)
    }
    return status
  })

  ipcMain.handle('openclaw:stop', async (): Promise<GatewayStatus> => {
    await killGateway()
    const status: GatewayStatus = { ...detectOpenClaw(), running: false }
    if (!win.isDestroyed()) {
      win.webContents.send('openclaw:statusChange', status)
    }
    return status
  })

  // ── Channel CRUD ───────────────────────────────────────────────────────

  ipcMain.handle('openclaw:listChannels', (): OpenClawChannel[] => {
    return getAllChannels()
  })

  ipcMain.handle('openclaw:addChannel', (_, input: {
    name: string
    type: string
    config?: Record<string, string>
    routing_agent_id?: string
  }): OpenClawChannel => {
    const db = getDb()
    const id = `ch-${uuidv4().slice(0, 8)}`
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO openclaw_channels (id, name, type, config, routing_agent_id, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(
      id,
      input.name,
      input.type,
      JSON.stringify(input.config ?? {}),
      input.routing_agent_id ?? 'agent-courier',
      now,
    )
    const row = db.prepare('SELECT * FROM openclaw_channels WHERE id = ?').get(id) as Record<string, unknown>
    return rowToChannel(row)
  })

  ipcMain.handle('openclaw:updateChannel', (_, id: string, updates: Partial<{
    name: string
    type: string
    config: Record<string, string>
    routing_agent_id: string
    enabled: boolean
  }>): OpenClawChannel => {
    const db = getDb()
    if (updates.name        !== undefined) db.prepare('UPDATE openclaw_channels SET name = ? WHERE id = ?').run(updates.name, id)
    if (updates.type        !== undefined) db.prepare('UPDATE openclaw_channels SET type = ? WHERE id = ?').run(updates.type, id)
    if (updates.config      !== undefined) db.prepare('UPDATE openclaw_channels SET config = ? WHERE id = ?').run(JSON.stringify(updates.config), id)
    if (updates.routing_agent_id !== undefined) db.prepare('UPDATE openclaw_channels SET routing_agent_id = ? WHERE id = ?').run(updates.routing_agent_id, id)
    if (updates.enabled     !== undefined) db.prepare('UPDATE openclaw_channels SET enabled = ? WHERE id = ?').run(updates.enabled ? 1 : 0, id)
    const row = db.prepare('SELECT * FROM openclaw_channels WHERE id = ?').get(id) as Record<string, unknown>
    return rowToChannel(row)
  })

  ipcMain.handle('openclaw:removeChannel', (_, id: string): { ok: boolean } => {
    const db = getDb()
    db.prepare('DELETE FROM openclaw_channels WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('openclaw:testChannel', async (_, id: string): Promise<{ ok: boolean; error?: string }> => {
    const running = await isGatewayRunning()
    if (!running) return { ok: false, error: 'OpenClaw Gateway is not running' }
    const db = getDb()
    const row = db.prepare('SELECT * FROM openclaw_channels WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!row) return { ok: false, error: 'Channel not found' }
    // Placeholder: real test would call gateway channel ping
    return { ok: true }
  })
}
