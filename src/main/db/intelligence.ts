import { v4 as uuidv4 } from 'uuid'
import { getDb } from './schema'

export interface IntelligenceInsight {
  id: string
  content: string
  insight_type: 'pattern' | 'anomaly' | 'recommendation' | 'recap'
  period_start: string | null
  period_end: string | null
  agent_ids: string   // JSON array string
  task_ids: string    // JSON array string
  is_read: number     // 0 | 1
  generated_at: string
}

export interface CreateInsightInput {
  content: string
  insight_type: IntelligenceInsight['insight_type']
  period_start?: string
  period_end?: string
  agent_ids?: string[]
  task_ids?: string[]
}

export function getAllInsights(limit = 50): IntelligenceInsight[] {
  return getDb()
    .prepare(
      `SELECT * FROM intelligence_insights ORDER BY generated_at DESC LIMIT ?`
    )
    .all(limit) as IntelligenceInsight[]
}

export function getUnreadInsights(): IntelligenceInsight[] {
  return getDb()
    .prepare(
      `SELECT * FROM intelligence_insights WHERE is_read = 0 ORDER BY generated_at DESC`
    )
    .all() as IntelligenceInsight[]
}

export function createInsight(input: CreateInsightInput): IntelligenceInsight {
  const id = uuidv4()
  const now = new Date().toISOString()

  getDb()
    .prepare(
      `INSERT INTO intelligence_insights
       (id, content, insight_type, period_start, period_end, agent_ids, task_ids, is_read, generated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .run(
      id, input.content, input.insight_type,
      input.period_start || null, input.period_end || null,
      JSON.stringify(input.agent_ids || []),
      JSON.stringify(input.task_ids || []),
      now
    )

  return getDb()
    .prepare('SELECT * FROM intelligence_insights WHERE id = ?')
    .get(id) as IntelligenceInsight
}

export function markInsightRead(id: string): void {
  getDb().prepare('UPDATE intelligence_insights SET is_read = 1 WHERE id = ?').run(id)
}

export function markAllInsightsRead(): void {
  getDb().prepare('UPDATE intelligence_insights SET is_read = 1').run()
}

export function deleteInsight(id: string): void {
  getDb().prepare('DELETE FROM intelligence_insights WHERE id = ?').run(id)
}
