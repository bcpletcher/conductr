import { useEffect, useState, useMemo, useCallback } from 'react'
import { useUIStore } from '../store/ui'
import { toast } from '../store/ui'
import type { Idea } from '../env.d'
import rawMd from '../../../../docs/roadmap.md?raw'

const api = window.electronAPI

// ─── Types ──────────────────────────────────────────────────────────────────

interface PhaseItem {
  text: string
  done: boolean
}

interface PhaseData {
  num: string
  title: string
  status: 'complete' | 'active' | 'planned'
  description: string
  items: PhaseItem[]
  progress: number
}

interface PinnedIdea {
  title: string
  phase: string | null
  bullets: string[]
}

// ─── Parser ─────────────────────────────────────────────────────────────────

function parseRoadmap(md: string): { phases: PhaseData[]; pinned: PinnedIdea[] } {
  const lines = md.split('\n')
  const phases: PhaseData[] = []
  const pinned: PinnedIdea[] = []

  let inPinned = false
  let currentPhase: PhaseData | null = null
  let currentPinned: PinnedIdea | null = null

  for (const line of lines) {
    if (line.startsWith('## 📌 Pinned Ideas')) {
      inPinned = true; currentPhase = null; continue
    }
    if (line.startsWith('## Phase ')) {
      inPinned = false; currentPinned = null
      const m = line.match(/^## Phase (\S+) — (.+)/)
      if (m) {
        const rawTitle = m[2]
        currentPhase = {
          num: m[1],
          title: rawTitle.replace(/[✅🔄]/g, '').trim(),
          status: rawTitle.includes('✅') ? 'complete' : rawTitle.includes('🔄') ? 'active' : 'planned',
          description: '',
          items: [],
          progress: 0,
        }
        phases.push(currentPhase)
      }
      continue
    }
    if (line.startsWith('## ')) { inPinned = false; currentPinned = null; currentPhase = null; continue }

    if (inPinned) {
      const pm = line.match(/^\*\*(.+?)\*\*\s*\*\(pinned by user.*?— Phase (.+?)\)\*/)
      if (pm) { currentPinned = { title: pm[1], phase: pm[2], bullets: [] }; pinned.push(currentPinned); continue }
      if (currentPinned && line.startsWith('- ')) currentPinned.bullets.push(line.slice(2).trim())
      continue
    }

    if (!currentPhase) continue
    if (line.startsWith('> ') && !currentPhase.description) { currentPhase.description = line.slice(2).trim(); continue }
    const im = line.match(/- \[([ x])\] (.+)/)
    if (im) currentPhase.items.push({ text: im[2], done: im[1] === 'x' })
  }

  for (const phase of phases) {
    if (phase.items.length === 0) {
      phase.progress = phase.status === 'complete' ? 100 : 0
    } else {
      phase.progress = Math.round((phase.items.filter((i) => i.done).length / phase.items.length) * 100)
    }
  }

  return { phases, pinned }
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<PhaseData['status'], string> = {
  complete: '#34d399',
  active:   '#818cf8',
  planned:  'rgba(255,255,255,0.18)',
}

const STATUS_LABEL: Record<PhaseData['status'], string> = {
  complete: 'Complete',
  active:   'In Progress',
  planned:  'Planned',
}

const EFFORT_COLOR: Record<string, string> = {
  S: '#34d399', M: '#818cf8', L: '#fb923c', XL: '#f87171',
}

const IDEA_STATUS_COLOR: Record<string, string> = {
  pending:  '#fbbf24',
  approved: '#34d399',
  denied:   '#f87171',
  pinned:   '#818cf8',
}

const DENY_REASONS = [
  'Not now',
  'Not aligned with vision',
  'Already planned',
  'Too risky',
  'Too complex',
  'Out of scope',
]

type RailItem = { type: 'phase'; num: string } | { type: 'ideas' }
type IdeaFilter = 'all' | 'pending' | 'approved' | 'denied' | 'pinned'
type IdeaSort = 'date_desc' | 'date_asc' | 'effort_asc' | 'effort_desc'

const EFFORT_RANK: Record<string, number> = { S: 1, M: 2, L: 3, XL: 4 }

// ─── IdeaCard ────────────────────────────────────────────────────────────────

interface IdeaCardProps {
  idea: Idea
  accentColor: string
  onApprove: () => void
  onDeny: (reason: string) => void
  onPin: () => void
  onDelete: () => void
  onRefine: () => void
}

function IdeaCard({ idea, accentColor, onApprove, onDeny, onPin, onDelete, onRefine }: IdeaCardProps): React.JSX.Element {
  const [expanded, setExpanded]   = useState(false)
  const [showDeny, setShowDeny]   = useState(false)
  const [hovered, setHovered]     = useState(false)

  const statusColor  = IDEA_STATUS_COLOR[idea.status] ?? accentColor
  const effortColor  = idea.effort ? (EFFORT_COLOR[idea.effort] ?? '#64748b') : '#64748b'
  const isPinned     = idea.status === 'pinned'
  const isApproved   = idea.status === 'approved'
  const isDenied     = idea.status === 'denied'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowDeny(false) }}
      style={{
        background: hovered ? 'rgba(255,255,255,0.050)' : 'rgba(255,255,255,0.028)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)'}`,
        borderLeft: `3px solid ${statusColor}`,
        borderRadius: 12,
        padding: '13px 15px',
        transition: 'background 0.15s, border-color 0.15s',
        opacity: isDenied ? 0.55 : 1,
      }}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 650, color: '#eef0f8', letterSpacing: '-0.015em', lineHeight: 1.25 }}>
              {idea.title}
            </span>
            {idea.effort && (
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: effortColor, background: `${effortColor}18`, border: `1px solid ${effortColor}30`, borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>
                {idea.effort}
              </span>
            )}
            {idea.phase && (
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>
                {idea.phase}
              </span>
            )}
            {isPinned && <i className="fa-solid fa-thumbtack" style={{ fontSize: 10, color: accentColor }} />}
          </div>
          <div className="flex items-center gap-3" style={{ marginBottom: idea.what ? 8 : 0 }}>
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.32)' }}>
              <i className="fa-solid fa-robot mr-1" style={{ fontSize: 9 }} />{idea.source_agent}
            </span>
            <span style={{ fontSize: 10.5, color: statusColor, fontWeight: 600 }}>
              {idea.status.charAt(0).toUpperCase() + idea.status.slice(1)}
            </span>
            {idea.deny_reason && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>"{idea.deny_reason}"</span>}
            {idea.task_id && <span style={{ fontSize: 10, color: '#34d399' }}><i className="fa-solid fa-circle-check mr-1" style={{ fontSize: 9 }} />Task created</span>}
          </div>
          {idea.what && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, margin: 0, display: expanded ? 'block' : '-webkit-box', overflow: expanded ? 'visible' : 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
              {idea.what}
            </p>
          )}
        </div>
        {(idea.why || idea.risks) && (
          <button onClick={() => setExpanded((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, color: 'rgba(255,255,255,0.22)', padding: 4 }}>
            <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'}`} style={{ fontSize: 10 }} />
          </button>
        )}
      </div>
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {idea.why && (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#34d399', marginBottom: 4 }}>Why</div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', lineHeight: 1.5, margin: 0 }}>{idea.why}</p>
            </div>
          )}
          {idea.risks && (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#fb923c', marginBottom: 4 }}>Risks</div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', lineHeight: 1.5, margin: 0 }}>{idea.risks}</p>
            </div>
          )}
        </div>
      )}
      {hovered && !isDenied && !isApproved && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={onApprove} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.30)', color: '#34d399' }}>
            <i className="fa-solid fa-check" style={{ fontSize: 10 }} />Approve
          </button>
          {!showDeny ? (
            <button onClick={() => setShowDeny(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.28)', color: '#f87171' }}>
              <i className="fa-solid fa-xmark" style={{ fontSize: 10 }} />Deny
            </button>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {DENY_REASONS.map((reason) => (
                <button key={reason} onClick={() => onDeny(reason)} style={{ padding: '3px 9px', borderRadius: 6, cursor: 'pointer', fontSize: 10.5, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.28)', color: '#f87171' }}>{reason}</button>
              ))}
              <button onClick={() => setShowDeny(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11 }}>Cancel</button>
            </div>
          )}
          <button onClick={onPin} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: isPinned ? `${accentColor}18` : 'rgba(255,255,255,0.05)', border: `1px solid ${isPinned ? `${accentColor}35` : 'rgba(255,255,255,0.12)'}`, color: isPinned ? accentColor : 'rgba(255,255,255,0.45)' }}>
            <i className="fa-solid fa-thumbtack" style={{ fontSize: 10 }} />{isPinned ? 'Unpin' : 'Pin'}
          </button>
          <button onClick={onRefine} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 7, cursor: 'pointer', fontSize: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.45)' }}>
            <i className="fa-solid fa-comment-dots" style={{ fontSize: 10 }} />Refine
          </button>
          <button onClick={onDelete} style={{ marginLeft: 'auto', padding: '4px 9px', borderRadius: 7, cursor: 'pointer', fontSize: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.22)' }} title="Delete proposal">
            <i className="fa-solid fa-trash" />
          </button>
        </div>
      )}
      {hovered && isApproved && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6 }}>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>
            <i className="fa-solid fa-trash mr-1" />Remove
          </button>
        </div>
      )}
    </div>
  )
}

