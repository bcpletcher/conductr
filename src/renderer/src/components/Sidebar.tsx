import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { NavPage } from '../App'
import { useUIStore } from '../store/ui'
import type { Document } from '../env.d'

interface SidebarProps {
  currentPage: NavPage
  onNavigate: (page: NavPage) => void
}

type NavItemDef = { id: NavPage; label: string; icon: string }

const NAV_ITEMS: NavItemDef[] = [
  { id: 'dashboard',    label: 'Dashboard',    icon: 'fa-solid fa-house' },
  { id: 'journal',      label: 'Journal',      icon: 'fa-solid fa-book' },
  { id: 'documents',    label: 'Documents',    icon: 'fa-solid fa-file-lines' },
  { id: 'agents',       label: 'Agents',       icon: 'fa-solid fa-robot' },
  { id: 'intelligence', label: 'Intelligence', icon: 'fa-solid fa-brain' },
  { id: 'clients',      label: 'Clients',      icon: 'fa-solid fa-users' },
  { id: 'workshop',     label: 'Workshop',     icon: 'fa-solid fa-gears' },
  { id: 'chat',         label: 'Chat',         icon: 'fa-solid fa-message' },
  { id: 'blueprint',    label: 'Blueprint',    icon: 'fa-solid fa-route' },
  { id: 'devtools',     label: 'Dev Tools',    icon: 'fa-solid fa-code' },
]

