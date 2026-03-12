interface MetricCardProps {
  label: string
  value: string | number
  subtitle?: string
  accent?: 'default' | 'green' | 'orange' | 'blue'
  icon?: string
}

const VALUE_COLOR: Record<string, string> = {
  default: '#a89af9',
  green:   '#10b981',
  orange:  '#f59e0b',
  blue:    '#3b82f6',
}

const ICON_BG: Record<string, string> = {
  default: 'rgba(124, 110, 245, 0.15)',
  green:   'rgba(16, 185, 129, 0.15)',
  orange:  'rgba(245, 158, 11, 0.15)',
  blue:    'rgba(59, 130, 246, 0.15)',
}

const ICON_COLOR: Record<string, string> = {
  default: '#a89af9',
  green:   '#10b981',
  orange:  '#f59e0b',
  blue:    '#3b82f6',
}

export default function MetricCard({
  label,
  value,
  subtitle,
  accent = 'default',
  icon
}: MetricCardProps): React.JSX.Element {
  return (
    <div
      className="card p-4"
      data-testid={`metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: '#5c6285' }}
        >
          {label}
        </span>
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: ICON_BG[accent] }}
          >
            <i className={`${icon} text-sm`} style={{ color: ICON_COLOR[accent] }} />
          </div>
        )}
      </div>
      <div
        className="text-2xl font-bold tracking-tight"
        style={{ color: VALUE_COLOR[accent] }}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-xs mt-1" style={{ color: '#5c6285' }}>{subtitle}</div>
      )}
    </div>
  )
}
