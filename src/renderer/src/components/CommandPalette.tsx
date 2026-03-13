import { useState, useEffect, useRef, useCallback } from 'react'
import type { NavPage } from '../App'
import type { Task, Agent } from '../env.d'
import { useUIStore } from '../store/ui'

interface Props {
  onNavigate: (page: NavPage) => void
}

type PaletteItem =
  | { kind: 'page';   id: string; label: string; sublabel: string; icon: string; page: NavPage }
  | { kind: 'action'; id: string; label: string; sublabel: string; icon: string; run: () => void }
  | { kind: 'task';   id: string; label: string; sublabel: string; task: Task }
  | { kind: 'agent';  id: string; label: string; sublabel: string; agent: Agent }

const NAV: Omit<Extract<PaletteItem, { kind: 'page' }>, 'kind'>[] = [
  { id: 'p-dashboard',    page: 'dashboard',    label: 'Dashboard',    sublabel: 'Overview',              icon: 'fa-house' },
  { id: 'p-workshop',     page: 'workshop',     label: 'Workshop',     sublabel: 'Task queue',            icon: 'fa-gears' },
  { id: 'p-chat',         page: 'chat',         label: 'Chat',         sublabel: 'Talk to agents',        icon: 'fa-message' },
  { id: 'p-agents',       page: 'agents',       label: 'Agents',       sublabel: 'Manage AI agents',      icon: 'fa-robot' },
  { id: 'p-documents',    page: 'documents',    label: 'Documents',    sublabel: 'Knowledge base',        icon: 'fa-file-lines' },
  { id: 'p-journal',      page: 'journal',      label: 'Journal',      sublabel: 'Activity log',          icon: 'fa-book' },
  { id: 'p-intelligence', page: 'intelligence', label: 'Intelligence', sublabel: 'Insights & recaps',     icon: 'fa-brain' },
  { id: 'p-clients',      page: 'clients',      label: 'Clients',      sublabel: 'Client management',     icon: 'fa-users' },
  { id: 'p-metrics',      page: 'metrics',      label: 'API Manager',  sublabel: 'Usage & billing',       icon: 'fa-chart-bar' },
]

const CATEGORY_LABEL: Record<PaletteItem['kind'], string> = {
  page: 'Go to', action: 'Quick Actions', task: 'Tasks', agent: 'Agents',
}

const ITEM_ICON: Record<PaletteItem['kind'], string> = {
  page: '', action: '', task: 'fa-layer-group', agent: 'fa-robot',
}

