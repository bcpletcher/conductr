import { useEffect, useState } from 'react'
import TaskCard from '../components/TaskCard'
import StatusBadge from '../components/StatusBadge'
import ActivityFeed from '../components/ActivityFeed'
import Modal from '../components/Modal'
import type { Task, ActivityLogEntry, Agent } from '../env.d'

const api = window.electronAPI

type Tab = 'queued' | 'active' | 'complete'

// ── TaskDetail — pure display, no IPC listeners (Workshop owns them all) ────────
interface TaskDetailProps {
  task: Task
  agents: Agent[]
  liveLog: ActivityLogEntry[]
  liveProgress: number
  onClose: () => void
}

function TaskDetail({
  task,
  agents,
  liveLog,
  liveProgress,
  onClose: _onClose
}: TaskDetailProps): React.JSX.Element {
  const [running, setRunning] = useState(false)
  const assignedAgent = agents.find((a) => a.id === task.agent_id)

  async function handleStart(): Promise<void> {
    setRunning(true)
    await api.tasks.start(task.id)
    setRunning(false)
  }

  function parseTags(tagsJson: string): string[] {
    try { return JSON.parse(tagsJson) || [] } catch { return [] }
  }

  return (
    <div className="p-6">
      {/* Title + status */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">{task.title}</h2>
          <StatusBadge status={task.status} pulse />
        </div>
        {task.status === 'queued' && (
          <button
            onClick={handleStart}
            disabled={running}
            className="btn-primary disabled:opacity-50"
          >
            {running
              ? 'Running…'
              : <><span>Start Task</span> <i className="fa-solid fa-arrow-right ml-1" /></>}
          </button>
        )}
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

      {/* Activity log — driven by Workshop's consolidated listener */}
      <div>
        <h3 className="section-label mb-3">
          Activity Log
        </h3>
        <div className="glass-surface rounded-lg p-3">
          <ActivityFeed entries={liveLog} maxHeight="300px" autoScroll />
        </div>
      </div>
    </div>
  )
}

// ── NewTaskForm ─────────────────────────────────────────────────────────────────
interface NewTaskFormProps {
  agents: Agent[]
  onSubmit: (data: { title: string; description: string; tags: string[]; agent_id: string }) => void
  onCancel: () => void
}

function NewTaskForm({ agents, onSubmit, onCancel }: NewTaskFormProps): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [agentId, setAgentId] = useState(agents[0]?.id || '')

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!title.trim()) return
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
    onSubmit({ title: title.trim(), description: description.trim(), tags, agent_id: agentId })
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
  const [tab, setTab] = useState<Tab>('queued')
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)

  // Live state keyed by taskId — single source of truth, owned here
  const [taskLogs, setTaskLogs] = useState<Map<string, ActivityLogEntry[]>>(new Map())
  const [taskProgress, setTaskProgress] = useState<Map<string, number>>(new Map())

  async function loadTasks(): Promise<void> {
    const all = await api.tasks.getAll()
    setTasks(all)
  }

  useEffect(() => {
    loadTasks()
    api.agents.getAll().then(setAgents)

    // All task IPC listeners live here — no child component registers its own
    api.tasks.onStatusUpdate(({ taskId, status }) => {
      setTasks((prev) =>
        prev.map((t) => t.id === taskId ? { ...t, status: status as Task['status'] } : t)
      )
      // Keep the open modal's status badge in sync
      setSelectedTask((prev) =>
        prev?.id === taskId ? { ...prev, status: status as Task['status'] } : prev
      )
    })

    api.tasks.onProgressUpdate(({ taskId, progress: p }) => {
      // Updates card progress bars in the list
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, progress: p } : t))
      // Feeds liveProgress into TaskDetail
      setTaskProgress((prev) => new Map(prev).set(taskId, p))
    })

    api.tasks.onLogUpdate(({ taskId, message }) => {
      setTaskLogs((prev) => {
        const existing = prev.get(taskId) ?? []
        const entry: ActivityLogEntry = {
          id: `live-${Date.now()}-${Math.random()}`,
          task_id: taskId,
          agent_id: null,
          message,
          timestamp: new Date().toISOString()
        }
        return new Map(prev).set(taskId, [...existing, entry])
      })
    })

    return () => api.tasks.removeAllListeners()
  }, [])

  // Fetch persisted log from DB when opening a task; skip if live events already populated it
  async function openTask(task: Task): Promise<void> {
    setSelectedTask(task)
    if (!taskLogs.has(task.id)) {
      const log = await api.tasks.getActivityLog(task.id)
      setTaskLogs((prev) => {
        if (prev.has(task.id)) return prev // a live event arrived in the meantime
        return new Map(prev).set(task.id, log)
      })
    }
  }

  const filtered = tasks.filter((t) => {
    if (tab === 'queued') return t.status === 'queued'
    if (tab === 'active') return t.status === 'active'
    if (tab === 'complete') return t.status === 'complete' || t.status === 'failed'
    return false
  })

  const counts = {
    queued: tasks.filter((t) => t.status === 'queued').length,
    active: tasks.filter((t) => t.status === 'active').length,
    complete: tasks.filter((t) => t.status === 'complete' || t.status === 'failed').length
  }

  async function handleCreateTask(data: {
    title: string; description: string; tags: string[]; agent_id: string
  }): Promise<void> {
    await api.tasks.create(data)
    setShowNewTask(false)
    loadTasks()
  }

  // Start from TaskCard button — opens modal then fires the task
  async function handleStartFromCard(taskId: string): Promise<void> {
    await api.tasks.updateStatus(taskId, 'active')
    loadTasks()
    const task = tasks.find((t) => t.id === taskId)
    if (task) openTask({ ...task, status: 'active' })
    api.tasks.start(taskId) // fire-and-forget; events come through listeners above
  }

  return (
    <div data-testid="workshop-page">
      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Workshop</h1>
          <p className="page-subtitle">Autonomous work queue & live progress</p>
        </div>
        <button onClick={() => setShowNewTask(true)} className="btn-primary">
          + New Task
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-5 border-b border-border">
        {(['queued', 'active', 'complete'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors capitalize border-b-2 -mb-px ${
              tab === t
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {t} ({counts[t]})
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-16">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.04] flex items-center justify-center">
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

      {/* Task detail modal */}
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
          />
        )}
      </Modal>

      {/* New task modal */}
      <Modal
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        title="New Task"
        width="max-w-lg"
      >
        <NewTaskForm
          agents={agents}
          onSubmit={handleCreateTask}
          onCancel={() => setShowNewTask(false)}
        />
      </Modal>
    </div>
  )
}
