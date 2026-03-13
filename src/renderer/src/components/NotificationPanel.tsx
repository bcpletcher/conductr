import { useEffect } from 'react'
import { useUIStore } from '../store/ui'
import type { Notification } from '../store/ui'

const PANEL_WIDTH = 300

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const TYPE_META: Record<Notification['type'], { color: string; bg: string; icon: string; label: string }> = {
  success: { color: '#34d399', bg: 'rgba(52,211,153,0.08)',  icon: 'fa-solid fa-circle-check', label: 'Success' },
  error:   { color: '#f87171', bg: 'rgba(248,113,113,0.08)', icon: 'fa-solid fa-circle-xmark',  label: 'Error'   },
  info:    { color: '#818cf8', bg: 'rgba(129,140,248,0.08)', icon: 'fa-solid fa-circle-info',   label: 'Info'    },
}

export default function NotificationPanel(): React.JSX.Element {
  const isOpen        = useUIStore((s) => s.isNotifPanelOpen)
  const closePanel    = useUIStore((s) => s.closeNotifPanel)
  const notifications = useUIStore((s) => s.notifications)
  const clearAll      = useUIStore((s) => s.clearNotifications)
  const unreadCount   = notifications.filter((n) => !n.read).length

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, closePanel])

  return (
    <>
      {/* Invisible backdrop to close on outside click */}
      {isOpen && (
        <div
          data-testid="notif-backdrop"
          onClick={closePanel}
          style={{ position: 'fixed', inset: 0, zIndex: 149 }}
        />
      )}

      {/* Panel — slides out from behind the sidebar */}
      <div
        data-testid="notif-panel"
        style={{
          position: 'fixed',
          left: 248,
          top: 0,
          width: PANEL_WIDTH,
          height: '100vh',
          zIndex: 150,
          background: 'linear-gradient(180deg, rgba(12, 13, 32, 0.98) 0%, rgba(10, 11, 28, 0.98) 100%)',
          backdropFilter: 'blur(48px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(48px) saturate(1.4)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          // Accent-tinted left edge — visually "attached" to sidebar
          borderLeft: '1px solid rgba(129,140,248,0.18)',
          boxShadow: '12px 0 48px rgba(0,0,0,0.55), inset 1px 0 0 rgba(129,140,248,0.06)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-105%)',
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease',
          display: 'flex',
          flexDirection: 'column',
        } as React.CSSProperties}
      >
        {/* Subtle top gradient line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, rgba(129,140,248,0.40), rgba(129,140,248,0.08) 60%, transparent)',
        }} />

        {/* Header */}
        <div
          style={{
            padding: '20px 16px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.20)' }}
              >
                <i className="fa-regular fa-bell" style={{ fontSize: 11, color: '#818cf8' }} />
              </div>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 2, display: 'block' }}>
                    {unreadCount} unread
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.30)', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '4px 8px', borderRadius: 7,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.60)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.30)' }}
                >
                  Clear all
                </button>
              )}
              <button
                onClick={closePanel}
                style={{
                  width: 26, height: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.40)',
                  fontSize: 14, lineHeight: 1, transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = 'rgba(255,255,255,0.10)'
                  el.style.color = 'rgba(255,255,255,0.80)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = 'rgba(255,255,255,0.05)'
                  el.style.color = 'rgba(255,255,255,0.40)'
                }}
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '8px 10px' }}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ opacity: 0.45 }}>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <i className="fa-regular fa-bell-slash" style={{ fontSize: 20, color: 'rgba(255,255,255,0.28)' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>All clear</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>No notifications yet</p>
              </div>
            </div>
          ) : (
            notifications.map((n) => {
              const meta = TYPE_META[n.type]
              return (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '10px 12px',
                    marginBottom: 4,
                    borderRadius: 11,
                    background: n.read ? 'rgba(255,255,255,0.025)' : meta.bg,
                    border: `1px solid ${n.read ? 'rgba(255,255,255,0.05)' : `${meta.color}28`}`,
                    // Left type accent stripe
                    borderLeft: `3px solid ${n.read ? 'rgba(255,255,255,0.10)' : meta.color}`,
                  }}
                >
                  <i
                    className={meta.icon}
                    style={{ fontSize: 13, color: n.read ? 'rgba(255,255,255,0.28)' : meta.color, marginTop: 1, flexShrink: 0 }}
                  />
                  <div className="flex-1 min-w-0">
                    <p style={{
                      fontSize: 12.5,
                      color: n.read ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.82)',
                      lineHeight: 1.45,
                      wordBreak: 'break-word',
                    }}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span style={{
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: n.read ? 'rgba(255,255,255,0.20)' : `${meta.color}99`,
                      }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)' }}>·</span>
                      <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.26)' }}>
                        {timeAgo(n.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
