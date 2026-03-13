import type { NavPage } from '../App'

interface SidebarProps {
  currentPage: NavPage
  onNavigate: (page: NavPage) => void
}

interface NavItem {
  id: NavPage
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',    icon: 'fa-solid fa-house' },
  { id: 'workshop',     label: 'Workshop',     icon: 'fa-solid fa-gears' },
  { id: 'agents',       label: 'Agents',       icon: 'fa-solid fa-robot' },
  { id: 'chat',         label: 'Chat',         icon: 'fa-solid fa-message' },
  { id: 'intelligence', label: 'Intelligence', icon: 'fa-solid fa-brain' },
  { id: 'documents',    label: 'Documents',    icon: 'fa-solid fa-file-lines' },
  { id: 'journal',      label: 'Journal',      icon: 'fa-solid fa-book' },
  { id: 'clients',      label: 'Clients',      icon: 'fa-solid fa-users' },
]

const BOTTOM_ITEMS: NavItem[] = [
  { id: 'metrics',  label: 'API Manager', icon: 'fa-solid fa-chart-bar' },
  { id: 'settings', label: 'Settings',    icon: 'fa-solid fa-gear' },
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps): React.JSX.Element {
  return (
    /* Flush with window left/top/bottom edges; only right corners rounded to match macOS window radius */
    <aside
      data-testid="sidebar"
      className="flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        width: 256,
        background: 'rgba(8, 10, 26, 0.62)',
        WebkitBackdropFilter: 'blur(48px) saturate(1.8)',
        backdropFilter: 'blur(48px) saturate(1.8)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
        {/* Logo — top padding accounts for trafficLightPosition y:22 + button height ~14px = 36px, we use 44px */}
        <div className="pt-11 pb-5 px-5">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #8b7cf8, #5b4de8)',
                boxShadow: '0 0 18px rgba(139,124,248,0.38), 0 2px 6px rgba(0,0,0,0.4)',
              }}
            >
              <i className="fa-solid fa-rocket text-white text-xs" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">Dispatchr</div>
              <div className="section-label mt-0.5" style={{ color: '#4e5480' }}>Autonomous AI</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav
          className="flex-1 px-3 overflow-y-auto"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <div className="section-label px-3 mb-2">Navigation</div>
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                data-testid={`nav-${item.id}`}
                className={`nav-item w-full text-left ${currentPage === item.id ? 'active' : ''}`}
              >
                <i className={`${item.icon} text-sm w-4 text-center flex-shrink-0`} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="my-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

          <div className="space-y-0.5">
            {BOTTOM_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                data-testid={`nav-${item.id}`}
                className={`nav-item w-full text-left ${currentPage === item.id ? 'active' : ''}`}
              >
                <i className={`${item.icon} text-sm w-4 text-center flex-shrink-0`} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div
          className="px-5 py-4"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          <div className="text-xs" style={{ color: '#363a5a' }}>v0.1.0 · Phase 8</div>
        </div>
      </aside>
  )
}
