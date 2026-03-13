import { useEffect, useState } from 'react'
import MetricCard from '../components/MetricCard'
import ActivityFeed from '../components/ActivityFeed'
import type { NavPage } from '../App'
import type { TaskCounts, ActivityLogEntry, Document } from '../env.d'

const api = window.electronAPI

const QUICK_LINKS = [
  { label: 'Workshop',            icon: 'fa-solid fa-gears',      page: 'workshop' as NavPage,     iconColor: '#b4abfa', iconBg: 'rgba(139,124,248,0.16)' },
  { label: 'Client Intelligence', icon: 'fa-solid fa-brain',      page: 'intelligence' as NavPage, iconColor: '#a78bfa', iconBg: 'rgba(167,139,250,0.16)' },
  { label: 'API Metrics',         icon: 'fa-solid fa-chart-bar',  page: 'metrics' as NavPage,      iconColor: '#60a5fa', iconBg: 'rgba(96,165,250,0.16)'  },
]

interface DashboardProps {
  onNavigate?: (page: NavPage) => void
}

function EmptyState({ icon, label }: { icon: string; label: string }): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2.5">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <i className={`${icon} text-xs`} style={{ color: 'rgba(255,255,255,0.14)' }} />
      </div>
      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>{label}</span>
    </div>
  )
}

function CardHeader({
  icon,
  iconColor,
  title,
  action,
  onAction,
}: {
  icon: string
  iconColor: string
  title: string
  action?: string
  onAction?: () => void
}): React.JSX.Element {
  return (
    <div
      className="flex items-center justify-between pb-3 mb-3 flex-shrink-0"
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
          style={{
            color: '#6ea8fe',
            background: 'rgba(96,165,250,0.07)',
            border: '1px solid rgba(96,165,250,0.14)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.13)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.07)' }}
        >
          {action}
        </button>
      )}
    </div>
  )
}

export default function Dashboard({ onNavigate }: DashboardProps): React.JSX.Element {
  const [counts, setCounts] = useState<TaskCounts>({ queued: 0, active: 0, complete: 0, failed: 0 })
  const [activity, setActivity] = useState<ActivityLogEntry[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [todaySpend, setTodaySpend] = useState(0)

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [c, a, spend] = await Promise.all([
          api.tasks.getCounts(),
          api.tasks.getActivityLog(),
          api.metrics.getTodaySpend()
        ])
        setCounts(c)
        setActivity(a.slice(0, 20))
        setTodaySpend(spend)
      } catch (err) {
        console.error('Dashboard load error:', err)
      }
    }
    load()
  }, [])

  return (
    <div data-testid="dashboard-page" className="flex flex-col h-full gap-4">

      {/* ── Hero header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-shrink-0 pb-1">
        <div>
          <h1
            className="font-bold tracking-tight"
            style={{ fontSize: 22, color: '#eef0f8', letterSpacing: '-0.03em' }}
          >
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.36)' }}>
            Real-time overview of all systems
          </p>
        </div>

        {/* Status pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl mt-1"
          style={{
            background: 'rgba(52,211,153,0.07)',
            border: '1px solid rgba(52,211,153,0.15)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.9)' }}
          />
          <span className="text-xs font-medium" style={{ color: '#34d399', letterSpacing: '0.02em' }}>
            All systems operational
          </span>
        </div>
      </div>

      {/* ── Metric cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        <MetricCard label="Queued"       value={counts.queued}                  icon="fa-solid fa-clipboard-list" />
        <MetricCard label="Active"       value={counts.active}  accent="blue"   icon="fa-solid fa-bolt" />
        <MetricCard label="Completed"    value={counts.complete} accent="green" icon="fa-solid fa-circle-check" />
        <MetricCard label="Today's Spend" value={`$${todaySpend.toFixed(4)}`} accent="orange" icon="fa-solid fa-dollar-sign" />
      </div>

      {/* ── Middle row — Activity + Announcements ─────────────────── */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">

        {/* Live Activity */}
        <div className="card p-4 flex flex-col min-h-0">
          <CardHeader
            icon="fa-solid fa-wave-square"
            iconColor="#34d399"
            title="Live Activity"
            action="View All"
            onAction={() => onNavigate?.('workshop')}
          />
          {/* Live pulse dot */}
          <div className="flex items-center gap-1.5 mb-3 -mt-1">
            <div className="w-1 h-1 rounded-full bg-accent-green animate-pulse" />
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.04em' }}>
              LIVE
            </span>
          </div>
          {activity.length === 0
            ? <EmptyState icon="fa-solid fa-wave-square" label="No activity yet" />
            : <ActivityFeed entries={activity} maxHeight="100%" />}
        </div>

        {/* Announcements */}
        <div className="card p-4 flex flex-col min-h-0">
          <CardHeader
            icon="fa-solid fa-bullhorn"
            iconColor="#f472b6"
            title="Announcements"
          />
          <EmptyState icon="fa-solid fa-bell" label="No announcements" />
        </div>
      </div>

      {/* ── Bottom row — Recent Docs + Quick Links ────────────────── */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">

        {/* Recent Documents */}
        <div className="card p-4 flex flex-col min-h-0">
          <CardHeader
            icon="fa-solid fa-file-lines"
            iconColor="#34d399"
            title="Recent Documents"
            action="View All"
            onAction={() => onNavigate?.('documents')}
          />
          {documents.length === 0 ? (
            <EmptyState icon="fa-solid fa-folder-open" label="No documents yet" />
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div>
                    <div className="text-sm" style={{ color: '#dde2f0' }}>{doc.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.26)' }}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <i className="fa-solid fa-arrow-right text-xs" style={{ color: 'rgba(255,255,255,0.18)' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="card p-4 flex flex-col min-h-0">
          <CardHeader
            icon="fa-solid fa-bolt"
            iconColor="#fbbf24"
            title="Quick Links"
          />
          <div className="flex flex-col gap-2">
            {QUICK_LINKS.map((link) => (
              <button
                key={link.page}
                onClick={() => onNavigate?.(link.page)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-left transition-all"
                style={{
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderTopColor: 'rgba(255,255,255,0.10)',
                  color: '#c4cadf',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'rgba(255,255,255,0.065)'
                  el.style.borderColor = 'rgba(255,255,255,0.11)'
                  el.style.color = '#eef0f8'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'rgba(255,255,255,0.035)'
                  el.style.borderColor = 'rgba(255,255,255,0.07)'
                  el.style.color = '#c4cadf'
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: link.iconBg }}
                >
                  <i className={`${link.icon} text-xs`} style={{ color: link.iconColor }} />
                </div>
                <span>{link.label}</span>
                <i
                  className="fa-solid fa-chevron-right ml-auto"
                  style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
