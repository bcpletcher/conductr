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

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-house' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'workshop', label: 'Workshop', icon: 'fa-solid fa-gears' },
      { id: 'chat',     label: 'Chat',     icon: 'fa-solid fa-message' },
      { id: 'agents',   label: 'Agents',   icon: 'fa-solid fa-robot' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'intelligence', label: 'Intelligence', icon: 'fa-solid fa-brain' },
      { id: 'documents',    label: 'Documents',    icon: 'fa-solid fa-file-lines' },
      { id: 'journal',      label: 'Journal',      icon: 'fa-solid fa-book' },
      { id: 'clients',      label: 'Clients',      icon: 'fa-solid fa-users' },
    ],
  },
]

const SYSTEM_ITEMS: NavItem[] = [
  { id: 'metrics',  label: 'API Manager', icon: 'fa-solid fa-chart-bar' },
  { id: 'settings', label: 'Settings',    icon: 'fa-solid fa-gear' },
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps): React.JSX.Element {
  return (
    <aside
      data-testid="sidebar"
      className="flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        width: 248,
        /*
          White-tinted frosted glass panel.
          The rgba(255,255,255,...) tint makes the sidebar appear
          noticeably lighter than the deep navy body background —
          the same visual contrast as the reference image.
          Heavy blur ensures the background gradient bleeds through softly.
        */
        /*
          High blur + very low white tint = gradient bleeds through
          as a muted colour wash, making the sidebar feel "frosted"
          while keeping it darker than the vivid background.
        */
        background: 'rgba(255, 255, 255, 0.032)',
        WebkitBackdropFilter: 'blur(80px) saturate(1.1)',
        backdropFilter: 'blur(80px) saturate(1.1)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.03)',
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Logo */}
      <div className="pt-12 pb-4 px-5">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(145deg, #9b8dfa 0%, #5e40f0 100%)',
              boxShadow: '0 0 22px rgba(139,124,248,0.50), 0 2px 8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          >
            <i className="fa-solid fa-rocket text-white" style={{ fontSize: 11 }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.025em', lineHeight: 1 }}>
              Dispatchr
            </div>
            <div style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(255,255,255,0.30)', marginTop: 3 }}>
              Autonomous AI
            </div>
          </div>
        </div>
      </div>

      {/* Navigation groups */}
      <nav
        className="flex-1 px-3 overflow-y-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            <span className="nav-section-label" style={{ marginTop: gi === 0 ? 4 : 18 }}>
              {group.label}
            </span>
            <div className="space-y-0.5">
              {group.items.map((item) => (
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
          </div>
        ))}

        {/* Divider */}
        <div
          className="mx-2 my-4"
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
          }}
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
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-4"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.9)' }}
          />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.26)', letterSpacing: '0.02em' }}>
            v0.1.0 · Phase 8
          </span>
        </div>
      </div>
    </aside>
  )
}