export default function CommandPalette({ onNavigate }: Props): React.JSX.Element | null {
  const isPaletteOpen = useUIStore((s) => s.isPaletteOpen)
  const closePalette  = useUIStore((s) => s.closePalette)
  const openSheet     = useUIStore((s) => s.openSheet)

  const [query,       setQuery]       = useState('')
  const [tasks,       setTasks]       = useState<Task[]>([])
  const [agents,      setAgents]      = useState<Agent[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)

  // Quick actions (defined inside component for closure access)
  const ACTIONS: Extract<PaletteItem, { kind: 'action' }>[] = [
    {
      kind: 'action', id: 'act-settings', icon: 'fa-gear',
      label: 'Open Settings',
      sublabel: 'Appearance, accent color, wallpaper',
      run: () => { closePalette(); onNavigate('settings') },
    },
    {
      kind: 'action', id: 'act-shortcuts', icon: 'fa-keyboard',
      label: 'View Keyboard Shortcuts',
      sublabel: 'Full shortcut reference ⌘/',
      run: () => { closePalette(); openSheet() },
    },
    {
      kind: 'action', id: 'act-new-task', icon: 'fa-plus',
      label: 'New Task',
      sublabel: 'Create a new task for an agent to run',
      run: () => { closePalette(); onNavigate('workshop') },
    },
  ]

  // Load data + reset state when palette opens
  useEffect(() => {
    if (!isPaletteOpen) { setQuery(''); setActiveIndex(0); return }
    setTimeout(() => inputRef.current?.focus(), 0)
    Promise.all([
      window.electronAPI.tasks.getAll(),
      window.electronAPI.agents.getAll(),
    ]).then(([t, a]) => { setTasks(t); setAgents(a) })
  }, [isPaletteOpen])

  // Build flat items array for keyboard nav
  const q = query.toLowerCase().trim()
  const navItems = (q ? NAV.filter((n) => n.label.toLowerCase().includes(q) || n.sublabel.toLowerCase().includes(q)) : NAV)
    .map((n): PaletteItem => ({ kind: 'page', ...n }))

  const actionItems = (q ? ACTIONS.filter((a) => a.label.toLowerCase().includes(q) || a.sublabel.toLowerCase().includes(q)) : ACTIONS)

  const taskItems = tasks
    .filter((t) => t.title.toLowerCase().includes(q))
    .slice(0, 5)
    .map((t): PaletteItem => ({
      kind: 'task', id: `t-${t.id}`, label: t.title, sublabel: t.status, task: t,
    }))

  const agentItems = agents
    .filter((a) => a.name.toLowerCase().includes(q))
    .slice(0, 4)
    .map((a): PaletteItem => ({
      kind: 'agent', id: `a-${a.id}`, label: a.name, sublabel: a.operational_role ?? 'AI Agent', agent: a,
    }))

  // Show actions always; show task/agent sections only when there's a query
  const items: PaletteItem[] = q
    ? [...navItems, ...actionItems, ...taskItems, ...agentItems]
    : [...navItems, ...actionItems]

  const totalItems = items.length
  const activeIdx  = totalItems > 0 ? Math.min(activeIndex, totalItems - 1) : 0

  // Section header tracking
  const pageStart   = items.findIndex((i) => i.kind === 'page')
  const actionStart = items.findIndex((i) => i.kind === 'action')
  const taskStart   = items.findIndex((i) => i.kind === 'task')
  const agentStart  = items.findIndex((i) => i.kind === 'agent')

  const execItem = useCallback((item: PaletteItem) => {
    if (item.kind === 'action') { item.run(); return }
    closePalette()
    if (item.kind === 'page')  onNavigate(item.page)
    if (item.kind === 'task')  onNavigate('workshop')
    if (item.kind === 'agent') onNavigate('agents')
  }, [onNavigate, closePalette])

  // Keyboard navigation
  useEffect(() => {
    if (!isPaletteOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape')    { closePalette() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, totalItems - 1)) }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
      else if (e.key === 'Enter') {
        e.preventDefault()
        const item = items[activeIdx]
        if (item) execItem(item)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPaletteOpen, items, activeIdx, totalItems, execItem, closePalette])

  // Reset active index on query change
  useEffect(() => { setActiveIndex(0) }, [query])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-pi="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  if (!isPaletteOpen) return null

  return (
    <div
      data-testid="command-palette"
      onClick={(e) => { if (e.target === e.currentTarget) closePalette() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(4, 5, 16, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '18vh',
        animation: 'fade-in 0.12s ease',
      }}
    >
      <div
        style={{
          width: 580,
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10, 12, 30, 0.94)',
          backdropFilter: 'blur(48px) saturate(1.2)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderTop: '1px solid rgba(255,255,255,0.16)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.72), 0 0 0 1px rgba(139,124,248,0.06)',
          overflow: 'hidden',
          animation: 'palette-drop 0.16s ease',
        }}
      >
        {/* Search row */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, tasks, agents…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#eef0f8', fontSize: 15, fontFamily: 'var(--font-sans)',
              letterSpacing: '-0.01em',
            }}
          />
          <kbd style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 5, fontFamily: 'inherit' }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ overflowY: 'auto', padding: '6px 0 4px' }}>
          {items.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.26)', fontSize: 13 }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : items.map((item, idx) => {
            const isActive = idx === activeIdx
            const icon = (item.kind === 'page' || item.kind === 'action') ? item.icon : ITEM_ICON[item.kind]
            return (
              <div key={item.id}>
                {idx === pageStart   && <SectionHeader label={CATEGORY_LABEL.page} />}
                {idx === actionStart && <SectionHeader label={CATEGORY_LABEL.action} />}
                {idx === taskStart   && <SectionHeader label={CATEGORY_LABEL.task} />}
                {idx === agentStart  && <SectionHeader label={CATEGORY_LABEL.agent} />}
                <button
                  data-pi={idx}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => execItem(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: 'calc(100% - 16px)',
                    margin: '1px 8px',
                    padding: '9px 12px',
                    background: isActive ? 'rgba(139,124,248,0.14)' : 'transparent',
                    border: 'none', borderRadius: 10,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.08s',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: isActive ? 'rgba(139,124,248,0.22)' : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.08s',
                  }}>
                    <i className={`fa-solid ${icon}`} style={{ fontSize: 12, color: isActive ? '#b4abfa' : 'rgba(255,255,255,0.42)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: isActive ? '#fff' : '#c8cce8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.sublabel}
                    </div>
                  </div>
                  {isActive && (
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.07)', padding: '2px 7px', borderRadius: 5, fontWeight: 600, flexShrink: 0 }}>
                      ↵
                    </span>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer hints */}
        <div style={{ padding: '7px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 14, alignItems: 'center' }}>
          {([['↑↓', 'Navigate'], ['↵', 'Select'], ['Esc', 'Close']] as [string, string][]).map(([key, label]) => (
            <span key={key} style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 11, color: 'rgba(255,255,255,0.26)' }}>
              <kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4, fontFamily: 'inherit' }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ label }: { label: string }): React.JSX.Element {
  return (
    <div style={{ padding: '8px 20px 3px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(255,255,255,0.26)' }}>
      {label}
    </div>
  )
}
