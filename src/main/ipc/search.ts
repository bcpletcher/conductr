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

/** Escape + normalize a user query into FTS5 match syntax */
function buildFtsQuery(query: string): string {
  // Strip FTS5 special chars that could cause parse errors
  const safe = query.replace(/['"*()\[\]:^~?\\]/g, ' ').trim()
  const terms = safe.split(/\s+/).filter(t => t.length > 1)
  if (terms.length === 0) return '""'
  // Match any term; FTS5 ranks by relevance automatically
  return terms.join(' OR ')
}

export function registerSearchHandlers(): void {
  ipcMain.handle('search:global', (_e, query: string): SearchResult[] => {
    if (!query || query.trim().length < 2) return []

    const db = getDb()
    const ftsQuery = buildFtsQuery(query)
    const results: SearchResult[] = []

    try {
      // ── Tasks (FTS5) ────────────────────────────────────────────────────────
      const tasks = db.prepare(`
        SELECT t.id, t.title, t.description, t.status
        FROM tasks t
        WHERE t.id IN (SELECT id FROM tasks_fts WHERE tasks_fts MATCH ?)
        LIMIT 5
      `).all(ftsQuery) as Array<{ id: string; title: string; description: string | null; status: string }>

      for (const t of tasks) {
        results.push({
          type:     'task',
          id:       t.id,
          title:    t.title,
          subtitle: t.status,
          snippet:  t.description?.slice(0, 120) ?? '',
        })
      }

      // ── Agents (FTS5) ───────────────────────────────────────────────────────
      const agents = db.prepare(`
        SELECT a.id, a.name, a.operational_role, a.system_directive
        FROM agents a
        WHERE a.id IN (SELECT id FROM agents_fts WHERE agents_fts MATCH ?)
        LIMIT 4
      `).all(ftsQuery) as Array<{ id: string; name: string; operational_role: string | null; system_directive: string | null }>

      for (const a of agents) {
        results.push({
          type:     'agent',
          id:       a.id,
          title:    a.name,
          subtitle: a.operational_role ?? 'Agent',
          snippet:  a.system_directive?.slice(0, 120) ?? '',
        })
      }

      // ── Documents (FTS5) ────────────────────────────────────────────────────
      const docs = db.prepare(`
        SELECT d.id, d.title, d.content, d.doc_type
        FROM documents d
        WHERE d.id IN (SELECT id FROM documents_fts WHERE documents_fts MATCH ?)
        LIMIT 5
      `).all(ftsQuery) as Array<{ id: string; title: string; content: string | null; doc_type: string }>

      for (const d of docs) {
        results.push({
          type:     'document',
          id:       d.id,
          title:    d.title,
          subtitle: d.doc_type,
          snippet:  d.content?.slice(0, 120) ?? '',
        })
      }

      // ── Journal entries (FTS5) ──────────────────────────────────────────────
      const journal = db.prepare(`
        SELECT j.id, j.title, j.content, j.date
        FROM journal_entries j
        WHERE j.id IN (SELECT id FROM journal_fts WHERE journal_fts MATCH ?)
        LIMIT 3
      `).all(ftsQuery) as Array<{ id: string; title: string; content: string; date: string }>

      for (const j of journal) {
        results.push({
          type:     'journal',
          id:       j.id,
          title:    j.title,
          subtitle: j.date,
          snippet:  j.content?.slice(0, 120) ?? '',
        })
      }

      // ── Chat messages (FTS5) ────────────────────────────────────────────────
      const messages = db.prepare(`
        SELECT m.id, m.content, m.role, a.name AS agent_name
        FROM messages m
        LEFT JOIN agents a ON m.agent_id = a.id
        WHERE m.id IN (SELECT id FROM messages_fts WHERE messages_fts MATCH ?)
        LIMIT 4
      `).all(ftsQuery) as Array<{ id: string; content: string; role: string; agent_name: string | null }>

      for (const m of messages) {
        results.push({
          type:     'message',
          id:       m.id,
          title:    `Chat — ${m.agent_name ?? 'Agent'}`,
          subtitle: m.role === 'user' ? 'You said' : `${m.agent_name ?? 'Agent'} said`,
          snippet:  m.content?.slice(0, 120) ?? '',
        })
      }
    } catch {
      // FTS5 parse error (e.g. empty query after sanitize) — return empty
    }

    return results
  })
}
