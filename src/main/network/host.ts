/**
 * Phase 16 — Host Server.
 * Detects LAN/Tailscale IPs, manages a lightweight HTTP RPC server,
 * and exposes Conductr DB operations to authorised client connections.
 */

import { networkInterfaces } from 'os'
import { execSync } from 'child_process'
import * as http from 'http'
import { getDb } from '../db/schema'
import { derivePairingToken } from './pairing'
import type { PeerInfo } from './types'

// DB function imports for the handler registry
import {
  getAllTasks,
  getTasksByStatus,
  getTaskById,
  createTask,
  updateTaskStatus,
  updateTaskProgress,
  deleteTask,
  getTaskCounts,
} from '../db/tasks'
import { getAllAgents, getAgentById, updateAgent } from '../db/agents'
import {
  getAllDocuments,
  getDocumentById,
  createDocument,
  searchDocuments,
  getDocumentsByTag,
  getDocumentsByTaskId,
  getDocumentsByAgentId,
  deleteDocument,
  getActivityLog,
} from '../db/documents'

// ── Constants ─────────────────────────────────────────────────────────────────

export const HOST_PORT = 9876

// ── IP detection ──────────────────────────────────────────────────────────────

export function getLanIp(): string | null {
  const nets = networkInterfaces()
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return null
}

export function getTailscaleIp(): string | null {
  try {
    const raw = execSync('tailscale ip --4 2>/dev/null', { timeout: 3000, encoding: 'utf8' })
    return raw.trim() || null
  } catch {
    return null
  }
}

export function getTailscalePeers(): PeerInfo[] {
  try {
    const raw = execSync('tailscale status --json 2>/dev/null', { timeout: 5000, encoding: 'utf8' })
    const data = JSON.parse(raw) as {
      Peer?: Record<string, { DNSName?: string; TailscaleIPs?: string[] }>
    }
    return Object.values(data.Peer ?? {}).map((p) => ({
      name: (p.DNSName ?? '').replace(/\.$/, '') || 'Unknown peer',
      ip: p.TailscaleIPs?.[0] ?? '',
      isConductrHost: false,
    }))
  } catch {
    return []
  }
}

// ── Handler registry ──────────────────────────────────────────────────────────

type RpcHandler = (...args: unknown[]) => unknown

const registry = new Map<string, RpcHandler>()

function buildRegistry(): void {
  if (registry.size > 0) return // already built

  // Tasks
  registry.set('tasks:getAll', () => getAllTasks())
  registry.set('tasks:getByStatus', (s) => getTasksByStatus(s as string))
  registry.set('tasks:getById', (id) => getTaskById(id as string))
  registry.set('tasks:create', (input) => createTask(input as Parameters<typeof createTask>[0]))
  registry.set('tasks:updateStatus', (id, s, p) =>
    updateTaskStatus(id as string, s as string, p as number | undefined))
  registry.set('tasks:updateProgress', (id, p) =>
    updateTaskProgress(id as string, p as number))
  registry.set('tasks:delete', (id) => { deleteTask(id as string); return { ok: true } })
  registry.set('tasks:getCounts', () => getTaskCounts())
  registry.set('tasks:getActivityLog', (taskId) => getActivityLog(taskId as string | undefined))

  // Agents
  registry.set('agents:getAll', () => getAllAgents())
  registry.set('agents:getById', (id) => getAgentById(id as string))
  registry.set('agents:update', (id, input) =>
    updateAgent(id as string, input as Parameters<typeof updateAgent>[1]))

  // Documents
  registry.set('documents:getAll', (limit) => getAllDocuments(limit as number | undefined))
  registry.set('documents:getById', (id) => getDocumentById(id as string))
  registry.set('documents:create', (input) =>
    createDocument(input as Parameters<typeof createDocument>[0]))
  registry.set('documents:delete', (id) => { deleteDocument(id as string); return { ok: true } })
  registry.set('documents:search', (q) => searchDocuments(q as string))
  registry.set('documents:getByTag', (tag) => getDocumentsByTag(tag as string))
  registry.set('documents:getByTask', (id) => getDocumentsByTaskId(id as string))
  registry.set('documents:getByAgent', (id) => getDocumentsByAgentId(id as string))

  // Search (lightweight cross-table text search)
  registry.set('search:global', (query) => {
    try {
      const db = getDb()
      const q = `%${query}%`
      const tasks = db.prepare(
        "SELECT id, title, 'task' as type FROM tasks WHERE title LIKE ? LIMIT 5"
      ).all(q) as { id: string; title: string; type: string }[]
      const docs = db.prepare(
        "SELECT id, title, 'document' as type FROM documents WHERE title LIKE ? LIMIT 5"
      ).all(q) as { id: string; title: string; type: string }[]
      return [...tasks, ...docs]
    } catch {
      return []
    }
  })
}

