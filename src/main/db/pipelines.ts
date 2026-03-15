/**
 * Phase 17 — Pipelines DB module.
 * CRUD operations for pipelines, pipeline_runs, and pipeline_step_runs tables.
 */

import { randomUUID } from 'crypto'
import { getDb } from './schema'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PipelineStepDef {
  id: string
  name: string
  agent_id: string
  description: string
  execution_mode: 'sequential' | 'parallel'
  depends_on: string[]
  inject_prior_outputs: boolean
}

export interface Pipeline {
  id: string
  name: string
  description: string | null
  steps: string           // JSON: PipelineStepDef[]
  is_template: number     // 0 | 1
  created_at: string
  updated_at: string
}

export interface PipelineRun {
  id: string
  pipeline_id: string
  status: 'pending' | 'running' | 'complete' | 'failed' | 'cancelled'
  started_at: string | null
  completed_at: string | null
  created_at: string
  pipeline_name?: string
}

export interface PipelineStepRun {
  id: string
  run_id: string
  step_id: string
  agent_id: string | null
  task_id: string | null
  status: 'pending' | 'running' | 'complete' | 'failed' | 'skipped'
  output: string | null
  started_at: string | null
  completed_at: string | null
}

// ── Pipeline CRUD ─────────────────────────────────────────────────────────────

export function getAllPipelines(templatesOnly = false): Pipeline[] {
  const db = getDb()
  if (templatesOnly) {
    return db.prepare(`SELECT * FROM pipelines WHERE is_template = 1 ORDER BY name ASC`).all() as Pipeline[]
  }
  return db.prepare(`SELECT * FROM pipelines ORDER BY is_template DESC, name ASC`).all() as Pipeline[]
}

export function getPipelineById(id: string): Pipeline | null {
  const db = getDb()
  return (db.prepare(`SELECT * FROM pipelines WHERE id = ?`).get(id) as Pipeline) ?? null
}

export function createPipeline(input: {
  name: string
  description?: string
  steps?: PipelineStepDef[]
  is_template?: boolean
}): Pipeline {
  const db = getDb()
  const id = randomUUID()
  const now = new Date().toISOString()
  const steps = JSON.stringify(input.steps ?? [])
  db.prepare(`
    INSERT INTO pipelines (id, name, description, steps, is_template, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.name, input.description ?? null, steps, input.is_template ? 1 : 0, now, now)
  return getPipelineById(id)!
}

export function updatePipeline(
  id: string,
  updates: { name?: string; description?: string; steps?: PipelineStepDef[] },
): Pipeline {
  const db = getDb()
  const now = new Date().toISOString()
  if (updates.name !== undefined)        db.prepare(`UPDATE pipelines SET name = ?, updated_at = ? WHERE id = ?`).run(updates.name, now, id)
  if (updates.description !== undefined) db.prepare(`UPDATE pipelines SET description = ?, updated_at = ? WHERE id = ?`).run(updates.description, now, id)
  if (updates.steps !== undefined)       db.prepare(`UPDATE pipelines SET steps = ?, updated_at = ? WHERE id = ?`).run(JSON.stringify(updates.steps), now, id)
  return getPipelineById(id)!
}

export function deletePipeline(id: string): void {
  const db = getDb()
  // Cascade: delete step runs, then runs, then pipeline
  db.prepare(`
    DELETE FROM pipeline_step_runs WHERE run_id IN (
      SELECT id FROM pipeline_runs WHERE pipeline_id = ?
    )
  `).run(id)
  db.prepare(`DELETE FROM pipeline_runs WHERE pipeline_id = ?`).run(id)
  db.prepare(`DELETE FROM pipelines WHERE id = ?`).run(id)
}

// ── Pipeline Run CRUD ─────────────────────────────────────────────────────────

export function createPipelineRun(pipelineId: string): PipelineRun {
  const db = getDb()
  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO pipeline_runs (id, pipeline_id, status, created_at)
    VALUES (?, ?, 'pending', ?)
  `).run(id, pipelineId, now)
  return getPipelineRun(id)!
}

