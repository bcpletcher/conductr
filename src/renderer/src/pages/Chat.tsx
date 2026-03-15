import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Agent, ChatImage, Message, PromptTemplate } from '../env.d'
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
  const totalTokens = messages.reduce((s, m) => s + estimateTokens(m.content), 0)
    + estimateTokens(streamContent)
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
        transition: 'color 0.15s',
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
  onQueueAsTask: (content: string) => void
  onToggleBookmark: (id: string) => void
  searchQuery: string
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background: 'rgba(251,191,36,0.35)', color: '#fbbf24', borderRadius: 2 }}>{part}</mark>
      : part
  )
}

function MessageBubble({ msg, agent, onQueueAsTask, onToggleBookmark, searchQuery }: BubbleProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)
  const isUser = msg.role === 'user'
  const isBookmarked = msg.bookmarked === 1

  if (isUser) {
    return (
      <div
        className="flex justify-end mb-4 items-end gap-1.5"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex items-center gap-1" style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          <button
            onClick={() => onToggleBookmark(msg.id)}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 11,
              color: isBookmarked ? '#fbbf24' : 'rgba(255,255,255,0.3)',
              padding: '3px 5px', borderRadius: 6, transition: 'color 0.15s',
            }}
          >
            <i className={isBookmarked ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'} />
          </button>
          <CopyButton text={msg.content} />
        </div>
        <div>
          {/* Image previews for user messages */}
          {msg.images && msg.images.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end mb-1.5">
              {msg.images.map((img, i) => (
                <img
                  key={i}
                  src={img.preview}
                  alt="Attached image"
                  style={{
                    maxWidth: 180, maxHeight: 180, borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.10)',
                    objectFit: 'cover',
                  }}
                />
              ))}
            </div>
          )}
          <div
            className="max-w-[72%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-text-primary leading-relaxed"
            style={{
              background: 'rgba(99,102,241,0.18)',
              border: '1px solid rgba(99,102,241,0.28)',
              whiteSpace: 'pre-wrap',
              maxWidth: '100%',
            }}
          >
            {searchQuery ? highlightText(msg.content, searchQuery) : msg.content}
          </div>
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
          <div className="flex items-center gap-1" style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
            <button
              onClick={() => onToggleBookmark(msg.id)}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 11,
                color: isBookmarked ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                padding: '3px 5px', borderRadius: 6, transition: 'color 0.15s',
              }}
            >
              <i className={isBookmarked ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'} />
            </button>
            <CopyButton text={msg.content} />
            <button
              onClick={() => onQueueAsTask(msg.content)}
              title="Queue as Workshop task"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 11,
                color: 'rgba(255,255,255,0.30)', padding: '3px 5px', borderRadius: 6,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#34d399')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.30)')}
            >
              <i className="fa-solid fa-list-check" />
            </button>
          </div>
          {isBookmarked && (
            <i className="fa-solid fa-bookmark text-xs" style={{ color: '#fbbf24', fontSize: 9 }} />
          )}
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
function StreamingBubble({ content, agent }: { content: string; agent: Agent | null }): React.JSX.Element {
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
                <span className="inline-block w-0.5 h-[0.9em] bg-accent ml-0.5 align-middle animate-pulse" />
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

// ── Image helpers ──────────────────────────────────────────────────────────
async function fileToImage(file: File): Promise<ChatImage | null> {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowed.includes(file.type)) return null
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      // Strip the data:image/xxx;base64, prefix for the API
      const base64 = dataUrl.split(',')[1]
      resolve({ data: base64, mediaType: file.type, preview: dataUrl })
    }
    reader.readAsDataURL(file)
  })
}

// ── @-mention autocomplete ─────────────────────────────────────────────────
function getMentionInfo(text: string, cursorPos: number): { partial: string; start: number } | null {
  const before = text.slice(0, cursorPos)
  const match = before.match(/@(\w*)$/)
  if (!match) return null
  return { partial: match[1], start: cursorPos - match[0].length }
}

