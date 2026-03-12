import { useEffect, useState } from 'react'
import MetricCard from '../components/MetricCard'
import ActivityFeed from '../components/ActivityFeed'
import type { TaskCounts, ActivityLogEntry, Document } from '../env.d'

const api = window.electronAPI

const QUICK_LINKS = [
  { label: 'Workshop', icon: '⚙️', page: 'workshop' },
  { label: 'Client Intelligence', icon: '🧠', page: 'intelligence' },
  { label: 'API Metrics', icon: '📊', page: 'metrics' }
]

export default function Dashboard(): React.JSX.Element {
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
    <div>
      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Mission Control</h1>
          <p className="page-subtitle">Real-time overview of all systems</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="status-dot bg-accent-green animate-pulse" />
          <span className="text-xs text-text-muted">Connected</span>
        </div>
      </div>

      {/* Status cards row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Queued" value={counts.queued} icon="📋" />
        <MetricCard label="Active" value={counts.active} accent="blue" icon="⚡" />
        <MetricCard label="Completed" value={counts.complete} accent="green" icon="✅" />
        <MetricCard
          label="Today's Spend"
          value={`$${todaySpend.toFixed(4)}`}
          accent="orange"
          icon="💸"
        />
      </div>

      {/* Middle row — Activity + Announcements */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Live Activity */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Live Activity</h2>
            <button className="text-xs text-accent-blue hover:text-blue-400 transition-colors">
              View All
            </button>
          </div>
          <ActivityFeed entries={activity} maxHeight="220px" />
        </div>

        {/* Announcements */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Announcements</h2>
          </div>
          <div className="flex items-center justify-center text-text-muted text-sm py-12">
            No announcements
          </div>
        </div>
      </div>

      {/* Bottom row — Recent Docs + Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Documents */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Recent Documents</h2>
            <button className="text-xs text-accent-blue hover:text-blue-400 transition-colors">
              View All
            </button>
          </div>
          {documents.length === 0 ? (
            <div className="flex items-center justify-center text-text-muted text-sm py-8">
              No documents yet
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <div className="text-sm text-text-primary">{doc.title}</div>
                    <div className="text-xs text-text-muted">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-text-muted text-xs">→</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Quick Links</h2>
          </div>
          <div className="flex flex-col gap-2">
            {QUICK_LINKS.map((link) => (
              <button
                key={link.page}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface hover:bg-border/50 text-sm text-text-primary transition-colors text-left"
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
                <span className="ml-auto text-text-muted">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