export function getPipelineRun(runId: string): PipelineRun | null {
  const db = getDb()
  return (db.prepare(`
    SELECT pr.*, p.name AS pipeline_name
    FROM pipeline_runs pr
    LEFT JOIN pipelines p ON p.id = pr.pipeline_id
    WHERE pr.id = ?
  `).get(runId) as PipelineRun) ?? null
}

export function getPipelineRuns(pipelineId: string, limit = 20): PipelineRun[] {
  const db = getDb()
  return db.prepare(`
    SELECT pr.*, p.name AS pipeline_name
    FROM pipeline_runs pr
    LEFT JOIN pipelines p ON p.id = pr.pipeline_id
    WHERE pr.pipeline_id = ?
    ORDER BY pr.created_at DESC
    LIMIT ?
  `).all(pipelineId, limit) as PipelineRun[]
}

export function getRecentRuns(limit = 50): PipelineRun[] {
  const db = getDb()
  return db.prepare(`
    SELECT pr.*, p.name AS pipeline_name
    FROM pipeline_runs pr
    LEFT JOIN pipelines p ON p.id = pr.pipeline_id
    ORDER BY pr.created_at DESC
    LIMIT ?
  `).all(limit) as PipelineRun[]
}

export function updatePipelineRun(
  runId: string,
  updates: { status?: PipelineRun['status']; started_at?: string; completed_at?: string },
): void {
  const db = getDb()
  if (updates.status !== undefined)       db.prepare(`UPDATE pipeline_runs SET status = ? WHERE id = ?`).run(updates.status, runId)
  if (updates.started_at !== undefined)   db.prepare(`UPDATE pipeline_runs SET started_at = ? WHERE id = ?`).run(updates.started_at, runId)
  if (updates.completed_at !== undefined) db.prepare(`UPDATE pipeline_runs SET completed_at = ? WHERE id = ?`).run(updates.completed_at, runId)
}

// ── Step Run CRUD ─────────────────────────────────────────────────────────────

export function createStepRun(
  runId: string,
  stepId: string,
  agentId?: string,
  taskId?: string,
): PipelineStepRun {
  const db = getDb()
  const id = randomUUID()
  db.prepare(`
    INSERT INTO pipeline_step_runs (id, run_id, step_id, agent_id, task_id, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(id, runId, stepId, agentId ?? null, taskId ?? null)
  return getStepRunById(id)!
}

export function getStepRunById(id: string): PipelineStepRun | null {
  const db = getDb()
  return (db.prepare(`SELECT * FROM pipeline_step_runs WHERE id = ?`).get(id) as PipelineStepRun) ?? null
}

export function getStepRunsByRunId(runId: string): PipelineStepRun[] {
  const db = getDb()
  return db.prepare(`SELECT * FROM pipeline_step_runs WHERE run_id = ? ORDER BY rowid ASC`).all(runId) as PipelineStepRun[]
}

export function updateStepRun(
  id: string,
  updates: {
    status?: PipelineStepRun['status']
    task_id?: string
    output?: string
    started_at?: string
    completed_at?: string
  },
): void {
  const db = getDb()
  if (updates.status !== undefined)       db.prepare(`UPDATE pipeline_step_runs SET status = ? WHERE id = ?`).run(updates.status, id)
  if (updates.task_id !== undefined)      db.prepare(`UPDATE pipeline_step_runs SET task_id = ? WHERE id = ?`).run(updates.task_id, id)
  if (updates.output !== undefined)       db.prepare(`UPDATE pipeline_step_runs SET output = ? WHERE id = ?`).run(updates.output, id)
  if (updates.started_at !== undefined)   db.prepare(`UPDATE pipeline_step_runs SET started_at = ? WHERE id = ?`).run(updates.started_at, id)
  if (updates.completed_at !== undefined) db.prepare(`UPDATE pipeline_step_runs SET completed_at = ? WHERE id = ?`).run(updates.completed_at, id)
}
