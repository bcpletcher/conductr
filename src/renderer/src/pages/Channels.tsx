import { useEffect, useState, useCallback } from 'react'
import type { OpenClawStatus, OpenClawChannel } from '../env.d'
import { getAgentColor, getAgentTitle, AGENT_TITLES } from '../assets/agents'

const api = window.electronAPI

// ── Channel type config ────────────────────────────────────────────────────

const CHANNEL_TYPES: Array<{
  id: string
  label: string
  icon: string
  color: string
  fields: Array<{ key: string; label: string; placeholder: string; secret?: boolean }>
}> = [
  {
    id: 'telegram',
    label: 'Telegram',
    icon: 'fa-brands fa-telegram',
    color: '#2AABEE',
    fields: [{ key: 'bot_token', label: 'Bot Token', placeholder: '1234567890:ABCdef...', secret: true }],
  },
  {
    id: 'slack',
    label: 'Slack',
    icon: 'fa-brands fa-slack',
    color: '#4A154B',
    fields: [
      { key: 'bot_token', label: 'Bot Token', placeholder: 'xoxb-...', secret: true },
      { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/...' },
    ],
  },
  {
    id: 'discord',
    label: 'Discord',
    icon: 'fa-brands fa-discord',
    color: '#5865F2',
    fields: [
      { key: 'bot_token', label: 'Bot Token', placeholder: 'MTI3...', secret: true },
      { key: 'guild_id', label: 'Guild ID', placeholder: '1234567890' },
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: 'fa-brands fa-whatsapp',
    color: '#25D366',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'Coming in Phase 16', secret: true }],
  },
  {
    id: 'imessage',
    label: 'iMessage',
    icon: 'fa-solid fa-comment-dots',
    color: '#34d399',
    fields: [{ key: 'apple_id', label: 'Apple ID', placeholder: 'Coming in Phase 16' }],
  },
  {
    id: 'email',
    label: 'Email',
    icon: 'fa-solid fa-envelope',
    color: '#f97316',
    fields: [
      { key: 'smtp_host', label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
      { key: 'smtp_user', label: 'Username', placeholder: 'you@gmail.com' },
      { key: 'smtp_pass', label: 'Password / App Key', placeholder: '••••••••', secret: true },
    ],
  },
]

function getChannelType(typeId: string) {
  return CHANNEL_TYPES.find((t) => t.id === typeId) ?? CHANNEL_TYPES[0]
}

// ── Reusable sub-components ────────────────────────────────────────────────

function SectionLabel({ icon, children }: { icon: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      <i className={icon} style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }} />
      <span style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'rgba(255,255,255,0.40)',
      }}>
        {children}
      </span>
    </div>
  )
}

// ── Gateway Status Tab ─────────────────────────────────────────────────────

