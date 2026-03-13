import type { Agent } from '../env.d'
import { AGENT_AVATARS } from '../assets/agents'

interface AgentCardProps {
  agent: Agent
  taskCount?: number
  onClick?: () => void
  selected?: boolean
}

export default function AgentCard({
  agent,
  taskCount = 0,
  onClick,
  selected
}: AgentCardProps): React.JSX.Element {
  const svgUrl = AGENT_AVATARS[agent.id]

  return (
    <div
      className={`card p-4 cursor-pointer transition-all ${selected ? 'border-accent/60' : ''}`}
      style={selected ? { background: 'rgba(139,124,248,0.12)' } : undefined}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar — SVG for default agents, emoji fallback for custom */}
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-xl flex-shrink-0 border border-white/[0.06] overflow-hidden">
          {svgUrl
            ? <img src={svgUrl} alt={agent.name} className="w-full h-full object-cover" />
            : agent.avatar}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-primary truncate">{agent.name}</h3>
            {taskCount > 0 && (
              <span className="flex-shrink-0 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                {taskCount} tasks
              </span>
            )}
          </div>
          {agent.operational_role && (
            <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{agent.operational_role}</p>
          )}
        </div>
      </div>
    </div>
  )
}
