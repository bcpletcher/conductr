import { useEffect, useState } from 'react'
import AgentCard from '../components/AgentCard'
import ActivityFeed from '../components/ActivityFeed'
import Modal from '../components/Modal'
import type { Agent, ActivityLogEntry } from '../env.d'
import { AGENT_AVATARS } from '../assets/agents'

const api = window.electronAPI

interface AgentDetailProps {
  agent: Agent
  onEdit: () => void
}

function AgentDetail({ agent, onEdit }: AgentDetailProps): React.JSX.Element {
  const [log, setLog] = useState<ActivityLogEntry[]>([])

  useEffect(() => {
    api.agents.getActivityLog(agent.id).then(setLog)
  }, [agent.id])

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Avatar + name */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
          {AGENT_AVATARS[agent.id]
            ? <img src={AGENT_AVATARS[agent.id]} alt={agent.name} className="w-full h-full object-cover" />
            : agent.avatar}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-text-primary">{agent.name}</h2>
          {agent.operational_role && (
            <p className="text-sm text-text-muted mt-1 line-clamp-2">{agent.operational_role}</p>
          )}
        </div>
        <button onClick={onEdit} className="btn-ghost text-xs">
          Edit
        </button>
      </div>

      {/* System Directive */}
      {agent.system_directive && (
        <div className="mb-5">
          <h3 className="section-label mb-2">
            Hidden Directives
          </h3>
          <div className="glass-surface rounded-lg p-4 text-sm text-text-primary leading-relaxed">
            {agent.system_directive}
          </div>
        </div>
      )}

      {/* Operational Role */}
      {agent.operational_role && (
        <div className="mb-5">
          <h3 className="section-label mb-2">
            Operational Role
          </h3>
          <div className="glass-surface rounded-lg p-4 text-sm text-text-primary leading-relaxed">
            {agent.operational_role}
          </div>
        </div>
      )}

      {/* Activity history */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
          Activity History
        </h3>
        <div className="glass-surface rounded-lg p-3">
          <ActivityFeed entries={log} maxHeight="200px" />
        </div>
      </div>
    </div>
  )
}

interface AgentFormProps {
  initial?: Partial<Agent>
  onSubmit: (data: Partial<Agent>) => void
  onCancel: () => void
}

function AgentForm({ initial, onSubmit, onCancel }: AgentFormProps): React.JSX.Element {
  const [name, setName] = useState(initial?.name || '')
  const [avatar, setAvatar] = useState(initial?.avatar || '🤖')
  const [directive, setDirective] = useState(initial?.system_directive || '')
  const [role, setRole] = useState(initial?.operational_role || '')

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      avatar: avatar.trim() || '🤖',
      system_directive: directive.trim() || undefined,
      operational_role: role.trim() || undefined
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Agent name"
            required
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Avatar (emoji)</label>
          <input
            type="text"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="🤖"
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5">System Directive</label>
        <textarea
          value={directive}
          onChange={(e) => setDirective(e.target.value)}
          placeholder="Core directive for this agent..."
          rows={3}
          className="input resize-none"
        />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Operational Role</label>
        <textarea
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Describe this agent's role and responsibilities..."
          rows={3}
          className="input resize-none"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost px-4 py-2">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {initial ? 'Save Changes' : 'Create Agent'}
        </button>
      </div>
    </form>
  )
}

export default function Agents(): React.JSX.Element {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)

  async function loadAgents(): Promise<void> {
    const all = await api.agents.getAll()
    setAgents(all)
    if (!selectedAgent && all.length > 0) {
      setSelectedAgent(all[0])
    }
  }

  useEffect(() => {
    loadAgents()
  }, [])

  async function handleCreate(data: Partial<Agent>): Promise<void> {
    const created = await api.agents.create(data)
    setShowForm(false)
    setAgents((prev) => [...prev, created])
    setSelectedAgent(created)
  }

  async function handleEdit(data: Partial<Agent>): Promise<void> {
    if (!editingAgent) return
    const updated = await api.agents.update(editingAgent.id, data)
    setEditingAgent(null)
    setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    setSelectedAgent(updated)
  }

  return (
    <div data-testid="agents-page" className="flex flex-col h-full">
      <div className="page-header flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="page-title">Agents</h1>
          <p className="page-subtitle">Manage AI personas and directives</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + New Agent
        </button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Agent list */}
        <div className="w-64 flex-shrink-0 space-y-2 overflow-y-auto">
          <div className="section-label px-1 mb-3">
            Personnel
          </div>
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => setSelectedAgent(agent)}
              selected={selectedAgent?.id === agent.id}
            />
          ))}
          {agents.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-text-muted">
              <i className="fa-solid fa-robot text-text-dim text-xl" />
              <span className="text-sm">No agents yet</span>
            </div>
          )}
        </div>

        {/* Agent detail */}
        <div className="flex-1 card overflow-hidden flex flex-col">
          {selectedAgent ? (
            <AgentDetail
              agent={selectedAgent}
              onEdit={() => setEditingAgent(selectedAgent)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
              Select an agent
            </div>
          )}
        </div>
      </div>

      {/* New agent modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New Agent"
        width="max-w-lg"
      >
        <AgentForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      </Modal>

      {/* Edit agent modal */}
      <Modal
        open={!!editingAgent}
        onClose={() => setEditingAgent(null)}
        title="Edit Agent"
        width="max-w-lg"
      >
        {editingAgent && (
          <AgentForm
            initial={editingAgent}
            onSubmit={handleEdit}
            onCancel={() => setEditingAgent(null)}
          />
        )}
      </Modal>
    </div>
  )
}
