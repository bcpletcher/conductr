import { useEffect, useMemo, useRef, useState } from 'react'
import type { Agent, Message } from '../env.d'
import { AGENT_AVATARS } from '../assets/agents'
import MarkdownRenderer from '../components/MarkdownRenderer'

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
  const dim = { sm: 28, md: 36, lg: 56 }[size]
  const fontSize = { sm: '1rem', md: '1.1rem', lg: '1.75rem' }[size]
  const radius = { sm: 8, md: 10, lg: 14 }[size]
  const svgUrl = AGENT_AVATARS[agent.id]

  return (
    <div
      className="flex-shrink-0 overflow-hidden bg-white/[0.04] border border-white/[0.06] flex items-center justify-center"
      style={{ width: dim, height: dim, borderRadius: radius, fontSize }}
    >
      {svgUrl
        ? <img src={svgUrl} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

// ── Message bubble ─────────────────────────────────────────────────────────
interface BubbleProps {
  msg: Message
  agent: Agent | null
}

function MessageBubble({ msg, agent }: BubbleProps): React.JSX.Element {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
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

  // Total estimated tokens across all messages
  const totalTokens = useMemo(
    () => messages.reduce((s, m) => s + estimateTokens(m.content), 0),
    [messages]
  )

  // Load agents on mount
  useEffect(() => {
    api.agents.getAll().then((all) => {
      setAgents(all)
      if (all.length > 0) setSelectedAgent(all[0])
    })
  }, [])

  // Load history + wire streaming listeners when agent changes
  useEffect(() => {
    if (!selectedAgent) return

    api.chat.getMessages(selectedAgent.id).then(setMessages)

    api.chat.onChunk(({ chunk }) => setStreamContent((prev) => prev + chunk))

    api.chat.onDone(({ message }) => {
      setMessages((prev) => [...prev, message])
      setStreamContent('')
      setStreaming(false)
    })

    api.chat.onError(({ error }) => {
      console.error('Chat error:', error)
      setStreamContent(`⚠ ${error}`)
      setStreaming(false)
    })

    return () => {
      api.chat.removeAllListeners()
    }
  }, [selectedAgent?.id])

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamContent])

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

    // Optimistic user message
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

  const showThread = messages.length > 0 || streaming

  return (
    <div data-testid="chat-page" className="flex flex-col h-full gap-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {selectedAgent && <AgentAvatar agent={selectedAgent} size="md" />}
          <div>
            <h1 className="page-title" style={{ marginBottom: 0 }}>
              {selectedAgent?.name ?? 'Chat'}
            </h1>
            {selectedAgent?.operational_role && (
              <p className="page-subtitle" style={{ marginTop: 2 }}>
                {selectedAgent.operational_role}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Context meter */}
          {messages.length > 0 && (
            <ContextMeter messages={messages} streamContent={streamContent} />
          )}

          {/* Agent switcher */}
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

          {messages.length > 0 && (
            <button onClick={handleClear} className="btn-ghost px-3 py-1.5 text-xs">
              Clear
            </button>
          )}
        </div>
      </div>

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

    </div>
  )
}
