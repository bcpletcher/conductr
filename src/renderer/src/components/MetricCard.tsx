interface MetricCardProps {
  label: string
  value: string | number
  subtitle?: string
  accent?: 'default' | 'green' | 'orange' | 'blue'
  icon?: string
}

const VALUE_COLOR: Record<string, string> = {
  default: '#b4abfa',
  green:   '#34d399',
  orange:  '#fbbf24',
  blue:    '#60a5fa',
}

const ICON_BG: Record<string, string> = {
  default: 'rgba(139,124,248,0.20)',
  green:   'rgba(52,211,153,0.18)',
  orange:  'rgba(251,191,36,0.18)',
  blue:    'rgba(96,165,250,0.18)',
}

const ICON_COLOR: Record<string, string> = {
  default: '#b4abfa',
  green:   '#34d399',
  orange:  '#fbbf24',
  blue:    '#60a5fa',
}

// Colored top-border highlight per accent
const BORDER_TOP: Record<string, string> = {
  default: 'rgba(139,124,248,0.50)',
  green:   'rgba(52,211,153,0.42)',
  orange:  'rgba(251,191,36,0.42)',
  blue:    'rgba(96,165,250,0.42)',
}

// Subtle gradient wash from the accent color into the card
const CARD_GRADIENT: Record<string, string> = {
  default: 'linear-gradient(145deg, rgba(139,124,248,0.09) 0%, transparent 55%)',
  green:   'linear-gradient(145deg, rgba(52,211,153,0.08) 0%, transparent 55%)',
  orange:  'linear-gradient(145deg, rgba(251,191,36,0.08) 0%, transparent 55%)',
  blue:    'linear-gradient(145deg, rgba(96,165,250,0.08) 0%, transparent 55%)',
}

// Soft ambient glow under the card
const CARD_GLOW: Record<string, string> = {
  default: '0 0 28px rgba(139,124,248,0.13)',
  green:   '0 0 28px rgba(52,211,153,0.10)',
  orange:  '0 0 28px rgba(251,191,36,0.10)',
  blue:    '0 0 28px rgba(96,165,250,0.10)',
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
      style={{
        borderTop: `2px solid ${BORDER_TOP[accent]}`,
        boxShadow: `0 1px 0 rgba(255,255,255,0.06) inset, 0 2px 16px rgba(0,0,0,0.30), 0 8px 40px rgba(0,0,0,0.20), ${CARD_GLOW[accent]}`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="section-label">{label}</span>
        {icon && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: ICON_BG[accent],
              boxShadow: `0 0 12px ${ICON_BG[accent]}`,
            }}
          >
            <i className={`${icon} text-sm`} style={{ color: ICON_COLOR[accent] }} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold tracking-tight" style={{ color: VALUE_COLOR[accent] }}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs mt-1" style={{ color: '#5c6285' }}>{subtitle}</div>
      )}
    </div>
  )
}
