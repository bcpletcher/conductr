import { v4 as uuidv4 } from 'uuid'
import { getDb } from './schema'

export interface Document {
  id: string
  title: string
  content: string | null
  task_id: string | null
  client_id: string | null
  created_at: string
}

export interface CreateDocumentInput {
  title: string
  content?: string
  task_id?: string
  client_id?: string
}

export function getAllDocuments(limit = 50): Document[] {
  return getDb()
    .prepare('SELECT * FROM documents ORDER BY created_at DESC LIMIT ?')
    .all(limit) as Document[]
}

export function getDocumentById(id: string): Document | null {
  return (getDb().prepare('SELECT * FROM documents WHERE id = ?').get(id) as Document) || null
}

export function createDocument(input: CreateDocumentInput): Document {
  const id = uuidv4()
  const now = new Date().toISOString()

  getDb()
    .prepare(
      `INSERT INTO documents (id, title, content, task_id, client_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, input.title, input.content || null, input.task_id || null, input.client_id || null, now)

  return getDocumentById(id)!
}

export function deleteDocument(id: string): void {
  getDb().prepare('DELETE FROM documents WHERE id = ?').run(id)
}

export function getActivityLog(taskId?: string, limit = 100) {
  if (taskId) {
    return getDb()
      .prepare(
        `SELECT al.*, a.name as agent_name
         FROM activity_log al
         LEFT JOIN agents a ON al.agent_id = a.id
         WHERE al.task_id = ?
         ORDER BY al.timestamp ASC`
      )
      .all(taskId)
  }
  return getDb()
    .prepare(
      `SELECT al.*, a.name as agent_name, t.title as task_title
       FROM activity_log al
       LEFT JOIN agents a ON al.agent_id = a.id
       LEFT JOIN tasks t ON al.task_id = t.id
       ORDER BY al.timestamp DESC
       LIMIT ?`
    )
    .all(limit)
}

export function addActivityLog(entry: {
  task_id?: string
  agent_id?: string
  message: string
}): void {
  const id = uuidv4()
  const now = new Date().toISOString()

  getDb()
    .prepare(
      `INSERT INTO activity_log (id, task_id, agent_id, message, timestamp)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(id, entry.task_id || null, entry.agent_id || null, entry.message, now)
}
