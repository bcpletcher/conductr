import { useEffect, useRef } from 'react'
import type { ActivityLogEntry } from '../env.d'

interface ActivityFeedProps {
  entries: ActivityLogEntry[]
  maxHeight?: string
  autoScroll?: boolean
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ActivityFeed({
  entries,
  maxHeight = '240px',
  autoScroll = false
}: ActivityFeedProps): React.JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [entries, autoScroll])

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center text-text-muted text-sm py-8">
        No activity yet
      </div>
    )
  }

  return (
    <div className="overflow-y-auto" style={{ maxHeight }}>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="flex gap-3 text-sm">
            <span className="font-mono text-xs text-text-muted whitespace-nowrap mt-0.5 flex-shrink-0">
              {formatTime(entry.timestamp)}
            </span>
            <div className="flex-1 min-w-0">
              {entry.agent_name && (
                <span className="text-accent-indigo text-xs font-medium mr-2">
                  [{entry.agent_name}]
                </span>
              )}
              <span className="text-text-primary break-words">{entry.message}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
