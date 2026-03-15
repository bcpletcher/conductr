import { v4 as uuidv4 } from 'uuid'
import { getDb } from './schema'

export interface DbIdea {
  id: string
  title: string
  what: string | null
  why: string | null
  risks: string | null
  effort: string | null   // 'S' | 'M' | 'L' | 'XL'
  phase: string | null
  source_agent: string
  status: string          // 'pending' | 'approved' | 'denied' | 'pinned'
  deny_reason: string | null
  task_id: string | null
  created_at: string
  updated_at: string
}

const STATUS_ORDER = `CASE status
  WHEN 'pinned'   THEN 0
  WHEN 'pending'  THEN 1
  WHEN 'approved' THEN 2
  WHEN 'denied'   THEN 3
  ELSE 4 END`

export function getIdeas(status?: string): DbIdea[] {
  const db = getDb()
  if (status && status !== 'all') {
    return db
      .prepare(`SELECT * FROM ideas WHERE status = ? ORDER BY created_at DESC`)
      .all(status) as DbIdea[]
  }
  return db
    .prepare(`SELECT * FROM ideas ORDER BY ${STATUS_ORDER}, created_at DESC`)
    .all() as DbIdea[]
}

export function getIdeaById(id: string): DbIdea | undefined {
  return getDb().prepare('SELECT * FROM ideas WHERE id = ?').get(id) as DbIdea | undefined
}

export function createIdea(input: {
  title: string
  what?: string | null
  why?: string | null
  risks?: string | null
  effort?: string | null
  phase?: string | null
  source_agent?: string
}): DbIdea {
  const id = uuidv4()
  const now = new Date().toISOString()
  const db = getDb()
  db.prepare(`
    INSERT INTO ideas (id, title, what, why, risks, effort, phase, source_agent, status, deny_reason, task_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, ?)
  `).run(
    id,
    input.title,
    input.what ?? null,
    input.why ?? null,
    input.risks ?? null,
    input.effort ?? null,
    input.phase ?? null,
    input.source_agent ?? 'Lyra',
    now,
    now,
  )
  return getIdeaById(id)!
}

export function updateIdeaStatus(
  id: string,
  status: 'pending' | 'approved' | 'denied' | 'pinned',
  extra: { denyReason?: string; taskId?: string } = {}
): DbIdea | undefined {
  const now = new Date().toISOString()
  getDb().prepare(`
    UPDATE ideas SET status = ?, deny_reason = ?, task_id = ?, updated_at = ? WHERE id = ?
  `).run(
    status,
    extra.denyReason ?? null,
    extra.taskId ?? null,
    now,
    id,
  )
  return getIdeaById(id)
}

export function deleteIdea(id: string): void {
  getDb().prepare('DELETE FROM ideas WHERE id = ?').run(id)
}

export function getPendingCount(): number {
  const row = getDb().prepare("SELECT COUNT(*) as n FROM ideas WHERE status = 'pending'").get() as { n: number }
  return row.n
}
