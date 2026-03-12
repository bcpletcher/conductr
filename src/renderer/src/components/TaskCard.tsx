import StatusBadge from './StatusBadge'
import type { Task } from '../env.d'

interface TaskCardProps {
  task: Task
  onClick?: () => void
  onStart?: () => void
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor(diff / 60000)
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function parseTags(tagsJson: string): string[] {
  try {
    return JSON.parse(tagsJson) || []
  } catch {
    return []
  }
}

const TAG_COLORS = [
  'bg-indigo-500/20 text-indigo-300',
  'bg-green-500/20 text-green-300',
  'bg-orange-500/20 text-orange-300',
  'bg-blue-500/20 text-blue-300',
  'bg-purple-500/20 text-purple-300'
]

export default function TaskCard({ task, onClick, onStart }: TaskCardProps): React.JSX.Element {
  const tags = parseTags(task.tags)

  return (
    <div
      className="card p-4 hover:border-border/80 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={task.status} pulse />
            <h3 className="text-sm font-semibold text-text-primary truncate">{task.title}</h3>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-text-muted line-clamp-2 mb-2">{task.description}</p>
          )}

          {/* Tags + meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            {tags.map((tag, i) => (
              <span
                key={tag}
                className={`px-2 py-0.5 rounded text-xs font-medium ${TAG_COLORS[i % TAG_COLORS.length]}`}
              >
                {tag}
              </span>
            ))}
            {task.progress > 0 && (
              <span className="text-xs text-text-muted">
                {task.progress}% complete
              </span>
            )}
            <span className="text-xs text-text-dim ml-auto">{timeAgo(task.created_at)}</span>
          </div>

          {/* Progress bar */}
          {task.status === 'active' && (
            <div className="mt-3 h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-indigo rounded-full transition-all duration-500"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Start button */}
        {task.status === 'queued' && onStart && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onStart()
            }}
            className="flex-shrink-0 btn-primary whitespace-nowrap text-xs px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Start →
          </button>
        )}
      </div>
    </div>
  )
}