// ── HTTP server ───────────────────────────────────────────────────────────────

let server: http.Server | null = null
let activeConnections = 0

export function isHostServerRunning(): boolean {
  return server !== null
}

export function getConnectedClients(): number {
  return activeConnections
}

export function startHostServer(hostToken: string): void {
  if (server) return
  buildRegistry()

  server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    // Collect body
    let body = ''
    req.on('data', (chunk) => { body += chunk as string })
    req.on('end', () => {
      void handleRequest(req.url ?? '', body, hostToken, res)
    })
  })

  server.listen(HOST_PORT, '0.0.0.0', () => {
    console.log(`[Network Host] HTTP server listening on port ${HOST_PORT}`)
  })

  server.on('error', (err) => {
    console.error('[Network Host] Server error:', err.message)
  })

  // Track active TCP connections as a rough client proxy
  server.on('connection', () => { activeConnections++ })
}

async function handleRequest(
  url: string,
  rawBody: string,
  hostToken: string,
  res: http.ServerResponse,
): Promise<void> {
  try {
    // Health probe — no auth required
    if (url === '/health') {
      res.writeHead(200)
      res.end(JSON.stringify({ ok: true, service: 'conductr' }))
      return
    }

    let data: Record<string, unknown> = {}
    try {
      if (rawBody) data = JSON.parse(rawBody) as Record<string, unknown>
    } catch {
      res.writeHead(400)
      res.end(JSON.stringify({ error: 'Invalid JSON' }))
      return
    }

    // Pairing endpoint — exchange 6-digit code for auth token
    if (url === '/pair') {
      const { code } = data as { code: string }
      const db = getDb()
      const storedCode = db
        .prepare('SELECT value FROM network_config WHERE key = ?')
        .get('host_pairing_code') as { value: string } | undefined
      const salt = db
        .prepare('SELECT value FROM network_config WHERE key = ?')
        .get('host_pairing_salt') as { value: string } | undefined

      if (storedCode?.value && salt?.value && code === storedCode.value) {
        const token = derivePairingToken(code, salt.value)
        res.writeHead(200)
        res.end(JSON.stringify({ ok: true, token }))
      } else {
        res.writeHead(401)
        res.end(JSON.stringify({ ok: false, error: 'Invalid pairing code' }))
      }
      return
    }

    // RPC endpoint — proxy IPC calls
    if (url === '/rpc') {
      const { channel, args = [], auth } = data as {
        channel: string
        args?: unknown[]
        auth: string
      }

      if (auth !== hostToken) {
        res.writeHead(401)
        res.end(JSON.stringify({ error: 'Unauthorized' }))
        return
      }

      const handler = registry.get(channel)
      if (!handler) {
        res.writeHead(404)
        res.end(JSON.stringify({ error: `Channel not exposed: ${channel}` }))
        return
      }

      const result = await Promise.resolve(handler(...(args as unknown[])))
      res.writeHead(200)
      res.end(JSON.stringify({ result }))
      return
    }

    res.writeHead(404)
    res.end(JSON.stringify({ error: 'Not found' }))
  } catch (err) {
    res.writeHead(500)
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }))
  }
}

export function stopHostServer(): void {
  server?.close(() => {
    console.log('[Network Host] HTTP server stopped')
  })
  server = null
  activeConnections = 0
}
