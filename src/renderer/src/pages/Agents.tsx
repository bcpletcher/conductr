import { useEffect, useState, useRef } from 'react'
import Modal from '../components/Modal'
import ActivityFeed from '../components/ActivityFeed'
import type { Agent, AgentFile, AgentMemory, SkillSummary, ActivityLogEntry, Task } from '../env.d'
import { AGENT_AVATARS, getAgentColor } from '../assets/agents'

const api = window.electronAPI

// ─── Accent color per agent ID ───────────────────────────────────────────────
// Single source of truth lives in assets/agents/index.ts (AGENT_COLORS).
// getAgentColor() covers all 11 agents; this function is the canonical accessor.
function getAccent(agentId: string): string {
  return getAgentColor(agentId)
}

// IDs considered the "lead" agent for org chart positioning
const LEAD_IDS = new Set(['agent-lyra'])

// Phase-locked agents — seeded in DB, shown dimmed in org chart until their phase lands
const PHASE_LOCKED: Record<string, string> = {
  'agent-nexus':    'Phase 11',
  'agent-helm':     'Phase 11',
  'agent-atlas':    'Phase 12',
  'agent-ledger':   'Phase 4+',
}

// The 5 standard files every agent should have
const STANDARD_FILES = ['SOUL.md', 'TOOLS.md', 'MEMORY.md', 'IDENTITY.md', 'HEARTBEAT.md']

// Agent file requirements for Protocol tab + Files tab
const AGENT_FILES: { name: string; desc: string }[] = [
  { name: 'SOUL.md',      desc: 'Values & personality core' },
  { name: 'TOOLS.md',     desc: 'Available integrations' },
  { name: 'MEMORY.md',    desc: 'Persistent knowledge store' },
  { name: 'IDENTITY.md',  desc: 'Agent persona definition' },
  { name: 'HEARTBEAT.md', desc: 'Health & uptime monitoring' },
]

// Scaffold content for each standard file
const FILE_TEMPLATES: Record<string, string> = {
  'SOUL.md': `# Soul

## Core Values
-

## Communication Style


## Personality Traits
-
`,
  'TOOLS.md': `# Tools

## Available Integrations


## API Access
-

## Capabilities
-
`,
  'MEMORY.md': `# Memory

## Persistent Knowledge


## Key Context
-

## Learned Patterns

`,
  'IDENTITY.md': `# Identity

## Who I Am


## Primary Mission


## Operating Boundaries
-
`,
  'HEARTBEAT.md': `# Heartbeat

## Health Checks
-

## Escalation Rules
-

## Recovery Procedures

`,
}

const PROTOCOL_RULES = [
  'Each agent owns exactly one domain — no overlap.',
  'Agents report outcomes, not activities.',
  'Never hallucinate tool results — fail loudly.',
  'Memory is sacred — never delete without explicit approval.',
  'Escalate budget overruns immediately to Commander.',
]

// ─── Roster Item ─────────────────────────────────────────────────────────────
interface RosterItemProps {
  agent: Agent
  selected: boolean
  isOnline: boolean
  onClick: () => void
}

