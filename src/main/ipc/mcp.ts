import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema'
import {
  connectServer,
  disconnectServer,
  getStatus,
  getAllStatuses,
  listToolsForServer,
  testServer,
} from '../mcp/manager'
import type { McpServerConfig } from '../mcp/types'
import { MCP_COMMUNITY_REGISTRY } from '../mcp/types'

// ── DB helpers ─────────────────────────────────────────────────────────────

function dbRowToConfig(row: Record<string, unknown>): McpServerConfig {
  return {
    id:              row.id as string,
    name:            row.name as string,
    type:            (row.type as string | undefined) === 'sse' ? 'sse' : 'stdio',
    command:         row.command as string | undefined,
    args:            JSON.parse((row.args as string) || '[]'),
    url:             row.url as string | undefined,
    env:             JSON.parse((row.env as string) || '{}'),
    requireApproval: Boolean(row.require_approval),
    enabled:         Boolean(row.enabled),
    createdAt:       row.created_at as string,
  }
}

function getAllServers(): McpServerConfig[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM mcp_servers ORDER BY created_at').all()
  return (rows as Record<string, unknown>[]).map(dbRowToConfig)
}

function getServerById(id: string): McpServerConfig | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  return row ? dbRowToConfig(row) : null
}

// ── Auto-connect enabled servers on startup ─────────────────────────────────

export async function initMcpConnections(): Promise<void> {
  const servers = getAllServers().filter((s) => s.enabled)
  for (const server of servers) {
    connectServer(server).catch((err) => {
      console.error(`[MCP] Failed to auto-connect "${server.name}":`, err)
    })
  }
}

// ── IPC handlers ────────────────────────────────────────────────────────────

export function registerMcpHandlers(): void {
  /** List all configured servers with live connection status */
  ipcMain.handle('mcp:listServers', () => {
    const servers = getAllServers()
    return servers.map((s) => ({ ...s, status: getStatus(s.id) }))
  })

  /** Add a new server (and auto-connect if enabled) */
  ipcMain.handle('mcp:addServer', async (
    _,
    input: {
      name: string
      type: 'stdio' | 'sse'
      command?: string
      args?: string[]
      url?: string
      env?: Record<string, string>
      requireApproval?: boolean
    }
  ) => {
    const db = getDb()
    const id = `mcp-${uuidv4().slice(0, 8)}`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO mcp_servers (id, name, type, command, args, url, env, require_approval, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      id,
      input.name,
      input.type,
      input.command ?? null,
      JSON.stringify(input.args ?? []),
      input.url ?? null,
      JSON.stringify(input.env ?? {}),
      input.requireApproval ? 1 : 0,
      now
    )

    const config = getServerById(id)!
    const status = await connectServer(config)
    return { ...config, status }
  })

  /** Remove a server and disconnect */
  ipcMain.handle('mcp:removeServer', async (_, id: string) => {
    await disconnectServer(id)
    const db = getDb()
    db.prepare('DELETE FROM agent_mcp_servers WHERE server_id = ?').run(id)
    db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(id)
    return { ok: true }
  })

  /** Update server config (requires reconnect) */
  ipcMain.handle('mcp:updateServer', async (
    _,
    id: string,
    updates: Partial<{
      name: string
      command: string
      args: string[]
      url: string
      env: Record<string, string>
      requireApproval: boolean
      enabled: boolean
    }>
  ) => {
    const db = getDb()
    const fields: string[] = []
    const values: unknown[] = []

    if (updates.name !== undefined)            { fields.push('name = ?');             values.push(updates.name) }
    if (updates.command !== undefined)         { fields.push('command = ?');           values.push(updates.command) }
    if (updates.args !== undefined)            { fields.push('args = ?');              values.push(JSON.stringify(updates.args)) }
    if (updates.url !== undefined)             { fields.push('url = ?');               values.push(updates.url) }
    if (updates.env !== undefined)             { fields.push('env = ?');               values.push(JSON.stringify(updates.env)) }
    if (updates.requireApproval !== undefined) { fields.push('require_approval = ?'); values.push(updates.requireApproval ? 1 : 0) }
    if (updates.enabled !== undefined)         { fields.push('enabled = ?');           values.push(updates.enabled ? 1 : 0) }

    if (fields.length > 0) {
      values.push(id)
      db.prepare(`UPDATE mcp_servers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    await disconnectServer(id)
    const config = getServerById(id)
    if (config?.enabled) await connectServer(config)

    return getServerById(id)
  })

  /** Test a server connection without persisting */
  ipcMain.handle('mcp:testConnection', async (_, config: Omit<McpServerConfig, 'id' | 'createdAt'>) => {
    return testServer({ ...config, id: 'test', createdAt: new Date().toISOString() })
  })

  /** Re-connect a server */
  ipcMain.handle('mcp:reconnect', async (_, id: string) => {
    const config = getServerById(id)
    if (!config) return { serverId: id, status: 'error', toolCount: 0, error: 'Server not found' }
    return connectServer(config)
  })

  /** List tools from a specific server */
  ipcMain.handle('mcp:listTools', async (_, serverId: string) => {
    return listToolsForServer(serverId)
  })

  /** Get all tools from all connected servers (for a given list of server IDs) */
  ipcMain.handle('mcp:getAgentTools', async (_, serverIds: string[]) => {
    const tools = []
    for (const id of serverIds) {
      const t = await listToolsForServer(id)
      tools.push(...t)
    }
    return tools
  })

  /** Get server IDs assigned to an agent */
  ipcMain.handle('mcp:getAgentServers', (_, agentId: string) => {
    const db = getDb()
    const rows = db
      .prepare('SELECT server_id FROM agent_mcp_servers WHERE agent_id = ?')
      .all(agentId) as { server_id: string }[]
    return rows.map((r) => r.server_id)
  })

  /** Set server IDs for an agent (replace-all pattern) */
  ipcMain.handle('mcp:setAgentServers', (_, agentId: string, serverIds: string[]) => {
    const db = getDb()
    const deleteStmt = db.prepare('DELETE FROM agent_mcp_servers WHERE agent_id = ?')
    const insertStmt = db.prepare('INSERT OR IGNORE INTO agent_mcp_servers (agent_id, server_id) VALUES (?, ?)')
    db.transaction(() => {
      deleteStmt.run(agentId)
      for (const sid of serverIds) {
        insertStmt.run(agentId, sid)
      }
    })()
    return { ok: true }
  })

  /** Return static community registry */
  ipcMain.handle('mcp:getRegistry', () => MCP_COMMUNITY_REGISTRY)

  /** Get live connection statuses for all servers */
  ipcMain.handle('mcp:getStatuses', () => getAllStatuses())
}
