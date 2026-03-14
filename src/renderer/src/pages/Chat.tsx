import { useEffect, useMemo, useRef, useState } from 'react'
import type { Agent, Message } from '../env.d'
import { AGENT_AVATARS, getAgentColor } from '../assets/agents'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { toast } from '../store/ui'

const api = window.electronAPI

// Rough token estimate: 4 chars ≈ 1 token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// ── Avatar helper ──────────────────────────────────────────────────────────
interface AvatarProps {
  agent: Agent
  size?: 'sm' | 'md' | 'lg'
}

function AgentAvatar({ agent, size = 'md' }: AvatarProps): React.JSX.Element {
  const dim    = { sm: 28, md: 36, lg: 56 }[size]
  const fontSize = { sm: '1rem', md: '1.1rem', lg: '1.75rem' }[size]
  const imgUrl = AGENT_AVATARS[agent.id]
  const color  = getAgentColor(agent.id)

  // Dark-grunge circle border: dark inner ring → coloured outer ring → soft glow
  const borderPx   = { sm: 2, md: 2, lg: 3 }[size]
  const ringOffset = { sm: '1.5px', md: '2px', lg: '2.5px' }[size]

  return (
    <div
      className="flex-shrink-0 overflow-hidden flex items-center justify-center"
      style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        border: `${borderPx}px solid rgba(4, 4, 14, 0.90)`,
        boxShadow: `0 0 0 ${ringOffset} ${color}cc, 0 0 12px ${color}50`,
        fontSize,
        background: 'rgba(0,0,0,0.25)',
      }}
    >
      {imgUrl
        ? <img src={imgUrl} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        : agent.avatar}
    </div>
  )
}

// ── Typing indicator ───────────────────────────────────────────────────────
function TypingDots(): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}

// ── Context meter ──────────────────────────────────────────────────────────
interface ContextMeterProps {
  messages: Message[]
  streamContent: string
}

function ContextMeter({ messages, streamContent }: ContextMeterProps): React.JSX.Element {
  const totalChars = messages.reduce((s, m) => s + m.content.length, 0) + streamContent.length
  const tokens = estimateTokens(totalChars > 0 ? String(totalChars) : '')
  const totalTokens = messages.reduce((s, m) => s + estimateTokens(m.content), 0)
  const maxContext = 200000

  const pct = Math.min((totalTokens / maxContext) * 100, 100)
  const barColor = pct > 80 ? '#f87171' : pct > 60 ? '#fb923c' : '#34d399'

  if (messages.length === 0) return <></>
  void tokens

  return (
    <div className="flex items-center gap-2" title={`~${totalTokens.toLocaleString()} tokens used`}>
      <span className="text-xs tabular-nums" style={{ color: '#64748b' }}>
        ~{totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens} tok
      </span>
      <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  )
}

// ── Copy button ────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      data-testid="msg-copy-btn"
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy message'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: copied ? 'var(--color-accent-green)' : 'rgba(255,255,255,0.30)',
        fontSize: 11,
        padding: '3px 5px',
        borderRadius: 6,
        transition: 'color 0.15s, opacity 0.15s',
        flexShrink: 0,
      }}
    >
      <i className={copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'} />
    </button>
  )
}

// ── Message bubble ─────────────────────────────────────────────────────────
interface BubbleProps {
  msg: Message
  agent: Agent | null
}

function MessageBubble({ msg, agent }: BubbleProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div
        className="flex justify-end mb-4 items-end gap-1.5"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          <CopyButton text={msg.content} />
        </div>
        <div
          className="max-w-[72%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-text-primary leading-relaxed"
          style={{
            background: 'rgba(99,102,241,0.18)',
            border: '1px solid rgba(99,102,241,0.28)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex items-start gap-2.5 mb-4"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {agent && <AgentAvatar agent={agent} size="sm" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          {agent && (
            <div className="text-xs text-text-muted font-medium">{agent.name}</div>
          )}
          <div style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
            <CopyButton text={msg.content} />
          </div>
        </div>
        <div
          className="inline-block max-w-full px-4 py-3 rounded-2xl rounded-tl-sm"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <MarkdownRenderer content={msg.content} />
        </div>
      </div>
    </div>
  )
}

