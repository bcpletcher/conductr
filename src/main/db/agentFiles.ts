import { getDb } from './schema'
import { v4 as uuidv4 } from 'uuid'

export interface AgentFileRow {
  id: string
  agent_id: string
  filename: string
  content: string
  created_at: string
  updated_at: string | null
}

export function getAgentFiles(agentId: string): AgentFileRow[] {
  const db = getDb()
  return db
    .prepare(`SELECT * FROM agent_files WHERE agent_id = ? ORDER BY filename ASC`)
    .all(agentId) as AgentFileRow[]
}

export function getAgentFile(agentId: string, filename: string): AgentFileRow | null {
  const db = getDb()
  return db
    .prepare(`SELECT * FROM agent_files WHERE agent_id = ? AND filename = ?`)
    .get(agentId, filename) as AgentFileRow | null
}

export function saveAgentFile(
  agentId: string,
  filename: string,
  content: string
): AgentFileRow {
  const db = getDb()
  const now = new Date().toISOString()
  const existing = getAgentFile(agentId, filename)
  if (existing) {
    db.prepare(
      `UPDATE agent_files SET content = ?, updated_at = ? WHERE agent_id = ? AND filename = ?`
    ).run(content, now, agentId, filename)
  } else {
    db.prepare(
      `INSERT INTO agent_files (id, agent_id, filename, content, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(uuidv4(), agentId, filename, content, now)
  }
  return getAgentFile(agentId, filename)!
}

export function deleteAgentFile(agentId: string, filename: string): void {
  const db = getDb()
  db.prepare(`DELETE FROM agent_files WHERE agent_id = ? AND filename = ?`).run(agentId, filename)
}
