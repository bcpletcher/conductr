import { v4 as uuidv4 } from 'uuid'
import { getDb } from './schema'

export interface DbMessage {
  id: string
  agent_id: string
  role: 'user' | 'assistant'
  content: string
  bookmarked: number  // 0 | 1
  created_at: string
}

export function getMessages(agentId: string): DbMessage[] {
  return getDb()
    .prepare('SELECT * FROM messages WHERE agent_id = ? ORDER BY created_at ASC')
    .all(agentId) as DbMessage[]
}

export function addMessage(
  agentId: string,
  role: 'user' | 'assistant',
  content: string
): DbMessage {
  const id = uuidv4()
  const created_at = new Date().toISOString()
  getDb()
    .prepare('INSERT INTO messages (id, agent_id, role, content, bookmarked, created_at) VALUES (?, ?, ?, ?, 0, ?)')
    .run(id, agentId, role, content, created_at)
  return { id, agent_id: agentId, role, content, bookmarked: 0, created_at }
}

export function toggleBookmark(messageId: string): boolean {
  const db = getDb()
  const row = db.prepare('SELECT bookmarked FROM messages WHERE id = ?').get(messageId) as { bookmarked: number } | undefined
  if (!row) return false
  const newVal = row.bookmarked === 1 ? 0 : 1
  db.prepare('UPDATE messages SET bookmarked = ? WHERE id = ?').run(newVal, messageId)
  return newVal === 1
}

export function clearMessages(agentId: string): void {
  getDb().prepare('DELETE FROM messages WHERE agent_id = ?').run(agentId)
}