function parseMentions(text: string, agents: Agent[]): string[] {
  const mentioned: string[] = []
  const regex = /@(\w+)/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    const name = m[1].toLowerCase()
    const agent = agents.find((a) => a.name.toLowerCase() === name)
    if (agent) mentioned.push(agent.id)
  }
  return [...new Set(mentioned)]
}

// @file:filename → inject file contents as context block
async function resolveFileMentions(text: string): Promise<string> {
  const regex = /@file:([\w./\\-]+)/g
  const matches = [...text.matchAll(regex)]
  if (matches.length === 0) return text

  // Load connected repos once
  let repos: { id: string; name: string; path: string }[] = []
  try { repos = await window.electronAPI.repos.getAll() } catch { return text }
  if (repos.length === 0) return text

  let enriched = text
  for (const match of matches) {
    const query = match[1].split('/').pop() ?? match[1] // use basename for search
    // Search all repos for the file
    for (const repo of repos) {
      try {
        const results = await window.electronAPI.repos.findFile(repo.path, query)
        if (results.length > 0) {
          const filePath = (results[0] as { path: string }).path
          const fileResult = await window.electronAPI.repos.readFile(repo.path, filePath)
          if (fileResult && 'content' in fileResult) {
            const ext = filePath.split('.').pop() ?? ''
            const block = `\n\n[Context from @file:${match[1]}]\n\`\`\`${ext}\n${(fileResult as { content: string }).content.slice(0, 8000)}\n\`\`\``
            enriched = enriched.replace(match[0], `@file:${match[1]}${block}`)
            break
          }
        }
      } catch { /* file not found in this repo */ }
    }
  }
  return enriched
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
      <div
        className="flex items-center gap-2 px-3 flex-shrink-0"
        style={{ paddingTop: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {agent && <AgentAvatar agent={agent} size="sm" />}
        <span className="text-sm font-medium text-text-primary flex-1 truncate">{agent?.name ?? 'Unknown'}</span>
        {isStreaming && <i className="fa-solid fa-circle text-xs animate-pulse" style={{ color: 'var(--color-accent)' }} />}
        {isDone && <i className="fa-solid fa-circle-check text-xs" style={{ color: '#34d399' }} />}
        {!isStreaming && !isDone && content === '' && <i className="fa-regular fa-clock text-xs" style={{ color: '#64748b' }} />}
      </div>

      <div className="flex-1 overflow-y-auto p-3" style={{ minHeight: 140 }}>
        {content
          ? (
            <>
              <MarkdownRenderer content={content} />
              {isStreaming && <span className="inline-block w-0.5 h-[0.9em] bg-accent ml-0.5 align-middle animate-pulse" />}
            </>
          )
          : isStreaming
            ? <TypingDots />
            : <span className="text-xs" style={{ color: '#64748b' }}>Waiting…</span>}
      </div>

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

// ── Queue as Task modal ────────────────────────────────────────────────────
interface QueueTaskModalProps {
  content: string
  agentId: string | null
  onClose: () => void
}

function QueueTaskModal({ content, agentId, onClose }: QueueTaskModalProps): React.JSX.Element {
  const [title, setTitle] = useState(() => content.split('\n')[0].slice(0, 80))
  const [description, setDescription] = useState(content.slice(0, 1000))
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate(): Promise<void> {
    if (!title.trim()) return
    setSubmitting(true)
    await api.tasks.create({
      title: title.trim(),
      description: description.trim() || null,
      agent_id: agentId,
      status: 'queued',
    })
    toast.success('Task queued in Workshop')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-[480px] rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: 'rgba(20,20,35,0.95)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <i className="fa-solid fa-list-check" style={{ color: '#34d399' }} />
            Queue as Workshop Task
          </h3>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-xs"><i className="fa-solid fa-xmark" /></button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-text-muted">Task Title</label>
          <input
            className="input text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-text-muted">Description</label>
          <textarea
            className="input text-sm resize-none"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ lineHeight: 1.5 }}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || submitting}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-40"
          >
            {submitting ? <i className="fa-solid fa-spinner animate-spin mr-1.5" /> : null}
            Create Task
          </button>
        </div>
      </div>
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

  // ── Image state ───────────────────────────────────────────────────────────
  const [pendingImages, setPendingImages] = useState<ChatImage[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  // ── @-mention autocomplete ────────────────────────────────────────────────
  const [mentionMenu, setMentionMenu] = useState<{ partial: string; start: number } | null>(null)

  // ── Prompt templates ─────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [rewriting, setRewriting] = useState(false)

  // ── Conversation search ───────────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Queue as Task modal ───────────────────────────────────────────────────
  const [queueModal, setQueueModal] = useState<string | null>(null)

  // ── Filter toggle (all / bookmarked) ─────────────────────────────────────
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false)

  // Auto-clear broadcastSending when all agents have responded
  useEffect(() => {
    if (broadcastSending && broadcastSelected.length > 0 && broadcastDone.length >= broadcastSelected.length) {
      setBroadcastSending(false)
    }
  }, [broadcastDone.length, broadcastSelected.length, broadcastSending])

  // Load agents on mount
  useEffect(() => {
    api.agents.getAll().then((all) => {
      setAgents(all)
      if (all.length > 0) setSelectedAgent(all[0])
    })
  }, [])

  // Load history + templates when agent changes
  useEffect(() => {
    if (!selectedAgent) return
    api.chat.getMessages(selectedAgent.id).then(setMessages)
    api.prompts.getAll(selectedAgent.id).then(setTemplates)
  }, [selectedAgent?.id])

  // Wire streaming listeners
  useEffect(() => {
    api.chat.removeAllListeners()

    if (broadcastMode) {
      api.chat.onChunk(({ agentId, chunk }) => {
        setBroadcastStreams((prev) => ({ ...prev, [agentId]: (prev[agentId] ?? '') + chunk }))
      })
      api.chat.onDone(({ agentId, message }) => {
        setBroadcastStreams((prev) => ({ ...prev, [agentId]: (prev[agentId] ?? '') }))
        void message
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

  // Focus search input when opened
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    } else {
      setSearchQuery('')
    }
  }, [showSearch])

  // ── Normal chat handlers ─────────────────────────────────────────────────
  function handleAgentSwitch(agentId: string): void {
    const agent = agents.find((a) => a.id === agentId)
    if (!agent || agent.id === selectedAgent?.id) return
    api.chat.removeAllListeners()
    setStreamContent('')
    setStreaming(false)
    setMessages([])
    setPendingImages([])
    setSelectedAgent(agent)
  }

  async function handleAutoRewrite(): Promise<void> {
    if (!input.trim() || rewriting) return
    setRewriting(true)
    try {
      const improved = await api.prompts.autoRewrite(input)
      setInput(improved)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
        }
      }, 0)
    } catch {
      toast('Auto-rewrite failed', 'error')
    } finally {
      setRewriting(false)
    }
  }

  function handleInsertTemplate(template: PromptTemplate): void {
    setInput(template.content)
    setShowTemplates(false)
    api.prompts.incrementUsage(template.id)
    textareaRef.current?.focus()
  }

  async function handleSend(): Promise<void> {
    if ((!input.trim() && pendingImages.length === 0) || !selectedAgent || streaming) return
    // Resolve @file: mentions before sending
    const rawContent = input.trim() || '(Image attached)'
    const content = await resolveFileMentions(rawContent)
    const images = pendingImages.length > 0 ? [...pendingImages] : undefined

    // Parse @-mentions and build context
    const mentionedIds = parseMentions(input, agents)
    let mentionContexts: { agentName: string; messages: { role: string; content: string }[] }[] | undefined
    if (mentionedIds.length > 0) {
      const histories = await Promise.all(
        mentionedIds.map(async (id) => {
          const msgs = await api.chat.getMessages(id)
          const agent = agents.find((a) => a.id === id)
          return { agentName: agent?.name ?? id, messages: msgs.slice(-6) }
        })
      )
      mentionContexts = histories
    }

    setInput('')
    resetTextareaHeight()
    setPendingImages([])
    setMentionMenu(null)

    const tempMsg: Message = {
      id: `tmp-${Date.now()}`,
      agent_id: selectedAgent.id,
      role: 'user',
      content,
      bookmarked: 0,
      created_at: new Date().toISOString(),
      images,
    }
    setMessages((prev) => [...prev, tempMsg])
    setStreaming(true)
    setStreamContent('')

    api.chat.send(selectedAgent.id, content, images, mentionContexts)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    // Navigate mention menu with arrows / close with Escape
    if (mentionMenu) {
      if (e.key === 'Escape') { e.preventDefault(); setMentionMenu(null); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    const val = e.target.value
    setInput(val)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
    // Check for @-mention
    const info = getMentionInfo(val, e.target.selectionStart ?? val.length)
    setMentionMenu(info)
  }

  function insertMention(agentName: string): void {
    if (!mentionMenu || !textareaRef.current) return
    const before = input.slice(0, mentionMenu.start)
    const after = input.slice(textareaRef.current.selectionStart ?? input.length)
    setInput(`${before}@${agentName} ${after}`)
    setMentionMenu(null)
    setTimeout(() => textareaRef.current?.focus(), 0)
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
    await api.documents.create({ title, content, doc_type: 'recap', agent_id: selectedAgent.id })
    toast.success('Saved to Documents')
  }

  async function handleToggleBookmark(messageId: string): Promise<void> {
    const isNowBookmarked = await api.chat.toggleBookmark(messageId)
    setMessages((prev) =>
      prev.map((m) => m.id === messageId ? { ...m, bookmarked: isNowBookmarked ? 1 : 0 } : m)
    )
  }

  // ── Image paste / drop handlers ───────────────────────────────────────────
  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>): Promise<void> {
    const items = Array.from(e.clipboardData.items)
    const imageItems = items.filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    if (imageItems.length === 0) return

    const newImages: ChatImage[] = []
    for (const item of imageItems) {
      const file = item.getAsFile()
      if (!file) continue
      const img = await fileToImage(file)
      if (img) newImages.push(img)
    }
    if (newImages.length > 0) {
      e.preventDefault() // prevent pasting the file path as text
      setPendingImages((prev) => [...prev, ...newImages].slice(0, 4))
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    const newImages: ChatImage[] = []
    for (const file of files) {
      const img = await fileToImage(file)
      if (img) newImages.push(img)
    }
    if (newImages.length > 0) setPendingImages((prev) => [...prev, ...newImages].slice(0, 4))
  }, [])

  // ── Broadcast handlers ───────────────────────────────────────────────────
  function handleToggleBroadcast(): void {
    if (!broadcastMode) {
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
  }

  function toggleBroadcastAgent(agentId: string): void {
    setBroadcastSelected((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    )
  }

  // ── Filtered messages ─────────────────────────────────────────────────────
  const filteredMessages = useMemo(() => {
    let list = messages
    if (showBookmarksOnly) list = list.filter((m) => m.bookmarked === 1)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((m) => m.content.toLowerCase().includes(q))
    }
    return list
  }, [messages, showBookmarksOnly, searchQuery])

  // Mention autocomplete filtered list
  const mentionSuggestions = useMemo(() => {
    if (!mentionMenu) return []
    const partial = mentionMenu.partial.toLowerCase()
    return agents.filter((a) => a.name.toLowerCase().startsWith(partial) && a.id !== selectedAgent?.id)
  }, [mentionMenu, agents, selectedAgent?.id])

  // ── Derived ───────────────────────────────────────────────────────────────
  const showThread  = messages.length > 0 || streaming
  const hasMessages = messages.length > 0
  const bookmarkCount = messages.filter((m) => m.bookmarked === 1).length

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      data-testid="chat-page"
      className="flex flex-col h-full gap-4"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ background: 'rgba(129,140,248,0.12)', border: '2px dashed rgba(129,140,248,0.5)' }}
        >
          <div className="text-center">
            <i className="fa-solid fa-image text-3xl mb-2 block" style={{ color: 'var(--color-accent)' }} />
            <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>Drop image to attach</div>
          </div>
        </div>
      )}

      {/* Queue as Task modal */}
      {queueModal && (
        <QueueTaskModal
          content={queueModal}
          agentId={selectedAgent?.id ?? null}
          onClose={() => setQueueModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {selectedAgent && !broadcastMode && <AgentAvatar agent={selectedAgent} size="md" />}
          {broadcastMode && (
            <div
              className="flex-shrink-0 flex items-center justify-center"
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)' }}
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
          {!broadcastMode && hasMessages && (
            <ContextMeter messages={messages} streamContent={streamContent} />
          )}

          {/* Search toggle */}
          {!broadcastMode && hasMessages && (
            <button
              onClick={() => setShowSearch((v) => !v)}
              className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
              title="Search conversation (Ctrl+F)"
              style={{
                color: showSearch ? 'var(--color-accent)' : undefined,
                background: showSearch ? 'rgba(129,140,248,0.10)' : undefined,
              }}
            >
              <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 11 }} />
            </button>
          )}

          {/* Bookmark filter */}
          {!broadcastMode && bookmarkCount > 0 && (
            <button
              onClick={() => setShowBookmarksOnly((v) => !v)}
              className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
              title="Show bookmarked only"
              style={{
                color: showBookmarksOnly ? '#fbbf24' : undefined,
                background: showBookmarksOnly ? 'rgba(251,191,36,0.10)' : undefined,
              }}
            >
              <i className="fa-solid fa-bookmark" style={{ fontSize: 11 }} />
              {bookmarkCount}
            </button>
          )}

          {/* Agent switcher */}
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

      {/* Search bar */}
      {showSearch && !broadcastMode && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <i className="fa-solid fa-magnifying-glass text-xs" style={{ color: '#64748b' }} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowSearch(false) }}
            placeholder="Search messages…"
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
          {searchQuery && (
            <span className="text-xs text-text-muted">
              {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => setShowSearch(false)}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11 }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* ── Broadcast mode view ──────────────────────────────────────────── */}
      {broadcastMode ? (
        <div className="flex flex-col flex-1 min-h-0 gap-3">
          <div className="flex flex-wrap gap-2 flex-shrink-0" data-testid="broadcast-agent-chips">
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
                  {isSelected && <i className="fa-solid fa-check" style={{ fontSize: 9, marginLeft: 2 }} />}
                </button>
              )
            })}
          </div>

          <div className="flex-1 min-h-0 overflow-x-auto" data-testid="broadcast-columns">
            {broadcastSelected.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-text-muted">
                  <i className="fa-solid fa-satellite-dish text-2xl mb-3 block opacity-30" />
                  <div className="text-sm">Select at least one agent to broadcast to</div>
                </div>
              </div>
            ) : broadcastDone.length === 0 && !broadcastSending ? (
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
                {filteredMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    agent={msg.role === 'assistant' ? selectedAgent : null}
                    onQueueAsTask={(content) => setQueueModal(content)}
                    onToggleBookmark={handleToggleBookmark}
                    searchQuery={searchQuery}
                  />
                ))}
                {streaming && !searchQuery && !showBookmarksOnly && (
                  <StreamingBubble content={streamContent} agent={selectedAgent} />
                )}
                <div ref={bottomRef} />
              </div>
            ) : (
              <EmptyThread agent={selectedAgent} />
            )}
          </div>

          {/* Image preview strip */}
          {pendingImages.length > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {pendingImages.map((img, i) => (
                <div key={i} className="relative flex-shrink-0">
                  <img
                    src={img.preview}
                    alt="Pending image"
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.10)' }}
                  />
                  <button
                    onClick={() => setPendingImages((prev) => prev.filter((_, j) => j !== i))}
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      background: 'rgba(30,30,50,0.95)', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '50%', width: 18, height: 18, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#94a3b8', fontSize: 9,
                    }}
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              ))}
              <span className="text-xs text-text-muted ml-1">
                {pendingImages.length} image{pendingImages.length > 1 ? 's' : ''} attached
              </span>
            </div>
          )}

          {/* Input bar */}
          <div className="card flex-shrink-0 flex items-end gap-3 p-3 relative">
            {/* Templates dropdown */}
            {showTemplates && templates.length > 0 && (
              <div
                className="absolute bottom-full left-3 mb-2 rounded-xl overflow-hidden z-10"
                style={{
                  background: 'rgba(20,20,35,0.98)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  minWidth: 240,
                  maxWidth: 340,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <span className="text-xs font-semibold" style={{ color: '#64748b', letterSpacing: '0.05em' }}>PROMPT TEMPLATES</span>
                </div>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onMouseDown={(e) => { e.preventDefault(); handleInsertTemplate(t) }}
                    className="w-full flex flex-col gap-0.5 px-3 py-2.5 text-left transition-colors"
                    style={{ color: '#e2e8f0' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs truncate" style={{ color: '#64748b' }}>{t.content.slice(0, 60)}{t.content.length > 60 ? '…' : ''}</div>
                  </button>
                ))}
              </div>
            )}

            {/* @-mention autocomplete */}
            {mentionMenu && mentionSuggestions.length > 0 && (
              <div
                className="absolute bottom-full left-3 mb-2 rounded-xl overflow-hidden z-10"
                style={{
                  background: 'rgba(20,20,35,0.98)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  minWidth: 180,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                {mentionSuggestions.map((agent) => (
                  <button
                    key={agent.id}
                    onMouseDown={(e) => { e.preventDefault(); insertMention(agent.name) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors"
                    style={{ color: '#e2e8f0' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <AgentAvatar agent={agent} size="sm" />
                    <div>
                      <div className="font-medium" style={{ fontSize: 13 }}>{agent.name}</div>
                      <div className="text-xs" style={{ color: '#64748b' }}>{agent.operational_role ?? 'Agent'}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                selectedAgent
                  ? `Message ${selectedAgent.name}… (@ to mention, Cmd+V to paste image)`
                  : 'Select an agent…'
              }
              disabled={!selectedAgent || streaming}
              rows={1}
              className="input flex-1 resize-none leading-relaxed"
              style={{ minHeight: 40, maxHeight: 160, height: 40, paddingTop: 10, paddingBottom: 10 }}
            />
            {/* Toolbar: templates + auto-rewrite */}
            <div className="flex-shrink-0 flex items-center gap-1.5">
              {templates.length > 0 && (
                <button
                  onClick={() => setShowTemplates((v) => !v)}
                  title="Prompt templates"
                  style={{
                    height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: showTemplates ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${showTemplates ? 'rgba(129,140,248,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 8, cursor: 'pointer',
                    color: showTemplates ? 'var(--color-accent)' : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.15s',
                  }}
                >
                  <i className="fa-solid fa-layer-group" style={{ fontSize: 11 }} />
                </button>
              )}
              {input.trim().length > 8 && (
                <button
                  onClick={handleAutoRewrite}
                  disabled={rewriting || !selectedAgent}
                  title="Improve prompt with AI"
                  style={{
                    height: 32, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
                    fontSize: 11, transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                >
                  {rewriting
                    ? <i className="fa-solid fa-spinner animate-spin" style={{ fontSize: 10 }} />
                    : <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 10 }} />}
                  {rewriting ? 'Improving…' : 'Improve'}
                </button>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={(!input.trim() && pendingImages.length === 0) || !selectedAgent || streaming}
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
