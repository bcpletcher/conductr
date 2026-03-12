import { v4 as uuidv4 } from 'uuid'
import { getDb } from './schema'

export interface Task {
  id: string
  title: string
  description: string | null
  status: 'queued' | 'active' | 'complete' | 'failed'
  agent_id: string | null
  client_id: string | null
  tags: string
  progress: number
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface CreateTaskInput {
  title: string
  description?: string
  agent_id?: string
  client_id?: string
  tags?: string[]
}

export function getAllTasks(): Task[] {
  return getDb().prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as Task[]
}

export function getTasksByStatus(status: string): Task[] {
  return getDb()
    .prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC')
    .all(status) as Task[]
}

export function getTaskById(id: string): Task | null {
  return (getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task) || null
}

export function createTask(input: CreateTaskInput): Task {
  const id = uuidv4()
  const now = new Date().toISOString()
  const tags = JSON.stringify(input.tags || [])

  getDb()
    .prepare(
      `INSERT INTO tasks (id, title, description, status, agent_id, client_id, tags, progress, created_at)
       VALUES (?, ?, ?, 'queued', ?, ?, ?, 0, ?)`
    )
    .run(id, input.title, input.description || null, input.agent_id || null, input.client_id || null, tags, now)

  return getTaskById(id)!
}

export function updateTaskStatus(
  id: string,
  status: Task['status'],
  progress?: number
): void {
  const now = new Date().toISOString()

  if (status === 'active') {
    getDb()
      .prepare('UPDATE tasks SET status = ?, started_at = ?, progress = ? WHERE id = ?')
      .run(status, now, progress ?? 0, id)
  } else if (status === 'complete' || status === 'failed') {
    getDb()
      .prepare('UPDATE tasks SET status = ?, completed_at = ?, progress = ? WHERE id = ?')
      .run(status, now, progress ?? 100, id)
  } else {
    getDb()
      .prepare('UPDATE tasks SET status = ?, progress = ? WHERE id = ?')
      .run(status, progress ?? 0, id)
  }
}

export function updateTaskProgress(id: string, progress: number): void {
  getDb().prepare('UPDATE tasks SET progress = ? WHERE id = ?').run(progress, id)
}

export function deleteTask(id: string): void {
  getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id)
}

export function getTaskCounts(): {
  queued: number
  active: number
  complete: number
  failed: number
} {
  const db = getDb()
  const queued = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'queued'").get() as { count: number }).count
  const active = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'active'").get() as { count: number }).count
  const complete = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'complete'").get() as { count: number }).count
  const failed = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'failed'").get() as { count: number }).count
  return { queued, active, complete, failed }
}
