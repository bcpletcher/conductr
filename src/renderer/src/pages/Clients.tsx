import { useEffect, useState } from 'react'
import ActivityFeed from '../components/ActivityFeed'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import TabBar from '../components/TabBar'
import type { Client, Task, Document, ActivityLogEntry } from '../env.d'

const api = window.electronAPI

// ── Client form ──────────────────────────────────────────────────────────────
interface ClientFormProps {
  initial?: Partial<Client>
  onSubmit: (data: { name: string; description: string }) => void
  onCancel: () => void
}

function ClientForm({ initial, onSubmit, onCancel }: ClientFormProps): React.JSX.Element {
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description: description.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Client Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acme Corp"
          required
          className="input"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this client..."
          rows={3}
          className="input resize-none"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost px-4 py-2">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {initial?.name ? 'Save Changes' : 'Create Client'}
        </button>
      </div>
    </form>
  )
}

// ── Client card (list item) ───────────────────────────────────────────────────
interface ClientCardProps {
  client: Client
  taskCount: number
  docCount: number
  selected: boolean
  onClick: () => void
}

function ClientCard({ client, taskCount, docCount, selected, onClick }: ClientCardProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left card p-4 transition-all ${selected ? 'border-accent/50' : ''}`}
      style={selected ? { background: 'rgba(139,124,248,0.10)' } : undefined}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
          style={{
            background: 'linear-gradient(135deg, rgba(139,124,248,0.25) 0%, rgba(167,139,250,0.15) 100%)',
            border: '1px solid rgba(139,124,248,0.22)',
            color: '#b4abfa',
          }}
        >
          {client.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text-primary truncate">{client.name}</div>
          {client.description && (
            <div className="text-xs mt-0.5 line-clamp-1" style={{ color: 'rgba(255,255,255,0.36)' }}>
              {client.description}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.36)' }}>
          <i className="fa-solid fa-gears" style={{ fontSize: 10 }} />
          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </span>
        <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.36)' }}>
          <i className="fa-solid fa-file-lines" style={{ fontSize: 10 }} />
          {docCount} {docCount === 1 ? 'doc' : 'docs'}
        </span>
      </div>
    </button>
  )
}

// ── Empty state helper ────────────────────────────────────────────────────────
function EmptyState({ icon, label }: { icon: string; label: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <i className={`${icon} text-sm`} style={{ color: 'rgba(255,255,255,0.14)' }} />
      </div>
      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.28)' }}>{label}</span>
    </div>
  )
}

// ── Client detail panel ───────────────────────────────────────────────────────
interface ClientDetailProps {
  client: Client
  onEdit: () => void
  onDelete: () => void
}

function ClientDetail({ client, onEdit, onDelete }: ClientDetailProps): React.JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([])
  const [docs, setDocs] = useState<Document[]>([])
  const [log, setLog] = useState<ActivityLogEntry[]>([])
  const [activeTab, setActiveTab] = useState<'tasks' | 'docs' | 'activity'>('tasks')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    api.clients.getTasks(client.id).then((t) => setTasks(t as Task[]))
    api.clients.getDocuments(client.id).then((d) => setDocs(d as Document[]))
    api.clients.getActivityLog(client.id).then((l) => setLog(l as ActivityLogEntry[]))
  }, [client.id])

  const taskCounts = {
    queued: tasks.filter((t) => t.status === 'queued').length,
    active: tasks.filter((t) => t.status === 'active').length,
    complete: tasks.filter((t) => t.status === 'complete').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex items-start justify-between p-6 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(139,124,248,0.30) 0%, rgba(167,139,250,0.18) 100%)',
              border: '1px solid rgba(139,124,248,0.28)',
              color: '#b4abfa',
              boxShadow: '0 0 20px rgba(139,124,248,0.15)',
            }}
          >
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{client.name}</h2>
            {client.description && (
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.36)' }}>
                {client.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="btn-ghost text-xs px-3 py-1.5">
            Edit
          </button>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.42)' }}>Delete?</span>
              <button
                onClick={onDelete}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.22)' }}
              >
                Confirm
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-ghost text-xs">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ color: 'rgba(255,255,255,0.28)', border: '1px solid transparent' }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.color = '#f87171'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.28)'
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <i className="fa-solid fa-trash-can" style={{ fontSize: 11 }} />
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div
        className="grid grid-cols-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {[
          { label: 'Queued',    value: taskCounts.queued,   color: '#b4abfa' },
          { label: 'Active',    value: taskCounts.active,   color: '#60a5fa' },
          { label: 'Complete',  value: taskCounts.complete, color: '#34d399' },
          { label: 'Documents', value: docs.length,         color: '#a78bfa' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="py-4 px-5"
            style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : undefined }}
          >
            <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="section-label mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <TabBar
        tabs={[
          { id: 'tasks',    label: 'Tasks',     count: tasks.length > 0 ? tasks.length : undefined },
          { id: 'docs',     label: 'Documents' },
          { id: 'activity', label: 'Activity' },
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as typeof activeTab)}
      />

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'tasks' && (
          tasks.length === 0 ? (
            <EmptyState icon="fa-solid fa-gears" label="No tasks for this client yet" />
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusBadge status={task.status} />
                    <span className="text-sm text-text-primary truncate">{task.title}</span>
                  </div>
                  <span className="text-xs flex-shrink-0 ml-3" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    {new Date(task.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'docs' && (
          docs.length === 0 ? (
            <EmptyState icon="fa-solid fa-file-lines" label="No documents for this client yet" />
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <i className="fa-solid fa-file-lines flex-shrink-0" style={{ fontSize: 11, color: '#a78bfa' }} />
                    <span className="text-sm text-text-primary truncate">{doc.title}</span>
                  </div>
                  <span className="text-xs flex-shrink-0 ml-3" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'activity' && (
          log.length === 0 ? (
            <EmptyState icon="fa-solid fa-wave-square" label="No activity for this client yet" />
          ) : (
            <div className="glass-surface rounded-lg p-3">
              <ActivityFeed entries={log} maxHeight="400px" />
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ── Clients page ──────────────────────────────────────────────────────────────
export default function Clients(): React.JSX.Element {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [counts, setCounts] = useState<Record<string, { tasks: number; docs: number }>>({})

  async function loadClients(): Promise<void> {
    const all = await api.clients.getAll()
    setClients(all)
    if (all.length > 0 && !selectedClient) setSelectedClient(all[0])
    const countMap: Record<string, { tasks: number; docs: number }> = {}
    await Promise.all(
      all.map(async (c) => {
        const [tasks, docs] = await Promise.all([
          api.clients.getTaskCount(c.id),
          api.clients.getDocCount(c.id),
        ])
        countMap[c.id] = { tasks, docs }
      })
    )
    setCounts(countMap)
  }

  useEffect(() => {
    loadClients()
  }, [])

  async function handleCreate(data: { name: string; description: string }): Promise<void> {
    const created = await api.clients.create(data)
    setShowNewClient(false)
    setClients((prev) => [...prev, created])
    setSelectedClient(created)
    setCounts((prev) => ({ ...prev, [created.id]: { tasks: 0, docs: 0 } }))
  }

  async function handleEdit(data: { name: string; description: string }): Promise<void> {
    if (!editingClient) return
    const updated = await api.clients.update(editingClient.id, data)
    setEditingClient(null)
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    setSelectedClient(updated)
  }

  async function handleDelete(): Promise<void> {
    if (!selectedClient) return
    await api.clients.delete(selectedClient.id)
    const remaining = clients.filter((c) => c.id !== selectedClient.id)
    setClients(remaining)
    setSelectedClient(remaining[0] || null)
    setCounts((prev) => {
      const next = { ...prev }
      delete next[selectedClient.id]
      return next
    })
  }

  return (
    <div data-testid="clients-page" className="flex flex-col h-full">
      <div className="page-header flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Client-specific project tracking</p>
        </div>
        <button onClick={() => setShowNewClient(true)} className="btn-primary">
          + New Client
        </button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Client list */}
        <div
          className="w-64 flex-shrink-0 flex flex-col overflow-hidden rounded-2xl"
          style={{
            background: 'var(--card-bg, rgba(255,255,255,0.04))',
            backdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.2) brightness(var(--card-brightness, 1))',
            WebkitBackdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.2) brightness(var(--card-brightness, 1))',
            border: '1px solid rgba(255,255,255,0.07)',
            borderTopColor: 'rgba(255,255,255,0.11)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.40)',
          }}
          data-testid="client-list"
        >
          <div className="section-label px-4 pt-4 pb-2 flex-shrink-0">Portfolio</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ background: 'rgba(0,0,0,0.10)' }}>
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                taskCount={counts[client.id]?.tasks ?? 0}
                docCount={counts[client.id]?.docs ?? 0}
                selected={selectedClient?.id === client.id}
                onClick={() => setSelectedClient(client)}
              />
            ))}
            {clients.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <i className="fa-solid fa-users text-xl" style={{ color: 'rgba(255,255,255,0.30)' }} />
                <span className="text-sm">No clients yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Client detail */}
        <div className="flex-1 card overflow-hidden flex flex-col">
          {selectedClient ? (
            <ClientDetail
              key={selectedClient.id}
              client={selectedClient}
              onEdit={() => setEditingClient(selectedClient)}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <i className="fa-solid fa-users" style={{ fontSize: 16, color: 'rgba(255,255,255,0.32)' }} />
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Select a client or create your first one
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={showNewClient}
        onClose={() => setShowNewClient(false)}
        title="New Client"
        width="max-w-md"
      >
        <ClientForm onSubmit={handleCreate} onCancel={() => setShowNewClient(false)} />
      </Modal>

      <Modal
        open={!!editingClient}
        onClose={() => setEditingClient(null)}
        title="Edit Client"
        width="max-w-md"
      >
        {editingClient && (
          <ClientForm
            initial={editingClient}
            onSubmit={handleEdit}
            onCancel={() => setEditingClient(null)}
          />
        )}
      </Modal>
    </div>
  )
}