// ─── PhaseDetail ─────────────────────────────────────────────────────────────

function PhaseDetail({ phase, accentColor }: { phase: PhaseData; accentColor: string }): React.JSX.Element {
  const color     = STATUS_COLOR[phase.status]
  const doneCount = phase.items.filter((i) => i.done).length
  const isPlanned = phase.status === 'planned'
  const isComplete = phase.status === 'complete'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header card */}
      <div
        style={{
          background: 'var(--card-bg, rgba(255,255,255,0.04))',
          backdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.2)',
          WebkitBackdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.2)',
          border: `1px solid rgba(255,255,255,0.08)`,
          borderTop: `3px solid ${color}`,
          borderRadius: 14,
          padding: '20px 22px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.40)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div style={{ flex: 1 }}>
            <div className="flex items-center gap-3 mb-2">
              <span
                style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: isPlanned ? 'rgba(255,255,255,0.30)' : color,
                  background: isPlanned ? 'rgba(255,255,255,0.06)' : `${color}18`,
                  border: `1px solid ${isPlanned ? 'rgba(255,255,255,0.10)' : `${color}35`}`,
                  borderRadius: 6, padding: '3px 9px',
                }}
              >
                Phase {phase.num}
              </span>
              <span
                style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                  color, display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block',
                    boxShadow: isPlanned ? 'none' : `0 0 5px ${color}`,
                  }}
                />
                {STATUS_LABEL[phase.status]}
              </span>
            </div>
            <h2
              style={{
                fontSize: 22, fontWeight: 750, letterSpacing: '-0.03em', lineHeight: 1.2,
                color: isPlanned ? 'rgba(255,255,255,0.55)' : '#eef0f8', margin: 0,
              }}
            >
              {phase.title}
            </h2>
            {phase.description && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.46)', lineHeight: 1.6, marginTop: 8, marginBottom: 0 }}>
                {phase.description}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {phase.items.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 7 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
                {doneCount} of {phase.items.length} tasks complete
              </span>
              <span
                style={{
                  fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em',
                  color: isComplete ? '#34d399' : isPlanned ? 'rgba(255,255,255,0.30)' : accentColor,
                }}
              >
                {phase.progress}%
              </span>
            </div>
            <div style={{ height: 5, borderRadius: 5, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${phase.progress}%`, height: '100%', borderRadius: 5,
                  background: isComplete
                    ? 'linear-gradient(90deg, #34d399, #6ee7b7)'
                    : isPlanned
                    ? 'rgba(255,255,255,0.18)'
                    : `linear-gradient(90deg, ${accentColor}, #a5b4fc)`,
                  transition: 'width 0.5s ease',
                  boxShadow: isComplete ? '0 0 8px rgba(52,211,153,0.4)' : isPlanned ? 'none' : `0 0 8px ${accentColor}60`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Checklist */}
      {phase.items.length > 0 && (
        <div
          style={{
            background: 'var(--card-bg-dark, rgba(255,255,255,0.03))',
            backdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)',
            WebkitBackdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            padding: '16px 20px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 12px rgba(0,0,0,0.30)',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>
            Deliverables
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {phase.items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                {item.done
                  ? <i className="fa-solid fa-circle-check" style={{ fontSize: 13, color: '#34d399', marginTop: 1, flexShrink: 0 }} />
                  : <i className="fa-regular fa-circle" style={{ fontSize: 13, color: 'rgba(255,255,255,0.18)', marginTop: 1, flexShrink: 0 }} />}
                <span
                  style={{
                    fontSize: 13, lineHeight: 1.5,
                    color: item.done ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.72)',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── IdeasPanel ───────────────────────────────────────────────────────────────

interface IdeasPanelProps {
  pinned: PinnedIdea[]
  accentColor: string
  onNavigateToChat: () => void
}

function IdeasPanel({ pinned, accentColor, onNavigateToChat }: IdeasPanelProps): React.JSX.Element {
  const [ideas, setIdeas]           = useState<Idea[]>([])
  const [filter, setFilter]         = useState<IdeaFilter>('all')
  const [sort, setSort]             = useState<IdeaSort>('date_desc')
  const [generating, setGenerating] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    api.ideas.getAll().then((all) => { setIdeas(all); setLoading(false) })
  }, [])

  useEffect(() => {
    api.ideas.removeAllListeners()
    api.ideas.onGenerating(() => { setGenerating(true); setStreamText('') })
    api.ideas.onChunk(({ chunk }) => setStreamText((p) => p + chunk))
    api.ideas.onDone(({ count, ideas: newIdeas }) => {
      setGenerating(false); setStreamText('')
      if (count > 0) {
        setIdeas((prev) => {
          const existingIds = new Set(prev.map((i) => i.id))
          const fresh = (newIdeas as Idea[]).filter((i) => !existingIds.has(i.id))
          return [...fresh, ...prev]
        })
        toast.success(`${count} new proposal${count > 1 ? 's' : ''} from Lyra`)
        setFilter('pending')
      } else {
        toast.info('No new proposals (already up to date)')
      }
    })
    api.ideas.onError(({ error }) => { setGenerating(false); setStreamText(''); toast.error(`Proposal generation failed: ${error}`) })
    return () => api.ideas.removeAllListeners()
  }, [])

  async function handleApprove(idea: Idea): Promise<void> {
    const task = await api.tasks.create({ title: idea.title, description: [idea.what, idea.why ? `\nWhy: ${idea.why}` : ''].filter(Boolean).join('\n') || null, status: 'queued' })
    await api.ideas.approve(idea.id, task.id)
    setIdeas((prev) => prev.map((i) => i.id === idea.id ? { ...i, status: 'approved', task_id: task.id } : i))
    toast.success('Task created in Workshop')
  }

  async function handleDeny(idea: Idea, reason: string): Promise<void> {
    await api.ideas.deny(idea.id, reason)
    setIdeas((prev) => prev.map((i) => i.id === idea.id ? { ...i, status: 'denied', deny_reason: reason } : i))
  }

  async function handlePin(idea: Idea): Promise<void> {
    const updated = await api.ideas.pin(idea.id)
    if (updated) setIdeas((prev) => prev.map((i) => i.id === idea.id ? updated : i))
  }

  async function handleDelete(idea: Idea): Promise<void> {
    await api.ideas.delete(idea.id)
    setIdeas((prev) => prev.filter((i) => i.id !== idea.id))
  }

  function handleRefine(_idea: Idea): void {
    onNavigateToChat()
    toast.info('Opening Chat with Lyra — paste the idea title to start refining')
  }

  const filteredIdeas = useMemo(() => {
    const base = filter === 'all' ? ideas : ideas.filter((i) => i.status === filter)
    return [...base].sort((a, b) => {
      if (sort === 'date_asc')    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sort === 'date_desc')   return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === 'effort_asc')  return (EFFORT_RANK[a.effort ?? 'M'] ?? 2) - (EFFORT_RANK[b.effort ?? 'M'] ?? 2)
      if (sort === 'effort_desc') return (EFFORT_RANK[b.effort ?? 'M'] ?? 2) - (EFFORT_RANK[a.effort ?? 'M'] ?? 2)
      return 0
    })
  }, [ideas, filter, sort])

  const counts = useMemo(() => ({
    all: ideas.length,
    pending: ideas.filter((i) => i.status === 'pending').length,
    approved: ideas.filter((i) => i.status === 'approved').length,
    denied: ideas.filter((i) => i.status === 'denied').length,
    pinned: ideas.filter((i) => i.status === 'pinned').length,
  }), [ideas])

  const ideaFilters: { id: IdeaFilter; label: string; color: string }[] = [
    { id: 'all',      label: 'All',      color: accentColor },
    { id: 'pending',  label: 'Pending',  color: '#fbbf24' },
    { id: 'pinned',   label: 'Pinned',   color: '#818cf8' },
    { id: 'approved', label: 'Approved', color: '#34d399' },
    { id: 'denied',   label: 'Denied',   color: '#f87171' },
  ]

  return (
    <div>
      {/* Pinned directions */}
      {pinned.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>
            📌 Pinned Directions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {pinned.map((idea) => (
              <div
                key={idea.title}
                style={{
                  background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)',
                  borderLeft: `3px solid ${accentColor}`, borderRadius: 12, padding: '12px 14px',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <i className="fa-solid fa-thumbtack" style={{ fontSize: 10, color: accentColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#eef0f8' }}>{idea.title}</span>
                  {idea.phase && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: accentColor, background: `${accentColor}18`, border: `1px solid ${accentColor}30`, borderRadius: 5, padding: '1px 6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Phase {idea.phase}
                    </span>
                  )}
                </div>
                {idea.bullets[0] && (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginTop: 4, marginBottom: 0, lineHeight: 1.4 }}>{idea.bullets[0]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>
          ✨ Proposals from Lyra
        </div>
        <button
          onClick={() => api.ideas.generate()}
          disabled={generating}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '5px 13px',
            background: generating ? `${accentColor}10` : `${accentColor}18`,
            border: `1px solid ${accentColor}35`, borderRadius: 8,
            color: accentColor, fontSize: 12, fontWeight: 600, cursor: generating ? 'default' : 'pointer',
            opacity: generating ? 0.7 : 1,
          }}
        >
          {generating
            ? <><i className="fa-solid fa-spinner animate-spin" style={{ fontSize: 11 }} /> Analyzing…</>
            : <><i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 11 }} /> Analyze &amp; Propose</>}
        </button>
      </div>

      {generating && streamText && (
        <div style={{ padding: '12px 16px', marginBottom: 12, borderRadius: 12, background: `${accentColor}08`, border: `1px solid ${accentColor}20`, fontSize: 11.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55, fontFamily: 'monospace', maxHeight: 120, overflow: 'hidden' }}>
          <span style={{ color: accentColor, fontFamily: 'inherit' }}>Lyra › </span>
          {streamText.slice(-400)}
          <span className="inline-block w-0.5 h-[0.9em] ml-0.5 align-middle animate-pulse" style={{ background: accentColor }} />
        </div>
      )}

      {ideas.length > 0 && (
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {ideaFilters.map((f) => {
              const active = filter === f.id
              const count = counts[f.id]
              if (f.id !== 'all' && count === 0) return null
              return (
                <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: '5px 13px', borderRadius: 8, cursor: 'pointer', fontSize: 12, border: `1px solid ${active ? `${f.color}50` : 'rgba(255,255,255,0.07)'}`, background: active ? `${f.color}18` : 'rgba(255,255,255,0.03)', color: active ? f.color : 'rgba(255,255,255,0.42)', fontWeight: active ? 650 : 400, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {f.label}
                  <span style={{ fontSize: 10, background: active ? `${f.color}30` : 'rgba(255,255,255,0.07)', color: active ? f.color : 'rgba(255,255,255,0.28)', borderRadius: 5, padding: '0 5px', lineHeight: '16px', minWidth: 18, textAlign: 'center' }}>{count}</span>
                </button>
              )
            })}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as IdeaSort)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, padding: '5px 10px', fontSize: 11.5, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', outline: 'none' }}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="effort_asc">Effort: S → XL</option>
            <option value="effort_desc">Effort: XL → S</option>
          </select>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)' }}>
          <i className="fa-solid fa-spinner animate-spin" style={{ fontSize: 20, marginBottom: 10, display: 'block' }} />Loading…
        </div>
      ) : filteredIdeas.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredIdeas.map((idea) => (
            <IdeaCard
              key={idea.id} idea={idea} accentColor={accentColor}
              onApprove={() => handleApprove(idea)}
              onDeny={(reason) => handleDeny(idea, reason)}
              onPin={() => handlePin(idea)}
              onDelete={() => handleDelete(idea)}
              onRefine={() => handleRefine(idea)}
            />
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 24px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.09)', borderRadius: 14, textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accentColor}14`, border: `1px solid ${accentColor}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <i className="fa-solid fa-lightbulb" style={{ fontSize: 18, color: accentColor }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 650, color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>
            {filter !== 'all' ? `No ${filter} proposals` : 'No proposals yet'}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', maxWidth: 320, margin: '0 auto 16px', lineHeight: 1.55 }}>
            {filter === 'all'
              ? 'Lyra will analyze the roadmap, codebase, and usage patterns to surface targeted improvements.'
              : `No proposals with status "${filter}" yet.`}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Rail helpers ─────────────────────────────────────────────────────────────

function RailPhaseBtn({ phase, selected, accentColor, onSelect }: {
  phase: PhaseData
  selected: RailItem
  accentColor: string
  onSelect: (item: RailItem) => void
}): React.JSX.Element {
  const isActive  = selected.type === 'phase' && selected.num === phase.num
  const color     = STATUS_COLOR[phase.status]
  const isPlanned = phase.status === 'planned'
  return (
    <button
      onClick={() => onSelect({ type: 'phase', num: phase.num })}
      style={{
        width: '100%', textAlign: 'left', padding: '7px 10px',
        borderRadius: 8, border: 'none', cursor: 'pointer',
        background: isActive ? `${accentColor}14` : 'transparent',
        boxShadow: isActive ? `inset 0 0 0 1px ${accentColor}30` : 'none',
        marginBottom: 1, transition: 'background 0.12s',
        display: 'flex', alignItems: 'center', gap: 8,
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: color, boxShadow: isPlanned ? 'none' : `0 0 4px ${color}80`,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: isActive ? accentColor : 'rgba(255,255,255,0.28)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 0.5 }}>
          {phase.num}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: isActive ? 600 : 400, color: isActive ? '#eef0f8' : isPlanned ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.64)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {phase.title}
        </div>
      </div>
      {phase.items.length > 0 && (
        <span style={{ fontSize: 9.5, color: isActive ? accentColor : 'rgba(255,255,255,0.22)', fontWeight: 600, flexShrink: 0 }}>
          {phase.progress}%
        </span>
      )}
    </button>
  )
}

function CompletedGroup({ phases, selected, accentColor, onSelect }: {
  phases: PhaseData[]
  selected: RailItem
  accentColor: string
  onSelect: (item: RailItem) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  if (phases.length === 0) return <></>
  const hasSelectedPhase = selected.type === 'phase' && phases.some(p => p.num === selected.num)
  const isOpen = open || hasSelectedPhase
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 4px 3px',
        }}
      >
        <i
          className={`fa-solid fa-chevron-${isOpen ? 'down' : 'right'}`}
          style={{ fontSize: 8, color: '#34d399', opacity: 0.7 }}
        />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34d399', opacity: 0.7 }}>
          Completed · {phases.length}
        </span>
      </button>
      {isOpen && phases.map((phase) => (
        <RailPhaseBtn key={phase.num} phase={phase} selected={selected} accentColor={accentColor} onSelect={onSelect} />
      ))}
    </div>
  )
}

// ─── Ideas Kanban ─────────────────────────────────────────────────────────────

const KANBAN_COLS: { id: Idea['status'] | 'pinned'; label: string; color: string; icon: string }[] = [
  { id: 'pending',  label: 'Open',       color: '#fbbf24', icon: 'fa-solid fa-inbox' },
  { id: 'pinned',   label: 'Pinned',     color: '#818cf8', icon: 'fa-solid fa-thumbtack' },
  { id: 'approved', label: 'Approved',   color: '#34d399', icon: 'fa-solid fa-circle-check' },
  { id: 'denied',   label: 'Denied',     color: '#f87171', icon: 'fa-solid fa-circle-xmark' },
]
const COMPLETED_SHOW_MAX = 5

interface IdeasKanbanProps {
  pinned: PinnedIdea[]
  accentColor: string
  onNavigateToChat: () => void
}

function IdeasKanban({ accentColor, onNavigateToChat }: IdeasKanbanProps): React.JSX.Element {
  const [ideas, setIdeas]           = useState<Idea[]>([])
  const [generating, setGenerating] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [loading, setLoading]       = useState(true)
  const [showAllDenied, setShowAllDenied] = useState(false)

  useEffect(() => {
    api.ideas.getAll().then((all) => { setIdeas(all); setLoading(false) })
  }, [])

  useEffect(() => {
    api.ideas.removeAllListeners()
    api.ideas.onGenerating(() => { setGenerating(true); setStreamText('') })
    api.ideas.onChunk(({ chunk }) => setStreamText((p) => p + chunk))
    api.ideas.onDone(({ count, ideas: newIdeas }) => {
      setGenerating(false); setStreamText('')
      if (count > 0) {
        setIdeas((prev) => {
          const existingIds = new Set(prev.map((i) => i.id))
          const fresh = (newIdeas as Idea[]).filter((i) => !existingIds.has(i.id))
          return [...fresh, ...prev]
        })
        toast.success(`${count} new proposal${count > 1 ? 's' : ''} from Lyra`)
      } else {
        toast.info('No new proposals (already up to date)')
      }
    })
    api.ideas.onError(({ error }) => { setGenerating(false); setStreamText(''); toast.error(`Proposal generation failed: ${error}`) })
    return () => api.ideas.removeAllListeners()
  }, [])

  async function handleApprove(idea: Idea): Promise<void> {
    const task = await api.tasks.create({ title: idea.title, description: [idea.what, idea.why ? `\nWhy: ${idea.why}` : ''].filter(Boolean).join('\n') || null, status: 'queued' })
    await api.ideas.approve(idea.id, task.id)
    setIdeas((prev) => prev.map((i) => i.id === idea.id ? { ...i, status: 'approved', task_id: task.id } : i))
    toast.success('Task created in Workshop')
  }

  async function handleDeny(idea: Idea, reason: string): Promise<void> {
    await api.ideas.deny(idea.id, reason)
    setIdeas((prev) => prev.map((i) => i.id === idea.id ? { ...i, status: 'denied', deny_reason: reason } : i))
  }

  async function handlePin(idea: Idea): Promise<void> {
    const updated = await api.ideas.pin(idea.id)
    if (updated) setIdeas((prev) => prev.map((i) => i.id === idea.id ? updated : i))
  }

  async function handleDelete(idea: Idea): Promise<void> {
    await api.ideas.delete(idea.id)
    setIdeas((prev) => prev.filter((i) => i.id !== idea.id))
  }

  function handleRefine(_idea: Idea): void {
    onNavigateToChat()
    toast.info('Opening Chat with Lyra — paste the idea title to start refining')
  }

  const colIdeas = (colId: Idea['status'] | 'pinned'): Idea[] => {
    const status = colId === 'pinned' ? 'pinned' : colId
    return ideas.filter(i => i.status === status).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4" style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          {ideas.length} total · {ideas.filter(i => i.status === 'pending').length} open
        </div>
        <div className="flex items-center gap-2">
          {generating && streamText && (
            <span style={{ fontSize: 11, color: accentColor, fontFamily: 'monospace' }}>
              <i className="fa-solid fa-spinner animate-spin mr-1" style={{ fontSize: 10 }} />
              Analyzing…
            </span>
          )}
          <button
            onClick={() => api.ideas.generate()}
            disabled={generating}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px',
              background: generating ? `${accentColor}10` : `${accentColor}18`,
              border: `1px solid ${accentColor}35`, borderRadius: 8,
              color: accentColor, fontSize: 12, fontWeight: 600, cursor: generating ? 'default' : 'pointer',
              opacity: generating ? 0.7 : 1,
            }}
          >
            <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 11 }} />
            Analyze &amp; Propose
          </button>
        </div>
      </div>

      {/* Kanban columns */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.25)' }}>
          <i className="fa-solid fa-spinner animate-spin" style={{ fontSize: 20, marginBottom: 10, display: 'block' }} />Loading…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {KANBAN_COLS.map((col) => {
            const colItems = colIdeas(col.id)
            const isDenied = col.id === 'denied'
            const shown = isDenied && !showAllDenied ? colItems.slice(0, COMPLETED_SHOW_MAX) : colItems

            return (
              <div
                key={col.id}
                style={{
                  display: 'flex', flexDirection: 'column',
                  background: 'var(--card-bg-dark, rgba(255,255,255,0.025))',
                  backdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)',
                  WebkitBackdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderTop: `2px solid ${col.color}`,
                  borderRadius: 12,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                  overflow: 'hidden',
                }}
              >
                {/* Column header */}
                <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                  <div className="flex items-center gap-2">
                    <i className={col.icon} style={{ fontSize: 11, color: col.color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: col.color }}>{col.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.30)', background: 'rgba(255,255,255,0.06)', borderRadius: 99, padding: '0 6px', lineHeight: '18px' }}>
                      {colItems.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {shown.length === 0 && (
                    <div style={{ textAlign: 'center', paddingTop: 28, color: 'rgba(255,255,255,0.18)', fontSize: 11 }}>
                      <i className={col.icon} style={{ fontSize: 16, display: 'block', marginBottom: 6 }} />
                      Empty
                    </div>
                  )}
                  {shown.map((idea) => (
                    <IdeaCard
                      key={idea.id} idea={idea} accentColor={accentColor}
                      onApprove={() => handleApprove(idea)}
                      onDeny={(reason) => handleDeny(idea, reason)}
                      onPin={() => handlePin(idea)}
                      onDelete={() => handleDelete(idea)}
                      onRefine={() => handleRefine(idea)}
                    />
                  ))}
                  {isDenied && colItems.length > COMPLETED_SHOW_MAX && (
                    <button
                      onClick={() => setShowAllDenied(v => !v)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.30)', padding: '4px 0', textAlign: 'center' }}
                    >
                      {showAllDenied ? '↑ Show less' : `↓ Show ${colItems.length - COMPLETED_SHOW_MAX} more`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Storyboard page ──────────────────────────────────────────────────────────

type StoryTab = 'roadmap' | 'ideas'

export default function Storyboard(): React.JSX.Element {
  const accentColor = useUIStore((s) => s.accentColor)
  const setPage     = useUIStore((s) => s.setPage)

  const { phases, pinned } = useMemo(() => parseRoadmap(rawMd), [])

  const firstActivePhase = phases.find((p) => p.status === 'active')
  const [storyTab, setStoryTab] = useState<StoryTab>('roadmap')
  const [selected, setSelected] = useState<RailItem>(
    firstActivePhase ? { type: 'phase', num: firstActivePhase.num } : { type: 'ideas' }
  )
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    api.ideas.getPendingCount().then(setPendingCount)
  }, [])

  // Summary stats
  const completeCount = phases.filter((p) => p.status === 'complete').length
  const activeCount   = phases.filter((p) => p.status === 'active').length
  const totalItems    = phases.reduce((n, p) => n + p.items.length, 0)
  const doneItems     = phases.reduce((n, p) => n + p.items.filter((i) => i.done).length, 0)
  const overallPct    = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  const selectedPhase = selected.type === 'phase'
    ? phases.find((p) => p.num === selected.num) ?? null
    : null

  return (
    <div data-testid="blueprint-page" style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 0 }}>
      {/* Page header */}
      <div style={{ paddingTop: 8, paddingBottom: 14, flexShrink: 0 }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 750, color: '#eef0f8', letterSpacing: '-0.035em', lineHeight: 1.1, margin: 0 }}>
              Storyboard
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 4, marginBottom: 0 }}>
              {phases.length} phases · Conductr's living plan
            </p>
          </div>
          {/* Summary bar */}
          <div className="flex items-center gap-3">
            {[
              { label: 'Done',    val: completeCount,                               color: '#34d399' },
              { label: 'Active',  val: activeCount,                                 color: accentColor },
              { label: 'Planned', val: phases.length - completeCount - activeCount, color: 'rgba(255,255,255,0.25)' },
            ].map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 11px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block', boxShadow: `0 0 4px ${s.color}80` }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.44)' }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#eef0f8' }}>{s.val}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>Overall</span>
              <div style={{ width: 72, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <div style={{ width: `${overallPct}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${accentColor}, #6ee7b7)` }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.02em' }}>{overallPct}%</span>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {([
            { id: 'roadmap' as StoryTab, label: 'Roadmap', icon: 'fa-solid fa-route' },
            { id: 'ideas'   as StoryTab, label: 'Ideas',   icon: 'fa-solid fa-lightbulb', badge: pendingCount },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setStoryTab(t.id)
                if (t.id === 'ideas') api.ideas.getPendingCount().then(setPendingCount)
              }}
              style={{
                padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: storyTab === t.id ? 600 : 400,
                background: storyTab === t.id ? 'rgba(255,255,255,0.07)' : 'transparent',
                color: storyTab === t.id ? '#eef0f8' : 'rgba(255,255,255,0.45)',
                transition: 'all 0.15s',
                boxShadow: storyTab === t.id ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <i className={t.icon} style={{ fontSize: 11 }} />
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span style={{ fontSize: 9, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.20)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: 99, padding: '0 5px', lineHeight: '15px', minWidth: 17, textAlign: 'center' }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Roadmap tab ── */}
      {storyTab === 'roadmap' && (
        <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left rail */}
          <div
            style={{
              width: 230, flexShrink: 0,
              background: 'var(--card-bg-dark, rgba(255,255,255,0.025))',
              backdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)',
              WebkitBackdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              borderRadius: 14,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowY: 'auto', flex: 1, padding: '6px 8px' }}>
              {/* In Progress */}
              {phases.filter(p => p.status === 'active').length > 0 && (
                <>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor, padding: '4px 4px 3px', opacity: 0.7 }}>
                    In Progress
                  </div>
                  {phases.filter(p => p.status === 'active').map((phase) => (
                    <RailPhaseBtn key={phase.num} phase={phase} selected={selected} accentColor={accentColor} onSelect={setSelected} />
                  ))}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '6px 2px' }} />
                </>
              )}

              {/* Planned */}
              {phases.filter(p => p.status === 'planned').length > 0 && (
                <>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', padding: '4px 4px 3px' }}>
                    Planned
                  </div>
                  {phases.filter(p => p.status === 'planned').map((phase) => (
                    <RailPhaseBtn key={phase.num} phase={phase} selected={selected} accentColor={accentColor} onSelect={setSelected} />
                  ))}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '6px 2px' }} />
                </>
              )}

              {/* Completed — collapsed by default */}
              <CompletedGroup phases={phases.filter(p => p.status === 'complete')} selected={selected} accentColor={accentColor} onSelect={setSelected} />
            </div>
          </div>

          {/* Right panel */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2, paddingBottom: 32 }}>
            {selectedPhase ? (
              <PhaseDetail phase={selectedPhase} accentColor={accentColor} />
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.22)' }}>
                <i className="fa-solid fa-route" style={{ fontSize: 32, marginBottom: 14, display: 'block' }} />
                <div style={{ fontSize: 14 }}>Select a phase to view details</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Ideas tab (Kanban) ── */}
      {storyTab === 'ideas' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <IdeasKanban pinned={pinned} accentColor={accentColor} onNavigateToChat={() => setPage('chat')} />
        </div>
      )}
    </div>
  )
}
