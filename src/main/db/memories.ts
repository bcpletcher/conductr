import { v4 as uuidv4 } from 'uuid'
import { getDb } from './schema'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentMemory {
  id: string
  agent_id: string
  client_id: string | null
  domain_tags: string   // JSON array
  skill_tags: string    // JSON array
  content: string
  relevance_score: number
  source: string        // 'task' | 'skill_build' | 'manual'
  task_id: string | null
  skill_level: string | null  // 'novice' | 'practitioner' | 'expert' | 'master'
  created_at: string
  last_used_at: string | null
}

export interface KnowledgeEntry {
  id: string
  title: string
  content: string
  source_agent: string | null
  domain_tags: string   // JSON array
  client_id: string | null
  created_at: string
  updated_at: string | null
}

export interface SkillSummary {
  domain: string
  memory_count: number
  skill_level: string
  agent_id: string
}

// ─── Agent Memories CRUD ──────────────────────────────────────────────────────

export function getMemories(agentId: string, options?: {
  clientId?: string | null  // null = global only, undefined = all
  domain?: string
  limit?: number
}): AgentMemory[] {
  const db = getDb()
  let sql = `SELECT * FROM agent_memories WHERE agent_id = ?`
  const params: (string | null | number)[] = [agentId]

  if (options?.clientId === null) {
    sql += ` AND client_id IS NULL`
  } else if (options?.clientId) {
    sql += ` AND (client_id = ? OR client_id IS NULL)`
    params.push(options.clientId)
  }

  if (options?.domain) {
    sql += ` AND domain_tags LIKE ?`
    params.push(`%"${options.domain}"%`)
  }

  sql += ` ORDER BY relevance_score DESC, last_used_at DESC`
  sql += ` LIMIT ?`
  params.push(options?.limit ?? 100)

  return db.prepare(sql).all(...params) as AgentMemory[]
}