function GatewayTab({ onStatusChange }: { onStatusChange: (s: OpenClawStatus) => void }): React.JSX.Element {
  const [status, setStatus]     = useState<OpenClawStatus | null>(null)
  const [loading, setLoading]   = useState(true)
  const [working, setWorking]   = useState(false)

  const refresh = useCallback(async () => {
    try {
      const s = await api.openclaw.getStatus()
      setStatus(s)
      onStatusChange(s)
    } catch {
      setStatus({ installed: false, running: false, error: 'Failed to check status' })
    } finally {
      setLoading(false)
    }
  }, [onStatusChange])

  useEffect(() => {
    refresh()
    api.openclaw.onStatusChange((s) => {
      setStatus(s)
      onStatusChange(s)
    })
    return () => { api.openclaw.removeStatusListener() }
  }, [refresh, onStatusChange])

  async function handleStart(): Promise<void> {
    setWorking(true)
    try { await api.openclaw.start() } finally { setWorking(false); refresh() }
  }

  async function handleRestart(): Promise<void> {
    setWorking(true)
    try { await api.openclaw.restart() } finally { setWorking(false); refresh() }
  }

  async function handleStop(): Promise<void> {
    setWorking(true)
    try { await api.openclaw.stop() } finally { setWorking(false); refresh() }
  }

  async function handleInstall(): Promise<void> {
    await api.openclaw.install()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.45)' }}>
        <i className="fa-solid fa-spinner animate-spin" style={{ marginRight: 8 }} />
        Checking Gateway status…
      </div>
    )
  }

  const statusColor  = status?.running ? '#34d399' : status?.installed ? '#fbbf24' : '#f87171'
  const statusLabel  = status?.running ? 'Running' : status?.installed ? 'Stopped' : 'Not Installed'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Main status card */}
      <div style={{
        padding: '20px 24px', borderRadius: 14,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${statusColor}22`,
        borderTop: `2px solid ${statusColor}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${statusColor}14`,
              border: `1px solid ${statusColor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fa-solid fa-tower-broadcast" style={{ fontSize: 18, color: statusColor }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.01em' }}>
                OpenClaw Gateway
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: statusColor,
                  ...(status?.running ? { boxShadow: `0 0 6px ${statusColor}` } : {}),
                }} />
                <span style={{ fontSize: 12, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
                {status?.version && (
                  <span style={{
                    fontSize: 10, color: 'rgba(255,255,255,0.35)',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 5, padding: '1px 6px',
                  }}>
                    v{status.version}
                  </span>
                )}
                {status?.pid && (
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>
                    PID {status.pid}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {!status?.installed && (
              <button
                onClick={handleInstall}
                style={{
                  padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: '#818cf8', border: 'none', color: '#fff',
                }}
              >
                <i className="fa-solid fa-download mr-1.5" />Install OpenClaw
              </button>
            )}
            {status?.installed && !status.running && (
              <button
                onClick={handleStart}
                disabled={working}
                style={{
                  padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399',
                  opacity: working ? 0.5 : 1,
                }}
              >
                <i className="fa-solid fa-play mr-1.5" />{working ? 'Starting…' : 'Start'}
              </button>
            )}
            {status?.running && (
              <>
                <button
                  onClick={handleRestart}
                  disabled={working}
                  style={{
                    padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.70)',
                    opacity: working ? 0.5 : 1,
                  }}
                >
                  <i className="fa-solid fa-rotate mr-1.5" />{working ? 'Restarting…' : 'Restart'}
                </button>
                <button
                  onClick={handleStop}
                  disabled={working}
                  style={{
                    padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171',
                    opacity: working ? 0.5 : 1,
                  }}
                >
                  <i className="fa-solid fa-stop mr-1.5" />{working ? 'Stopping…' : 'Stop'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info rows */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'WebSocket', value: 'ws://127.0.0.1:18789', icon: 'fa-solid fa-plug' },
            { label: 'Health', value: 'http://127.0.0.1:18789/health', icon: 'fa-solid fa-heart-pulse' },
          ].map((row) => (
            <div key={row.label} style={{
              padding: '10px 14px', borderRadius: 9,
              background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <i className={row.icon} style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)' }} />
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)' }}>
                  {row.label}
                </span>
              </div>
              <code style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>
                {row.value}
              </code>
            </div>
          ))}
        </div>

        {status?.error && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)', fontSize: 12, color: '#f87171' }}>
            <i className="fa-solid fa-circle-exclamation mr-1.5" />{status.error}
          </div>
        )}
      </div>

      {/* Install guide */}
      {!status?.installed && (
        <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(129,140,248,0.05)', border: '1px solid rgba(129,140,248,0.15)' }}>
          <SectionLabel icon="fa-solid fa-terminal">Install OpenClaw</SectionLabel>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 12 }}>
            OpenClaw Gateway is a personal AI assistant platform. Install it globally via npm to enable messaging channels, browser control, and skill automation.
          </p>
          <code style={{
            display: 'block', padding: '10px 14px', borderRadius: 8,
            background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 12, color: '#818cf8', fontFamily: 'monospace',
          }}>
            npm install -g openclaw &amp;&amp; openclaw onboard
          </code>
        </div>
      )}
    </div>
  )
}

