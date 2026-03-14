import { useEffect, useState } from 'react'
import ActivityFeed from '../components/ActivityFeed'
import type { NavPage } from '../App'
import type { TaskCounts, ActivityLogEntry, Document, Task, Client } from '../env.d'

const api = window.electronAPI

// Compute once at module load — static session uptime reference
const SESSION_START = Date.now()

// ── Agent helpers ────────────────────────────────────────────────
// Colours match each agent's webp icon primary hue (public/agent-*.webp)
const AGENT_COLORS: Record<string, string> = {
  'agent-lyra':     '#a855f7',  // purple
  'agent-nova':     '#3b82f6',  // blue
  'agent-scout':    '#06b6d4',  // cyan
  'agent-forge':    '#f97316',  // orange
  'agent-pixel':    '#ec4899',  // pink
  'agent-sentinel': '#ef4444',  // red
  'agent-courier':  '#22c55e',  // green
}

function agentDisplayName(agentId: string | null): string {
  if (!agentId) return 'Lyra'
  const name = agentId.replace('agent-', '')
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function agentColor(agentId: string | null): string {
  return AGENT_COLORS[agentId ?? ''] ?? '#818cf8'
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor(diff / 60000)
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

// ── Sub-components ───────────────────────────────────────────────
interface DashboardProps {
  onNavigate?: (page: NavPage) => void
}

function CardHeader({
  icon, iconColor, title, action, onAction,
}: {
  icon: string; iconColor: string; title: string; action?: string; onAction?: () => void
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between pb-3 mb-3 flex-shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center gap-2.5">
        <i className={`${icon} text-xs`} style={{ color: iconColor }} />
        <h2 className="text-sm font-semibold" style={{ color: '#dde2f0' }}>{title}</h2>
      </div>
      {action && onAction && (
        <button
          onClick={onAction}
          className="text-xs px-2.5 py-1 rounded-lg transition-all"
          style={{ color: '#6ea8fe', background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.14)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.13)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.07)' }}
        >
          {action}
        </button>
      )}
    </div>
  )
}

function EmptyState({ icon, label }: { icon: string; label: string }): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2.5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <i className={`${icon} text-xs`} style={{ color: 'rgba(255,255,255,0.14)' }} />
      </div>
      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>{label}</span>
    </div>
  )
}

