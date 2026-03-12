import type { TaskStatus } from '../env.d'

interface StatusBadgeProps {
  status: TaskStatus | string
  pulse?: boolean
}

const STATUS_CONFIG: Record<
  string,
  { label: string; dotColor: string; bgColor: string; textColor: string }
> = {
  queued: {
    label: 'Queued',
    dotColor: 'bg-text-muted',
    bgColor: 'bg-text-muted/10',
    textColor: 'text-text-muted'
  },
  active: {
    label: 'Active',
    dotColor: 'bg-accent-indigo',
    bgColor: 'bg-accent-indigo/10',
    textColor: 'text-accent-indigo'
  },
  'in-progress': {
    label: 'In Progress',
    dotColor: 'bg-accent-orange',
    bgColor: 'bg-accent-orange/10',
    textColor: 'text-accent-orange'
  },
  complete: {
    label: 'Complete',
    dotColor: 'bg-accent-green',
    bgColor: 'bg-accent-green/10',
    textColor: 'text-accent-green'
  },
  failed: {
    label: 'Failed',
    dotColor: 'bg-red-500',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400'
  }
}

export default function StatusBadge({ status, pulse }: StatusBadgeProps): React.JSX.Element {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.queued

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      <span
        className={`status-dot ${config.dotColor} ${pulse && status === 'active' ? 'animate-pulse' : ''}`}
      />
      {config.label}
    </span>
  )
}