// ── Channels Tab ───────────────────────────────────────────────────────────

const AGENT_LIST = Object.entries(AGENT_TITLES).map(([id, title]) => ({ id, title }))

function ChannelsTab({ gatewayRunning }: { gatewayRunning: boolean }): React.JSX.Element {
  const [channels, setChannels] = useState<OpenClawChannel[]>([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [testing, setTesting]   = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; error?: string }>>({})

  // Add form state
  const [form, setForm] = useState({
    name: '',
    type: 'telegram',
    config: {} as Record<string, string>,
    routing_agent_id: 'agent-courier',
  })
  const [adding, setAdding]   = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    api.openclaw.listChannels().then((list) => {
      setChannels(list)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleAdd(): Promise<void> {
    if (!form.name.trim()) { setAddError('Name is required'); return }
    setAdding(true); setAddError('')
    try {
      const ch = await api.openclaw.addChannel({
        name: form.name.trim(),
        type: form.type,
        config: form.config,
        routing_agent_id: form.routing_agent_id,
      })
      setChannels((prev) => [...prev, ch])
      setShowAdd(false)
      setForm({ name: '', type: 'telegram', config: {}, routing_agent_id: 'agent-courier' })
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add channel')
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(ch: OpenClawChannel): Promise<void> {
    const updated = await api.openclaw.updateChannel(ch.id, { enabled: !ch.enabled })
    setChannels((prev) => prev.map((c) => c.id === ch.id ? updated : c))
  }

  async function handleRemove(id: string): Promise<void> {
    await api.openclaw.removeChannel(id)
    setChannels((prev) => prev.filter((c) => c.id !== id))
  }

  async function handleTest(id: string): Promise<void> {
    setTesting(id)
    try {
      const result = await api.openclaw.testChannel(id)
      setTestResult((prev) => ({ ...prev, [id]: result }))
      setTimeout(() => setTestResult((prev) => { const n = { ...prev }; delete n[id]; return n }), 4000)
    } finally {
      setTesting(null)
    }
  }

  const selectedType = getChannelType(form.type)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#eef0f8' }}>Intelligence Channels</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>
            Connect messaging platforms to route inbound messages to agents
          </div>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          style={{
            padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.28)', color: '#818cf8',
          }}
        >
          <i className="fa-solid fa-plus mr-1.5" />Add Channel
        </button>
      </div>

      {/* Add channel form */}
      {showAdd && (
        <div style={{
          padding: '16px 18px', borderRadius: 12,
          background: 'rgba(129,140,248,0.04)',
          border: '1px solid rgba(129,140,248,0.18)',
        }}>
          <SectionLabel icon="fa-solid fa-plus">New Channel</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {/* Type selector */}
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', display: 'block', marginBottom: 4 }}>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, config: {} }))}
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'rgba(255,255,255,0.80)', outline: 'none', cursor: 'pointer',
                }}
              >
                {CHANNEL_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            {/* Name */}
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', display: 'block', marginBottom: 4 }}>Display Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={`e.g. ${selectedType.label} Bot`}
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'rgba(255,255,255,0.80)', outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Dynamic config fields */}
          {selectedType.fields.map((field) => (
            <div key={field.key} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', display: 'block', marginBottom: 4 }}>{field.label}</label>
              <input
                type={field.secret ? 'password' : 'text'}
                value={form.config[field.key] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, [field.key]: e.target.value } }))}
                placeholder={field.placeholder}
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'rgba(255,255,255,0.80)', outline: 'none',
                }}
              />
            </div>
          ))}

          {/* Routing agent */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', display: 'block', marginBottom: 4 }}>Route to Agent</label>
            <select
              value={form.routing_agent_id}
              onChange={(e) => setForm((f) => ({ ...f, routing_agent_id: e.target.value }))}
              style={{
                width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'rgba(255,255,255,0.80)', outline: 'none', cursor: 'pointer',
              }}
            >
              {AGENT_LIST.map((a) => (
                <option key={a.id} value={a.id}>{a.title.split(' ')[0]} — {a.title}</option>
              ))}
            </select>
          </div>

          {addError && (
            <div style={{ fontSize: 12, color: '#f87171', marginBottom: 8 }}>{addError}</div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAdd}
              disabled={adding}
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: '#818cf8', border: 'none', color: '#fff', opacity: adding ? 0.6 : 1,
              }}
            >
              {adding ? 'Adding…' : 'Add Channel'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddError('') }}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Channel list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.45)' }}>
          <i className="fa-solid fa-spinner animate-spin" style={{ marginRight: 6 }} />Loading channels…
        </div>
      ) : channels.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '52px 20px', gap: 10,
          background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.08)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="fa-solid fa-tower-broadcast" style={{ fontSize: 20, color: 'rgba(255,255,255,0.32)' }} />
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>No channels configured</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>Add your first channel to start receiving messages</div>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              marginTop: 4, padding: '7px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.28)', color: '#818cf8',
            }}
          >
            <i className="fa-solid fa-plus mr-1.5" />Add Channel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {channels.map((ch) => {
            const ct      = getChannelType(ch.type)
            const agent   = ch.routing_agent_id
            const aColor  = getAgentColor(agent)
            const aTitle  = getAgentTitle(agent) || agent
            const tr      = testResult[ch.id]
            const isTesting = testing === ch.id

            return (
              <div
                key={ch.id}
                style={{
                  padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${ch.enabled ? `${ct.color}20` : 'rgba(255,255,255,0.06)'}`,
                  opacity: ch.enabled ? 1 : 0.55,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Channel type icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${ct.color}14`,
                    border: `1px solid ${ct.color}28`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className={ct.icon} style={{ fontSize: 14, color: ct.color }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#eef0f8' }}>{ch.name}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                        padding: '1px 6px', borderRadius: 5,
                        background: `${ct.color}14`, border: `1px solid ${ct.color}28`, color: ct.color,
                      }}>
                        {ct.label}
                      </span>
                      {/* Gateway-running dot */}
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                        background: ch.enabled && gatewayRunning ? '#34d399' : 'rgba(255,255,255,0.20)',
                        ...(ch.enabled && gatewayRunning ? { boxShadow: '0 0 5px #34d399' } : {}),
                      }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <i className="fa-solid fa-arrow-right" style={{ fontSize: 8, color: 'rgba(255,255,255,0.30)' }} />
                      <span style={{
                        fontSize: 10, color: aColor, fontWeight: 600,
                        padding: '1px 6px', borderRadius: 5,
                        background: `${aColor}12`, border: `1px solid ${aColor}25`,
                      }}>
                        {aTitle.split(' — ')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {tr && (
                      <span style={{ fontSize: 11, color: tr.ok ? '#34d399' : '#f87171', fontWeight: 600 }}>
                        {tr.ok ? '✓ OK' : `✗ ${tr.error ?? 'Error'}`}
                      </span>
                    )}
                    <button
                      onClick={() => handleTest(ch.id)}
                      disabled={isTesting}
                      title="Test connection"
                      style={{
                        padding: '5px 10px', borderRadius: 7, fontSize: 11, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
                        color: 'rgba(255,255,255,0.55)', opacity: isTesting ? 0.5 : 1,
                      }}
                    >
                      {isTesting ? <i className="fa-solid fa-spinner animate-spin" /> : 'Test'}
                    </button>
                    {/* Enable toggle */}
                    <button
                      onClick={() => handleToggle(ch)}
                      title={ch.enabled ? 'Disable' : 'Enable'}
                      style={{
                        width: 32, height: 18, borderRadius: 9, cursor: 'pointer', border: 'none',
                        background: ch.enabled ? '#34d399' : 'rgba(255,255,255,0.12)',
                        position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: 2,
                        left: ch.enabled ? 16 : 2,
                        width: 14, height: 14, borderRadius: '50%',
                        background: '#fff', transition: 'left 0.2s',
                      }} />
                    </button>
                    <button
                      onClick={() => handleRemove(ch.id)}
                      title="Remove channel"
                      style={{
                        width: 28, height: 28, borderRadius: 7, cursor: 'pointer', border: 'none',
                        background: 'none', color: 'rgba(255,255,255,0.30)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f87171' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.30)' }}
                    >
                      <i className="fa-solid fa-trash-can" style={{ fontSize: 11 }} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Skills Tab (ClawHub) ───────────────────────────────────────────────────

function SkillsTab({ gatewayRunning }: { gatewayRunning: boolean }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#eef0f8' }}>ClawHub Skills</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>
            Browse and install automation skills from the ClawHub registry
          </div>
        </div>
        <button
          disabled={!gatewayRunning}
          title={gatewayRunning ? 'Browse ClawHub' : 'Start Gateway first'}
          style={{
            padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600,
            background: gatewayRunning ? 'rgba(129,140,248,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${gatewayRunning ? 'rgba(129,140,248,0.28)' : 'rgba(255,255,255,0.10)'}`,
            color: gatewayRunning ? '#818cf8' : 'rgba(255,255,255,0.30)',
            cursor: gatewayRunning ? 'pointer' : 'not-allowed',
          }}
        >
          <i className="fa-solid fa-store mr-1.5" />Browse ClawHub
        </button>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '52px 20px', gap: 12,
        background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.08)',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="fa-solid fa-puzzle-piece" style={{ fontSize: 20, color: 'rgba(255,255,255,0.32)' }} />
        </div>
        {gatewayRunning ? (
          <>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>No skills installed</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>Browse ClawHub to install automation skills</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>Gateway offline</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>Start the Gateway on the Gateway tab to browse skills</div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Channels page ─────────────────────────────────────────────────────

type ChannelsTab = 'gateway' | 'channels' | 'skills'

export default function Channels(): React.JSX.Element {
  const [activeTab, setActiveTab]         = useState<ChannelsTab>('gateway')
  const [gatewayRunning, setGatewayRunning] = useState(false)

  const handleStatusChange = useCallback((s: OpenClawStatus) => {
    setGatewayRunning(s.running)
  }, [])

  const TABS: Array<{ id: ChannelsTab; label: string; icon: string }> = [
    { id: 'gateway',  label: 'Gateway',  icon: 'fa-solid fa-tower-broadcast' },
    { id: 'channels', label: 'Channels', icon: 'fa-solid fa-comments' },
    { id: 'skills',   label: 'Skills',   icon: 'fa-solid fa-puzzle-piece' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Page header */}
      <div style={{ flexShrink: 0, paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.03em' }}>
              Channels
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.36)', marginTop: 2 }}>
              OpenClaw Gateway + messaging channels + ClawHub skills
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: gatewayRunning ? '#34d399' : 'rgba(255,255,255,0.20)',
              ...(gatewayRunning ? { boxShadow: '0 0 8px rgba(52,211,153,0.9)' } : {}),
            }} />
            <span style={{ fontSize: 12, color: gatewayRunning ? '#34d399' : 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
              Gateway {gatewayRunning ? 'running' : 'offline'}
            </span>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 3, marginTop: 14, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: '10px 10px 0 0',
                  border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 600 : 500,
                  background: isActive ? 'rgba(129,140,248,0.08)' : 'transparent',
                  color: isActive ? '#818cf8' : 'rgba(255,255,255,0.45)',
                  borderBottom: isActive ? '2px solid #818cf8' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <i className={tab.icon} style={{ fontSize: 11 }} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 24 }}>
        {activeTab === 'gateway' && (
          <GatewayTab onStatusChange={handleStatusChange} />
        )}
        {activeTab === 'channels' && (
          <ChannelsTab gatewayRunning={gatewayRunning} />
        )}
        {activeTab === 'skills' && (
          <SkillsTab gatewayRunning={gatewayRunning} />
        )}
      </div>
    </div>
  )
}
