import type { Agent } from '../env.d'
import { AGENT_AVATARS, getAgentColor } from '../assets/agents'

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
  const imgUrl = AGENT_AVATARS[agent.id]
  const color  = getAgentColor(agent.id)

  return (
    <div
      className={`card p-4 cursor-pointer transition-all ${selected ? 'border-accent/60' : ''}`}
      style={selected ? { background: `${color}18` } : undefined}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar — circle with dark grunge border */}
        <div
          className="flex-shrink-0 overflow-hidden flex items-center justify-center text-xl"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '2px solid rgba(4, 4, 14, 0.90)',
            boxShadow: `0 0 0 2px ${color}cc, 0 0 12px ${color}50`,
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          {imgUrl
            ? <img src={imgUrl} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
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
