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
  { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { id: 'journal', label: 'Journal', icon: '📓' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'agents', label: 'Agents', icon: '🤖' },
  { id: 'intelligence', label: 'Intelligence', icon: '🧠' },
  { id: 'workshop', label: 'Workshop', icon: '⚙️' },
  { id: 'clients', label: 'Clients', icon: '👥' }
]

const BOTTOM_ITEMS: NavItem[] = [
  { id: 'metrics', label: 'API Manager', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙' }
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps): React.JSX.Element {
  return (
    <aside
      className="w-sidebar flex-shrink-0 flex flex-col bg-surface border-r border-border h-full"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Logo / App Name — top padding for macOS traffic lights */}
      <div className="pt-8 pb-4 px-4" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <div>
            <div className="text-sm font-semibold text-text-primary leading-tight">
              Mission Control
            </div>
            <div className="text-xs text-text-muted">AI Command Center</div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`nav-item w-full text-left ${currentPage === item.id ? 'active' : ''}`}
          >
            <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        <div className="my-2 border-t border-border" />

        {BOTTOM_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`nav-item w-full text-left ${currentPage === item.id ? 'active' : ''}`}
          >
            <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom version tag */}
      <div className="px-4 py-3 border-t border-border" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="text-xs text-text-muted">v0.1.0 — Phase 0</div>
      </div>
    </aside>
  )
}
