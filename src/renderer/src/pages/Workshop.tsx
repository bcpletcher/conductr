import { useEffect, useState } from 'react'
import TaskCard from '../components/TaskCard'
import StatusBadge from '../components/StatusBadge'
import ActivityFeed from '../components/ActivityFeed'
import Modal from '../components/Modal'
import type { Task, ActivityLogEntry, Agent } from '../env.d'

const api = window.electronAPI

type Tab = 'queued' | 'active' | 'complete'

interface TaskDetailProps {
  task: Task
  agents: Agent[]
  onClose: () => void
}

function TaskDetail({ task, agents, onClose }: TaskDetailProps): React.JSX.Element {
  const [log, setLog] = useState<ActivityLogEntry[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(task.progress)

  const assignedAgent = agents.find((a) => a.id === task.agent_id)

  useEffect(() => {
    api.tasks.getActivityLog(task.id).then(setLog)

    api.tasks.onLogUpdate(({ taskId, message }) => {
      if (taskId === task.id) {
        setLog((prev) => [
          ...prev,
          { id: Date.now().toString(), task_id: taskId, agent_id: null, message, timestamp: new Date().toISOString() }
        ])
      }
    })

    api.tasks.onProgressUpdate(({ taskId, progress: p }) => {
      if (taskId === task.id) setProgress(p)
    })

    return () => api.tasks.removeAllListeners()
  }, [task.id])

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
            {running ? 'Running…' : <><span>Start Task</span> <i className="fa-solid fa-arrow-right ml-1" /></>}
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
            <span
              key={tag}
              className="px-2 py-0.5 rounded bg-accent/10 text-accent text-xs font-medium"
            >
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
      {(task.status === 'active' || progress > 0) && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-indigo rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Activity log */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
          Activity Log
        </h3>
        <div className="glass-surface rounded-lg p-3">
          <ActivityFeed entries={log} maxHeight="300px" autoScroll />
        </div>
      </div>
    </div>
  )
}

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
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onSubmit({ title: title.trim(), description: description.trim(), tags, agent_id: agentId })
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label className="block text-xs text-text-muted mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          required
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50"
        />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the task..."
          rows={3}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">Tags (comma-separated)</label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g. research, skill, automation"
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50"
        />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">Assign Agent</label>
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50"
        >
          <option value="">No agent</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.avatar} {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost px-4 py-2">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          Queue Task
        </button>
      </div>
    </form>
  )
}

export default function Workshop(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('queued')
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)

  async function loadTasks(): Promise<void> {
    const all = await api.tasks.getAll()
    setTasks(all)
  }

  useEffect(() => {
    loadTasks()
    api.agents.getAll().then(setAgents)

    api.tasks.onStatusUpdate(({ taskId, status }) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: status as Task['status'] } : t))
      )
    })

    return () => api.tasks.removeAllListeners()
  }, [])

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
    title: string
    description: string
    tags: string[]
    agent_id: string
  }): Promise<void> {
    await api.tasks.create(data)
    setShowNewTask(false)
    loadTasks()
  }

  async function handleStartTask(taskId: string): Promise<void> {
    await api.tasks.updateStatus(taskId, 'active')
    loadTasks()
    const task = tasks.find((t) => t.id === taskId)
    if (task) setSelectedTask({ ...task, status: 'active' })
    api.tasks.start(taskId)
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
        <div className="card flex items-center justify-center text-text-muted text-sm py-16">
          No {tab} tasks
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => setSelectedTask(task)}
              onStart={() => handleStartTask(task.id)}
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
