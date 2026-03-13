import { useEffect, useState } from 'react'
import MetricCard from '../components/MetricCard'
import ActivityFeed from '../components/ActivityFeed'
import type { NavPage } from '../App'
import type { TaskCounts, ActivityLogEntry, Document } from '../env.d'

const api = window.electronAPI

const QUICK_LINKS = [
  { label: 'Workshop',            icon: 'fa-solid fa-gears',     page: 'workshop' as NavPage,     iconColor: '#b4abfa', iconBg: 'rgba(139,124,248,0.18)' },
  { label: 'Client Intelligence', icon: 'fa-solid fa-brain',     page: 'intelligence' as NavPage, iconColor: '#a78bfa', iconBg: 'rgba(167,139,250,0.18)' },
  { label: 'API Metrics',         icon: 'fa-solid fa-chart-bar', page: 'metrics' as NavPage,      iconColor: '#60a5fa', iconBg: 'rgba(96,165,250,0.18)'  },
]

interface DashboardProps {
  onNavigate?: (page: NavPage) => void
}

function EmptyState({ icon, label }: { icon: string; label: string }): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2.5">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <i className={`${icon} text-sm`} style={{ color: '#3a4068' }} />
      </div>
      <span className="text-sm" style={{ color: '#3a4068' }}>{label}</span>
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

      {/* Header */}
      <div className="flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time overview of all systems</p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl mt-0.5"
          style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.16)' }}
        >
          <span className="status-dot bg-accent-green animate-pulse" />
          <span className="text-xs font-medium" style={{ color: '#34d399' }}>Connected</span>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4 flex-shrink-0">
        <MetricCard label="Queued"       value={counts.queued}                    icon="fa-solid fa-clipboard-list" />
        <MetricCard label="Active"       value={counts.active}  accent="blue"     icon="fa-solid fa-bolt" />
        <MetricCard label="Completed"    value={counts.complete} accent="green"   icon="fa-solid fa-circle-check" />
        <MetricCard label="Today's Spend" value={`$${todaySpend.toFixed(4)}`} accent="orange" icon="fa-solid fa-dollar-sign" />
      </div>

      {/* Middle row — Activity + Announcements */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Live Activity */}
        <div className="card p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-3 mb-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              <h2 className="text-sm font-semibold text-text-primary">Live Activity</h2>
            </div>
            <button
              onClick={() => onNavigate?.('workshop')}
              className="text-xs px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)' }}
            >
              View All
            </button>
          </div>
          {activity.length === 0
            ? <EmptyState icon="fa-solid fa-wave-square" label="No activity yet" />
            : <ActivityFeed entries={activity} maxHeight="100%" />}
        </div>

        {/* Announcements */}
        <div className="card p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-3 mb-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-bullhorn text-xs" style={{ color: '#f472b6' }} />
              <h2 className="text-sm font-semibold text-text-primary">Announcements</h2>
            </div>
          </div>
          <EmptyState icon="fa-solid fa-bell" label="No announcements" />
        </div>
      </div>

      {/* Bottom row — Recent Docs + Quick Links */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Recent Documents */}
        <div className="card p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-3 mb-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-file-lines text-xs" style={{ color: '#34d399' }} />
              <h2 className="text-sm font-semibold text-text-primary">Recent Documents</h2>
            </div>
            <button
              onClick={() => onNavigate?.('documents')}
              className="text-xs px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)' }}
            >
              View All
            </button>
          </div>
          {documents.length === 0 ? (
            <EmptyState icon="fa-solid fa-folder-open" label="No documents yet" />
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <div className="text-sm text-text-primary">{doc.title}</div>
                    <div className="text-xs text-text-muted">{new Date(doc.created_at).toLocaleDateString()}</div>
                  </div>
                  <i className="fa-solid fa-arrow-right text-text-muted text-xs" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="card p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-3 mb-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-bolt text-xs" style={{ color: '#fbbf24' }} />
              <h2 className="text-sm font-semibold text-text-primary">Quick Links</h2>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {QUICK_LINKS.map((link) => (
              <button
                key={link.page}
                onClick={() => onNavigate?.(link.page)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-primary transition-all text-left"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderTopColor: 'rgba(255,255,255,0.10)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)'
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: link.iconBg }}
                >
                  <i className={`${link.icon} text-xs`} style={{ color: link.iconColor }} />
                </div>
                <span>{link.label}</span>
                <i className="fa-solid fa-chevron-right ml-auto text-xs" style={{ color: '#3a3e60' }} />
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
