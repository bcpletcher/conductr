import { ipcMain, BrowserWindow } from 'electron'
import {
  getAllDocuments,
  getDocumentById,
  createDocument,
  deleteDocument,
  searchDocuments,
  getDocumentsByTag,
  getDocumentsByTaskId,
  getDocumentsByAgentId,
} from '../db/documents'
import {
  getAllJournalEntries,
  getJournalEntriesByDate,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  searchJournalEntries,
} from '../db/journal'
import {
  getAllInsights,
  getUnreadInsights,
  createInsight,
  markInsightRead,
  markAllInsightsRead,
  deleteInsight,
} from '../db/intelligence'
import { getDb } from '../db/schema'
import { runClaude } from '../../api/claude'

export function registerDocumentHandlers(win: BrowserWindow): void {

  // ── Documents ────────────────────────────────────────────────────────
  ipcMain.handle('documents:getAll', (_e, limit?: number) => getAllDocuments(limit))
  ipcMain.handle('documents:getById', (_e, id: string) => getDocumentById(id))
  ipcMain.handle('documents:create', (_e, input) => createDocument(input))
  ipcMain.handle('documents:delete', (_e, id: string) => deleteDocument(id))
  ipcMain.handle('documents:search', (_e, query: string) => searchDocuments(query))
  ipcMain.handle('documents:getByTag', (_e, tag: string) => getDocumentsByTag(tag))
  ipcMain.handle('documents:getByTask', (_e, taskId: string) => getDocumentsByTaskId(taskId))
  ipcMain.handle('documents:getByAgent', (_e, agentId: string) => getDocumentsByAgentId(agentId))

  // ── Journal ──────────────────────────────────────────────────────────
  ipcMain.handle('journal:getAll', (_e, limit?: number) => getAllJournalEntries(limit))
  ipcMain.handle('journal:getByDate', (_e, date: string) => getJournalEntriesByDate(date))
  ipcMain.handle('journal:create', (_e, input) => createJournalEntry(input))
  ipcMain.handle('journal:update', (_e, id: string, content: string) => updateJournalEntry(id, content))
  ipcMain.handle('journal:delete', (_e, id: string) => deleteJournalEntry(id))
  ipcMain.handle('journal:search', (_e, query: string) => searchJournalEntries(query))

  // ── Intelligence — read ──────────────────────────────────────────────
  ipcMain.handle('intelligence:getAll', (_e, limit?: number) => getAllInsights(limit))
  ipcMain.handle('intelligence:getUnread', () => getUnreadInsights())
  ipcMain.handle('intelligence:markRead', (_e, id: string) => markInsightRead(id))
  ipcMain.handle('intelligence:markAllRead', () => markAllInsightsRead())
  ipcMain.handle('intelligence:delete', (_e, id: string) => deleteInsight(id))

  // ── Intelligence — generate (streaming) ──────────────────────────────
  ipcMain.on('intelligence:generate', async (
    _e,
    { type }: { type: 'insight' | 'recap' }
  ) => {
    const db = getDb()

    const recentTasks = db
      .prepare(
        `SELECT t.title, t.status, t.completed_at, a.name as agent_name
         FROM tasks t LEFT JOIN agents a ON t.agent_id = a.id
         WHERE t.created_at >= datetime('now', '-7 days')
         ORDER BY t.created_at DESC LIMIT 20`
      )
      .all() as Array<{ title: string; status: string; completed_at: string | null; agent_name: string | null }>

    const spendData = db
      .prepare(
        `SELECT COALESCE(SUM(cost_usd), 0) as total, COUNT(*) as calls
         FROM api_usage WHERE timestamp >= datetime('now', '-7 days')`
      )
      .get() as { total: number; calls: number }

    const agentActivity = db
      .prepare(
        `SELECT a.name, COUNT(au.id) as calls, COALESCE(SUM(au.cost_usd), 0) as cost
         FROM api_usage au LEFT JOIN agents a ON au.agent_id = a.id
         WHERE au.timestamp >= datetime('now', '-7 days')
         GROUP BY au.agent_id ORDER BY calls DESC`
      )
      .all() as Array<{ name: string; calls: number; cost: number }>

    const context = [
      `## Conductr Activity Context (Last 7 Days)`,
      `Tasks: ${recentTasks.length} total. ${recentTasks.filter(t => t.status === 'complete').length} completed, ${recentTasks.filter(t => t.status === 'failed').length} failed.`,
      `API Spend: $${Number(spendData.total).toFixed(4)} across ${spendData.calls} calls.`,
      agentActivity.length > 0
        ? `Top Agents: ${agentActivity.slice(0, 3).map(a => `${a.name} (${a.calls} calls, $${Number(a.cost).toFixed(4)})`).join(', ')}`
        : `No agent activity yet.`,
      recentTasks.length > 0
        ? `Recent Tasks: ${recentTasks.slice(0, 5).map(t => `"${t.title}" [${t.status}]`).join(', ')}`
        : `No recent tasks.`,
    ].join('\n')

    const systemPrompt = type === 'recap'
      ? `You are an intelligence analyst for an AI operations platform called Conductr. Generate a concise weekly recap report covering task throughput, agent performance, and cost trends. Use markdown formatting with headers. Be specific and data-driven.`
      : `You are an intelligence analyst for Conductr. Analyze the provided activity data and surface one key pattern, anomaly, or actionable recommendation. Keep it to 2-3 sentences. Be specific and direct.`

    const userPrompt = type === 'recap'
      ? `Generate a weekly recap from this data:\n\n${context}`
      : `Analyze this activity and identify the most important pattern or recommendation:\n\n${context}`

    const now = new Date().toISOString()

    try {
      const result = await runClaude({
        systemPrompt,
        userPrompt,
        maxTokens: type === 'recap' ? 2048 : 512,
        onChunk: (chunk) => {
          win.webContents.send('intelligence:chunk', { chunk })
        }
      })

      const insight = createInsight({
        content: result.content,
        insight_type: type === 'recap' ? 'recap' : 'pattern',
        period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        period_end: now,
      })

      win.webContents.send('intelligence:done', { insight })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      win.webContents.send('intelligence:error', { error })
    }
  })
}