export function getMemoriesForTask(agentId: string, clientId: string | null, taskDescription: string, limit = 8): AgentMemory[] {
  const db = getDb()

  // Fetch candidate memories scoped to agent + (client or global)
  let sql = `
    SELECT * FROM agent_memories
    WHERE agent_id = ?
    AND (client_id IS NULL ${clientId ? 'OR client_id = ?' : ''})
    ORDER BY relevance_score DESC, last_used_at DESC
    LIMIT 40
  `
  const params: (string | null)[] = [agentId]
  if (clientId) params.push(clientId)

  const candidates = db.prepare(sql).all(...params) as AgentMemory[]

  // Simple keyword relevance: score by how many task description words appear in content
  const words = taskDescription.toLowerCase().split(/\W+/).filter(w => w.length > 3)
  if (words.length === 0) return candidates.slice(0, limit)

  const scored = candidates.map(m => {
    const lower = m.content.toLowerCase()
    const domainLower = m.domain_tags.toLowerCase()
    let score = m.relevance_score
    for (const w of words) {
      if (lower.includes(w)) score += 0.3
      if (domainLower.includes(w)) score += 0.5
    }
    return { memory: m, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(s => s.memory)
}

export function createMemory(input: Partial<AgentMemory> & { agent_id: string; content: string }): AgentMemory {
  const db = getDb()
  const now = new Date().toISOString()
  const memory: AgentMemory = {
    id: uuidv4(),
    agent_id: input.agent_id,
    client_id: input.client_id ?? null,
    domain_tags: input.domain_tags ?? '[]',
    skill_tags: input.skill_tags ?? '[]',
    content: input.content,
    relevance_score: input.relevance_score ?? 1.0,
    source: input.source ?? 'task',
    task_id: input.task_id ?? null,
    skill_level: input.skill_level ?? null,
    created_at: now,
    last_used_at: null,
  }
  db.prepare(`
    INSERT INTO agent_memories
    (id, agent_id, client_id, domain_tags, skill_tags, content, relevance_score, source, task_id, skill_level, created_at, last_used_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    memory.id, memory.agent_id, memory.client_id,
    memory.domain_tags, memory.skill_tags, memory.content,
    memory.relevance_score, memory.source, memory.task_id,
    memory.skill_level, memory.created_at, memory.last_used_at
  )
  return memory
}

export function deleteMemory(id: string): void {
  getDb().prepare(`DELETE FROM agent_memories WHERE id = ?`).run(id)
}

export function clearAgentMemories(agentId: string, clientId?: string): void {
  const db = getDb()
  if (clientId) {
    db.prepare(`DELETE FROM agent_memories WHERE agent_id = ? AND client_id = ?`).run(agentId, clientId)
  } else {
    db.prepare(`DELETE FROM agent_memories WHERE agent_id = ?`).run(agentId)
  }
}

export function markMemoriesUsed(ids: string[]): void {
  if (ids.length === 0) return
  const db = getDb()
  const now = new Date().toISOString()
  const stmt = db.prepare(`UPDATE agent_memories SET last_used_at = ? WHERE id = ?`)
  for (const id of ids) stmt.run(now, id)
}

export function getMemoryCount(agentId: string): number {
  const row = getDb().prepare(`SELECT COUNT(*) as c FROM agent_memories WHERE agent_id = ?`).get(agentId) as { c: number }
  return row.c
}

// ─── Skill Hardening ──────────────────────────────────────────────────────────

export function SKILL_LEVEL(count: number): string {
  if (count >= 20) return 'master'
  if (count >= 10) return 'expert'
  if (count >= 5)  return 'practitioner'
  return 'novice'
}

export function runSkillHardening(agentId?: string): { created: number; promoted: number } {
  const db = getDb()
  const now = new Date().toISOString()
  let created = 0
  let promoted = 0

  // 1. Compute skill levels per agent per domain
  const query = agentId
    ? db.prepare(`SELECT agent_id, domain_tags, COUNT(*) as c FROM agent_memories WHERE agent_id = ? GROUP BY agent_id, domain_tags`).all(agentId)
    : db.prepare(`SELECT agent_id, domain_tags, COUNT(*) as c FROM agent_memories GROUP BY agent_id, domain_tags`).all()

  const rows = query as Array<{ agent_id: string; domain_tags: string; c: number }>

  for (const row of rows) {
    let domains: string[]
    try { domains = JSON.parse(row.domain_tags) } catch { continue }

    for (const domain of domains) {
      const level = SKILL_LEVEL(row.c)

      // Update skill_level on all memories in this domain/agent
      db.prepare(`
        UPDATE agent_memories
        SET skill_level = ?
        WHERE agent_id = ? AND domain_tags LIKE ?
      `).run(level, row.agent_id, `%"${domain}"%`)
    }
  }

  // 2. Promote client-scoped patterns to global when same domain appears across 3+ clients
  const promotionQuery = agentId
    ? db.prepare(`
        SELECT agent_id, domain_tags, COUNT(DISTINCT client_id) as client_count, GROUP_CONCAT(content, '\n---\n') as all_content
        FROM agent_memories
        WHERE client_id IS NOT NULL AND agent_id = ?
        GROUP BY agent_id, domain_tags
        HAVING client_count >= 3
      `).all(agentId)
    : db.prepare(`
        SELECT agent_id, domain_tags, COUNT(DISTINCT client_id) as client_count, GROUP_CONCAT(content, '\n---\n') as all_content
        FROM agent_memories
        WHERE client_id IS NOT NULL
        GROUP BY agent_id, domain_tags
        HAVING client_count >= 3
      `).all()

  const promoRows = promotionQuery as Array<{
    agent_id: string; domain_tags: string; client_count: number; all_content: string
  }>

  for (const row of promoRows) {
    // Check if a global memory for this agent+domain already exists
    const existingGlobal = db.prepare(`
      SELECT id FROM agent_memories
      WHERE agent_id = ? AND client_id IS NULL AND domain_tags = ? AND source = 'skill_build'
    `).get(row.agent_id, row.domain_tags)

    if (!existingGlobal) {
      let domains: string[]
      try { domains = JSON.parse(row.domain_tags) } catch { domains = [] }

      const summaryContent = `Cross-client pattern (${row.client_count} clients): ${domains.join(', ')}\n\nKey observations:\n${row.all_content.slice(0, 1000)}`

      db.prepare(`
        INSERT INTO agent_memories
        (id, agent_id, client_id, domain_tags, skill_tags, content, relevance_score, source, task_id, skill_level, created_at, last_used_at)
        VALUES (?, ?, NULL, ?, '[]', ?, 1.5, 'skill_build', NULL, 'expert', ?, NULL)
      `).run(uuidv4(), row.agent_id, row.domain_tags, summaryContent, now)

      promoted++
      created++
    }
  }

  return { created, promoted }
}

// ─── Skill Summaries ──────────────────────────────────────────────────────────

export function getSkillSummaries(agentId: string): SkillSummary[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT agent_id, domain_tags, COUNT(*) as memory_count,
           MAX(CASE
             WHEN COUNT(*) >= 20 THEN 'master'
             WHEN COUNT(*) >= 10 THEN 'expert'
             WHEN COUNT(*) >= 5  THEN 'practitioner'
             ELSE 'novice'
           END) as skill_level
    FROM agent_memories
    WHERE agent_id = ?
    GROUP BY agent_id, domain_tags
    ORDER BY memory_count DESC
  `).all(agentId) as Array<{ agent_id: string; domain_tags: string; memory_count: number; skill_level: string }>

  const summaries: SkillSummary[] = []
  for (const row of rows) {
    try {
      const domains = JSON.parse(row.domain_tags) as string[]
      for (const domain of domains) {
        summaries.push({
          domain,
          memory_count: row.memory_count,
          skill_level: row.skill_level,
          agent_id: row.agent_id,
        })
      }
    } catch { /* skip malformed */ }
  }
  return summaries
}

// ─── Knowledge Base CRUD ─────────────────────────────────────────────────────

export function getKnowledge(options?: { domain?: string; clientId?: string; limit?: number }): KnowledgeEntry[] {
  const db = getDb()
  let sql = `SELECT * FROM knowledge_base WHERE 1=1`
  const params: (string | number)[] = []

  if (options?.domain) {
    sql += ` AND domain_tags LIKE ?`
    params.push(`%"${options.domain}"%`)
  }
  if (options?.clientId) {
    sql += ` AND (client_id = ? OR client_id IS NULL)`
    params.push(options.clientId)
  }
  sql += ` ORDER BY created_at DESC LIMIT ?`
  params.push(options?.limit ?? 50)

  return db.prepare(sql).all(...params) as KnowledgeEntry[]
}

export function createKnowledgeEntry(input: Partial<KnowledgeEntry> & { title: string; content: string }): KnowledgeEntry {
  const db = getDb()
  const now = new Date().toISOString()
  const entry: KnowledgeEntry = {
    id: uuidv4(),
    title: input.title,
    content: input.content,
    source_agent: input.source_agent ?? null,
    domain_tags: input.domain_tags ?? '[]',
    client_id: input.client_id ?? null,
    created_at: now,
    updated_at: null,
  }
  db.prepare(`
    INSERT INTO knowledge_base (id, title, content, source_agent, domain_tags, client_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(entry.id, entry.title, entry.content, entry.source_agent, entry.domain_tags, entry.client_id, entry.created_at, entry.updated_at)
  return entry
}

export function deleteKnowledgeEntry(id: string): void {
  getDb().prepare(`DELETE FROM knowledge_base WHERE id = ?`).run(id)
}
