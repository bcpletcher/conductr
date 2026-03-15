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

type PhaseFilter = 'all' | 'complete' | 'active' | 'planned'
type IdeaFilter = 'all' | 'pending' | 'approved' | 'denied' | 'pinned'
type IdeaSort = 'date_desc' | 'date_asc' | 'effort_asc' | 'effort_desc'
type Tab = 'phases' | 'ideas'

const EFFORT_RANK: Record<string, number> = { S: 1, M: 2, L: 3, XL: 4 }

// ─── PhaseCard ───────────────────────────────────────────────────────────────

interface PhaseCardProps {
  phase: PhaseData
  expanded: boolean
  onToggle: () => void
  accentColor: string
}

function PhaseCard({ phase, expanded, onToggle, accentColor }: PhaseCardProps): React.JSX.Element {
  const color     = STATUS_COLOR[phase.status]
  const doneCount = phase.items.filter((i) => i.done).length
  const isPlanned = phase.status === 'planned'

  return (
    <div
      onClick={onToggle}
      style={{
        background: expanded ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${expanded ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)'}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="flex items-start gap-2.5">
        <span
          style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: isPlanned ? 'rgba(255,255,255,0.30)' : color,
            background: isPlanned ? 'rgba(255,255,255,0.06)' : `${color}18`,
            border: `1px solid ${isPlanned ? 'rgba(255,255,255,0.10)' : `${color}35`}`,
            borderRadius: 5, padding: '2px 6px', flexShrink: 0, marginTop: 1,
          }}
        >
          {phase.num}
        </span>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13, fontWeight: 650, color: isPlanned ? 'rgba(255,255,255,0.52)' : '#eef0f8', letterSpacing: '-0.015em', lineHeight: 1.3 }}>
            {phase.title}
          </div>
          {phase.description && (
            <div
              style={{
                fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 3, lineHeight: 1.4,
                display: '-webkit-box', overflow: 'hidden',
                WebkitLineClamp: expanded ? 99 : 2, WebkitBoxOrient: 'vertical',
              } as React.CSSProperties}
            >
              {phase.description}
            </div>
          )}
        </div>
        <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'}`} style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', flexShrink: 0, marginTop: 3 }} />
      </div>

      {phase.items.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: isPlanned ? 'none' : `0 0 4px ${color}` }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: isPlanned ? 'rgba(255,255,255,0.25)' : color, letterSpacing: '0.02em' }}>
                {STATUS_LABEL[phase.status]}
              </span>
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.26)' }}>{doneCount} / {phase.items.length}</span>
          </div>
          <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${phase.progress}%`, height: '100%', borderRadius: 3,
                background: phase.status === 'complete'
                  ? 'linear-gradient(90deg, #34d399, #6ee7b7)'
                  : phase.status === 'active'
                  ? `linear-gradient(90deg, ${accentColor}, #a5b4fc)`
                  : 'rgba(255,255,255,0.18)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}

      {expanded && phase.items.length > 0 && (
        <div
          style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 5 }}
          onClick={(e) => e.stopPropagation()}
        >
          {phase.items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              {item.done
                ? <i className="fa-solid fa-circle-check" style={{ fontSize: 11, color: '#34d399', marginTop: 1.5, flexShrink: 0 }} />
                : <i className="fa-regular fa-circle" style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 1.5, flexShrink: 0 }} />}
              <span style={{ fontSize: 11.5, color: item.done ? 'rgba(255,255,255,0.36)' : 'rgba(255,255,255,0.68)', textDecoration: item.done ? 'line-through' : 'none', lineHeight: 1.45 }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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
        borderRadius: 14,
        padding: '14px 16px',
        transition: 'background 0.15s, border-color 0.15s',
        opacity: isDenied ? 0.55 : 1,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 650, color: '#eef0f8', letterSpacing: '-0.015em', lineHeight: 1.25 }}>
              {idea.title}
            </span>
            {idea.effort && (
              <span
                style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: effortColor, background: `${effortColor}18`,
                  border: `1px solid ${effortColor}30`, borderRadius: 5, padding: '2px 6px', flexShrink: 0,
                }}
              >
                {idea.effort}
              </span>
            )}
            {idea.phase && (
              <span
                style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.40)', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)', borderRadius: 5, padding: '2px 6px', flexShrink: 0,
                }}
              >
                {idea.phase}
              </span>
            )}
            {isPinned && (
              <i className="fa-solid fa-thumbtack" style={{ fontSize: 10, color: accentColor }} />
            )}
          </div>

          {/* Source + status */}
          <div className="flex items-center gap-3" style={{ marginBottom: idea.what ? 8 : 0 }}>
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.32)' }}>
              <i className="fa-solid fa-robot mr-1" style={{ fontSize: 9 }} />
              {idea.source_agent}
            </span>
            <span style={{ fontSize: 10.5, color: statusColor, fontWeight: 600 }}>
              {idea.status.charAt(0).toUpperCase() + idea.status.slice(1)}
            </span>
            {idea.deny_reason && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>
                "{idea.deny_reason}"
              </span>
            )}
            {idea.task_id && (
              <span style={{ fontSize: 10, color: '#34d399' }}>
                <i className="fa-solid fa-circle-check mr-1" style={{ fontSize: 9 }} />
                Task created
              </span>
            )}
          </div>

          {/* What (preview) */}
          {idea.what && (
            <p
              style={{
                fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, margin: 0,
                display: expanded ? 'block' : '-webkit-box',
                overflow: expanded ? 'visible' : 'hidden',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              } as React.CSSProperties}
            >
              {idea.what}
            </p>
          )}
        </div>

        {/* Expand / collapse toggle */}
        {(idea.why || idea.risks) && (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, color: 'rgba(255,255,255,0.22)', padding: 4 }}
          >
            <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'}`} style={{ fontSize: 10 }} />
          </button>
        )}
      </div>

      {/* Expanded body */}
      {expanded && (
        <div
          style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
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

      {/* Actions — shown on hover for pending/pinned */}
      {hovered && !isDenied && !isApproved && (
        <div
          style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6, flexWrap: 'wrap' }}
        >
          {/* Approve */}
          <button
            onClick={onApprove}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 11px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.30)',
              color: '#34d399', transition: 'background 0.15s',
            }}
          >
            <i className="fa-solid fa-check" style={{ fontSize: 10 }} />
            Approve
          </button>

          {/* Deny */}
          {!showDeny ? (
            <button
              onClick={() => setShowDeny(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 11px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.28)',
                color: '#f87171', transition: 'background 0.15s',
              }}
            >
              <i className="fa-solid fa-xmark" style={{ fontSize: 10 }} />
              Deny
            </button>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {DENY_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => onDeny(reason)}
                  style={{
                    padding: '3px 9px', borderRadius: 6, cursor: 'pointer', fontSize: 10.5,
                    background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.28)',
                    color: '#f87171',
                  }}
                >
                  {reason}
                </button>
              ))}
              <button onClick={() => setShowDeny(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11 }}>
                Cancel
              </button>
            </div>
          )}

          {/* Pin */}
          <button
            onClick={onPin}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 11px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: isPinned ? `${accentColor}18` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isPinned ? `${accentColor}35` : 'rgba(255,255,255,0.12)'}`,
              color: isPinned ? accentColor : 'rgba(255,255,255,0.45)',
            }}
          >
            <i className="fa-solid fa-thumbtack" style={{ fontSize: 10 }} />
            {isPinned ? 'Unpin' : 'Pin'}
          </button>

          {/* Refine with Lyra */}
          <button
            onClick={onRefine}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 11px', borderRadius: 7, cursor: 'pointer', fontSize: 11,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            <i className="fa-solid fa-comment-dots" style={{ fontSize: 10 }} />
            Refine
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            style={{
              marginLeft: 'auto', padding: '4px 9px', borderRadius: 7, cursor: 'pointer', fontSize: 10,
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.22)',
            }}
            title="Delete proposal"
          >
            <i className="fa-solid fa-trash" />
          </button>
        </div>
      )}

      {/* Approved: show task link hint */}
      {hovered && isApproved && (
        <div
          style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6 }}
        >
          <button
            onClick={onDelete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'rgba(255,255,255,0.22)' }}
          >
            <i className="fa-solid fa-trash mr-1" />Remove
          </button>
        </div>
      )}
    </div>
  )
}

// ─── PinnedRoadmapCard ────────────────────────────────────────────────────────

function PinnedRoadmapCard({ idea, accentColor }: { idea: PinnedIdea; accentColor: string }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `3px solid ${accentColor}`, borderRadius: 14, padding: '14px 16px',
        cursor: idea.bullets.length > 0 ? 'pointer' : 'default',
      }}
      onClick={() => idea.bullets.length > 0 && setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-2.5">
        <i className="fa-solid fa-thumbtack" style={{ fontSize: 11, color: accentColor, marginTop: 2, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: 13, fontWeight: 650, color: '#eef0f8', letterSpacing: '-0.015em' }}>{idea.title}</span>
            {idea.phase && (
              <span style={{ fontSize: 9.5, fontWeight: 700, color: accentColor, background: `${accentColor}18`, border: `1px solid ${accentColor}30`, borderRadius: 5, padding: '1px 6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Phase {idea.phase}
              </span>
            )}
          </div>
          {!expanded && idea.bullets[0] && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginTop: 3, lineHeight: 1.4 }}>{idea.bullets[0]}</p>
          )}
        </div>
        {idea.bullets.length > 1 && (
          <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'}`} style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', flexShrink: 0, marginTop: 2 }} />
        )}
      </div>
      {expanded && idea.bullets.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }} onClick={(e) => e.stopPropagation()}>
          {idea.bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-2" style={{ marginBottom: i < idea.bullets.length - 1 ? 6 : 0 }}>
              <span style={{ color: accentColor, fontSize: 11, marginTop: 1, flexShrink: 0 }}>›</span>
              <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.60)', lineHeight: 1.45 }}>{b}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── PhasesTab ───────────────────────────────────────────────────────────────

