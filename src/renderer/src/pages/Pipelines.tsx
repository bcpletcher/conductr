/**
 * Phase 17 — Pipelines & Swarms page.
 * Three tabs: Builder (pipeline templates + custom), Swarm Mode (NL decompose + run), Runs (history).
 */

import { useState, useEffect, useRef } from 'react'
import type { Pipeline, PipelineStepDef, PipelineRun, PipelineStepRun } from '../env.d'
import { useUIStore } from '../store/ui'
import { AGENT_AVATARS, AGENT_COLORS } from '../assets/agents'

// ── Constants ─────────────────────────────────────────────────────────────────

const AGENT_LABELS: Record<string, { name: string; color: string }> = {
  'agent-lyra':     { name: 'Lyra',     color: '#818cf8' },
  'agent-nova':     { name: 'Nova',     color: '#a78bfa' },
  'agent-scout':    { name: 'Scout',    color: '#22d3ee' },
  'agent-forge':    { name: 'Forge',    color: '#f97316' },
  'agent-pixel':    { name: 'Pixel',    color: '#ec4899' },
  'agent-sentinel': { name: 'Sentinel', color: '#34d399' },
  'agent-courier':  { name: 'Courier',  color: '#fbbf24' },
  'agent-nexus':    { name: 'Nexus',    color: '#0ea5e9' },
  'agent-helm':     { name: 'Helm',     color: '#f43f5e' },
  'agent-atlas':    { name: 'Atlas',    color: '#9333ea' },
  'agent-ledger':   { name: 'Ledger',   color: '#eab308' },
}

const STATUS_COLORS: Record<string, string> = {
  pending:   '#64748b',
  running:   '#818cf8',
  complete:  '#34d399',
  failed:    '#f87171',
  cancelled: '#94a3b8',
  skipped:   '#94a3b8',
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function AgentPill({ agentId }: { agentId: string }): React.JSX.Element {
  const info = AGENT_LABELS[agentId]
  const avatarUrl = AGENT_AVATARS[agentId]
  const color = info?.color ?? AGENT_COLORS[agentId] ?? '#818cf8'
  const name = info?.name ?? agentId
  if (!info && !avatarUrl) return <span style={{ fontSize: 11, color: '#64748b' }}>{agentId}</span>
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px 2px 4px', borderRadius: 20,
      background: `${color}18`, border: `1px solid ${color}40`,
      fontSize: 11, color, fontWeight: 600,
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name} style={{ width: 14, height: 14, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
        : <span style={{ width: 14, height: 14, borderRadius: 4, background: `${color}30`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>✦</span>
      }
      {name}
    </span>
  )
}

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const color = STATUS_COLORS[status] ?? '#64748b'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20,
      background: `${color}18`, border: `1px solid ${color}40`,
      fontSize: 11, color, fontWeight: 600, textTransform: 'capitalize',
    }}>
      {status === 'running' && (
        <span style={{ width: 6, height: 6, borderRadius: 3, background: color, animation: 'pulse 1.5s infinite' }} />
      )}
      {status}
    </span>
  )
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return '—'
  const s = new Date(start).getTime()
  const e = end ? new Date(end).getTime() : Date.now()
  const secs = Math.floor((e - s) / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

// ── Step card used in Builder and Run detail ──────────────────────────────────

function StepCard({ step, index, stepRun }: {
  step: PipelineStepDef
  index: number
  stepRun?: PipelineStepRun
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const status = stepRun?.status ?? 'pending'
  const color = STATUS_COLORS[status]

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${stepRun ? `${color}40` : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 10,
      padding: '10px 14px',
      transition: 'border-color 0.2s',
    }}>
      <div className="flex items-center gap-3">
        <div style={{
          width: 22, height: 22, borderRadius: 11, flexShrink: 0,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
        }}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: 13, fontWeight: 600, color: '#eef0f8' }}>{step.name}</span>
            {stepRun && <StatusBadge status={status} />}
            <span style={{
              fontSize: 10, color: step.execution_mode === 'parallel' ? '#22d3ee' : '#818cf8',
              background: step.execution_mode === 'parallel' ? 'rgba(34,211,238,0.1)' : 'rgba(129,140,248,0.1)',
              border: `1px solid ${step.execution_mode === 'parallel' ? 'rgba(34,211,238,0.25)' : 'rgba(129,140,248,0.25)'}`,
              padding: '1px 6px', borderRadius: 10, fontWeight: 600,
            }}>
              {step.execution_mode}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 2, lineHeight: 1.4 }}>
            {step.description}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <AgentPill agentId={step.agent_id} />
          {stepRun?.output && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4 }}
            >
              <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'}`} style={{ fontSize: 11 }} />
            </button>
          )}
        </div>
      </div>
      {stepRun && (
        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)', marginTop: 4, paddingLeft: 34 }}>
          {formatDuration(stepRun.started_at, stepRun.completed_at)}
        </div>
      )}
      {expanded && stepRun?.output && (
        <div style={{
          marginTop: 10, paddingLeft: 34,
          padding: '8px 10px 8px 34px',
          background: 'rgba(0,0,0,0.3)', borderRadius: 6,
          fontSize: 11.5, color: '#94a3b8', fontFamily: 'monospace',
          maxHeight: 160, overflowY: 'auto', lineHeight: 1.5,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {stepRun.output.slice(0, 1200)}{stepRun.output.length > 1200 ? '\n…[truncated]' : ''}
        </div>
      )}
    </div>
  )
}

