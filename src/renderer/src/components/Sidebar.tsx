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
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-house' },
  { id: 'journal', label: 'Journal', icon: 'fa-solid fa-book' },
  { id: 'documents', label: 'Documents', icon: 'fa-solid fa-file-lines' },
  { id: 'agents', label: 'Agents', icon: 'fa-solid fa-robot' },
  { id: 'intelligence', label: 'Intelligence', icon: 'fa-solid fa-brain' },
  { id: 'workshop', label: 'Workshop', icon: 'fa-solid fa-gears' },
  { id: 'clients', label: 'Clients', icon: 'fa-solid fa-users' }
]

const BOTTOM_ITEMS: NavItem[] = [
  { id: 'metrics', label: 'API Manager', icon: 'fa-solid fa-chart-bar' },
  { id: 'settings', label: 'Settings', icon: 'fa-solid fa-gear' }
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps): React.JSX.Element {
  return (
    <aside
      data-testid="sidebar"
      className="w-sidebar flex-shrink-0 flex flex-col h-full backdrop-blur-xl bg-white/[0.03] border-r border-white/[0.06]"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Logo / App Name — top padding for macOS traffic lights */}
      <div className="pt-8 pb-4 px-4" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-rocket text-lg text-accent" />
          <div>
            <div className="text-sm font-bold text-text-primary leading-tight tracking-wide">
              Orqis
            </div>
            <div className="text-[10px] text-text-dim uppercase tracking-widest">Autonomous AI</div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="text-[10px] font-semibold text-text-dim uppercase tracking-widest px-3 mb-2">
          Navigation
        </div>
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              data-testid={`nav-${item.id}`}
              className={`nav-item w-full text-left ${currentPage === item.id ? 'active' : ''}`}
            >
              <i className={`${item.icon} text-sm w-5 text-center flex-shrink-0`} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="my-3 border-t border-white/[0.06]" />

        <div className="space-y-0.5">
          {BOTTOM_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              data-testid={`nav-${item.id}`}
              className={`nav-item w-full text-left ${currentPage === item.id ? 'active' : ''}`}
            >
              <i className={`${item.icon} text-sm w-5 text-center flex-shrink-0`} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Bottom version tag */}
      <div className="px-4 py-3 border-t border-white/[0.06]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="text-xs text-text-muted">v0.1.0 — Phase 0</div>
      </div>
    </aside>
  )
}
