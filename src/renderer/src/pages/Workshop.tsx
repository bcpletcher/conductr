import { useEffect, useState } from 'react'
import type { TokenEstimate } from '../env.d'
import TaskCard from '../components/TaskCard'
import StatusBadge from '../components/StatusBadge'
import ActivityFeed from '../components/ActivityFeed'
import Modal from '../components/Modal'
import TabBar from '../components/TabBar'
import type { Task, ActivityLogEntry, Agent, Document, Client } from '../env.d'

const api = window.electronAPI

type Tab      = 'queued' | 'active' | 'complete'
type ViewMode = 'list' | 'board'

// ── Shared helpers ────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff    = Date.now() - new Date(iso).getTime()
  const hours   = Math.floor(diff / 3_600_000)
  const minutes = Math.floor(diff / 60_000)
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`
  if (hours > 0)  return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function parseTags(tagsJson: string): string[] {
  try { return JSON.parse(tagsJson) || [] } catch { return [] }
}

const TAG_COLORS = [
  'bg-indigo-500/20 text-indigo-300',
  'bg-green-500/20  text-green-300',
  'bg-orange-500/20 text-orange-300',
  'bg-blue-500/20   text-blue-300',
  'bg-purple-500/20 text-purple-300',
]

// ── BoardCard — compact Kanban card ──────────────────────────────────────────

interface BoardCardProps {
  task:    Task
  agents:  Agent[]
  onClick: () => void
  onStart?: () => void
}

function BoardCard({ task, agents, onClick, onStart }: BoardCardProps): React.JSX.Element {
  const tags  = parseTags(task.tags)
  const agent = agents.find((a) => a.id === task.agent_id)

  const accentColor = {
    queued:   '#94a3b8',
    active:   '#34d399',
    complete: 'var(--color-accent, #818cf8)',
    failed:   '#f87171',
  }[task.status] ?? '#94a3b8'

  return (
    <div
      data-testid="board-card"
      className="rounded-xl p-3 cursor-pointer group transition-all"
      style={{
        background:   'rgba(255,255,255,0.04)',
        border:       '1px solid rgba(255,255,255,0.06)',
        borderLeft:   `3px solid ${accentColor}`,
      }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
    >
      {/* Title */}
      <h4 className="text-sm font-medium text-text-primary mb-2 leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Progress bar — active tasks only */}
      {task.status === 'active' && (
        <div className="mb-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${task.progress}%`, background: '#34d399' }}
          />
        </div>
      )}

      {/* Tags (show first 2, then +N) */}
      {tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          {tags.slice(0, 2).map((tag, i) => (
            <span
              key={tag}
              className={`px-1.5 py-0.5 rounded text-xs font-medium ${TAG_COLORS[i % TAG_COLORS.length]}`}
            >
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span className="text-xs text-text-muted">+{tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Footer: agent + time-ago */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          {agent ? (
            <>
              <span className="text-sm leading-none flex-shrink-0">{agent.avatar}</span>
              <span className="text-xs text-text-muted truncate">{agent.name}</span>
            </>
          ) : (
            <span className="text-xs text-text-muted">Unassigned</span>
          )}
        </div>
        <span className="text-xs flex-shrink-0 ml-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {timeAgo(task.created_at)}
        </span>
      </div>

      {/* Hover-reveal Start button for queued tasks */}
      {task.status === 'queued' && onStart && (
        <button
          onClick={(e) => { e.stopPropagation(); onStart() }}
          className="w-full mt-2.5 btn-primary text-xs py-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Start <i className="fa-solid fa-arrow-right ml-1" />
        </button>
      )}
    </div>
  )
}

// ── BoardView — 4-column Kanban ───────────────────────────────────────────────

const BOARD_COLUMNS: { status: Task['status']; label: string; icon: string; color: string }[] = [
  { status: 'queued',   label: 'Queued',   icon: 'fa-clock',        color: '#94a3b8' },
  { status: 'active',   label: 'Active',   icon: 'fa-bolt',         color: '#34d399' },
  { status: 'complete', label: 'Complete', icon: 'fa-circle-check', color: 'var(--color-accent, #818cf8)' },
  { status: 'failed',   label: 'Failed',   icon: 'fa-circle-xmark', color: '#f87171' },
]

interface BoardViewProps {
  tasks:    Task[]
  agents:   Agent[]
  openTask: (task: Task) => void
  startTask: (taskId: string) => void
}

function BoardView({ tasks, agents, openTask, startTask }: BoardViewProps): React.JSX.Element {
  return (
    <div data-testid="board-view" className="flex gap-4 overflow-x-auto p-4 h-full">
      {BOARD_COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status)
        return (
          <div
            key={col.status}
            className="flex flex-col rounded-2xl p-3"
            style={{
              minWidth: 240, flex: '1 1 0',
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderTopColor: 'rgba(255,255,255,0.11)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <i
                  className={`fa-solid ${col.icon} text-xs`}
                  style={{ color: col.color }}
                />
                <span className="text-sm font-semibold text-text-primary">{col.label}</span>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full text-text-muted font-medium"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                {colTasks.length}
              </span>
            </div>

            {/* Coloured rule under the header */}
            <div
              className="h-0.5 rounded-full mb-3"
              style={{ background: col.color, opacity: 0.35 }}
            />

            {/* Card stack */}
            <div
              className="flex flex-col gap-2 overflow-y-auto pr-0.5"
              style={{ maxHeight: 'calc(100vh - 320px)' }}
            >
              {colTasks.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center gap-2 py-10 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}
                >
                  <i className={`fa-solid ${col.icon} text-text-dim text-base`} style={{ color: col.color, opacity: 0.35 }} />
                  <span className="text-xs text-text-muted">No {col.label.toLowerCase()} tasks</span>
                </div>
              ) : (
                colTasks.map((task) => (
                  <BoardCard
                    key={task.id}
                    task={task}
                    agents={agents}
                    onClick={() => openTask(task)}
                    onStart={task.status === 'queued' ? () => startTask(task.id) : undefined}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── TaskDetail — pure display, no IPC listeners (Workshop owns them all) ────────

interface TaskDetailProps {
  task:         Task
  agents:       Agent[]
  liveLog:      ActivityLogEntry[]
  liveProgress: number
  onClose:      () => void
  onStart?:     () => void
  onDelete?:    () => void
  onCancel?:    () => void
}

function TaskDetail({
  task,
  agents,
  liveLog,
  liveProgress,
  onClose: _onClose,
  onStart,
  onDelete,
  onCancel,
}: TaskDetailProps): React.JSX.Element {
  const [taskDocs, setTaskDocs] = useState<Document[]>([])
  const [tokenEstimate, setTokenEstimate] = useState<TokenEstimate | null>(null)
  const assignedAgent = agents.find((a) => a.id === task.agent_id)

  useEffect(() => {
    api.documents.getByTask(task.id).then((docs) => setTaskDocs(docs as Document[]))
    if (task.status === 'queued') {
      api.tasks.estimateTokens(task.agent_id, task.title, task.description).then(setTokenEstimate)
    }
  }, [task.id])

  return (
    <div className="p-6">
      {/* Title + status */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">{task.title}</h2>
          <StatusBadge status={task.status} pulse />
        </div>
        <div className="flex items-center gap-2">
          {task.status === 'queued' && onStart && (
            <button onClick={onStart} className="btn-primary">
              <span>Start Task</span> <i className="fa-solid fa-arrow-right ml-1" />
            </button>
          )}
          {task.status === 'active' && onCancel && (
            <button
              onClick={onCancel}
              className="btn-ghost px-3 py-1.5 text-sm"
              style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
            >
              <i className="fa-solid fa-stop mr-1.5" />Cancel
            </button>
          )}
          {(task.status === 'queued' || task.status === 'complete' || task.status === 'failed') && onDelete && (
            <button
              onClick={onDelete}
              className="btn-ghost px-3 py-1.5 text-sm"
              style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
            >
              <i className="fa-solid fa-trash mr-1.5" />Delete
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-text-muted mb-4 leading-relaxed">{task.description}</p>
      )}

      {/* Tags */}
      {parseTags(task.tags).length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {parseTags(task.tags).map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded bg-accent/10 text-accent text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Meta grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xs text-text-muted mb-1">Created</div>
          <div className="text-sm text-text-primary">
            {new Date(task.created_at).toLocaleDateString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-text-muted mb-1">Started</div>
          <div className="text-sm text-text-primary">
            {task.started_at ? new Date(task.started_at).toLocaleDateString() : '—'}
          </div>
        </div>
        <div>
          <div className="text-xs text-text-muted mb-1">Agent</div>
          <div className="text-sm text-text-primary">{assignedAgent?.name || '—'}</div>
        </div>
      </div>

      {/* Token estimate (queued tasks only) */}
      {tokenEstimate && task.status === 'queued' && (
        <div
          className="rounded-xl p-3 mb-4 flex items-start gap-3"
          style={{ background: 'rgba(129,140,248,0.07)', border: '1px solid rgba(129,140,248,0.18)' }}
        >
          <i className="fa-solid fa-microchip text-accent mt-0.5 flex-shrink-0" style={{ fontSize: 13 }} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-accent mb-2" style={{ letterSpacing: '0.05em' }}>ESTIMATED CONTEXT</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                { label: 'System', value: tokenEstimate.systemTokens },
                { label: 'Memory', value: tokenEstimate.memoryTokens },
                { label: 'Task', value: tokenEstimate.taskTokens },
                { label: 'Output budget', value: tokenEstimate.outputBudget },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-xs text-text-muted">{label}</span>
                  <span className="text-xs tabular-nums" style={{ color: '#94a3b8' }}>~{value.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-2 pt-2 flex justify-between" style={{ borderColor: 'rgba(129,140,248,0.15)' }}>
              <span className="text-xs font-medium text-text-muted">Total</span>
              <span className="text-xs font-semibold tabular-nums text-accent">~{tokenEstimate.total.toLocaleString()} tok</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {(task.status === 'active' || liveProgress > 0) && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>Progress</span>
            <span>{liveProgress}%</span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-indigo rounded-full transition-all duration-500"
              style={{ width: `${liveProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Activity log */}
      <div>
        <h3 className="section-label mb-3">Activity Log</h3>
        <div className="glass-surface rounded-lg p-3">
          <ActivityFeed entries={liveLog} maxHeight="300px" autoScroll />
        </div>
      </div>

      {/* Linked documents */}
      {taskDocs.length > 0 && (
        <div className="mt-5">
          <h3 className="section-label mb-3">Documents</h3>
          <div className="space-y-2">
            {taskDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <i className="fa-solid fa-file-lines text-text-muted flex-shrink-0" style={{ fontSize: 11 }} />
                  <span className="text-sm text-text-secondary truncate">{doc.title}</span>
                </div>
                <span style={{ fontSize: 10, color: '#64748b', flexShrink: 0, marginLeft: 8 }}>
                  {new Date(doc.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── NewTaskForm ─────────────────────────────────────────────────────────────────

interface NewTaskFormProps {
  agents:   Agent[]
  clients:  Client[]
  onSubmit: (data: { title: string; description: string; tags: string[]; agent_id: string; client_id: string }) => void
  onCancel: () => void
}

function NewTaskForm({ agents, clients, onSubmit, onCancel }: NewTaskFormProps): React.JSX.Element {
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput,   setTagsInput]   = useState('')
  const [agentId,     setAgentId]     = useState(agents[0]?.id || '')
  const [clientId,    setClientId]    = useState('')

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!title.trim()) return
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
    onSubmit({ title: title.trim(), description: description.trim(), tags, agent_id: agentId, client_id: clientId })
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          required
          className="input"
        />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the task..."
          rows={3}
          className="input resize-none"
        />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Tags (comma-separated)</label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g. research, skill, automation"
          className="input"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Assign Agent</label>
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="input"
          >
            <option value="">No agent</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Client (optional)</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="input"
          >
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost px-4 py-2">
          Cancel
        </button>
        <button type="submit" className="btn-primary">Queue Task</button>
      </div>
    </form>
  )
}

// ── Workshop page ───────────────────────────────────────────────────────────────

export default function Workshop(): React.JSX.Element {
  const [tab,          setTab]          = useState<Tab>('queued')
  const [viewMode,     setViewMode]     = useState<ViewMode>('list')
  const [tasks,        setTasks]        = useState<Task[]>([])
  const [agents,       setAgents]       = useState<Agent[]>([])
  const [clients,      setClients]      = useState<Client[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showNewTask,  setShowNewTask]  = useState(false)

  // Live state keyed by taskId — single source of truth, owned here
  const [taskLogs,     setTaskLogs]     = useState<Map<string, ActivityLogEntry[]>>(new Map())
  const [taskProgress, setTaskProgress] = useState<Map<string, number>>(new Map())

  async function loadTasks(): Promise<void> {
    const all = await api.tasks.getAll()
    setTasks(all)
  }

  useEffect(() => {
    loadTasks()
    api.agents.getAll().then(setAgents)
    api.clients.getAll().then(setClients)

    // All task IPC listeners live here — never in child components
    api.tasks.onStatusUpdate(({ taskId, status }) => {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: status as Task['status'] } : t))
      setSelectedTask((prev) => prev?.id === taskId ? { ...prev, status: status as Task['status'] } : prev)
    })

    api.tasks.onProgressUpdate(({ taskId, progress: p }) => {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, progress: p } : t))
      setTaskProgress((prev) => new Map(prev).set(taskId, p))
    })

    api.tasks.onLogUpdate(({ taskId, message }) => {
      setTaskLogs((prev) => {
        const existing = prev.get(taskId) ?? []
        const entry: ActivityLogEntry = {
          id:        `live-${Date.now()}-${Math.random()}`,
          task_id:   taskId,
          agent_id:  null,
          message,
          timestamp: new Date().toISOString(),
        }
        return new Map(prev).set(taskId, [...existing, entry])
      })
    })

    return () => api.tasks.removeAllListeners()
  }, [])

  // N shortcut — opens new task modal when no input is focused
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'n' && e.key !== 'N') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      setShowNewTask(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Fetch persisted log when opening a task; skip if live events already populated it
  async function openTask(task: Task): Promise<void> {
    setSelectedTask(task)
    if (!taskLogs.has(task.id)) {
      const log = await api.tasks.getActivityLog(task.id)
      setTaskLogs((prev) => {
        if (prev.has(task.id)) return prev
        return new Map(prev).set(task.id, log)
      })
    }
  }

  const filtered = tasks.filter((t) => {
    if (tab === 'queued')   return t.status === 'queued'
    if (tab === 'active')   return t.status === 'active'
    if (tab === 'complete') return t.status === 'complete' || t.status === 'failed'
    return false
  })

  const counts = {
    queued:   tasks.filter((t) => t.status === 'queued').length,
    active:   tasks.filter((t) => t.status === 'active').length,
    complete: tasks.filter((t) => t.status === 'complete' || t.status === 'failed').length,
  }

  async function handleCreateTask(data: {
    title: string; description: string; tags: string[]; agent_id: string; client_id: string
  }): Promise<void> {
    await api.tasks.create(data)
    setShowNewTask(false)
    loadTasks()
  }

  async function handleStartFromCard(taskId: string): Promise<void> {
    await api.tasks.updateStatus(taskId, 'active')
    loadTasks()
    const task = tasks.find((t) => t.id === taskId)
    if (task) openTask({ ...task, status: 'active' })
    api.tasks.start(taskId)
  }

  async function handleDeleteTask(taskId: string): Promise<void> {
    await api.tasks.delete(taskId)
    setSelectedTask(null)
    loadTasks()
  }

  async function handleCancelTask(taskId: string): Promise<void> {
    await api.tasks.updateStatus(taskId, 'failed')
    setSelectedTask((prev) => prev?.id === taskId ? { ...prev, status: 'failed' } : prev)
    loadTasks()
  }

  return (
    <div data-testid="workshop-page" className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Workshop</h1>
          <p className="page-subtitle">Autonomous work queue & live progress</p>
        </div>

        <div className="flex items-center gap-3">
          {/* List / Board view toggle */}
          <div
            className="flex items-center gap-0.5 p-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <button
              data-testid="view-toggle-list"
              onClick={() => setViewMode('list')}
              title="List view"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'text-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              style={viewMode === 'list' ? { background: 'var(--color-accent-subtle, rgba(129,140,248,0.15))' } : {}}
            >
              <i className="fa-solid fa-list text-sm" />
            </button>
            <button
              data-testid="view-toggle-board"
              onClick={() => setViewMode('board')}
              title="Board view"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'board'
                  ? 'text-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              style={viewMode === 'board' ? { background: 'var(--color-accent-subtle, rgba(129,140,248,0.15))' } : {}}
            >
              <i className="fa-solid fa-table-cells text-sm" />
            </button>
          </div>

          <button onClick={() => setShowNewTask(true)} className="btn-primary">
            + New Task
          </button>
        </div>
      </div>

      {/* ── List view ──────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="card flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
          {/* Tab bar */}
          <TabBar
            tabs={[
              { id: 'queued',   label: 'Queued',   count: counts.queued },
              { id: 'active',   label: 'Active',   count: counts.active },
              { id: 'complete', label: 'Complete', count: counts.complete },
            ]}
            active={tab}
            onChange={(id) => setTab(id as Tab)}
          />

          {/* Task list */}
          <div className="flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <i className={`fa-solid ${tab === 'queued' ? 'fa-clock' : tab === 'active' ? 'fa-bolt' : 'fa-circle-check'} text-text-dim text-base`} />
                </div>
                <span className="text-sm text-text-muted">No {tab} tasks</span>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => openTask(task)}
                    onStart={() => handleStartFromCard(task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Board view ─────────────────────────────────────────────────────── */}
      {viewMode === 'board' && (
        <div className="card flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <BoardView
            tasks={tasks}
            agents={agents}
            openTask={openTask}
            startTask={handleStartFromCard}
          />
        </div>
      )}

      {/* ── Task detail modal ──────────────────────────────────────────────── */}
      <Modal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Task Detail"
        width="max-w-2xl"
      >
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            agents={agents}
            liveLog={taskLogs.get(selectedTask.id) ?? []}
            liveProgress={taskProgress.get(selectedTask.id) ?? selectedTask.progress}
            onClose={() => setSelectedTask(null)}
            onStart={() => { handleStartFromCard(selectedTask.id) }}
            onDelete={() => { handleDeleteTask(selectedTask.id) }}
            onCancel={() => { handleCancelTask(selectedTask.id) }}
          />
        )}
      </Modal>

      {/* ── New task modal ─────────────────────────────────────────────────── */}
      <Modal
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        title="New Task"
        width="max-w-lg"
      >
        <NewTaskForm
          agents={agents}
          clients={clients}
          onSubmit={handleCreateTask}
          onCancel={() => setShowNewTask(false)}
        />
      </Modal>
    </div>
  )
}