// ── Builder Tab ───────────────────────────────────────────────────────────────

function BuilderTab({ accentColor }: { accentColor: string }): React.JSX.Element {
  const addToast = useUIStore((s) => s.addToast)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selected,  setSelected]  = useState<Pipeline | null>(null)
  const [creating,  setCreating]  = useState(false)
  const [newName,   setNewName]   = useState('')
  const [newDesc,   setNewDesc]   = useState('')
  const [running,   setRunning]   = useState<string | null>(null)

  const load = (): void => {
    window.electronAPI.pipelines.getAll().then(setPipelines).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleRun = async (pipelineId: string): Promise<void> => {
    setRunning(pipelineId)
    addToast('Pipeline started — watch the Runs tab for progress', 'info')
    try {
      const result = await window.electronAPI.pipelines.start(pipelineId)
      if (result.ok) {
        addToast('Pipeline complete!', 'success')
      } else {
        addToast(`Pipeline failed: ${result.error ?? 'unknown error'}`, 'error')
      }
    } catch {
      addToast('Pipeline execution error', 'error')
    } finally {
      setRunning(null)
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    await window.electronAPI.pipelines.delete(id)
    if (selected?.id === id) setSelected(null)
    load()
    addToast('Pipeline deleted', 'success')
  }

  const handleCreate = async (): Promise<void> => {
    if (!newName.trim()) return
    const p = await window.electronAPI.pipelines.create({
      name: newName.trim(),
      description: newDesc.trim() || undefined,
      steps: [],
    })
    load()
    setCreating(false)
    setNewName('')
    setNewDesc('')
    setSelected(p)
    addToast('Pipeline created', 'success')
  }

  const templates  = pipelines.filter((p) => p.is_template === 1)
  const custom     = pipelines.filter((p) => p.is_template === 0)

  const selectedSteps: PipelineStepDef[] = selected
    ? (() => { try { return JSON.parse(selected.steps) as PipelineStepDef[] } catch { return [] } })()
    : []

  return (
    <div className="flex gap-5" style={{ height: '100%' }}>
      {/* Left panel — list */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Templates */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Built-in Templates
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {templates.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8, textAlign: 'left',
                  background: selected?.id === p.id ? `${accentColor}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selected?.id === p.id ? `${accentColor}40` : 'rgba(255,255,255,0.07)'}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <i className="fa-solid fa-diagram-project" style={{ fontSize: 12, color: accentColor, opacity: 0.7 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#eef0f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </div>
                  {p.description && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom pipelines */}
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              My Pipelines
            </div>
            <button
              onClick={() => setCreating(true)}
              style={{
                background: `${accentColor}20`, border: `1px solid ${accentColor}40`,
                borderRadius: 6, padding: '3px 8px',
                fontSize: 10.5, color: accentColor, cursor: 'pointer', fontWeight: 600,
              }}
            >
              + New
            </button>
          </div>

          {creating && (
            <div style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '10px 12px', marginBottom: 8,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Pipeline name"
                style={{
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6, padding: '6px 10px', fontSize: 12.5, color: '#eef0f8',
                  width: '100%',
                }}
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                style={{
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#eef0f8',
                  width: '100%',
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  style={{
                    flex: 1, background: accentColor, border: 'none', borderRadius: 6,
                    padding: '5px 0', fontSize: 12, fontWeight: 600, color: '#fff',
                    cursor: newName.trim() ? 'pointer' : 'not-allowed', opacity: newName.trim() ? 1 : 0.5,
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => { setCreating(false); setNewName(''); setNewDesc('') }}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6, padding: '5px 0', fontSize: 12, color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {custom.length === 0 && !creating && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', padding: '12px 4px', textAlign: 'center' }}>
              No custom pipelines yet
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {custom.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 8,
                  background: selected?.id === p.id ? `${accentColor}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selected?.id === p.id ? `${accentColor}40` : 'rgba(255,255,255,0.07)'}`,
                  cursor: 'pointer',
                }}
                onClick={() => setSelected(p)}
              >
                <i className="fa-solid fa-diagram-project" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#eef0f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); void handleDelete(p.id) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 2 }}
                  title="Delete"
                >
                  <i className="fa-solid fa-trash" style={{ fontSize: 10 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — detail */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {selected ? (
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#eef0f8', marginBottom: 4 }}>
                  {selected.name}
                </h2>
                {selected.description && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{selected.description}</p>
                )}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                  {selectedSteps.length} step{selectedSteps.length !== 1 ? 's' : ''}
                  {selected.is_template ? ' · Built-in template' : ' · Custom pipeline'}
                </div>
              </div>
              <button
                onClick={() => void handleRun(selected.id)}
                disabled={running === selected.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 18px', borderRadius: 8, flexShrink: 0,
                  background: running === selected.id ? 'rgba(255,255,255,0.07)' : accentColor,
                  border: 'none', cursor: running === selected.id ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600, color: running === selected.id ? 'rgba(255,255,255,0.4)' : '#fff',
                  transition: 'all 0.15s',
                }}
              >
                {running === selected.id ? (
                  <><i className="fa-solid fa-circle-notch fa-spin" /> Running…</>
                ) : (
                  <><i className="fa-solid fa-play" /> Run Pipeline</>
                )}
              </button>
            </div>

            {/* Steps */}
            {selectedSteps.length === 0 ? (
              <div style={{
                padding: '32px', borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
                textAlign: 'center',
              }}>
                <i className="fa-solid fa-diagram-project" style={{ fontSize: 28, color: 'rgba(255,255,255,0.15)', marginBottom: 12 }} />
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>No steps defined yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedSteps.map((step, idx) => (
                  <StepCard key={step.id} step={step} index={idx} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.5,
          }}>
            <i className="fa-solid fa-diagram-project" style={{ fontSize: 40, color: 'rgba(255,255,255,0.15)' }} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>Select a pipeline to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Swarm Mode Tab ────────────────────────────────────────────────────────────

function SwarmTab({ accentColor }: { accentColor: string }): React.JSX.Element {
  const addToast = useUIStore((s) => s.addToast)
  const [goal,         setGoal]         = useState('')
  const [decomposing,  setDecomposing]  = useState(false)
  const [preview,      setPreview]      = useState<PipelineStepDef[] | null>(null)
  const [running,      setRunning]      = useState(false)
  const [lastRunId,    setLastRunId]    = useState<string | null>(null)
  const [liveSteps,    setLiveSteps]    = useState<PipelineStepRun[]>([])
  const [runStatus,    setRunStatus]    = useState<PipelineRun['status']>('pending')
  const textRef = useRef<HTMLTextAreaElement>(null)

  // Listen for real-time run updates
  useEffect(() => {
    window.electronAPI.pipelines.onRunUpdate((data) => {
      if (lastRunId && data.runId === lastRunId) {
        setLiveSteps(data.stepRuns)
        setRunStatus(data.status)
      }
    })
    return () => window.electronAPI.pipelines.removeAllListeners()
  }, [lastRunId])

  const handleDecompose = async (): Promise<void> => {
    if (!goal.trim()) return
    setDecomposing(true)
    setPreview(null)
    try {
      const result = await window.electronAPI.pipelines.decompose(goal)
      if (result.ok && result.steps) {
        setPreview(result.steps)
      } else {
        addToast(result.error ?? 'Decomposition failed', 'error')
      }
    } catch {
      addToast('Decomposition failed', 'error')
    } finally {
      setDecomposing(false)
    }
  }

  const handleLaunch = async (): Promise<void> => {
    if (!goal.trim()) return
    setRunning(true)
    setLiveSteps([])
    setRunStatus('running')
    addToast('Swarm launched — agents deploying…', 'info')
    try {
      const result = await window.electronAPI.pipelines.startSwarm(goal)
      if (result.ok) {
        setLastRunId(result.runId ?? null)
        addToast('Swarm complete!', 'success')
        setRunStatus('complete')
      } else {
        addToast(result.error ?? 'Swarm failed', 'error')
        setRunStatus('failed')
      }
    } catch {
      addToast('Swarm execution error', 'error')
      setRunStatus('failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div className="mb-6">
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#eef0f8', marginBottom: 6 }}>
          Swarm Mode
        </h2>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
          Describe your goal in plain language. Lyra will decompose it into a multi-agent pipeline
          and dispatch the full SWARM to complete it automatically.
        </p>
      </div>

      {/* Goal input */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '14px 16px', marginBottom: 16,
      }}>
        <textarea
          ref={textRef}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Describe your goal… e.g. 'Research competitor pricing, write a comparison report, and draft a pricing strategy document'"
          rows={4}
          style={{
            width: '100%', background: 'none', border: 'none', resize: 'none',
            fontSize: 14, color: '#eef0f8', lineHeight: 1.6,
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => void handleDecompose()}
          disabled={!goal.trim() || decomposing}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 20px', borderRadius: 8,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            cursor: !goal.trim() || decomposing ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600, color: '#eef0f8',
            opacity: !goal.trim() || decomposing ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
        >
          {decomposing ? (
            <><i className="fa-solid fa-circle-notch fa-spin" /> Decomposing…</>
          ) : (
            <><i className="fa-solid fa-wand-magic-sparkles" /> Preview Plan</>
          )}
        </button>

        <button
          onClick={() => void handleLaunch()}
          disabled={!goal.trim() || running}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 20px', borderRadius: 8,
            background: !goal.trim() || running ? 'rgba(255,255,255,0.05)' : accentColor,
            border: 'none',
            cursor: !goal.trim() || running ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600,
            color: !goal.trim() || running ? 'rgba(255,255,255,0.4)' : '#fff',
            opacity: !goal.trim() || running ? 0.6 : 1,
            transition: 'all 0.15s',
          }}
        >
          {running ? (
            <><i className="fa-solid fa-circle-notch fa-spin" /> Swarming…</>
          ) : (
            <><i className="fa-solid fa-bolt" /> Launch Swarm</>
          )}
        </button>
      </div>

      {/* Preview steps */}
      {preview && !running && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Proposed Plan — {preview.length} step{preview.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {preview.map((step, idx) => (
              <StepCard key={step.id} step={step} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Live run progress */}
      {(running || lastRunId) && liveSteps.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Swarm Progress
            </div>
            <StatusBadge status={runStatus} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {liveSteps.map((sr, idx) => {
              const stepDef = preview?.find((s) => s.id === sr.step_id)
              if (!stepDef) return null
              return <StepCard key={sr.id} step={stepDef} index={idx} stepRun={sr} />
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!preview && !running && liveSteps.length === 0 && (
        <div style={{
          padding: '40px 24px', borderRadius: 14,
          background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✦</div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>
            Describe your goal above
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            Preview the plan first, or launch directly to let the SWARM execute immediately.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Runs Tab ──────────────────────────────────────────────────────────────────

function RunsTab(): React.JSX.Element {
  const [runs,       setRuns]       = useState<PipelineRun[]>([])
  const [selected,   setSelected]   = useState<string | null>(null)
  const [detail,     setDetail]     = useState<{ run: PipelineRun; stepRuns: PipelineStepRun[] } | null>(null)
  const [pipelines,  setPipelines]  = useState<Pipeline[]>([])

  useEffect(() => {
    window.electronAPI.pipelines.getRecentRuns(50).then(setRuns).catch(() => {})
    window.electronAPI.pipelines.getAll().then(setPipelines).catch(() => {})
  }, [])

  // Listen for run updates in real-time
  useEffect(() => {
    window.electronAPI.pipelines.onRunUpdate((data) => {
      setRuns((prev) => {
        const idx = prev.findIndex((r) => r.id === data.runId)
        if (idx === -1) {
          // New run — prepend
          const pipeline = pipelines.find((p) => p.id === data.pipelineId)
          return [{
            id: data.runId,
            pipeline_id: data.pipelineId,
            status: data.status,
            started_at: new Date().toISOString(),
            completed_at: data.status === 'complete' || data.status === 'failed' ? new Date().toISOString() : null,
            created_at: new Date().toISOString(),
            pipeline_name: pipeline?.name,
          }, ...prev]
        }
        const updated = [...prev]
        updated[idx] = { ...updated[idx], status: data.status }
        return updated
      })
      if (selected === data.runId) {
        setDetail({ run: { ...detail?.run!, status: data.status }, stepRuns: data.stepRuns })
      }
    })
    return () => window.electronAPI.pipelines.removeAllListeners()
  }, [selected, detail, pipelines])

  const handleSelect = async (runId: string): Promise<void> => {
    setSelected(runId)
    const d = await window.electronAPI.pipelines.getRunDetail(runId)
    setDetail(d)
  }

  const pipeLookup = new Map(pipelines.map((p) => [p.id, p]))

  return (
    <div className="flex gap-5" style={{ height: '100%' }}>
      {/* Left — run list */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Recent Runs
        </div>
        {runs.length === 0 && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', padding: '16px 4px' }}>
            No runs yet — run a pipeline from the Builder tab.
          </div>
        )}
        {runs.map((run) => {
          const pipeline = pipeLookup.get(run.pipeline_id)
          const pName = run.pipeline_name ?? pipeline?.name ?? 'Unknown'
          return (
            <button
              key={run.id}
              onClick={() => void handleSelect(run.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8, textAlign: 'left',
                background: selected === run.id ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selected === run.id ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer', width: '100%',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                background: STATUS_COLORS[run.status] ?? '#64748b',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#eef0f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {pName}
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)' }}>
                  {formatDuration(run.started_at, run.completed_at)} · {run.status}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Right — run detail */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {detail ? (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#eef0f8' }}>
                {detail.run.pipeline_name ?? 'Run Detail'}
              </h2>
              <StatusBadge status={detail.run.status} />
              <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
                {formatDuration(detail.run.started_at, detail.run.completed_at)}
              </span>
            </div>

            {(() => {
              const pipeline = pipeLookup.get(detail.run.pipeline_id)
              const steps: PipelineStepDef[] = pipeline
                ? (() => { try { return JSON.parse(pipeline.steps) as PipelineStepDef[] } catch { return [] } })()
                : []
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detail.stepRuns.map((sr, idx) => {
                    const stepDef = steps.find((s) => s.id === sr.step_id) ?? {
                      id: sr.step_id,
                      name: sr.step_id,
                      agent_id: sr.agent_id ?? 'agent-lyra',
                      description: '',
                      execution_mode: 'sequential' as const,
                      depends_on: [],
                      inject_prior_outputs: false,
                    }
                    return <StepCard key={sr.id} step={stepDef} index={idx} stepRun={sr} />
                  })}
                </div>
              )
            })()}
          </div>
        ) : (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0.4,
          }}>
            <i className="fa-solid fa-timeline" style={{ fontSize: 36, color: 'rgba(255,255,255,0.15)' }} />
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.35)' }}>Select a run to view step details</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'builder' | 'swarm' | 'runs'

export default function Pipelines(): React.JSX.Element {
  const [tab,       setTab]       = useState<Tab>('builder')
  const accentColor               = useUIStore((s) => s.accentColor)

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'builder', label: 'Builder',    icon: 'fa-solid fa-diagram-project' },
    { id: 'swarm',   label: 'Swarm Mode', icon: 'fa-solid fa-bolt' },
    { id: 'runs',    label: 'Runs',       icon: 'fa-solid fa-timeline' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.025em', marginBottom: 4 }}>
            Pipelines
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.4)' }}>
            Multi-agent workflows — build, decompose, and run automated pipelines.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 16px', borderRadius: 8,
              background: tab === t.id ? `${accentColor}20` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${tab === t.id ? `${accentColor}45` : 'rgba(255,255,255,0.08)'}`,
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: tab === t.id ? accentColor : 'rgba(255,255,255,0.55)',
              transition: 'all 0.15s',
            }}
          >
            <i className={t.icon} style={{ fontSize: 12 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === 'builder' && <BuilderTab accentColor={accentColor} />}
        {tab === 'swarm'   && <SwarmTab   accentColor={accentColor} />}
        {tab === 'runs'    && <RunsTab />}
      </div>
    </div>
  )
}