// ── Top stat cards ───────────────────────────────────────────────
function StatCard({
  tag, tagIcon, accentColor, children, action, onAction,
}: {
  tag: string
  tagIcon?: string
  accentColor?: string
  children: React.ReactNode
  action?: { icon: string; onClick?: () => void }
  onAction?: () => void
}): React.JSX.Element {
  return (
    <div
      className="card p-4 flex flex-col gap-1.5 flex-1 min-w-0 relative overflow-hidden"
      style={{ cursor: onAction ? 'pointer' : 'default' }}
      onClick={onAction}
    >
      {/* Colored top accent strip */}
      {accentColor && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}40)`,
        }} />
      )}
      {/* Tag row */}
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1.5">
          {tagIcon && (
            <i className={`${tagIcon} text-xs`} style={{ color: accentColor ?? 'rgba(255,255,255,0.30)' }} />
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em',
            color: accentColor ?? 'rgba(255,255,255,0.32)',
          }}>
            {tag}
          </span>
        </div>
        {action && (
          <button
            onClick={(e) => { e.stopPropagation(); action.onClick?.() }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: accentColor ? `${accentColor}70` : 'rgba(255,255,255,0.28)',
              padding: '2px 4px', borderRadius: 6,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = accentColor ?? 'rgba(255,255,255,0.65)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = accentColor ? `${accentColor}70` : 'rgba(255,255,255,0.28)'
            }}
          >
            <i className={`${action.icon} text-xs`} />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────
export default function Dashboard({ onNavigate }: DashboardProps): React.JSX.Element {
  const [counts,      setCounts]      = useState<TaskCounts>({ queued: 0, active: 0, complete: 0, failed: 0 })
  const [activity,    setActivity]    = useState<ActivityLogEntry[]>([])
  const [documents,   setDocuments]   = useState<Document[]>([])
  const [clients,     setClients]     = useState<Client[]>([])
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [allDocs,     setAllDocs]     = useState<Document[]>([])

  // Uptime computed at render from session start (static, not a live ticker)
  const uptimeSecs    = Math.floor((Date.now() - SESSION_START) / 1000)
  const uptimeMinutes = Math.floor(uptimeSecs / 60)
  const uptimeHours   = Math.floor(uptimeMinutes / 60)
  const uptimeStr     = uptimeHours > 0
    ? `${uptimeHours}h ${uptimeMinutes % 60}m`
    : `${uptimeMinutes}m ${uptimeSecs % 60}s`

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [c, a, docs, clientList, completed, allDocsList] = await Promise.all([
          api.tasks.getCounts(),
          api.tasks.getActivityLog(),
          api.documents.getAll(3),
          api.clients.getAll(),
          api.tasks.getByStatus('complete'),
          api.documents.getAll(),
        ])
        setCounts(c)
        setActivity(a.slice(0, 20))
        setDocuments(docs)
        setClients(clientList)
        setRecentTasks(completed.slice(-5).reverse())
        setAllDocs(allDocsList)
      } catch (err) {
        console.error('Dashboard load error:', err)
      }
    }
    load()
  }, [])

  // Workshop % complete
  const totalTasks = counts.queued + counts.active + counts.complete
  const pctDone    = totalTasks > 0 ? Math.round((counts.complete / totalTasks) * 100) : 0

  // Quick links
  const QUICK_LINKS = [
    { label: 'Workshop',      icon: 'fa-solid fa-gears',     page: 'workshop' as NavPage,     iconColor: '#fb923c', iconBg: 'rgba(251,146,60,0.14)'  },
    { label: 'Intelligence',  icon: 'fa-solid fa-brain',     page: 'intelligence' as NavPage, iconColor: '#a78bfa', iconBg: 'rgba(167,139,250,0.14)' },
    { label: 'API Manager',   icon: 'fa-solid fa-chart-bar', page: 'metrics' as NavPage,      iconColor: '#22d3ee', iconBg: 'rgba(34,211,238,0.14)'  },
  ]

  return (
    <div data-testid="dashboard-page" className="flex flex-col h-full gap-3">

      {/* ── Title row ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-shrink-0 pb-0.5">
        <div>
          <h1 className="font-bold tracking-tight" style={{ fontSize: 22, color: '#eef0f8', letterSpacing: '-0.03em' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.36)' }}>
            Real-time overview of all systems
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl mt-1"
          style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.15)', backdropFilter: 'blur(12px)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.9)' }} />
          <span className="text-xs font-medium" style={{ color: '#34d399', letterSpacing: '0.02em' }}>
            All systems operational
          </span>
        </div>
      </div>

      {/* ── Top stat cards ────────────────────────────────────── */}
      <div className="flex gap-3 flex-shrink-0">

        {/* STATUS — combined with Lyra agent info */}
        <StatCard
          tag="Status"
          tagIcon="fa-solid fa-circle-dot"
          accentColor="#34d399"
          action={{ icon: 'fa-solid fa-arrow-right', onClick: () => onNavigate?.('agents') }}
        >
          <div className="flex items-center justify-between mt-0.5">
            <div className="flex items-center gap-2">
              {/* Lyra avatar */}
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(129,140,248,0.14)', border: '1px solid rgba(129,140,248,0.22)' }}
              >
                <i className="fa-solid fa-robot" style={{ fontSize: 9, color: '#818cf8' }} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {counts.active > 0 ? 'Active' : 'Online'}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Lyra · Lead Agent</div>
              </div>
            </div>
            <span
              className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
              style={{ background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.8)' }}
            />
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>
            {counts.active > 0
              ? `${counts.active} task${counts.active !== 1 ? 's' : ''} running`
              : 'Available for new tasks'
            }
          </div>
          <div className="flex items-center gap-1">
            <i className="fa-regular fa-clock" style={{ fontSize: 9, color: 'rgba(255,255,255,0.26)' }} />
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)' }}>{uptimeStr}</span>
          </div>
        </StatCard>

        {/* WORKSHOP */}
        <StatCard
          tag="Workshop"
          tagIcon="fa-solid fa-gears"
          accentColor="#fb923c"
          action={{ icon: 'fa-solid fa-arrow-right', onClick: () => onNavigate?.('workshop') }}
          onAction={() => onNavigate?.('workshop')}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {counts.active}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontWeight: 500, marginLeft: 4 }}>active</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)' }}>
            {counts.queued} queued
            {totalTasks > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.30)' }}> · {pctDone}% done</span>
            )}
          </div>
        </StatCard>

        {/* CLIENTS */}
        <StatCard
          tag="Clients"
          tagIcon="fa-solid fa-users"
          accentColor="#22d3ee"
          action={{ icon: 'fa-solid fa-arrow-right', onClick: () => onNavigate?.('clients') }}
          onAction={() => onNavigate?.('clients')}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {clients.length}
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)' }}>
            {clients.length === 0 ? 'No clients yet' : `${clients.length} workspace${clients.length !== 1 ? 's' : ''}`}
          </div>
        </StatCard>

        {/* DOCUMENTS */}
        <StatCard
          tag="Documents"
          tagIcon="fa-solid fa-file-lines"
          accentColor="#a78bfa"
          action={{ icon: 'fa-solid fa-arrow-right', onClick: () => onNavigate?.('documents') }}
          onAction={() => onNavigate?.('documents')}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {allDocs.length}
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)' }}>
            Total processed
          </div>
        </StatCard>
      </div>

      {/* ── Content area — 60/40 split ────────────────────────── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Left column — 60% */}
        <div className="flex flex-col gap-3 min-h-0" style={{ flex: '3 1 0%' }}>

          {/* Live Activity */}
          <div className="card p-4 flex flex-col min-h-0" style={{ flex: '1 1 0%' }}>
            <CardHeader
              icon="fa-solid fa-wave-square"
              iconColor="#34d399"
              title="Live Activity"
              action="View Workshop"
              onAction={() => onNavigate?.('workshop')}
            />
            <div className="flex items-center gap-1.5 mb-3 -mt-1">
              <div className="w-1 h-1 rounded-full bg-accent-green animate-pulse" />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Live
              </span>
            </div>
            {activity.length === 0
              ? <EmptyState icon="fa-solid fa-wave-square" label="No activity yet" />
              : <ActivityFeed entries={activity} maxHeight="100%" />
            }
          </div>

          {/* Recent Tasks — styled like git commits */}
          <div className="card p-4 flex flex-col flex-shrink-0" style={{ maxHeight: 240 }}>
            <CardHeader
              icon="fa-solid fa-code-commit"
              iconColor="#818cf8"
              title="Recent Tasks"
              action="View All"
              onAction={() => onNavigate?.('workshop')}
            />
            {recentTasks.length === 0 ? (
              <EmptyState icon="fa-solid fa-check-circle" label="No completed tasks yet" />
            ) : (
              <div className="overflow-y-auto space-y-0">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 py-2.5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    {/* Agent avatar */}
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `${agentColor(task.agent_id)}28`,
                        border: `1px solid ${agentColor(task.agent_id)}45`,
                      }}
                    >
                      <span style={{ fontSize: 9, fontWeight: 700, color: agentColor(task.agent_id) }}>
                        {agentDisplayName(task.agent_id).charAt(0)}
                      </span>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: '#c8cce8' }}>
                        {task.title}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
                        {agentDisplayName(task.agent_id)}
                      </div>
                    </div>
                    {/* Check mark + time */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <i className="fa-solid fa-circle-check" style={{ fontSize: 10, color: '#34d399' }} />
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.24)' }}>
                        {timeAgo(task.completed_at ?? task.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — 40% */}
        <div className="flex flex-col gap-3 min-h-0" style={{ flex: '2 1 0%' }}>

          {/* Recent Documents */}
          <div className="card p-4 flex flex-col" style={{ flex: '1 1 0%', minHeight: 0 }}>
            <CardHeader
              icon="fa-solid fa-file-lines"
              iconColor="#a78bfa"
              title="Recent Documents"
              action="View All"
              onAction={() => onNavigate?.('documents')}
            />
            {documents.length === 0 ? (
              <EmptyState icon="fa-solid fa-folder-open" label="No documents yet" />
            ) : (
              <div className="flex-1 overflow-y-auto space-y-0">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between py-2.5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.16)' }}
                      >
                        <i className="fa-solid fa-file-lines" style={{ fontSize: 9, color: '#a78bfa' }} />
                      </div>
                      <div>
                        <div className="text-xs font-medium truncate" style={{ color: '#dde2f0' }}>{doc.title}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.26)' }}>
                          {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <i className="fa-solid fa-chevron-right ml-3 flex-shrink-0" style={{ fontSize: 9, color: 'rgba(255,255,255,0.16)' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="card p-4 flex-shrink-0">
            <CardHeader
              icon="fa-solid fa-bolt"
              iconColor="#fbbf24"
              title="Quick Links"
            />
            <div className="flex flex-col gap-1.5">
              {QUICK_LINKS.map((link) => (
                <button
                  key={link.page}
                  onClick={() => onNavigate?.(link.page)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.055)',
                    color: '#c4cadf',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = 'rgba(255,255,255,0.06)'
                    el.style.color = '#eef0f8'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = 'rgba(255,255,255,0.03)'
                    el.style.color = '#c4cadf'
                  }}
                >
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: link.iconBg }}>
                    <i className={`${link.icon} text-xs`} style={{ color: link.iconColor }} />
                  </div>
                  <span className="text-xs font-medium">{link.label}</span>
                  <i className="fa-solid fa-chevron-right ml-auto" style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)' }} />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