function RosterItem({ agent, selected, isOnline, onClick }: RosterItemProps): React.JSX.Element {
  const accent = getAccent(agent.id)
  const svgUrl = AGENT_AVATARS[agent.id]
  const shortRole = agent.operational_role?.split('.')[0]?.split(',')[0]?.trim() ?? 'Agent'

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '9px 10px',
        borderRadius: 11,
        background: selected ? `${accent}14` : 'transparent',
        border: `1px solid ${selected ? `${accent}28` : 'transparent'}`,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        border: '1.5px solid rgba(4,4,14,0.90)',
        boxShadow: `0 0 0 1.5px ${accent}cc, 0 0 10px ${accent}50`,
        background: 'rgba(0,0,0,0.20)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, overflow: 'hidden',
      }}>
        {svgUrl
          ? <img src={svgUrl} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 9 }} />
          : <span style={{ fontSize: 15 }}>{agent.avatar}</span>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{
          fontSize: 13, fontWeight: 600,
          color: selected ? '#f1f5f9' : 'rgba(255,255,255,0.72)',
          lineHeight: 1.2, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {agent.name}
        </h3>
        <div style={{
          fontSize: 10.5, color: 'rgba(255,255,255,0.32)',
          marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {shortRole.length > 32 ? shortRole.substring(0, 32) + '…' : shortRole}
        </div>
      </div>

      <div style={{
        width: 7, height: 7, borderRadius: '50%',
        background: isOnline ? '#34d399' : 'rgba(255,255,255,0.15)',
        boxShadow: isOnline ? '0 0 5px #34d399' : 'none',
        flexShrink: 0,
      }} />
    </button>
  )
}

// ─── Agent Profile ────────────────────────────────────────────────────────────
interface AgentProfileProps {
  agent: Agent
  activeTasks: Task[]
  onEdit: () => void
}

type ProfileTab = 'profile' | 'files' | 'activity' | 'memory'

const SKILL_LEVEL_COLOR: Record<string, string> = {
  master:       '#f59e0b',
  expert:       '#818cf8',
  practitioner: '#34d399',
  novice:       '#64748b',
}

function AgentProfile({ agent, activeTasks, onEdit }: AgentProfileProps): React.JSX.Element {
  const accent = getAccent(agent.id)
  const svgUrl = AGENT_AVATARS[agent.id]
  const isOnline = activeTasks.length > 0
  const [log, setLog] = useState<ActivityLogEntry[]>([])
  const [profileTab, setProfileTab] = useState<ProfileTab>('profile')
  const [files, setFiles] = useState<AgentFile[]>([])
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [memories, setMemories] = useState<AgentMemory[]>([])
  const [skillSummaries, setSkillSummaries] = useState<SkillSummary[]>([])
  const [memoryDomainFilter, setMemoryDomainFilter] = useState<string>('')
  const [hardeningStatus, setHardeningStatus] = useState<string>('')
  const [memoryCount, setMemoryCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const shortRole = agent.operational_role?.split('.')[0]?.split(',')[0]?.trim() ?? ''

  async function loadFiles(): Promise<void> {
    const result = await api.agentFiles.getAll(agent.id)
    setFiles(result)
  }

  async function loadMemories(): Promise<void> {
    const [mems, skills, count] = await Promise.all([
      api.memories.getAll(agent.id, { limit: 60 }),
      api.memories.getSkillSummaries(agent.id),
      api.memories.getCount(agent.id),
    ])
    setMemories(mems)
    setSkillSummaries(skills)
    setMemoryCount(count)
  }

  useEffect(() => {
    setProfileTab('profile')
    setEditingFile(null)
    setEditContent('')
    setMemoryDomainFilter('')
    api.agents.getActivityLog(agent.id, 12).then(setLog).catch(() => {})
    loadFiles().catch(() => {})
    loadMemories().catch(() => {})
  }, [agent.id])

  function openFile(filename: string): void {
    const existing = files.find(f => f.filename === filename)
    setEditContent(existing?.content ?? FILE_TEMPLATES[filename] ?? '')
    setEditingFile(filename)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function cancelEdit(): void {
    setEditingFile(null)
    setEditContent('')
  }

  async function saveFile(): Promise<void> {
    if (!editingFile) return
    setSaving(true)
    try {
      await api.agentFiles.save(agent.id, editingFile, editContent)
      await loadFiles()
      setEditingFile(null)
      setEditContent('')
    } finally {
      setSaving(false)
    }
  }

  async function deleteFile(filename: string): Promise<void> {
    await api.agentFiles.delete(agent.id, filename)
    await loadFiles()
    if (editingFile === filename) {
      setEditingFile(null)
      setEditContent('')
    }
  }

  async function initAllFiles(): Promise<void> {
    for (const filename of STANDARD_FILES) {
      const existing = files.find(f => f.filename === filename)
      if (!existing?.content) {
        await api.agentFiles.save(agent.id, filename, FILE_TEMPLATES[filename] ?? '')
      }
    }
    await loadFiles()
  }

  const initializedCount = STANDARD_FILES.filter(f =>
    files.find(af => af.filename === f && af.content)
  ).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '24px 28px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: -50, left: 10, width: 140, height: 140,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}14 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 14 }}>
          {/* Large icon */}
          <div style={{
            width: 76, height: 76, borderRadius: 18,
            border: '2.5px solid rgba(4,4,14,0.92)',
            boxShadow: `0 0 0 2.5px ${accent}cc, 0 0 20px ${accent}60`,
            background: 'rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, overflow: 'hidden',
          }}>
            {svgUrl
              ? <img src={svgUrl} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }} />
              : <span style={{ fontSize: 32 }}>{agent.avatar}</span>
            }
          </div>

          {/* Name + badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.025em', lineHeight: 1 }}>
                {agent.name}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 9px', borderRadius: 20,
                background: isOnline ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isOnline ? 'rgba(52,211,153,0.22)' : 'rgba(255,255,255,0.08)'}`,
                fontSize: 10.5, fontWeight: 600,
                color: isOnline ? '#34d399' : 'rgba(255,255,255,0.35)',
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: isOnline ? '#34d399' : 'rgba(255,255,255,0.20)',
                  boxShadow: isOnline ? '0 0 4px #34d399' : 'none',
                }} />
                {isOnline ? 'Online' : 'Idle'}
              </span>
            </div>

            {shortRole && (
              <div style={{ marginBottom: 8 }}>
                <span style={{
                  display: 'inline-block', padding: '3px 11px', borderRadius: 20,
                  background: `${accent}16`, border: `1px solid ${accent}22`,
                  fontSize: 11, fontWeight: 600, color: accent, letterSpacing: '0.01em',
                }}>
                  {shortRole.length > 55 ? shortRole.substring(0, 55) + '…' : shortRole}
                </span>
              </div>
            )}

            {agent.system_directive && (
              <p style={{
                fontSize: 12, color: 'rgba(255,255,255,0.35)',
                fontStyle: 'italic', lineHeight: 1.5, marginTop: 2,
                maxWidth: 480, overflow: 'hidden',
                display: '-webkit-box',
              } as React.CSSProperties}>
                "{agent.system_directive.length > 110
                  ? agent.system_directive.substring(0, 110) + '…'
                  : agent.system_directive}"
              </p>
            )}
          </div>

          <button
            onClick={onEdit}
            style={{
              padding: '6px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.40)',
              fontSize: 12, cursor: 'pointer', flexShrink: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(255,255,255,0.08)'
              el.style.color = 'rgba(255,255,255,0.70)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(255,255,255,0.04)'
              el.style.color = 'rgba(255,255,255,0.40)'
            }}
          >
            Edit
          </button>
        </div>

        {/* Sub-tab bar */}
        <div style={{ display: 'flex', gap: 2 }}>
          {(['profile', 'files', 'activity', 'memory'] as ProfileTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setProfileTab(tab); setEditingFile(null); if (tab === 'memory') loadMemories().catch(() => {}) }}
              style={{
                padding: '7px 14px', fontSize: 12,
                fontWeight: profileTab === tab ? 600 : 400,
                color: profileTab === tab ? '#f1f5f9' : 'rgba(255,255,255,0.36)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${profileTab === tab ? accent : 'transparent'}`,
                marginBottom: -1,
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {tab === 'files'
                ? `Files ${initializedCount}/${STANDARD_FILES.length}`
                : tab === 'memory'
                  ? `Memory${memoryCount > 0 ? ` ${memoryCount}` : ''}`
                  : tab.charAt(0).toUpperCase() + tab.slice(1)
              }
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>

        {/* Profile tab */}
        {profileTab === 'profile' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              {agent.system_directive && (
                <div>
                  <SectionLabel icon="fa-solid fa-crosshairs">Mission Directives</SectionLabel>
                  <div style={{
                    padding: '13px 14px', borderRadius: 11,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderLeft: `3px solid ${accent}50`,
                    fontSize: 12.5, color: 'rgba(255,255,255,0.68)', lineHeight: 1.65,
                  }}>
                    {agent.system_directive}
                  </div>
                </div>
              )}
              {agent.operational_role && (
                <div>
                  <SectionLabel icon="fa-solid fa-id-badge">Operational Bio</SectionLabel>
                  <div style={{
                    padding: '13px 14px', borderRadius: 11,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65,
                  }}>
                    {agent.operational_role}
                  </div>
                </div>
              )}
            </div>

            {activeTasks.length > 0 && (
              <div>
                <SectionLabel icon="fa-solid fa-bolt">Active Tasks · {activeTasks.length}</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeTasks.map(task => (
                    <div key={task.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(52,211,153,0.04)',
                      border: '1px solid rgba(52,211,153,0.12)',
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#34d399', boxShadow: '0 0 5px #34d399', flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 12.5, color: 'rgba(255,255,255,0.75)',
                        flex: 1, minWidth: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {task.title}
                      </span>
                      <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600, flexShrink: 0 }}>
                        {task.progress}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!agent.system_directive && !agent.operational_role && activeTasks.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 48, color: 'rgba(255,255,255,0.22)' }}>
                <i className="fa-solid fa-robot" style={{ fontSize: 28, marginBottom: 10, display: 'block' }} />
                <p style={{ fontSize: 13 }}>No configuration yet</p>
                <p style={{ fontSize: 11, marginTop: 4, color: 'rgba(255,255,255,0.15)' }}>Click Edit to add directives</p>
              </div>
            )}
          </>
        )}

        {/* Files tab */}
        {profileTab === 'files' && (
          <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <SectionLabel icon="fa-solid fa-file-code">Agent Definition Files</SectionLabel>
              {initializedCount < STANDARD_FILES.length && (
                <button
                  onClick={initAllFiles}
                  style={{
                    padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                    background: `${accent}14`, border: `1px solid ${accent}28`,
                    color: accent, cursor: 'pointer',
                  }}
                >
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 9, marginRight: 5 }} />
                  Initialize All
                </button>
              )}
            </div>

            {/* File list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {AGENT_FILES.map(({ name: filename, desc }) => {
                const saved = files.find(f => f.filename === filename)
                const hasContent = !!(saved?.content)
                const isEditing = editingFile === filename

                return (
                  <div key={filename} style={{
                    borderRadius: 12,
                    border: `1px solid ${isEditing ? `${accent}30` : 'rgba(255,255,255,0.06)'}`,
                    background: isEditing ? `${accent}07` : 'rgba(255,255,255,0.02)',
                    overflow: 'hidden',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}>

                    {/* File row header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: hasContent ? `${accent}16` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${hasContent ? `${accent}28` : 'rgba(255,255,255,0.08)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <i className="fa-solid fa-file-code" style={{
                          fontSize: 12, color: hasContent ? accent : 'rgba(255,255,255,0.22)',
                        }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <code style={{
                            fontSize: 13, fontWeight: 600,
                            color: hasContent ? '#f1f5f9' : 'rgba(255,255,255,0.45)',
                          }}>
                            {filename}
                          </code>
                          <span style={{
                            fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                            background: hasContent ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${hasContent ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.08)'}`,
                            color: hasContent ? '#34d399' : 'rgba(255,255,255,0.25)',
                          }}>
                            {hasContent ? 'Saved' : 'Empty'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>{desc}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {hasContent && !isEditing && (
                          <button
                            onClick={() => deleteFile(filename)}
                            style={{
                              width: 26, height: 26, borderRadius: 6,
                              background: 'rgba(239,68,68,0.06)',
                              border: '1px solid rgba(239,68,68,0.12)',
                              color: 'rgba(239,68,68,0.45)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', fontSize: 10,
                            }}
                          >
                            <i className="fa-solid fa-trash" />
                          </button>
                        )}
                        <button
                          onClick={() => isEditing ? cancelEdit() : openFile(filename)}
                          style={{
                            padding: '4px 12px', borderRadius: 7,
                            background: isEditing ? 'rgba(255,255,255,0.05)' : `${accent}14`,
                            border: `1px solid ${isEditing ? 'rgba(255,255,255,0.10)' : `${accent}24`}`,
                            color: isEditing ? 'rgba(255,255,255,0.45)' : accent,
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          {isEditing ? 'Cancel' : (hasContent ? 'Edit' : 'Create')}
                        </button>
                      </div>
                    </div>

                    {/* Inline editor */}
                    {isEditing && (
                      <div style={{ borderTop: `1px solid ${accent}18`, padding: '0 14px 14px' }}>
                        <textarea
                          ref={textareaRef}
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={12}
                          style={{
                            width: '100%', marginTop: 10,
                            background: 'rgba(0,0,0,0.25)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8, padding: '10px 12px',
                            color: '#e2e8f0', fontSize: 12.5,
                            fontFamily: 'monospace', lineHeight: 1.65,
                            resize: 'vertical', outline: 'none',
                            boxSizing: 'border-box',
                          }}
                          spellCheck={false}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                          <button
                            onClick={cancelEdit}
                            style={{
                              padding: '6px 14px', borderRadius: 7, fontSize: 12,
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveFile}
                            disabled={saving}
                            style={{
                              padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                              background: saving ? `${accent}20` : accent,
                              border: `1px solid ${accent}`,
                              color: saving ? accent : '#0a0a1a',
                              cursor: saving ? 'wait' : 'pointer',
                              opacity: saving ? 0.7 : 1,
                            }}
                          >
                            {saving ? 'Saving…' : 'Save File'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Activity tab */}
        {profileTab === 'activity' && (
          <div>
            <SectionLabel icon="fa-solid fa-clock-rotate-left">Recent Activity</SectionLabel>
            {log.length > 0 ? (
              <div style={{
                padding: '10px 12px', borderRadius: 11,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <ActivityFeed entries={log} maxHeight="360px" />
              </div>
            ) : (
              <div style={{ textAlign: 'center', paddingTop: 40, color: 'rgba(255,255,255,0.22)' }}>
                <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 22, marginBottom: 8, display: 'block' }} />
                <p style={{ fontSize: 13 }}>No activity yet</p>
              </div>
            )}
          </div>
        )}

        {/* Memory tab */}
        {profileTab === 'memory' && (
          <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10 }}>
              <SectionLabel icon="fa-solid fa-brain">Agent Memory</SectionLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={async () => {
                    setHardeningStatus('Running…')
                    const result = await api.memories.runSkillHardening(agent.id)
                    await loadMemories()
                    setHardeningStatus(`Done — ${result.created} new, ${result.promoted} promoted`)
                    setTimeout(() => setHardeningStatus(''), 3000)
                  }}
                  style={{
                    padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                    background: `${accent}22`, border: `1px solid ${accent}40`,
                    color: accent, cursor: 'pointer',
                  }}
                >
                  <i className="fa-solid fa-gears" style={{ marginRight: 5 }} />
                  Run Skill Hardening
                </button>
                {memories.length > 0 && (
                  <button
                    onClick={async () => {
                      await api.memories.clearAgent(agent.id)
                      await loadMemories()
                    }}
                    style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 11,
                      background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.22)',
                      color: '#f87171', cursor: 'pointer',
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {hardeningStatus && (
              <div style={{ fontSize: 12, color: accent, marginBottom: 10, opacity: 0.8 }}>{hardeningStatus}</div>
            )}

            {/* Skill summaries */}
            {skillSummaries.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Skill Map</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {skillSummaries.slice(0, 12).map(s => (
                    <button
                      key={s.domain}
                      onClick={() => setMemoryDomainFilter(memoryDomainFilter === s.domain ? '' : s.domain)}
                      style={{
                        padding: '3px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        background: memoryDomainFilter === s.domain ? `${SKILL_LEVEL_COLOR[s.skill_level] ?? '#64748b'}22` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${memoryDomainFilter === s.domain ? SKILL_LEVEL_COLOR[s.skill_level] ?? '#64748b' : 'rgba(255,255,255,0.1)'}`,
                        color: SKILL_LEVEL_COLOR[s.skill_level] ?? '#94a3b8',
                      }}
                    >
                      {s.domain}
                      <span style={{ marginLeft: 5, opacity: 0.6, fontSize: 10 }}>{s.skill_level}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Memory list */}
            {memories.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 40, color: 'rgba(255,255,255,0.22)' }}>
                <i className="fa-solid fa-brain" style={{ fontSize: 22, marginBottom: 8, display: 'block' }} />
                <p style={{ fontSize: 13 }}>No memories yet</p>
                <p style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Memories are extracted automatically after each task run</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {memories
                  .filter(m => !memoryDomainFilter || m.domain_tags.includes(`"${memoryDomainFilter}"`))
                  .map(m => {
                    const domains = (() => { try { return JSON.parse(m.domain_tags) as string[] } catch { return [] } })()
                    const skillColor = m.skill_level ? (SKILL_LEVEL_COLOR[m.skill_level] ?? '#64748b') : undefined
                    return (
                      <div
                        key={m.id}
                        style={{
                          padding: '10px 14px', borderRadius: 10,
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${skillColor ? `${skillColor}20` : 'rgba(255,255,255,0.06)'}`,
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <p style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, flex: 1, margin: 0 }}>{m.content}</p>
                          <button
                            onClick={async () => { await api.memories.delete(m.id); await loadMemories() }}
                            style={{
                              flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                              color: 'rgba(255,255,255,0.25)', fontSize: 12, padding: '2px 4px',
                            }}
                          >
                            <i className="fa-solid fa-xmark" />
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          {domains.map(d => (
                            <span key={d} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                              {d}
                            </span>
                          ))}
                          {m.skill_level && (
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${skillColor}18`, color: skillColor, marginLeft: 'auto' }}>
                              {m.skill_level}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginLeft: m.skill_level ? 0 : 'auto' }}>
                            {m.source === 'skill_build' ? 'hardened' : m.source}
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Personnel Tab ────────────────────────────────────────────────────────────
interface PersonnelTabProps {
  agents: Agent[]
  selectedAgent: Agent | null
  agentTasks: Record<string, Task[]>
  onSelectAgent: (a: Agent) => void
  onEditAgent: (a: Agent) => void
}

function PersonnelTab({ agents, selectedAgent, agentTasks, onSelectAgent, onEditAgent }: PersonnelTabProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left: Roster */}
      <div style={{
        width: 248, flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(0, 0, 0, 0.18)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 14px 6px', flexShrink: 0 }}>
          <div style={{
            fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.09em', color: 'rgba(255,255,255,0.26)',
          }}>
            Intelligence Roster
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '2px 8px 12px' }}>
          {agents.map(agent => (
            <RosterItem
              key={agent.id}
              agent={agent}
              selected={selectedAgent?.id === agent.id}
              isOnline={(agentTasks[agent.id]?.length ?? 0) > 0}
              onClick={() => onSelectAgent(agent)}
            />
          ))}
          {agents.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 40, color: 'rgba(255,255,255,0.22)' }}>
              <i className="fa-solid fa-robot" style={{ fontSize: 22, marginBottom: 8, display: 'block' }} />
              <p style={{ fontSize: 12 }}>No agents yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Profile */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {selectedAgent ? (
          <AgentProfile
            agent={selectedAgent}
            activeTasks={agentTasks[selectedAgent.id] ?? []}
            onEdit={() => onEditAgent(selectedAgent)}
          />
        ) : (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 10, color: 'rgba(255,255,255,0.20)',
          }}>
            <i className="fa-solid fa-robot" style={{ fontSize: 28 }} />
            <span style={{ fontSize: 13 }}>Select an agent</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Org Chart Card ───────────────────────────────────────────────────────────
interface OrgCardProps {
  name: string
  role: string
  accent: string
  svgUrl?: string
  avatar?: string
  faIcon?: string
  size?: 'large' | 'normal'
  status?: 'online' | 'idle'
  phaseBadge?: string  // e.g. "Phase 11" — renders card dimmed with badge
}

function OrgCard({ name, role, accent, svgUrl, avatar, faIcon, size = 'normal', status, phaseBadge }: OrgCardProps): React.JSX.Element {
  const isLarge = size === 'large'
  const iconSize = isLarge ? 42 : 34
  const iconRadius = isLarge ? 12 : 9
  return (
    <div style={{
      padding: isLarge ? '13px 16px' : '10px 13px',
      borderRadius: 13,
      background: phaseBadge ? 'rgba(255,255,255,0.02)' : `${accent}0c`,
      border: `1px solid ${phaseBadge ? 'rgba(255,255,255,0.06)' : `${accent}26`}`,
      display: 'flex', alignItems: 'center', gap: 10,
      opacity: phaseBadge ? 0.5 : 1,
      position: 'relative',
    }}>
      <div style={{
        width: iconSize, height: iconSize, borderRadius: iconRadius,
        border: `${isLarge ? '2px' : '1.5px'} solid rgba(4,4,14,0.90)`,
        boxShadow: phaseBadge ? 'none' : `0 0 0 ${isLarge ? '2px' : '1.5px'} ${accent}cc, 0 0 ${isLarge ? '14px' : '10px'} ${accent}50`,
        background: 'rgba(0,0,0,0.20)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, overflow: 'hidden',
      }}>
        {svgUrl
          ? <img src={svgUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: iconRadius }} />
          : faIcon
            ? <i className={faIcon} style={{ fontSize: isLarge ? 16 : 13, color: accent }} />
            : <span style={{ fontSize: isLarge ? 18 : 14, color: accent }}>{avatar ?? name[0]}</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: isLarge ? 13.5 : 12, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </div>
        <div style={{
          fontSize: isLarge ? 10.5 : 9.5, color: phaseBadge ? 'rgba(255,255,255,0.30)' : accent,
          opacity: 0.80, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {role}
        </div>
      </div>
      {phaseBadge ? (
        <div style={{
          fontSize: 8.5, fontWeight: 700, color: 'rgba(255,255,255,0.40)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          background: 'rgba(255,255,255,0.07)', borderRadius: 5,
          padding: '2px 5px', flexShrink: 0,
        }}>
          {phaseBadge}
        </div>
      ) : status ? (
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: status === 'online' ? '#34d399' : 'rgba(255,255,255,0.18)',
          boxShadow: status === 'online' ? '0 0 5px #34d399' : 'none',
          flexShrink: 0,
        }} />
      ) : null}
    </div>
  )
}

// ─── Protocol Tab ─────────────────────────────────────────────────────────────
interface ProtocolTabProps {
  agents: Agent[]
  agentTasks: Record<string, Task[]>
}

function ProtocolTab({ agents, agentTasks }: ProtocolTabProps): React.JSX.Element {
  const leadAgent = agents.find(a => LEAD_IDS.has(a.id)) ?? agents[0] ?? null
  const subAgents     = agents.filter(a => a !== leadAgent)
  const coreAgents    = subAgents.filter(a => !PHASE_LOCKED[a.id])
  const lockedAgents  = subAgents.filter(a =>  PHASE_LOCKED[a.id])

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px 32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Left: Org Chart */}
        <div>
          <SectionLabel icon="fa-solid fa-sitemap">Organizational Chart</SectionLabel>
          <div style={{
            padding: '18px', borderRadius: 14,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {/* Commander row */}
            <OrgCard
              name="Mission Commander"
              role="Operations Lead"
              accent="#f59e0b"
              faIcon="fa-solid fa-user-tie"
            />
            {/* Connector */}
            <div style={{ display: 'flex', justifyContent: 'center', height: 20 }}>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.10)', height: '100%' }} />
            </div>
            {/* Lead agent */}
            {leadAgent && (
              <OrgCard
                name={leadAgent.name}
                role={leadAgent.operational_role?.split('.')[0]?.split(',')[0].trim() ?? 'Lead Agent'}
                accent={getAccent(leadAgent.id)}
                svgUrl={AGENT_AVATARS[leadAgent.id]}
                size="large"
                status={(agentTasks[leadAgent.id]?.length ?? 0) > 0 ? 'online' : 'idle'}
              />
            )}
            {/* Connector to sub-agents */}
            {coreAgents.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', height: 20 }}>
                  <div style={{ width: 1, background: 'rgba(255,255,255,0.10)', height: '100%' }} />
                </div>
                {/* Core agents — active now */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                  {coreAgents.map(agent => (
                    <OrgCard
                      key={agent.id}
                      name={agent.name}
                      role={(agent.operational_role?.split('.')[0]?.split(',')[0].trim() ?? 'Agent').substring(0, 22)}
                      accent={getAccent(agent.id)}
                      svgUrl={AGENT_AVATARS[agent.id]}
                      avatar={agent.avatar}
                      status={(agentTasks[agent.id]?.length ?? 0) > 0 ? 'online' : 'idle'}
                    />
                  ))}
                </div>
                {/* Expansion agents — phase-locked, dimmed */}
                {lockedAgents.length > 0 && (
                  <>
                    <div style={{
                      margin: '10px 0 6px',
                      fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.20)',
                      textTransform: 'uppercase', letterSpacing: '0.10em', textAlign: 'center',
                    }}>
                      Expansion Agents
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                      {lockedAgents.map(agent => (
                        <OrgCard
                          key={agent.id}
                          name={agent.name}
                          role={(agent.operational_role?.split('.')[0]?.split(',')[0].trim() ?? 'Agent').substring(0, 22)}
                          accent={getAccent(agent.id)}
                          svgUrl={AGENT_AVATARS[agent.id]}
                          avatar={agent.avatar}
                          phaseBadge={PHASE_LOCKED[agent.id]}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Budget + Agent Switching */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Budget Framework */}
          <div>
            <SectionLabel icon="fa-solid fa-coins">Budget Framework</SectionLabel>
            <div style={{
              padding: '14px 16px', borderRadius: 14,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <BudgetRow icon="fa-solid fa-coins"       label="Daily Budget"       value="$20.00" accent="#f59e0b" note="Shared agent pool" />
              <BudgetRow icon="fa-solid fa-check"        label="Auto-approve"       value="< $10"  accent="#34d399" note={`${leadAgent?.name ?? 'Lead'} approves`} />
              <BudgetRow icon="fa-solid fa-user"         label="Manual approve"     value="> $10"  accent="#818cf8" note="Commander approves" />
              <BudgetRow icon="fa-solid fa-triangle-exclamation" label="Overrun threshold" value="20%" accent="#f87171" note="Pause & escalate" />
            </div>
          </div>

          {/* Agent Switching */}
          <div>
            <SectionLabel icon="fa-solid fa-terminal">Agent Switching</SectionLabel>
            <div style={{
              padding: '14px 16px', borderRadius: 14,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                fontSize: 9.5, color: 'rgba(255,255,255,0.28)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
              }}>
                Command syntax
              </div>
              <div style={{
                fontFamily: 'monospace', fontSize: 12.5,
                padding: '7px 12px', borderRadius: 8, marginBottom: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#818cf8',
              }}>
                /agent &lt;name&gt;
              </div>
              <div style={{
                fontSize: 9.5, color: 'rgba(255,255,255,0.25)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
              }}>
                Available agents
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {agents.map((agent, i) => (
                  <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{
                      fontSize: 11.5, padding: '2px 8px', borderRadius: 6,
                      background: `${getAccent(agent.id)}12`,
                      color: getAccent(agent.id),
                      border: `1px solid ${getAccent(agent.id)}22`,
                      flexShrink: 0,
                    }}>
                      /agent {agent.name.toLowerCase()}
                    </code>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>
                      {i === 0 ? '← default' : (agent.operational_role?.split('.')[0]?.split(',')[0].trim() ?? '').substring(0, 26)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Creation Protocol — full width */}
      <div>
        <SectionLabel icon="fa-solid fa-file-code">Agent Creation Protocol</SectionLabel>
        <div style={{
          padding: '20px', borderRadius: 14,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Required files */}
            <div>
              <div style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
                color: '#f59e0b', marginBottom: 12,
              }}>
                Required Agent Files
              </div>
              {AGENT_FILES.map(f => (
                <div key={f.name} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
                  <i className="fa-solid fa-file-code" style={{ fontSize: 10, color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                  <code style={{ fontSize: 12, color: '#f59e0b', flexShrink: 0 }}>{f.name}</code>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>{f.desc}</span>
                </div>
              ))}
            </div>
            {/* Core philosophy */}
            <div>
              <div style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
                color: '#34d399', marginBottom: 12,
              }}>
                Core Philosophy
              </div>
              {PROTOCOL_RULES.map((rule, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, flexShrink: 0, width: 20 }}>
                    {String(i + 1).padStart(2, '0')}.
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.52)', lineHeight: 1.55 }}>
                    {rule}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Comms Tab ────────────────────────────────────────────────────────────────
interface CommsTabProps {
  agents: Agent[]
}

function CommsTab({ agents }: CommsTabProps): React.JSX.Element {
  const [selectedChannel, setSelectedChannel] = useState<Agent | null>(null)

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left: Intelligence Channels */}
      <div style={{
        width: 240, flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px 8px', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.70)', letterSpacing: '-0.01em' }}>
            Intelligence Channels
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 12px' }}>

          {/* Group Hubs */}
          <div style={{
            fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.09em', color: 'rgba(255,255,255,0.24)',
            padding: '8px 4px 4px',
          }}>
            Group Hubs
          </div>
          {['All Agents', 'Active Operations'].map(hub => (
            <button
              key={hub}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '7px 8px', borderRadius: 8,
                background: 'none', border: '1px solid transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'none'
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(129,140,248,0.10)',
                border: '1px solid rgba(129,140,248,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <i className="fa-solid fa-users" style={{ fontSize: 10, color: '#818cf8' }} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.60)' }}>{hub}</div>
                <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>Broadcast</div>
              </div>
            </button>
          ))}

          {/* Direct */}
          <div style={{
            fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.09em', color: 'rgba(255,255,255,0.24)',
            padding: '14px 4px 4px',
          }}>
            Direct
          </div>
          {agents.map(agent => {
            const accent = getAccent(agent.id)
            const svgUrl = AGENT_AVATARS[agent.id]
            const isSelected = selectedChannel?.id === agent.id
            const shortRole = (agent.operational_role?.split('.')[0]?.split(',')[0].trim() ?? 'Agent').substring(0, 22)

            return (
              <button
                key={agent.id}
                onClick={() => setSelectedChannel(agent)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 8px', borderRadius: 9,
                  background: isSelected ? `${accent}12` : 'none',
                  border: `1px solid ${isSelected ? `${accent}20` : 'transparent'}`,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  border: '1.5px solid rgba(4,4,14,0.90)',
                  boxShadow: `0 0 0 1.5px ${accent}cc, 0 0 8px ${accent}50`,
                  background: 'rgba(0,0,0,0.20)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, overflow: 'hidden',
                }}>
                  {svgUrl
                    ? <img src={svgUrl} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 7 }} />
                    : <span style={{ fontSize: 12 }}>{agent.avatar}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? '#f1f5f9' : 'rgba(255,255,255,0.58)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {agent.name}
                  </div>
                  <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.24)', marginTop: 1 }}>
                    {shortRole}
                  </div>
                </div>
                <div style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: '0.04em',
                  padding: '2px 5px', borderRadius: 4,
                  background: 'rgba(52,211,153,0.07)',
                  border: '1px solid rgba(52,211,153,0.14)',
                  color: 'rgba(52,211,153,0.55)', flexShrink: 0,
                }}>
                  E2E
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: Chat area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {selectedChannel ? (
          <>
            {/* Channel header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1.5px solid rgba(4,4,14,0.90)',
                boxShadow: `0 0 0 1.5px ${getAccent(selectedChannel.id)}cc, 0 0 10px ${getAccent(selectedChannel.id)}50`,
                background: 'rgba(0,0,0,0.20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {AGENT_AVATARS[selectedChannel.id]
                  ? <img src={AGENT_AVATARS[selectedChannel.id]} alt={selectedChannel.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  : <span style={{ fontSize: 14 }}>{selectedChannel.avatar}</span>
                }
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>
                  {selectedChannel.name}
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>
                  Direct — Secured Link
                </div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                  background: 'rgba(52,211,153,0.07)',
                  border: '1px solid rgba(52,211,153,0.14)',
                  color: 'rgba(52,211,153,0.75)',
                }}>
                  <i className="fa-solid fa-lock" style={{ fontSize: 8 }} />
                  Encrypted
                </span>
              </div>
            </div>

            {/* Chat stub */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 12, color: 'rgba(255,255,255,0.22)',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: `${getAccent(selectedChannel.id)}10`,
                border: `1px solid ${getAccent(selectedChannel.id)}1e`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="fa-solid fa-message" style={{ fontSize: 20, color: getAccent(selectedChannel.id), opacity: 0.55 }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.42)' }}>
                  Direct channel with {selectedChannel.name}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', marginTop: 5 }}>
                  Chat wiring coming in Phase 3B
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.16)', marginTop: 5 }}>
                  Use the Chat page to talk to {selectedChannel.name} now
                </p>
              </div>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 10, color: 'rgba(255,255,255,0.20)',
          }}>
            <i className="fa-solid fa-comments" style={{ fontSize: 32 }} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>Select a channel</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>Choose from the Intelligence Channels panel</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function SectionLabel({ icon, children }: { icon: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.07em', color: 'rgba(255,255,255,0.30)',
      marginBottom: 8,
    }}>
      <i className={icon} style={{ fontSize: 9, color: 'rgba(255,255,255,0.20)' }} />
      {children}
    </div>
  )
}

interface BudgetRowProps { icon: string; label: string; value: string; accent: string; note: string }
function BudgetRow({ icon, label, value, accent, note }: BudgetRowProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7,
        background: `${accent}12`, border: `1px solid ${accent}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <i className={icon} style={{ fontSize: 11, color: accent }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.52)', lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.26)', marginTop: 2 }}>{note}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: accent, flexShrink: 0 }}>{value}</div>
    </div>
  )
}

// ─── Agent Form ───────────────────────────────────────────────────────────────
interface AgentFormProps {
  initial?: Partial<Agent>
  onSubmit: (data: Partial<Agent>) => void
  onCancel: () => void
}

function AgentForm({ initial, onSubmit, onCancel }: AgentFormProps): React.JSX.Element {
  const [name,      setName]      = useState(initial?.name              || '')
  const [avatar,    setAvatar]    = useState(initial?.avatar            || '🤖')
  const [directive, setDirective] = useState(initial?.system_directive  || '')
  const [role,      setRole]      = useState(initial?.operational_role  || '')

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name:              name.trim(),
      avatar:            avatar.trim() || '🤖',
      system_directive:  directive.trim() || undefined,
      operational_role:  role.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Agent name" required className="input" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Avatar (emoji)</label>
          <input type="text" value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="🤖" className="input" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Mission Directives</label>
        <textarea value={directive} onChange={e => setDirective(e.target.value)} placeholder="Core directive for this agent…" rows={3} className="input resize-none" />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Operational Role</label>
        <textarea value={role} onChange={e => setRole(e.target.value)} placeholder="Describe this agent's role and responsibilities…" rows={3} className="input resize-none" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost px-4 py-2">Cancel</button>
        <button type="submit" className="btn-primary">{initial ? 'Save Changes' : 'Create Agent'}</button>
      </div>
    </form>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
type SwarmTab = 'personnel' | 'protocol' | 'comms'

const TABS: { id: SwarmTab; label: string }[] = [
  { id: 'personnel', label: 'Personnel' },
  { id: 'protocol',  label: 'Protocol'  },
  { id: 'comms',     label: 'Comms'     },
]

export default function Agents(): React.JSX.Element {
  const [agents,       setAgents]       = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [activeTab,    setActiveTab]    = useState<SwarmTab>('personnel')
  const [showForm,     setShowForm]     = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [agentTasks,   setAgentTasks]   = useState<Record<string, Task[]>>({})

  useEffect(() => {
    let mounted = true
    async function load(): Promise<void> {
      const [all, activeTasks] = await Promise.all([
        api.agents.getAll(),
        api.tasks.getByStatus('active'),
      ])
      if (!mounted) return
      setAgents(all)
      setSelectedAgent(prev => prev ?? (all.length > 0 ? all[0] : null))
      const byAgent: Record<string, Task[]> = {}
      for (const task of activeTasks) {
        if (task.agent_id) {
          if (!byAgent[task.agent_id]) byAgent[task.agent_id] = []
          byAgent[task.agent_id].push(task)
        }
      }
      setAgentTasks(byAgent)
    }
    load()
    return () => { mounted = false }
  }, [])

  async function handleCreate(data: Partial<Agent>): Promise<void> {
    const created = await api.agents.create(data)
    setShowForm(false)
    setAgents(prev => [...prev, created])
    setSelectedAgent(created)
  }

  async function handleEdit(data: Partial<Agent>): Promise<void> {
    if (!editingAgent) return
    const updated = await api.agents.update(editingAgent.id, data)
    setEditingAgent(null)
    setAgents(prev => prev.map(a => a.id === updated.id ? updated : a))
    setSelectedAgent(updated)
  }

  const onlineCount = agents.filter(a => (agentTasks[a.id]?.length ?? 0) > 0).length

  return (
    <div data-testid="agents-page" className="flex flex-col h-full overflow-hidden">

      {/* Page header — outside the glass card, consistent with other pages */}
      <div className="page-header flex items-start justify-between flex-shrink-0">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>Agents</h1>
            {/* SWARM OS badge — beside the title, not in front of it */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 20,
              background: 'rgba(129,140,248,0.10)',
              border: '1px solid rgba(129,140,248,0.20)',
              fontSize: 9.5, fontWeight: 800, letterSpacing: '0.10em',
              color: '#818cf8', textTransform: 'uppercase' as const, flexShrink: 0,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 4px #818cf8' }} />
              SWARM OS
            </span>
          </div>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            {agents.length} agent{agents.length !== 1 ? 's' : ''} · {onlineCount} online
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
          style={{ fontSize: 12, padding: '7px 14px' }}
        >
          + New Agent
        </button>
      </div>

      {/* Glass card — tab bar + content */}
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        background: 'rgba(6, 8, 22, 0.74)',
        backdropFilter: 'blur(48px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(48px) saturate(1.1)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTopColor: 'rgba(255,255,255,0.11)',
        borderRadius: 16,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.60)',
        overflow: 'hidden',
      }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 8px', flexShrink: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px', fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? '#f1f5f9' : 'rgba(255,255,255,0.38)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${activeTab === tab.id ? '#818cf8' : 'transparent'}`,
                marginBottom: -1, lineHeight: 1,
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {activeTab === 'personnel' && (
            <PersonnelTab
              agents={agents}
              selectedAgent={selectedAgent}
              agentTasks={agentTasks}
              onSelectAgent={setSelectedAgent}
              onEditAgent={setEditingAgent}
            />
          )}
          {activeTab === 'protocol' && (
            <ProtocolTab agents={agents} agentTasks={agentTasks} />
          )}
          {activeTab === 'comms' && (
            <CommsTab agents={agents} />
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Agent" width="max-w-lg">
        <AgentForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      </Modal>
      <Modal open={!!editingAgent} onClose={() => setEditingAgent(null)} title="Edit Agent" width="max-w-lg">
        {editingAgent && (
          <AgentForm
            initial={editingAgent}
            onSubmit={handleEdit}
            onCancel={() => setEditingAgent(null)}
          />
        )}
      </Modal>
    </div>
  )
}
