import { ipcMain } from 'electron'
import { getDb } from '../db/schema'

export function registerMetricsHandlers(): void {
  ipcMain.handle('metrics:getTodaySpend', () => {
    const today = new Date().toISOString().split('T')[0]
    const result = getDb()
      .prepare(
        `SELECT COALESCE(SUM(cost_usd), 0) as total
         FROM api_usage
         WHERE timestamp LIKE ?`
      )
      .get(`${today}%`) as { total: number }
    return result.total
  })

  ipcMain.handle('metrics:get7DaySpend', () => {
    const result = getDb()
      .prepare(
        `SELECT
          DATE(timestamp) as date,
          COALESCE(SUM(cost_usd), 0) as total
         FROM api_usage
         WHERE timestamp >= datetime('now', '-7 days')
         GROUP BY DATE(timestamp)
         ORDER BY date ASC`
      )
      .all()
    return result
  })

  ipcMain.handle('metrics:getTotalTokens', () => {
    const result = getDb()
      .prepare(
        `SELECT
          COALESCE(SUM(input_tokens), 0) as input_tokens,
          COALESCE(SUM(output_tokens), 0) as output_tokens,
          COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens
         FROM api_usage
         WHERE timestamp >= datetime('now', '-30 days')`
      )
      .get() as { input_tokens: number; output_tokens: number; total_tokens: number }
    return result
  })

  ipcMain.handle('metrics:getUsageByTask', (_, limit = 50) => {
    return getDb()
      .prepare(
        `SELECT
          au.*,
          t.title as task_title,
          a.name as agent_name
         FROM api_usage au
         LEFT JOIN tasks t ON au.task_id = t.id
         LEFT JOIN agents a ON au.agent_id = a.id
         ORDER BY au.timestamp DESC
         LIMIT ?`
      )
      .all(limit)
  })

  ipcMain.handle('metrics:getMostActiveModel', () => {
    const result = getDb()
      .prepare(
        `SELECT model, COUNT(*) as count
         FROM api_usage
         GROUP BY model
         ORDER BY count DESC
         LIMIT 1`
      )
      .get() as { model: string; count: number } | undefined
    return result?.model || 'claude-sonnet-4-5'
  })
}
