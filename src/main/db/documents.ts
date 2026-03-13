import { v4 as uuidv4 } from 'uuid'
import { getDb } from './schema'

export interface Document {
  id: string
  title: string
  content: string | null
  task_id: string | null
  agent_id: string | null
  client_id: string | null
  tags: string        // JSON array string
  doc_type: string    // 'output' | 'recap' | 'manual'
  created_at: string
  updated_at: string | null
}

export interface CreateDocumentInput {
  title: string
  content?: string
  task_id?: string
  agent_id?: string
  client_id?: string
  tags?: string[]
  doc_type?: string
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
  const tags = JSON.stringify(input.tags || [])

  getDb()
    .prepare(
      `INSERT INTO documents (id, title, content, task_id, agent_id, client_id, tags, doc_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id, input.title, input.content || null,
      input.task_id || null, input.agent_id || null, input.client_id || null,
      tags, input.doc_type || 'output', now, now
    )

  return getDocumentById(id)!
}

export function searchDocuments(query: string, limit = 50): Document[] {
  return getDb()
    .prepare(
      `SELECT * FROM documents
       WHERE title LIKE ? OR content LIKE ?
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(`%${query}%`, `%${query}%`, limit) as Document[]
}

export function getDocumentsByTag(tag: string, limit = 50): Document[] {
  return getDb()
    .prepare(
      `SELECT * FROM documents WHERE tags LIKE ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(`%"${tag}"%`, limit) as Document[]
}

export function getDocumentsByTaskId(taskId: string): Document[] {
  return getDb()
    .prepare('SELECT * FROM documents WHERE task_id = ? ORDER BY created_at DESC')
    .all(taskId) as Document[]
}

export function getDocumentsByAgentId(agentId: string, limit = 50): Document[] {
  return getDb()
    .prepare('SELECT * FROM documents WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(agentId, limit) as Document[]
}

export function getDocumentsByClientId(clientId: string, limit = 50): Document[] {
  return getDb()
    .prepare('SELECT * FROM documents WHERE client_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(clientId, limit) as Document[]
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
