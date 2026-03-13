import { v4 as uuidv4 } from 'uuid'
import { getDb } from './schema'

export interface Client {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface CreateClientInput {
  name: string
  description?: string
}

export function getAllClients(): Client[] {
  return getDb()
    .prepare('SELECT * FROM clients ORDER BY name ASC')
    .all() as Client[]
}

export function getClientById(id: string): Client | null {
  return (getDb().prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client) || null
}

export function createClient(input: CreateClientInput): Client {
  const id = uuidv4()
  const now = new Date().toISOString()
  getDb()
    .prepare('INSERT INTO clients (id, name, description, created_at) VALUES (?, ?, ?, ?)')
    .run(id, input.name, input.description || null, now)
  return getClientById(id)!
}

export function updateClient(id: string, input: Partial<CreateClientInput>): Client {
  const current = getClientById(id)
  if (!current) throw new Error(`Client not found: ${id}`)
  getDb()
    .prepare('UPDATE clients SET name = ?, description = ? WHERE id = ?')
    .run(
      input.name ?? current.name,
      input.description !== undefined ? (input.description || null) : current.description,
      id
    )
  return getClientById(id)!
}

export function deleteClient(id: string): void {
  getDb().prepare('DELETE FROM clients WHERE id = ?').run(id)
}

export function getClientTaskCount(clientId: string): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) as count FROM tasks WHERE client_id = ?')
    .get(clientId) as { count: number }
  return row.count
}

export function getClientDocCount(clientId: string): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) as count FROM documents WHERE client_id = ?')
    .get(clientId) as { count: number }
  return row.count
}

export function getClientTasks(clientId: string): unknown[] {
  return getDb()
    .prepare(
      `SELECT t.*, a.name as agent_name, a.avatar as agent_avatar
       FROM tasks t
       LEFT JOIN agents a ON t.agent_id = a.id
       WHERE t.client_id = ?
       ORDER BY t.created_at DESC`
    )
    .all(clientId)
}

export function getClientDocuments(clientId: string): unknown[] {
  return getDb()
    .prepare('SELECT * FROM documents WHERE client_id = ? ORDER BY created_at DESC')
    .all(clientId)
}

export function getClientActivityLog(clientId: string, limit = 30): unknown[] {
  return getDb()
    .prepare(
      `SELECT al.*, a.name as agent_name, t.title as task_title
       FROM activity_log al
       LEFT JOIN tasks t ON al.task_id = t.id
       LEFT JOIN agents a ON al.agent_id = a.id
       WHERE t.client_id = ?
       ORDER BY al.timestamp DESC
       LIMIT ?`
    )
    .all(clientId, limit)
}
