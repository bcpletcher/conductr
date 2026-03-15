/**
 * Phase 17 — Pipelines IPC handlers.
 * Registers all pipelines:* channels via ipcMain.handle.
 */

import { ipcMain, BrowserWindow } from 'electron'
import { runWithRouter } from '../../api/router'
import {
  getAllPipelines,
  getPipelineById,
  createPipeline,
  updatePipeline,
  deletePipeline,
  getRecentRuns,
  getPipelineRuns,
  getPipelineRun,
  getStepRunsByRunId,
  type PipelineStepDef,
} from '../db/pipelines'
import { executePipeline } from '../../agents/pipelineRunner'

// ── Handler registration ───────────────────────────────────────────────────────

export function registerPipelineHandlers(win: BrowserWindow): void {

  // ── List pipelines ─────────────────────────────────────────────────────────
  ipcMain.handle('pipelines:getAll', (_e, templatesOnly?: boolean) => {
    return getAllPipelines(templatesOnly)
  })

  ipcMain.handle('pipelines:getById', (_e, id: string) => {
    return getPipelineById(id)
  })

  // ── CRUD ───────────────────────────────────────────────────────────────────
  ipcMain.handle('pipelines:create', (
    _e,
    input: { name: string; description?: string; steps?: PipelineStepDef[]; is_template?: boolean },
  ) => {
    return createPipeline(input)
  })

  ipcMain.handle('pipelines:update', (
    _e,
    id: string,
    updates: { name?: string; description?: string; steps?: PipelineStepDef[] },
  ) => {
    return updatePipeline(id, updates)
  })

  ipcMain.handle('pipelines:delete', (_e, id: string) => {
    deletePipeline(id)
    return { ok: true }
  })

  // ── Execution ──────────────────────────────────────────────────────────────
  ipcMain.handle('pipelines:start', async (
    _e,
    pipelineId: string,
  ): Promise<{ ok: boolean; runId?: string; error?: string }> => {
    try {
      const run = await executePipeline(pipelineId, win)
      return { ok: true, runId: run.id }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Execution failed' }
    }
  })

  // ── Run history ────────────────────────────────────────────────────────────
  ipcMain.handle('pipelines:getRecentRuns', (_e, limit?: number) => {
    return getRecentRuns(limit)
  })

  ipcMain.handle('pipelines:getRuns', (_e, pipelineId: string, limit?: number) => {
    return getPipelineRuns(pipelineId, limit)
  })

  ipcMain.handle('pipelines:getRunDetail', (_e, runId: string) => {
    const run = getPipelineRun(runId)
    if (!run) return null
    const stepRuns = getStepRunsByRunId(runId)
    return { run, stepRuns }
  })

  // ── Decompose (Lyra LLM call) ──────────────────────────────────────────────
  ipcMain.handle('pipelines:decompose', async (
    _e,
    goal: string,
  ): Promise<{ ok: boolean; steps?: PipelineStepDef[]; error?: string }> => {
    const systemPrompt = `You are Lyra, the lead orchestrator. When given a high-level goal, decompose it into a multi-agent pipeline.
Respond ONLY with valid JSON — an array of step objects, nothing else.
Each step must have these exact fields:
{
  "id": "s1",             // short unique string: s1, s2, ...
  "name": "Step Name",    // short descriptive name
  "agent_id": "agent-nova",  // one of: agent-lyra, agent-nova, agent-scout, agent-forge, agent-pixel, agent-sentinel, agent-courier, agent-nexus, agent-helm, agent-atlas, agent-ledger
  "description": "What this step does",
  "execution_mode": "sequential",  // "sequential" or "parallel"
  "depends_on": [],       // array of step ids this step depends on
  "inject_prior_outputs": true  // whether to inject outputs of depends_on steps as context
}
Choose agents wisely: Scout for research, Nova for code, Forge for backend, Pixel for UI, Sentinel for testing/security, Helm for devops, Ledger for finance, Atlas for planning, Lyra for synthesis/orchestration.
Use parallel execution_mode when steps are truly independent.`

    const userPrompt = `Decompose this goal into a pipeline of 2-6 agent steps:\n\n${goal}`

    try {
      const result = await runWithRouter(systemPrompt, userPrompt, {
        agentId: 'agent-lyra',
        maxTokens: 1500,
      })

      // Extract JSON from potential markdown code block
      let jsonStr = result.content.trim()
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
      if (fenceMatch) jsonStr = fenceMatch[1]

      const steps = JSON.parse(jsonStr) as PipelineStepDef[]
      return { ok: true, steps }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Decomposition failed',
      }
    }
  })

  // ── Swarm: one-shot decompose + execute ────────────────────────────────────
  ipcMain.handle('pipelines:startSwarm', async (
    _e,
    goal: string,
  ): Promise<{ ok: boolean; runId?: string; pipelineId?: string; error?: string }> => {
    // 1. Decompose
    const decomposeResult = await (async () => {
      const systemPrompt = `You are Lyra, the lead orchestrator. When given a high-level goal, decompose it into a multi-agent pipeline.
Respond ONLY with valid JSON — an array of step objects, nothing else.
Each step must have: id, name, agent_id, description, execution_mode, depends_on, inject_prior_outputs.
Use one of: agent-lyra, agent-nova, agent-scout, agent-forge, agent-pixel, agent-sentinel, agent-courier, agent-nexus, agent-helm, agent-atlas, agent-ledger`

      const userPrompt = `Decompose into 2-6 steps:\n\n${goal}`
      const result = await runWithRouter(systemPrompt, userPrompt, {
        agentId: 'agent-lyra',
        maxTokens: 1500,
      })
      let jsonStr = result.content.trim()
      const m = jsonStr.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
      if (m) jsonStr = m[1]
      return JSON.parse(jsonStr) as PipelineStepDef[]
    })()

    // 2. Create a one-off pipeline
    const pipeline = createPipeline({
      name: goal.slice(0, 80),
      description: `Swarm run: ${goal}`,
      steps: decomposeResult,
      is_template: false,
    })

    // 3. Execute
    try {
      const run = await executePipeline(pipeline.id, win)
      return { ok: true, runId: run.id, pipelineId: pipeline.id }
    } catch (err) {
      return {
        ok: false,
        pipelineId: pipeline.id,
        error: err instanceof Error ? err.message : 'Swarm execution failed',
      }
    }
  })
}
