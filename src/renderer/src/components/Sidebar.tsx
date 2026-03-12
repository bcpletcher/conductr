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
    <aside
      data-testid="sidebar"
      className="w-sidebar flex-shrink-0 flex flex-col h-full border-r"
      style={{
        background: '#0e1020',
        borderColor: 'rgba(255,255,255,0.06)',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Logo — padded for macOS traffic lights */}
      <div className="pt-8 pb-5 px-5">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #7c6ef5, #5b4de8)',
              boxShadow: '0 0 16px rgba(124,110,245,0.35), 0 2px 6px rgba(0,0,0,0.4)'
            }}
          >
            <i className="fa-solid fa-rocket text-white text-xs" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">Orqis</div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: '#5c6285' }}>Autonomous AI</div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav
        className="flex-1 px-3 overflow-y-auto space-y-0.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="section-label px-3 mb-2">Navigation</div>
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

        <div className="my-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

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
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="text-xs" style={{ color: '#3d4166' }}>v0.1.0 · Phase 0</div>
      </div>
    </aside>
  )
}
