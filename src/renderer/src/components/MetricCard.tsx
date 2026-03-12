interface MetricCardProps {
  label: string
  value: string | number
  subtitle?: string
  accent?: 'default' | 'green' | 'orange' | 'blue'
  icon?: string
}

const ACCENT_CLASSES = {
  default: 'text-accent-indigo',
  green: 'text-accent-green',
  orange: 'text-accent-orange',
  blue: 'text-accent-blue'
}

export default function MetricCard({
  label,
  value,
  subtitle,
  accent = 'default',
  icon
}: MetricCardProps): React.JSX.Element {
  return (
    <div className="card p-4" data-testid={`metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-text-muted font-medium uppercase tracking-wide">{label}</span>
        {icon && <i className={`${icon} text-base text-text-muted`} />}
      </div>
      <div className={`text-2xl font-semibold ${ACCENT_CLASSES[accent]}`}>{value}</div>
      {subtitle && <div className="text-xs text-text-muted mt-1">{subtitle}</div>}
    </div>
  )
}
