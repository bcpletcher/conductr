// Reusable underline tab bar — consistent visual across Workshop, Storyboard, DevTools, Agents

export interface TabItem {
  id: string
  label: string
  icon?: string    // Font Awesome class e.g. "fa-solid fa-clock"
  badge?: number   // amber notification dot
  count?: number   // shown as (N) after label
}

interface TabBarProps {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
  className?: string
}

export default function TabBar({ tabs, active, onChange, className = '' }: TabBarProps): React.JSX.Element {
  return (
    <div className={`flex items-center gap-1 border-b border-border flex-shrink-0 px-2 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            active === tab.id
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          {tab.icon && <i className={tab.icon} style={{ fontSize: 11 }} />}
          {tab.label}
          {typeof tab.count !== 'undefined' && (
            <span className="text-xs" style={{ opacity: 0.6 }}>({tab.count})</span>
          )}
          {tab.badge != null && tab.badge > 0 && (
            <span
              style={{
                fontSize: 9, fontWeight: 700, color: '#fbbf24',
                background: 'rgba(251,191,36,0.20)', border: '1px solid rgba(251,191,36,0.35)',
                borderRadius: 99, padding: '0 5px', lineHeight: '15px',
                minWidth: 17, textAlign: 'center',
              }}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