function PhasesTab({ phases, accentColor }: { phases: PhaseData[]; accentColor: string }): React.JSX.Element {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter]     = useState<PhaseFilter>('all')

  const completeCount = phases.filter((p) => p.status === 'complete').length
  const activeCount   = phases.filter((p) => p.status === 'active').length
  const totalItems    = phases.reduce((n, p) => n + p.items.length, 0)
  const doneItems     = phases.reduce((n, p) => n + p.items.filter((i) => i.done).length, 0)
  const overallPct    = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0
  const visible       = filter === 'all' ? phases : phases.filter((p) => p.status === filter)

  const filters: { id: PhaseFilter; label: string; count: number }[] = [
    { id: 'all',      label: 'All',         count: phases.length },
    { id: 'complete', label: 'Complete',    count: completeCount },
    { id: 'active',   label: 'In Progress', count: activeCount },
    { id: 'planned',  label: 'Planned',     count: phases.length - completeCount - activeCount },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-6">
        {[
          { label: 'Complete',    value: completeCount,                               color: '#34d399' },
          { label: 'In Progress', value: activeCount,                                 color: accentColor },
          { label: 'Planned',     value: phases.length - completeCount - activeCount, color: 'rgba(255,255,255,0.32)' },
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
            <span className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 4px ${s.color}80` }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)' }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#eef0f8' }}>{s.value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '7px 14px' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>Overall</span>
          <div style={{ width: 100, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ width: `${overallPct}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${accentColor}, #6ee7b7)` }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.02em' }}>{overallPct}%</span>
        </div>
      </div>

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {filters.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setExpanded(null) }}
              style={{
                padding: '5px 13px', borderRadius: 8,
                border: `1px solid ${active ? `${accentColor}50` : 'rgba(255,255,255,0.07)'}`,
                background: active ? `${accentColor}18` : 'rgba(255,255,255,0.03)',
                color: active ? accentColor : 'rgba(255,255,255,0.42)',
                fontSize: 12, fontWeight: active ? 650 : 400, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
              }}
            >
              {f.label}
              <span style={{ fontSize: 10, background: active ? `${accentColor}30` : 'rgba(255,255,255,0.07)', color: active ? accentColor : 'rgba(255,255,255,0.28)', borderRadius: 5, padding: '0 5px', lineHeight: '16px', minWidth: 18, textAlign: 'center' }}>
                {f.count}
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10, alignItems: 'start' }}>
        {visible.map((phase) => (
          <PhaseCard
            key={phase.num}
            phase={phase}
            expanded={expanded === phase.num}
            onToggle={() => setExpanded(expanded === phase.num ? null : phase.num)}
            accentColor={accentColor}
          />
        ))}
      </div>
      {visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.22)' }}>
          <i className="fa-solid fa-route" style={{ fontSize: 28, marginBottom: 12, display: 'block' }} />
          <div style={{ fontSize: 14 }}>No phases match this filter</div>
        </div>
      )}
    </div>
  )
}

