import { v4 as uuidv4 } from 'uuid'
import { getDb } from './schema'

export interface PromptTemplate {
  id: string
  agent_id: string | null   // null = global
  name: string
  content: string
  tags: string              // JSON array
  usage_count: number
  created_at: string
  updated_at: string | null
}

export function getPromptTemplates(agentId?: string): PromptTemplate[] {
  const db = getDb()
  if (agentId) {
    return db.prepare(`
      SELECT * FROM prompt_templates
      WHERE agent_id = ? OR agent_id IS NULL
      ORDER BY usage_count DESC, created_at DESC
    `).all(agentId) as PromptTemplate[]
  }
  return db.prepare(`SELECT * FROM prompt_templates ORDER BY usage_count DESC, created_at DESC`).all() as PromptTemplate[]
}

export function createPromptTemplate(input: Partial<PromptTemplate> & { name: string; content: string }): PromptTemplate {
  const db = getDb()
  const now = new Date().toISOString()
  const tmpl: PromptTemplate = {
    id: uuidv4(),
    agent_id: input.agent_id ?? null,
    name: input.name,
    content: input.content,
    tags: input.tags ?? '[]',
    usage_count: 0,
    created_at: now,
    updated_at: null,
  }
  db.prepare(`
    INSERT INTO prompt_templates (id, agent_id, name, content, tags, usage_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tmpl.id, tmpl.agent_id, tmpl.name, tmpl.content, tmpl.tags, tmpl.usage_count, tmpl.created_at, tmpl.updated_at)
  return tmpl
}

export function deletePromptTemplate(id: string): void {
  getDb().prepare(`DELETE FROM prompt_templates WHERE id = ?`).run(id)
}

export function incrementTemplateUsage(id: string): void {
  const now = new Date().toISOString()
  getDb().prepare(`UPDATE prompt_templates SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?`).run(now, id)
}
