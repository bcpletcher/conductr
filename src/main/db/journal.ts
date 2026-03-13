import { v4 as uuidv4 } from 'uuid'
import { getDb } from './schema'

export interface JournalEntry {
  id: string
  date: string
  title: string
  content: string
  entry_type: 'manual' | 'task_complete' | 'recap' | 'system'
  task_id: string | null
  agent_id: string | null
  created_at: string
  updated_at: string | null
  // JOIN fields
  task_title?: string
  agent_name?: string
}

export interface CreateJournalEntryInput {
  title: string
  content: string
  entry_type?: JournalEntry['entry_type']
  task_id?: string
  agent_id?: string
  date?: string
}

export function getAllJournalEntries(limit = 100): JournalEntry[] {
  return getDb()
    .prepare(
      `SELECT je.*, t.title as task_title, a.name as agent_name
       FROM journal_entries je
       LEFT JOIN tasks t ON je.task_id = t.id
       LEFT JOIN agents a ON je.agent_id = a.id
       ORDER BY je.created_at DESC LIMIT ?`
    )
    .all(limit) as JournalEntry[]
}

export function getJournalEntriesByDate(date: string): JournalEntry[] {
  return getDb()
    .prepare(
      `SELECT je.*, t.title as task_title, a.name as agent_name
       FROM journal_entries je
       LEFT JOIN tasks t ON je.task_id = t.id
       LEFT JOIN agents a ON je.agent_id = a.id
       WHERE je.date = ?
       ORDER BY je.created_at ASC`
    )
    .all(date) as JournalEntry[]
}

export function createJournalEntry(input: CreateJournalEntryInput): JournalEntry {
  const id = uuidv4()
  const now = new Date().toISOString()
  const date = input.date || now.split('T')[0]

  getDb()
    .prepare(
      `INSERT INTO journal_entries (id, date, title, content, entry_type, task_id, agent_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id, date, input.title, input.content,
      input.entry_type || 'manual',
      input.task_id || null, input.agent_id || null,
      now, now
    )

  return getDb().prepare('SELECT * FROM journal_entries WHERE id = ?').get(id) as JournalEntry
}

export function updateJournalEntry(id: string, content: string): JournalEntry {
  const now = new Date().toISOString()
  getDb()
    .prepare('UPDATE journal_entries SET content = ?, updated_at = ? WHERE id = ?')
    .run(content, now, id)
  return getDb().prepare('SELECT * FROM journal_entries WHERE id = ?').get(id) as JournalEntry
}

export function deleteJournalEntry(id: string): void {
  getDb().prepare('DELETE FROM journal_entries WHERE id = ?').run(id)
}

export function searchJournalEntries(query: string, limit = 50): JournalEntry[] {
  return getDb()
    .prepare(
      `SELECT je.*, t.title as task_title, a.name as agent_name
       FROM journal_entries je
       LEFT JOIN tasks t ON je.task_id = t.id
       LEFT JOIN agents a ON je.agent_id = a.id
       WHERE je.title LIKE ? OR je.content LIKE ?
       ORDER BY je.created_at DESC LIMIT ?`
    )
    .all(`%${query}%`, `%${query}%`, limit) as JournalEntry[]
}