// ─── IdeasTab ────────────────────────────────────────────────────────────────

interface IdeasTabProps {
  pinned: PinnedIdea[]
  accentColor: string
  onNavigateToChat: () => void
}

function IdeasTab({ pinned, accentColor, onNavigateToChat }: IdeasTabProps): React.JSX.Element {
  const [ideas, setIdeas]           = useState<Idea[]>([])
  const [filter, setFilter]         = useState<IdeaFilter>('all')
  const [sort, setSort]             = useState<IdeaSort>('date_desc')
  const [generating, setGenerating] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [loading, setLoading]       = useState(true)

  // Load ideas on mount
  useEffect(() => {
    api.ideas.getAll().then((all) => { setIdeas(all); setLoading(false) })
  }, [])

  // Wire streaming listeners
  useEffect(() => {
    api.ideas.removeAllListeners()
    api.ideas.onGenerating(() => { setGenerating(true); setStreamText('') })
    api.ideas.onChunk(({ chunk }) => setStreamText((p) => p + chunk))
    api.ideas.onDone(({ count, ideas: newIdeas }) => {
      setGenerating(false)
      setStreamText('')
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
    api.ideas.onError(({ error }) => {
      setGenerating(false)
      setStreamText('')
      toast.error(`Proposal generation failed: ${error}`)
    })
    return () => api.ideas.removeAllListeners()
  }, [])

  async function handleApprove(idea: Idea): Promise<void> {
    // Create Workshop task from the idea
    const task = await api.tasks.create({
      title: idea.title,
      description: [idea.what, idea.why ? `\nWhy: ${idea.why}` : ''].filter(Boolean).join('\n') || null,
      status: 'queued',
    })
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

  function handleGenerate(): void {
    if (generating) return
    api.ideas.generate()
  }

  const filteredIdeas = useMemo(() => {
    const base = filter === 'all' ? ideas : ideas.filter((i) => i.status === filter)
    return [...base].sort((a, b) => {
      if (sort === 'date_asc')  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sort === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
      {/* Pinned roadmap directions */}
      {pinned.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>
            📌 Pinned Directions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pinned.map((idea) => (
              <PinnedRoadmapCard key={idea.title} idea={idea} accentColor={accentColor} />
            ))}
          </div>
        </div>
      )}

      {/* AI Proposals header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>
          ✨ Proposals from Lyra
        </div>
        <button
          onClick={handleGenerate}
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

      {/* Streaming preview */}
      {generating && streamText && (
        <div
          style={{
            padding: '12px 16px', marginBottom: 12, borderRadius: 12,
            background: `${accentColor}08`, border: `1px solid ${accentColor}20`,
            fontSize: 11.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55,
            fontFamily: 'monospace', maxHeight: 120, overflow: 'hidden',
          }}
        >
          <span style={{ color: accentColor, fontFamily: 'inherit' }}>Lyra › </span>
          {streamText.slice(-400)}
          <span className="inline-block w-0.5 h-[0.9em] bg-accent ml-0.5 align-middle animate-pulse" style={{ background: accentColor }} />
        </div>
      )}

      {/* Filter chips + sort */}
      {ideas.length > 0 && (
        <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
          {ideaFilters.map((f) => {
            const active = filter === f.id
            const count = counts[f.id]
            if (f.id !== 'all' && count === 0) return null
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: '5px 13px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                  border: `1px solid ${active ? `${f.color}50` : 'rgba(255,255,255,0.07)'}`,
                  background: active ? `${f.color}18` : 'rgba(255,255,255,0.03)',
                  color: active ? f.color : 'rgba(255,255,255,0.42)',
                  fontWeight: active ? 650 : 400, display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {f.label}
                <span style={{ fontSize: 10, background: active ? `${f.color}30` : 'rgba(255,255,255,0.07)', color: active ? f.color : 'rgba(255,255,255,0.28)', borderRadius: 5, padding: '0 5px', lineHeight: '16px', minWidth: 18, textAlign: 'center' }}>
                  {count}
                </span>
              </button>
            )
          })}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as IdeaSort)}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 8, padding: '5px 10px', fontSize: 11.5, color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="effort_asc">Effort: S → XL</option>
            <option value="effort_desc">Effort: XL → S</option>
          </select>
        </div>
      )}

      {/* Ideas grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)' }}>
          <i className="fa-solid fa-spinner animate-spin" style={{ fontSize: 20, marginBottom: 10, display: 'block' }} />
          Loading…
        </div>
      ) : filteredIdeas.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              accentColor={accentColor}
              onApprove={() => handleApprove(idea)}
              onDeny={(reason) => handleDeny(idea, reason)}
              onPin={() => handlePin(idea)}
              onDelete={() => handleDelete(idea)}
              onRefine={() => handleRefine(idea)}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div style={{ padding: '40px 24px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.09)', borderRadius: 14, textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accentColor}14`, border: `1px solid ${accentColor}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <i className="fa-solid fa-lightbulb" style={{ fontSize: 18, color: accentColor }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 650, color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>
            {filter !== 'all' ? `No ${filter} proposals` : 'No proposals yet'}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', maxWidth: 320, margin: '0 auto 16px', lineHeight: 1.55 }}>
            {filter === 'all'
              ? 'Lyra will analyze the roadmap, codebase, and usage patterns to surface targeted improvements. Each proposal includes what, why, risks, effort, and the phase it belongs to.'
              : `No proposals with status "${filter}" yet.`}
          </p>
          {filter === 'all' && (
            <div className="flex gap-2 justify-center flex-wrap">
              {['Roadmap gaps', 'Usage patterns', 'Code quality', 'Cost efficiency'].map((tag) => (
                <span key={tag} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 9px' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Blueprint page ───────────────────────────────────────────────────────────

export default function Blueprint(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('phases')
  const accentColor = useUIStore((s) => s.accentColor)
  const setPage     = useUIStore((s) => s.setPage)

  const { phases, pinned } = useMemo(() => parseRoadmap(rawMd), [])

  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    api.ideas.getPendingCount().then(setPendingCount)
  }, [])

  // When Ideas tab becomes active, refresh pending count
  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab)
    if (tab === 'ideas') {
      api.ideas.getPendingCount().then(setPendingCount)
    }
  }, [])

  const tabs: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: 'phases', label: 'Phases', icon: 'fa-solid fa-route' },
    { id: 'ideas',  label: 'Ideas',  icon: 'fa-solid fa-lightbulb', badge: pendingCount || undefined },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 48 }}>
      <div style={{ paddingTop: 8, marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 750, color: '#eef0f8', letterSpacing: '-0.035em', lineHeight: 1.1, margin: 0 }}>
          Blueprint
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 5 }}>
          {phases.length} phases · {pinned.length} pinned directions · Conductr's living plan
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1" style={{ marginBottom: 20, padding: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, width: 'fit-content' }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '6px 16px', borderRadius: 7, border: 'none',
                background: active ? `${accentColor}22` : 'transparent',
                color: active ? accentColor : 'rgba(255,255,255,0.40)',
                fontSize: 13, fontWeight: active ? 650 : 400, cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: active ? `inset 0 0 0 1px ${accentColor}35` : 'none',
                position: 'relative',
              }}
            >
              <i className={tab.icon} style={{ fontSize: 11 }} />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span
                  style={{
                    fontSize: 9, fontWeight: 700, color: '#fbbf24',
                    background: 'rgba(251,191,36,0.20)', border: '1px solid rgba(251,191,36,0.35)',
                    borderRadius: 99, padding: '0 5px', lineHeight: '15px', minWidth: 17, textAlign: 'center',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {activeTab === 'phases'
        ? <PhasesTab phases={phases} accentColor={accentColor} />
        : <IdeasTab pinned={pinned} accentColor={accentColor} onNavigateToChat={() => setPage('chat')} />
      }
    </div>
  )
}
