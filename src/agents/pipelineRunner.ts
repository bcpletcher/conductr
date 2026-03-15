/**
 * Phase 17 — Pipeline Execution Engine.
 * Runs a pipeline: resolves dependency order, executes steps in
 * sequential / parallel batches, injects prior outputs as context,
 * and streams progress events to the renderer via BrowserWindow.
 */

import { BrowserWindow } from 'electron'
import { createTask, updateTaskStatus } from '../main/db/tasks'
import { runTask } from './runner'
import {
  getPipelineById,
  createPipelineRun,
  updatePipelineRun,
  createStepRun,
  updateStepRun,
  getStepRunsByRunId,
  type PipelineStepDef,
  type PipelineRun,
  type PipelineStepRun,
} from '../main/db/pipelines'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PipelineProgressEvent {
  runId: string
  pipelineId: string
  status: PipelineRun['status']
  stepRuns: PipelineStepRun[]
}

// ── Topological sort ──────────────────────────────────────────────────────────

/**
 * Returns steps in execution order as waves (batches that can run in parallel).
 * Each wave is an array of steps whose dependencies are all satisfied by
 * previous waves.
 */
function resolveBatches(steps: PipelineStepDef[]): PipelineStepDef[][] {
  const stepMap = new Map(steps.map((s) => [s.id, s]))
  const waves: PipelineStepDef[][] = []
  const completed = new Set<string>()

  // Safety valve — at most N iterations (guards against circular deps)
  let remaining = [...steps]
  let guard = 0

  while (remaining.length > 0 && guard < steps.length + 1) {
    guard++
    const wave = remaining.filter(
      (s) => s.depends_on.every((dep) => completed.has(dep))
    )

    if (wave.length === 0) {
      // Circular dependency — run remaining sequentially as a last resort
      waves.push(remaining)
      break
    }

    waves.push(wave)
    wave.forEach((s) => completed.add(s.id))
    remaining = remaining.filter((s) => !completed.has(s.id))

    // Suppress unused warning
    void stepMap
  }

  return waves
}

// ── Push helper ───────────────────────────────────────────────────────────────

function push(win: BrowserWindow, event: PipelineProgressEvent): void {
  if (!win.isDestroyed()) {
    win.webContents.send('pipelines:runUpdate', event)
  }
}

// ── Main executor ─────────────────────────────────────────────────────────────

export async function executePipeline(
  pipelineId: string,
  win: BrowserWindow,
): Promise<PipelineRun> {
  const pipeline = getPipelineById(pipelineId)
  if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`)

  let steps: PipelineStepDef[]
  try {
    steps = JSON.parse(pipeline.steps) as PipelineStepDef[]
  } catch {
    throw new Error('Pipeline has invalid steps JSON')
  }

  // Create run record
  const run = createPipelineRun(pipelineId)
  const runId = run.id

  const now = () => new Date().toISOString()

  updatePipelineRun(runId, { status: 'running', started_at: now() })

  // Initialise step run records
  const stepRunMap = new Map<string, PipelineStepRun>()
  for (const step of steps) {
    const sr = createStepRun(runId, step.id, step.agent_id)
    stepRunMap.set(step.id, sr)
  }

  // Collect outputs keyed by stepId
  const outputMap = new Map<string, string>()

  const emitProgress = (): void => {
    push(win, {
      runId,
      pipelineId,
      status: 'running',
      stepRuns: getStepRunsByRunId(runId),
    })
  }

  emitProgress()

  try {
    const batches = resolveBatches(steps)

    for (const batch of batches) {
      // Run all steps in this wave concurrently
      await Promise.all(
        batch.map(async (step) => {
          const sr = stepRunMap.get(step.id)!
          updateStepRun(sr.id, { status: 'running', started_at: now() })
          emitProgress()

          try {
            // Build context from prior outputs if requested
            let priorContext = ''
            if (step.inject_prior_outputs && step.depends_on.length > 0) {
              const parts = step.depends_on
                .map((depId) => {
                  const out = outputMap.get(depId)
                  if (!out) return null
                  const depStep = steps.find((s) => s.id === depId)
                  return `### Output from "${depStep?.name ?? depId}"\n${out}`
                })
                .filter(Boolean)
              if (parts.length > 0) {
                priorContext = `\n\n---\n## Context from prior pipeline steps\n${parts.join('\n\n')}`
              }
            }

            const description = step.description + priorContext

            // Create a task for this step
            const task = createTask({
              title: `[Pipeline] ${step.name}`,
              description,
              agent_id: step.agent_id || null,
              status: 'queued',
            })

            // Link task to step run and pipeline run
            updateStepRun(sr.id, { task_id: task.id })

            // Run the task
            const result = await runTask(
              task.id,
              (msg) => {
                // Log messages are useful but we don't need to store them here
                void msg
              },
              (_progress) => {
                // Per-step progress is tracked via the task
              },
            )

            const output = result.content ?? ''
            outputMap.set(step.id, output)

            updateStepRun(sr.id, {
              status: 'complete',
              output,
              completed_at: now(),
            })
          } catch (err) {
            updateStepRun(sr.id, {
              status: 'failed',
              output: err instanceof Error ? err.message : 'Step failed',
              completed_at: now(),
            })
            throw err   // Propagate so the outer catch marks the run failed
          }

          emitProgress()
        }),
      )
    }

    updatePipelineRun(runId, { status: 'complete', completed_at: now() })
    push(win, {
      runId,
      pipelineId,
      status: 'complete',
      stepRuns: getStepRunsByRunId(runId),
    })
  } catch {
    updatePipelineRun(runId, { status: 'failed', completed_at: now() })
    push(win, {
      runId,
      pipelineId,
      status: 'failed',
      stepRuns: getStepRunsByRunId(runId),
    })
  }

  // Return the final run state
  const { getPipelineRun } = await import('../main/db/pipelines')
  return getPipelineRun(runId)!
}
