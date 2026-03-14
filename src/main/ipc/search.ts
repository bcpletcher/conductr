import { ipcMain } from 'electron'
import { getDb } from '../db/schema'

export type SearchResultType = 'task' | 'agent' | 'document' | 'journal' | 'message'

export interface SearchResult {
  type: SearchResultType
  id: string
  title: string
  subtitle: string
  snippet: string
}

export function registerSearchHandlers(): void {
  ipcMain.handle('search:global', (_e, query: string): SearchResult[] => {
    if (!query || query.trim().length < 2) return []

    const db = getDb()
    const q  = `%${query.trim()}%`
    const results: SearchResult[] = []

    // ── Tasks ──────────────────────────────────────────────────
    const tasks = db.prepare(`
      SELECT id, title, description, status
      FROM tasks
      WHERE title LIKE ? OR description LIKE ?
      LIMIT 5
    `).all(q, q) as Array<{ id: string; title: string; description: string | null; status: string }>

    for (const t of tasks) {
      results.push({
        type:     'task',
        id:       t.id,
        title:    t.title,
        subtitle: t.status,
        snippet:  t.description?.slice(0, 100) ?? '',
      })
    }

    // ── Agents ─────────────────────────────────────────────────
    const agents = db.prepare(`
      SELECT id, name, operational_role, system_directive
      FROM agents
      WHERE name LIKE ? OR operational_role LIKE ? OR system_directive LIKE ?
      LIMIT 4
    `).all(q, q, q) as Array<{ id: string; name: string; operational_role: string | null; system_directive: string | null }>

    for (const a of agents) {
      results.push({
        type:     'agent',
        id:       a.id,
        title:    a.name,
        subtitle: a.operational_role ?? 'Agent',
        snippet:  a.system_directive?.slice(0, 100) ?? '',
      })
    }

    // ── Documents ──────────────────────────────────────────────
    const docs = db.prepare(`
      SELECT id, title, content, doc_type
      FROM documents
      WHERE title LIKE ? OR content LIKE ?
      LIMIT 5
    `).all(q, q) as Array<{ id: string; title: string; content: string | null; doc_type: string }>

    for (const d of docs) {
      results.push({
        type:     'document',
        id:       d.id,
        title:    d.title,
        subtitle: d.doc_type,
        snippet:  d.content?.slice(0, 100) ?? '',
      })
    }

    // ── Journal entries ────────────────────────────────────────
    const journal = db.prepare(`
      SELECT id, title, content, date
      FROM journal_entries
      WHERE title LIKE ? OR content LIKE ?
      LIMIT 3
    `).all(q, q) as Array<{ id: string; title: string; content: string; date: string }>

    for (const j of journal) {
      results.push({
        type:     'journal',
        id:       j.id,
        title:    j.title,
        subtitle: j.date,
        snippet:  j.content?.slice(0, 100) ?? '',
      })
    }

    // ── Chat messages ──────────────────────────────────────────
    const messages = db.prepare(`
      SELECT m.id, m.content, m.role, a.name AS agent_name
      FROM messages m
      LEFT JOIN agents a ON m.agent_id = a.id
      WHERE m.content LIKE ?
      LIMIT 4
    `).all(q) as Array<{ id: string; content: string; role: string; agent_name: string | null }>

    for (const m of messages) {
      results.push({
        type:     'message',
        id:       m.id,
        title:    `Chat — ${m.agent_name ?? 'Agent'}`,
        subtitle: m.role === 'user' ? 'You said' : `${m.agent_name ?? 'Agent'} said`,
        snippet:  m.content?.slice(0, 100) ?? '',
      })
    }

    return results
  })
}
