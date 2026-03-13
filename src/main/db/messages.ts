import { v4 as uuidv4 } from 'uuid'
import { getDb } from './schema'

export interface DbMessage {
  id: string
  agent_id: string
  role: 'user' | 'assistant'
  content: string
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
    .prepare('INSERT INTO messages (id, agent_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, agentId, role, content, created_at)
  return { id, agent_id: agentId, role, content, created_at }
}

export function clearMessages(agentId: string): void {
  getDb().prepare('DELETE FROM messages WHERE agent_id = ?').run(agentId)
}