// ── Streaming bubble ───────────────────────────────────────────────────────
interface StreamingBubbleProps {
  content: string
  agent: Agent | null
}

function StreamingBubble({ content, agent }: StreamingBubbleProps): React.JSX.Element {
  return (
    <div className="flex items-start gap-2.5 mb-4">
      {agent && <AgentAvatar agent={agent} size="sm" />}
      <div className="flex-1 min-w-0">
        {agent && (
          <div className="text-xs text-text-muted mb-1.5 font-medium">{agent.name}</div>
        )}
        <div
          className="inline-block max-w-full px-4 py-3 rounded-2xl rounded-tl-sm"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {content
            ? (
              <>
                <MarkdownRenderer content={content} />
                <span
                  className="inline-block w-0.5 h-[0.9em] bg-accent ml-0.5 align-middle animate-pulse"
                />
              </>
            )
            : <TypingDots />}
        </div>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyThread({ agent }: { agent: Agent | null }): React.JSX.Element {
  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
        <i className="fa-solid fa-robot text-2xl text-text-dim" />
        <span className="text-sm">Select an agent to start chatting</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
      <AgentAvatar agent={agent} size="lg" />
      <div className="text-center">
        <div className="text-base font-semibold text-text-primary mb-1">{agent.name}</div>
        {agent.system_directive && (
          <div className="text-xs max-w-[280px] text-center leading-relaxed opacity-70">
            {agent.system_directive}
          </div>
        )}
      </div>
      <div className="text-xs opacity-50">Send a message to start chatting</div>
    </div>
  )
}

// ── Export helpers ─────────────────────────────────────────────────────────
function buildMarkdown(messages: Message[], agentName: string): string {
  const date = new Date().toISOString().slice(0, 10)
  const lines: string[] = [
    `# Chat with ${agentName}`,
    `_Exported on ${date}_`,
    '',
    '---',
    '',
  ]
  for (const m of messages) {
    const label = m.role === 'user' ? '**You**' : `**${agentName}**`
    lines.push(`${label}\n\n${m.content}`, '', '---', '')
  }
  return lines.join('\n')
}

function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown; charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Broadcast column card ──────────────────────────────────────────────────
interface BroadcastColumnProps {
  agent: Agent | null
  content: string
  isDone: boolean
  isStreaming: boolean
  onContinue: () => void
}

function BroadcastColumn({ agent, content, isDone, isStreaming, onContinue }: BroadcastColumnProps): React.JSX.Element {
  return (
    <div
      data-testid={`broadcast-col-${agent?.id ?? 'unknown'}`}
      className="flex flex-col flex-shrink-0"
      style={{
        width: 280,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center gap-2 px-3 flex-shrink-0"
        style={{ paddingTop: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {agent && <AgentAvatar agent={agent} size="sm" />}
        <span className="text-sm font-medium text-text-primary flex-1 truncate">
          {agent?.name ?? 'Unknown'}
        </span>
        {isStreaming && (
          <i className="fa-solid fa-circle text-xs animate-pulse" style={{ color: 'var(--color-accent)' }} />
        )}
        {isDone && (
          <i className="fa-solid fa-circle-check text-xs" style={{ color: '#34d399' }} />
        )}
        {!isStreaming && !isDone && content === '' && (
          <i className="fa-regular fa-clock text-xs" style={{ color: '#64748b' }} />
        )}
      </div>

      {/* Response body */}
      <div className="flex-1 overflow-y-auto p-3" style={{ minHeight: 140 }}>
        {content
          ? (
            <>
              <MarkdownRenderer content={content} />
              {isStreaming && (
                <span className="inline-block w-0.5 h-[0.9em] bg-accent ml-0.5 align-middle animate-pulse" />
              )}
            </>
          )
          : isStreaming
            ? <TypingDots />
            : <span className="text-xs" style={{ color: '#64748b' }}>Waiting…</span>}
      </div>

      {/* Continue footer */}
      {isDone && (
        <div
          className="px-3 flex-shrink-0"
          style={{ paddingTop: 8, paddingBottom: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <button
            onClick={onContinue}
            className="btn-ghost w-full text-xs flex items-center gap-1.5 justify-center"
          >
            Continue with {agent?.name}
            <i className="fa-solid fa-arrow-right" style={{ fontSize: 9 }} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Chat page ─────────────────────────────────────────────────────────
export default function Chat(): React.JSX.Element {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const broadcastTextareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Broadcast state ──────────────────────────────────────────────────────
  const [broadcastMode, setBroadcastMode] = useState(false)
  const [broadcastInput, setBroadcastInput] = useState('')
  const [broadcastSelected, setBroadcastSelected] = useState<string[]>([])
  const [broadcastStreams, setBroadcastStreams] = useState<Record<string, string>>({})
  const [broadcastDone, setBroadcastDone] = useState<string[]>([])
  const [broadcastSending, setBroadcastSending] = useState(false)

  // Auto-clear broadcastSending when all selected agents have responded
  useEffect(() => {
    if (broadcastSending && broadcastSelected.length > 0 && broadcastDone.length >= broadcastSelected.length) {
      setBroadcastSending(false)
    }
  }, [broadcastDone.length, broadcastSelected.length, broadcastSending])

  // Total estimated tokens across all messages
  const totalTokens = useMemo(
    () => messages.reduce((s, m) => s + estimateTokens(m.content), 0),
    [messages]
  )
  void totalTokens

  // Load agents on mount
  useEffect(() => {
    api.agents.getAll().then((all) => {
      setAgents(all)
      if (all.length > 0) setSelectedAgent(all[0])
    })
  }, [])

  // Load history when agent changes (separate from streaming listeners)
  useEffect(() => {
    if (!selectedAgent) return
    api.chat.getMessages(selectedAgent.id).then(setMessages)
  }, [selectedAgent?.id])

  // Wire streaming listeners — re-registered whenever mode or selected agent changes
  useEffect(() => {
    api.chat.removeAllListeners()

    if (broadcastMode) {
      // Broadcast: route each event to the right column by agentId
      api.chat.onChunk(({ agentId, chunk }) => {
        setBroadcastStreams((prev) => ({ ...prev, [agentId]: (prev[agentId] ?? '') + chunk }))
      })
      api.chat.onDone(({ agentId, message }) => {
        setBroadcastStreams((prev) => ({ ...prev, [agentId]: (prev[agentId] ?? '') }))
        void message  // message already persisted by main process
        setBroadcastDone((prev) => [...new Set([...prev, agentId])])
      })
      api.chat.onError(({ agentId, error }) => {
        setBroadcastStreams((prev) => ({ ...prev, [agentId]: (prev[agentId] ?? '') + `\n\n⚠ ${error}` }))
        setBroadcastDone((prev) => [...new Set([...prev, agentId])])
      })
    } else if (selectedAgent) {
      const id = selectedAgent.id
      api.chat.onChunk(({ agentId, chunk }) => {
        if (agentId !== id) return
        setStreamContent((prev) => prev + chunk)
      })
      api.chat.onDone(({ agentId, message }) => {
        if (agentId !== id) return
        setMessages((prev) => [...prev, message as Message])
        setStreamContent('')
        setStreaming(false)
      })
      api.chat.onError(({ agentId, error }) => {
        if (agentId !== id) return
        console.error('Chat error:', error)
        setStreamContent(`⚠ ${error}`)
        setStreaming(false)
      })
    }

    return () => api.chat.removeAllListeners()
  }, [broadcastMode, selectedAgent?.id])

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamContent])

  // ── Normal chat handlers ─────────────────────────────────────────────────
  function handleAgentSwitch(agentId: string): void {
    const agent = agents.find((a) => a.id === agentId)
    if (!agent || agent.id === selectedAgent?.id) return
    api.chat.removeAllListeners()
    setStreamContent('')
    setStreaming(false)
    setMessages([])
    setSelectedAgent(agent)
  }

  function handleSend(): void {
    if (!input.trim() || !selectedAgent || streaming) return
    const content = input.trim()
    setInput('')
    resetTextareaHeight()

    const tempMsg: Message = {
      id: `tmp-${Date.now()}`,
      agent_id: selectedAgent.id,
      role: 'user',
      content,
      created_at: new Date().toISOString()
    }
    setMessages((prev) => [...prev, tempMsg])
    setStreaming(true)
    setStreamContent('')

    api.chat.send(selectedAgent.id, content)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  function resetTextareaHeight(): void {
    if (textareaRef.current) textareaRef.current.style.height = '40px'
  }

  function handleClear(): void {
    if (!selectedAgent) return
    api.chat.clearMessages(selectedAgent.id)
    setMessages([])
  }

  function handleExport(): void {
    if (!selectedAgent || messages.length === 0) return
    const md       = buildMarkdown(messages, selectedAgent.name)
    const date     = new Date().toISOString().slice(0, 10)
    const filename = `chat-${selectedAgent.name.toLowerCase()}-${date}.md`
    downloadMarkdown(md, filename)
    toast.success('Conversation exported')
  }

  async function handleSaveAsDocument(): Promise<void> {
    if (!selectedAgent || messages.length === 0) return
    const date    = new Date().toISOString().slice(0, 10)
    const title   = `Chat with ${selectedAgent.name} — ${date}`
    const content = buildMarkdown(messages, selectedAgent.name)
    await api.documents.create({
      title,
      content,
      doc_type: 'recap',
      agent_id: selectedAgent.id,
    })
    toast.success('Saved to Documents')
  }

  // ── Broadcast handlers ───────────────────────────────────────────────────
  function handleToggleBroadcast(): void {
    if (!broadcastMode) {
      // Enter broadcast mode — select all agents by default
      setBroadcastSelected(agents.map((a) => a.id))
      setBroadcastStreams({})
      setBroadcastDone([])
      setBroadcastInput('')
      setBroadcastSending(false)
    }
    setBroadcastMode((prev) => !prev)
  }

  function handleBroadcastSend(): void {
    if (!broadcastInput.trim() || broadcastSending || broadcastSelected.length === 0) return
    const content = broadcastInput.trim()
    setBroadcastInput('')
    if (broadcastTextareaRef.current) broadcastTextareaRef.current.style.height = '40px'
    setBroadcastSending(true)
    setBroadcastStreams({})
    setBroadcastDone([])
    // Fire send for every selected agent — responses arrive in parallel via IPC
    for (const agentId of broadcastSelected) {
      api.chat.send(agentId, content)
    }
  }

  function handleBroadcastKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleBroadcastSend()
    }
  }

  function handleBroadcastContinue(agentId: string): void {
    const agent = agents.find((a) => a.id === agentId)
    if (!agent) return
    setBroadcastMode(false)
    setSelectedAgent(agent)
    setStreaming(false)
    setStreamContent('')
    // History will load via the selectedAgent?.id effect
  }

  function toggleBroadcastAgent(agentId: string): void {
    setBroadcastSelected((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    )
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const showThread  = messages.length > 0 || streaming
  const hasMessages = messages.length > 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div data-testid="chat-page" className="flex flex-col h-full gap-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {selectedAgent && !broadcastMode && <AgentAvatar agent={selectedAgent} size="md" />}
          {broadcastMode && (
            <div
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(129,140,248,0.12)',
                border: '1px solid rgba(129,140,248,0.25)',
              }}
            >
              <i className="fa-solid fa-satellite-dish" style={{ color: 'var(--color-accent)', fontSize: '1rem' }} />
            </div>
          )}
          <div>
            <h1 className="page-title" style={{ marginBottom: 0 }}>
              {broadcastMode ? 'Broadcast' : (selectedAgent?.name ?? 'Chat')}
            </h1>
            <p className="page-subtitle" style={{ marginTop: 2 }}>
              {broadcastMode
                ? `Sending to ${broadcastSelected.length} agent${broadcastSelected.length !== 1 ? 's' : ''}`
                : selectedAgent?.operational_role}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Context meter (normal mode only) */}
          {!broadcastMode && hasMessages && (
            <ContextMeter messages={messages} streamContent={streamContent} />
          )}

          {/* Agent switcher (normal mode only) */}
          {!broadcastMode && (
            <select
              value={selectedAgent?.id ?? ''}
              onChange={(e) => handleAgentSwitch(e.target.value)}
              className="input text-sm"
              style={{ width: 'auto', minWidth: 120, paddingRight: 36 }}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}

          {/* Broadcast toggle */}
          <button
            data-testid="chat-broadcast-btn"
            onClick={handleToggleBroadcast}
            className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
            title="Broadcast a message to all agents"
            style={{
              color: broadcastMode ? 'var(--color-accent)' : undefined,
              background: broadcastMode ? 'rgba(129,140,248,0.10)' : undefined,
              border: broadcastMode ? '1px solid rgba(129,140,248,0.25)' : undefined,
            }}
          >
            <i className="fa-solid fa-satellite-dish" style={{ fontSize: 11 }} />
            {broadcastMode ? 'Exit Broadcast' : 'Broadcast'}
          </button>

          {/* Export + Save + Clear — normal mode with messages only */}
          {!broadcastMode && hasMessages && (
            <>
              <button
                data-testid="chat-export-btn"
                onClick={handleExport}
                className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
                title="Export as markdown"
              >
                <i className="fa-solid fa-arrow-up-from-bracket" style={{ fontSize: 11 }} />
                Export
              </button>
              <button
                data-testid="chat-save-doc-btn"
                onClick={handleSaveAsDocument}
                className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
                title="Save conversation as document"
              >
                <i className="fa-regular fa-file-lines" style={{ fontSize: 11 }} />
                Save
              </button>
              <button onClick={handleClear} className="btn-ghost px-3 py-1.5 text-xs">
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Broadcast mode view ──────────────────────────────────────────── */}
      {broadcastMode ? (
        <div className="flex flex-col flex-1 min-h-0 gap-3">

          {/* Agent selection chips */}
          <div
            className="flex flex-wrap gap-2 flex-shrink-0"
            data-testid="broadcast-agent-chips"
          >
            {agents.map((agent) => {
              const isSelected = broadcastSelected.includes(agent.id)
              return (
                <button
                  key={agent.id}
                  data-testid={`broadcast-chip-${agent.id}`}
                  onClick={() => toggleBroadcastAgent(agent.id)}
                  className="flex items-center gap-1.5 text-xs transition-all"
                  style={{
                    padding: '5px 12px 5px 8px',
                    borderRadius: 99,
                    background: isSelected ? 'rgba(129,140,248,0.16)' : 'rgba(255,255,255,0.04)',
                    border: isSelected ? '1px solid rgba(129,140,248,0.35)' : '1px solid rgba(255,255,255,0.08)',
                    color: isSelected ? 'var(--color-accent)' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  <AgentAvatar agent={agent} size="sm" />
                  {agent.name}
                  {isSelected && (
                    <i className="fa-solid fa-check" style={{ fontSize: 9, marginLeft: 2 }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Response columns */}
          <div className="flex-1 min-h-0 overflow-x-auto" data-testid="broadcast-columns">
            {broadcastSelected.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-text-muted">
                  <i className="fa-solid fa-satellite-dish text-2xl mb-3 block opacity-30" />
                  <div className="text-sm">Select at least one agent to broadcast to</div>
                </div>
              </div>
            ) : broadcastDone.length === 0 && !broadcastSending ? (
              // Pre-send: show placeholder columns
              <div className="flex gap-3 h-full pb-1">
                {broadcastSelected.map((agentId) => {
                  const agent = agents.find((a) => a.id === agentId)
                  return (
                    <div
                      key={agentId}
                      className="flex-shrink-0 flex flex-col items-center justify-center gap-2"
                      style={{
                        width: 280,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px dashed rgba(255,255,255,0.07)',
                        borderRadius: 14,
                      }}
                    >
                      {agent && <AgentAvatar agent={agent} size="md" />}
                      <span className="text-sm text-text-muted">{agent?.name}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              // Active / done: show response columns
              <div className="flex gap-3 h-full pb-1">
                {broadcastSelected.map((agentId) => {
                  const agent   = agents.find((a) => a.id === agentId)
                  const content = broadcastStreams[agentId] ?? ''
                  const isDone  = broadcastDone.includes(agentId)
                  const isStreaming = broadcastSending && !isDone
                  return (
                    <BroadcastColumn
                      key={agentId}
                      agent={agent ?? null}
                      content={content}
                      isDone={isDone}
                      isStreaming={isStreaming}
                      onContinue={() => handleBroadcastContinue(agentId)}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Broadcast input bar */}
          <div className="card flex-shrink-0 flex items-end gap-3 p-3">
            <textarea
              ref={broadcastTextareaRef}
              value={broadcastInput}
              onChange={(e) => {
                setBroadcastInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
              }}
              onKeyDown={handleBroadcastKeyDown}
              placeholder={
                broadcastSelected.length === 0
                  ? 'Select agents above…'
                  : `Broadcast to ${broadcastSelected.length} agent${broadcastSelected.length !== 1 ? 's' : ''}…`
              }
              disabled={broadcastSending || broadcastSelected.length === 0}
              rows={1}
              data-testid="broadcast-input"
              className="input flex-1 resize-none leading-relaxed"
              style={{ minHeight: 40, maxHeight: 160, height: 40, paddingTop: 10, paddingBottom: 10 }}
            />
            <button
              onClick={handleBroadcastSend}
              disabled={!broadcastInput.trim() || broadcastSending || broadcastSelected.length === 0}
              data-testid="broadcast-send-btn"
              className="btn-primary flex-shrink-0 disabled:opacity-40"
              style={{ height: 40, width: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {broadcastSending
                ? <i className="fa-solid fa-spinner animate-spin text-sm" />
                : <i className="fa-solid fa-paper-plane text-sm" />}
            </button>
          </div>
        </div>

      ) : (
        /* ── Normal single-agent view ────────────────────────────────────── */
        <>
          {/* Message thread */}
          <div className="card flex-1 min-h-0 overflow-y-auto p-4">
            {showThread ? (
              <div>
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    agent={msg.role === 'assistant' ? selectedAgent : null}
                  />
                ))}
                {streaming && (
                  <StreamingBubble content={streamContent} agent={selectedAgent} />
                )}
                <div ref={bottomRef} />
              </div>
            ) : (
              <EmptyThread agent={selectedAgent} />
            )}
          </div>

          {/* Input bar */}
          <div className="card flex-shrink-0 flex items-end gap-3 p-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={selectedAgent ? `Message ${selectedAgent.name}…` : 'Select an agent…'}
              disabled={!selectedAgent || streaming}
              rows={1}
              className="input flex-1 resize-none leading-relaxed"
              style={{ minHeight: 40, maxHeight: 160, height: 40, paddingTop: 10, paddingBottom: 10 }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !selectedAgent || streaming}
              className="btn-primary flex-shrink-0 disabled:opacity-40"
              style={{ height: 40, width: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {streaming
                ? <i className="fa-solid fa-spinner animate-spin text-sm" />
                : <i className="fa-solid fa-arrow-up text-sm" />}
            </button>
          </div>
        </>
      )}

    </div>
  )
}
