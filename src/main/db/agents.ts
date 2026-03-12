import { v4 as uuidv4 } from 'uuid'
import { getDb } from './schema'

export interface Agent {
  id: string
  name: string
  avatar: string
  system_directive: string | null
  operational_role: string | null
  created_at: string
}

export interface CreateAgentInput {
  name: string
  avatar?: string
  system_directive?: string
  operational_role?: string
}

export function getAllAgents(): Agent[] {
  return getDb().prepare('SELECT * FROM agents ORDER BY created_at ASC').all() as Agent[]
}

export function getAgentById(id: string): Agent | null {
  return (getDb().prepare('SELECT * FROM agents WHERE id = ?').get(id) as Agent) || null
}

export function createAgent(input: CreateAgentInput): Agent {
  const id = uuidv4()
  const now = new Date().toISOString()

  getDb()
    .prepare(
      `INSERT INTO agents (id, name, avatar, system_directive, operational_role, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.name,
      input.avatar || '🤖',
      input.system_directive || null,
      input.operational_role || null,
      now
    )

  return getAgentById(id)!
}

export function updateAgent(id: string, input: Partial<CreateAgentInput>): void {
  const fields: string[] = []
  const values: unknown[] = []

  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name) }
  if (input.avatar !== undefined) { fields.push('avatar = ?'); values.push(input.avatar) }
  if (input.system_directive !== undefined) { fields.push('system_directive = ?'); values.push(input.system_directive) }
  if (input.operational_role !== undefined) { fields.push('operational_role = ?'); values.push(input.operational_role) }

  if (fields.length === 0) return
  values.push(id)

  getDb()
    .prepare(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`)
    .run(...values)
}

export function deleteAgent(id: string): void {
  getDb().prepare('DELETE FROM agents WHERE id = ?').run(id)
}

export function getActivityLogForAgent(agentId: string, limit = 50) {
  return getDb()
    .prepare(
      `SELECT al.*, t.title as task_title
       FROM activity_log al
       LEFT JOIN tasks t ON al.task_id = t.id
       WHERE al.agent_id = ?
       ORDER BY al.timestamp DESC
       LIMIT ?`
    )
    .all(agentId, limit)
}