const SYSTEM_ITEMS: NavItemDef[] = [
  { id: 'metrics',   label: 'API Manager', icon: 'fa-solid fa-chart-bar' },
  { id: 'providers', label: 'Providers',   icon: 'fa-solid fa-plug' },
  { id: 'settings',  label: 'Settings',    icon: 'fa-solid fa-gear' },
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps): React.JSX.Element {
  const notifications  = useUIStore((s) => s.notifications)
  const openNotifPanel = useUIStore((s) => s.openNotifPanel)
  const openSearch     = useUIStore((s) => s.openSearch)
  const accentColor    = useUIStore((s) => s.accentColor)
  const unreadCount    = notifications.filter((n) => !n.read).length
  const navRef         = useRef<HTMLElement>(null)

  /**
   * Arrow-key navigation within the sidebar nav.
   * Collects all focusable buttons inside the <nav>, then moves focus up/down.
   */
  function handleNavKeyDown(e: React.KeyboardEvent<HTMLElement>): void {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const nav = navRef.current
    if (!nav) return
    const buttons = Array.from(nav.querySelectorAll('button')) as HTMLElement[]
    const idx = buttons.indexOf(document.activeElement as HTMLElement)
    if (idx === -1) {
      // Nothing focused yet — focus first item
      buttons[0]?.focus()
      return
    }
    e.preventDefault()
    if (e.key === 'ArrowDown') {
      buttons[Math.min(idx + 1, buttons.length - 1)]?.focus()
    } else {
      buttons[Math.max(idx - 1, 0)]?.focus()
    }
  }

  const [showPopover, setShowPopover] = useState(false)
  const [popoverPos,  setPopoverPos]  = useState({ top: 0, left: 0 })
  const [recentDocs,  setRecentDocs]  = useState<Document[]>([])
  const [activeTasks, setActiveTasks] = useState(0)
  const [now,         setNow]         = useState(() => Date.now())
  const [appStart]                    = useState(() => Date.now())

  const headerRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()

  // Tick every second for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Load recent docs and active task count on mount
  useEffect(() => {
    window.electronAPI.documents.getAll(3).then(setRecentDocs).catch(() => {})
    window.electronAPI.tasks.getByStatus('active').then((t) => setActiveTasks(t.length)).catch(() => {})
  }, [])

  // Popover open/close with delay to allow mousing into the popover
  const showPop = (): void => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (headerRef.current) {
      const r = headerRef.current.getBoundingClientRect()
      setPopoverPos({ top: r.top, left: r.right + 8 })
    }
    setShowPopover(true)
  }

  const hidePop = (): void => {
    hideTimer.current = setTimeout(() => setShowPopover(false), 100)
  }

  // --- Computed values ---
  const secondsIntoInterval = Math.floor((now / 1000) % 1800)
  const nextCheckSecs        = 1800 - secondsIntoInterval
  const nextCheckStr         = nextCheckSecs > 60
    ? `${Math.floor(nextCheckSecs / 60)}m`
    : `${nextCheckSecs}s`

  const uptimeSecs    = Math.floor((now - appStart) / 1000)
  const uptimeMinutes = Math.floor(uptimeSecs / 60)
  const uptimeHours   = Math.floor(uptimeMinutes / 60)
  const uptimeStr     = uptimeHours > 0
    ? `${uptimeHours}:${String(uptimeMinutes % 60).padStart(2, '0')}:${String(uptimeSecs % 60).padStart(2, '0')}`
    : `${uptimeMinutes}:${String(uptimeSecs % 60).padStart(2, '0')}`

  const statusLabel = activeTasks > 0 ? 'Active' : 'Idle'
  const statusColor = activeTasks > 0 ? '#34d399' : '#fbbf24'
  const loadLabel   = activeTasks === 0 ? 'Low' : activeTasks < 3 ? 'Med' : 'High'
  const loadBpm     = activeTasks === 0 ? '50 BPM' : activeTasks < 3 ? '85 BPM' : '120 BPM'

  return (
    <>
      <aside
        data-testid="sidebar"
        className="flex-shrink-0 flex flex-col overflow-hidden"
        style={{
          width: 248,
          background: 'rgba(255, 255, 255, 0.032)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.1)',
          backdropFilter: 'blur(40px) saturate(1.1)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.03)',
          borderTopRightRadius: 20,
          borderBottomRightRadius: 20,
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        {/* ── Logo + bell header ──────────────────────────────── */}
        <div
          className="pt-10 pb-4 px-5"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onMouseEnter={showPop}
          onMouseLeave={hidePop}
        >
          {/* Hover card — highlights on mouse-enter; ref used to anchor the popover */}
          <div
            ref={headerRef}
            className="flex items-center gap-3 cursor-default select-none rounded-xl px-2 py-1.5 transition-all"
            style={{
              background: showPopover ? 'rgba(129,140,248,0.08)' : 'transparent',
              border: `1px solid ${showPopover ? 'rgba(129,140,248,0.15)' : 'transparent'}`,
            }}
          >
            {/* Avatar — conductr.webp */}
            <img
              src="./conductr.webp"
              alt="Conductr"
              className="w-9 h-9 rounded-xl flex-shrink-0 object-cover"
              style={{
                boxShadow: `0 0 18px ${accentColor}50, 0 2px 8px rgba(0,0,0,0.55)`,
              }}
            />

            {/* Name + status */}
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 14, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                Conductr
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: statusColor, boxShadow: `0 0 5px ${statusColor}` }}
                />
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.01em' }}>
                  {statusLabel} · {nextCheckStr}
                </span>
              </div>
            </div>

            {/* Bell notification button */}
            <button
              data-testid="notif-bell"
              onClick={(e) => { e.stopPropagation(); openNotifPanel() }}
              title="Notifications"
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: unreadCount > 0 ? accentColor : 'rgba(255,255,255,0.35)',
                padding: '4px 6px',
                borderRadius: 8,
                lineHeight: 1,
                transition: 'color 0.15s',
                flexShrink: 0,
              }}
            >
              <i className="fa-regular fa-bell" style={{ fontSize: 14 }} />
              {unreadCount > 0 && (
                <span
                  data-testid="notif-badge"
                  style={{
                    position: 'absolute', top: 0, right: 0,
                    minWidth: 14, height: 14, padding: '0 3px',
                    background: accentColor, borderRadius: 7,
                    fontSize: 9, fontWeight: 700, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>{/* end hover card */}
        </div>

        {/* ── Navigation ────────────────────────────────────────── */}
        <nav
          ref={navRef}
          aria-label="Main navigation"
          className="flex-1 px-3 overflow-y-auto"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onKeyDown={handleNavKeyDown}
        >
          <span className="nav-section-label" style={{ marginTop: 4 }}>Navigation</span>

          <div className="space-y-0.5 mt-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                data-testid={`nav-${item.id}`}
                className={`nav-item w-full text-left ${currentPage === item.id ? 'active' : ''}`}
              >
                <i className={`${item.icon} w-4 text-center flex-shrink-0`} style={{ fontSize: 12 }} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Search trigger */}
          <button
            data-testid="search-trigger"
            onClick={openSearch}
            className="nav-item w-full text-left"
            style={{ marginTop: 4 }}
            title="Search (⌘⇧F)"
          >
            <i className="fa-solid fa-magnifying-glass w-4 text-center flex-shrink-0" style={{ fontSize: 12 }} />
            <span style={{ flex: 1 }}>Search</span>
            <kbd
              style={{
                padding: '1px 5px', borderRadius: 4,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                fontSize: 10, color: 'rgba(255,255,255,0.28)',
                fontFamily: 'inherit', letterSpacing: 0,
              }}
            >
              ⌘⇧F
            </kbd>
          </button>

          {/* Divider */}
          <div
            className="mx-2 my-3"
            style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }}
          />

          <div className="space-y-0.5">
            {SYSTEM_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                data-testid={`nav-${item.id}`}
                className={`nav-item w-full text-left ${currentPage === item.id ? 'active' : ''}`}
              >
                <i className={`${item.icon} w-4 text-center flex-shrink-0`} style={{ fontSize: 12 }} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Recent Documents section */}
          {recentDocs.length > 0 && (
            <div className="mt-4 mb-2">
              <span className="nav-section-label">Recent Documents</span>
              <div className="space-y-0.5 mt-1">
                {recentDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => onNavigate('documents')}
                    className="nav-item w-full text-left"
                    title={doc.title}
                  >
                    <i className="fa-regular fa-file-lines w-4 text-center flex-shrink-0" style={{ fontSize: 11, opacity: 0.7 }} />
                    <span className="truncate" style={{ fontSize: 12, opacity: 0.85 }}>{doc.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* ── Lyra heartbeat popover — portal escapes backdrop-filter ─ */}
      {showPopover && createPortal(
        <div
          onMouseEnter={showPop}
          onMouseLeave={hidePop}
          style={{
            position: 'fixed',
            top: popoverPos.top,
            left: popoverPos.left,
            width: 272,
            zIndex: 9000,
            background: 'rgba(8, 10, 26, 0.97)',
            WebkitBackdropFilter: 'blur(48px) saturate(1.3)',
            backdropFilter: 'blur(48px) saturate(1.3)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderTopColor: 'rgba(255,255,255,0.18)',
            borderRadius: 14,
            padding: '16px 18px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.72), 0 0 0 1px rgba(139,124,248,0.08)',
            animation: 'fade-in 0.12s ease',
          }}
        >
          {/* Status heading */}
          <div className="flex items-center gap-2.5 mb-4">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}cc` }}
            />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#eef0f8', lineHeight: 1 }}>
                {statusLabel}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginTop: 3 }}>
                Lyra Agent Status
              </div>
            </div>
          </div>

          {/* Current Activity */}
          <div className="mb-3">
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>
              Current Activity
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#dde2f0' }}>
              {activeTasks > 0 ? `${activeTasks} task${activeTasks > 1 ? 's' : ''} running` : 'No activity today'}
            </div>
          </div>

          {/* Bandwidth Use */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                Bandwidth Use
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>0%</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}>
              <div style={{ width: '0%', height: '100%', background: accentColor, borderRadius: 2 }} />
            </div>
          </div>

          {/* Next Check + Load */}
          <div className="flex gap-5 mb-4">
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>
                Next Check
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {nextCheckStr}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.26)', marginTop: 3 }}>30m interval</div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.07)', paddingLeft: 20 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>
                Load
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {loadLabel}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.26)', marginTop: 3 }}>{loadBpm}</div>
            </div>
          </div>

          {/* Available status + uptime */}
          <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34d399' }} />
              <span style={{ fontSize: 12, color: '#34d399', fontWeight: 500 }}>
                Available for new tasks
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.26)', marginTop: 4 }}>
              Session uptime: {uptimeStr}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
