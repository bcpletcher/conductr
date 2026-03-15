import { ipcMain } from 'electron'
import {
  getMemories, createMemory, deleteMemory, clearAgentMemories,
  getKnowledge, createKnowledgeEntry, deleteKnowledgeEntry,
  runSkillHardening, getSkillSummaries, getMemoryCount,
} from '../db/memories'
import {
  getPromptTemplates, createPromptTemplate, deletePromptTemplate, incrementTemplateUsage,
} from '../db/prompts'
import { runWithRouter } from '../../api/router'

export function registerMemoryHandlers(): void {
  // ── Agent memories ──────────────────────────────────────────────────────────
  ipcMain.handle('memories:getAll', (_e, agentId: string, filters?: {
    clientId?: string | null
    domain?: string
    limit?: number
  }) => getMemories(agentId, filters))

  ipcMain.handle('memories:delete', (_e, id: string) => {
    deleteMemory(id)
    return true
  })

  ipcMain.handle('memories:clearAgent', (_e, agentId: string, clientId?: string) => {
    clearAgentMemories(agentId, clientId)
    return true
  })

  ipcMain.handle('memories:getCount', (_e, agentId: string) => getMemoryCount(agentId))

  ipcMain.handle('memories:getSkillSummaries', (_e, agentId: string) => getSkillSummaries(agentId))

  // ── Skill hardening ─────────────────────────────────────────────────────────
  ipcMain.handle('memories:runSkillHardening', (_e, agentId?: string) => {
    return runSkillHardening(agentId)
  })

  // ── Knowledge base ──────────────────────────────────────────────────────────
  ipcMain.handle('knowledge:getAll', (_e, options?: { domain?: string; clientId?: string; limit?: number }) =>
    getKnowledge(options)
  )

  ipcMain.handle('knowledge:delete', (_e, id: string) => {
    deleteKnowledgeEntry(id)
    return true
  })

  // ── Prompt templates ────────────────────────────────────────────────────────
  ipcMain.handle('prompts:getAll', (_e, agentId?: string) => getPromptTemplates(agentId))

  ipcMain.handle('prompts:create', (_e, input: { name: string; content: string; agent_id?: string; tags?: string }) =>
    createPromptTemplate(input)
  )

  ipcMain.handle('prompts:delete', (_e, id: string) => {
    deletePromptTemplate(id)
    return true
  })

  ipcMain.handle('prompts:incrementUsage', (_e, id: string) => {
    incrementTemplateUsage(id)
    return true
  })

  // ── Auto-rewrite ─────────────────────────────────────────────────────────────
  ipcMain.handle('prompts:autoRewrite', async (_e, content: string): Promise<string> => {
    const result = await runWithRouter(
      'You are a prompt engineer. Rewrite the given task description to be clearer, more specific, and more actionable for an AI agent. Keep it concise. Output only the rewritten prompt, nothing else.',
      content,
      { maxTokens: 512 }
    )
    return result.content.trim()
  })

  // ── Memory seeding (manual create from UI) ──────────────────────────────────
  ipcMain.handle('memories:create', (_e, input: {
    agent_id: string
    content: string
    domain_tags?: string
    skill_tags?: string
    client_id?: string
  }) => createMemory(input))

  // ── Knowledge create (from UI or agent) ────────────────────────────────────
  ipcMain.handle('knowledge:create', (_e, input: {
    title: string
    content: string
    source_agent?: string
    domain_tags?: string
    client_id?: string
  }) => createKnowledgeEntry(input))

}
