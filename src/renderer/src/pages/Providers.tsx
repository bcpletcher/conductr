import { useState, useEffect, useRef } from 'react'

type ProviderName = 'anthropic' | 'openrouter' | 'openai' | 'groq' | 'ollama'

interface ProviderMeta {
  label: string
  icon: string
  color: string
  description: string
  keyPrefix: string
  keyPlaceholder: string
  docsNote: string
}

interface ProviderStatus {
  configured: boolean
  maskedKey?: string
}

interface OllamaStatus {
  running: boolean
  modelCount: number
}

interface OllamaModel {
  id: string
  name: string
  size?: number
}

interface PullProgress {
  model: string
  status: string
  completed?: number
  total?: number
  error?: string
}

interface ModelInfo {
  id: string
  name: string
  provider: string
  isFree: boolean
  description?: string
  contextWindow: number
  inputCostPer1k: number
  outputCostPer1k: number
  recommended?: boolean
}

const PROVIDER_ORDER: ProviderName[] = ['openrouter', 'anthropic', 'openai', 'groq', 'ollama']

const OLLAMA_SUGGESTIONS = [
  { id: 'llama3.2:3b',       name: 'Llama 3.2 3B',       size: '~2 GB',  description: 'Fast, lightweight. Best starting point.' },
  { id: 'llama3.3:latest',   name: 'Llama 3.3 70B',       size: '~40 GB', description: 'Powerful local model. Requires 32GB+ RAM.' },
  { id: 'deepseek-coder:6.7b', name: 'DeepSeek Coder 6.7B', size: '~4 GB',  description: 'Code-focused. Great for Forge.' },
  { id: 'mistral:latest',    name: 'Mistral 7B',          size: '~4 GB',  description: 'Efficient general-purpose model.' },
  { id: 'phi4:latest',       name: 'Phi-4',               size: '~8 GB',  description: 'Surprisingly capable small model.' },
]

function formatBytes(bytes?: number): string {
  if (!bytes) return ''
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(0)} MB`
}

// ── Provider Card ─────────────────────────────────────────────────────────────
function ProviderCard({
  name,
  meta,
  status,
  onSave,
  onRemove,
  onTest,
}: {
  name: ProviderName
  meta: ProviderMeta
  status: ProviderStatus
  onSave: (key: string) => Promise<void>
  onRemove: () => Promise<void>
  onTest: (key: string) => Promise<{ ok: boolean; error?: string; modelCount?: number }>
}) {
  const [editing, setEditing]     = useState(false)
  const [keyInput, setKeyInput]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [testing, setTesting]     = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string; modelCount?: number } | null>(null)
  const [showKey, setShowKey]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 50)
  }, [editing])

  async function handleSave(): Promise<void> {
    if (!keyInput.trim()) return
    setSaving(true)
    try {
      // Test first
      setTesting(true)
      const result = await onTest(keyInput.trim())
      setTestResult(result)
      setTesting(false)
      if (!result.ok) { setSaving(false); return }
      await onSave(keyInput.trim())
      setEditing(false)
      setKeyInput('')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest(): Promise<void> {
    if (!keyInput.trim()) return
    setTesting(true)
    const result = await onTest(keyInput.trim())
    setTestResult(result)
    setTesting(false)
  }

  const isConfigured = status.configured
  const cardBorder = isConfigured
    ? `1px solid ${meta.color}40`
    : '1px solid rgba(255,255,255,0.06)'

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: cardBorder,
        borderRadius: 16,
        padding: '20px 22px',
        marginBottom: 12,
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        {/* Icon */}
        <div
          style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: `${meta.color}18`,
            border: `1px solid ${meta.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <i className={meta.icon} style={{ fontSize: 15, color: meta.color }} />
        </div>

        {/* Name + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.02em' }}>
              {meta.label}
            </span>
            {isConfigured && (
              <span
                style={{
                  padding: '2px 7px', borderRadius: 20,
                  background: 'rgba(52,211,153,0.12)',
                  border: '1px solid rgba(52,211,153,0.30)',
                  fontSize: 10, fontWeight: 700, color: '#34d399',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                }}
              >
                Connected
              </span>
            )}
          </div>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>
            {meta.description}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {name !== 'ollama' && (
            <>
              {isConfigured && !editing && (
                <button
                  onClick={() => { setEditing(true); setTestResult(null) }}
                  style={{
                    padding: '5px 10px', borderRadius: 7,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'rgba(255,255,255,0.55)', fontSize: 11, cursor: 'pointer',
                  }}
                >
                  Change Key
                </button>
              )}
              {isConfigured && !editing && (
                <button
                  onClick={onRemove}
                  style={{
                    padding: '5px 10px', borderRadius: 7,
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.20)',
                    color: '#f87171', fontSize: 11, cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              )}
              {!isConfigured && !editing && (
                <button
                  onClick={() => { setEditing(true); setTestResult(null) }}
                  style={{
                    padding: '6px 14px', borderRadius: 8,
                    background: `linear-gradient(135deg, ${meta.color}cc, ${meta.color}99)`,
                    border: 'none',
                    color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    boxShadow: `0 2px 10px ${meta.color}30`,
                  }}
                >
                  Connect
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Masked key display */}
      {isConfigured && status.maskedKey && !editing && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 10,
          }}
        >
          <i className="fa-solid fa-key" style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace' }}>
            {status.maskedKey}
          </span>
        </div>
      )}

      {/* Key entry form */}
      {editing && (
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 8,
              background: `${meta.color}0a`,
              border: `1px solid ${meta.color}20`,
              fontSize: 12, color: 'rgba(255,255,255,0.50)', lineHeight: 1.5,
            }}
          >
            <i className="fa-solid fa-circle-info" style={{ color: meta.color, marginRight: 6 }} />
            {meta.docsNote}
          </div>

          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input
              ref={inputRef}
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); setTestResult(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={meta.keyPlaceholder}
              style={{
                width: '100%', padding: '10px 40px 10px 12px',
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${testResult ? (testResult.ok ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)') : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 8, outline: 'none',
                color: '#eef0f8', fontSize: 13, fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = `${meta.color}80`)}
              onBlur={(e) => {
                if (!testResult) e.target.style.borderColor = 'rgba(255,255,255,0.12)'
              }}
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.35)', padding: 2,
              }}
            >
              <i className={`fa-regular fa-${showKey ? 'eye-slash' : 'eye'}`} style={{ fontSize: 12 }} />
            </button>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              style={{
                padding: '7px 10px', borderRadius: 7, marginBottom: 8,
                background: testResult.ok ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
                border: `1px solid ${testResult.ok ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
                display: 'flex', alignItems: 'center', gap: 7, fontSize: 12,
                color: testResult.ok ? '#34d399' : '#f87171',
              }}
            >
              <i className={`fa-solid fa-${testResult.ok ? 'circle-check' : 'circle-xmark'}`} />
              {testResult.ok
                ? `Connected${testResult.modelCount ? ` — ${testResult.modelCount} models available` : ''}`
                : testResult.error ?? 'Connection failed'}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleTest}
              disabled={testing || !keyInput.trim()}
              style={{
                padding: '8px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: testing ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.65)',
                fontSize: 12, cursor: testing || !keyInput.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {testing ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 5 }} />Testing…</> : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !keyInput.trim()}
              style={{
                flex: 1, padding: '8px 14px', borderRadius: 8,
                background: saving || !keyInput.trim()
                  ? `${meta.color}40`
                  : `linear-gradient(135deg, ${meta.color}cc, ${meta.color}99)`,
                border: 'none',
                color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: saving || !keyInput.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 5 }} />Saving…</> : 'Save & Connect'}
            </button>
            <button
              onClick={() => { setEditing(false); setKeyInput(''); setTestResult(null) }}
              style={{
                padding: '8px 10px', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.40)', fontSize: 12, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Ollama Section ────────────────────────────────────────────────────────────
function OllamaSection({ meta }: { meta: ProviderMeta }) {
  const [status, setStatus]           = useState<OllamaStatus | null>(null)
  const [models, setModels]           = useState<OllamaModel[]>([])
  const [detecting, setDetecting]     = useState(false)
  const [pulling, setPulling]         = useState<string | null>(null)
  const [pullProgress, setPullProgress] = useState<PullProgress | null>(null)

  useEffect(() => {
    detect()
    // Listen for pull progress
    window.electronAPI.providers.onPullProgress((data) => {
      setPullProgress(data)
      if (data.status === 'done') {
        setPulling(null)
        setPullProgress(null)
        loadModels()
      } else if (data.status === 'error') {
        setPulling(null)
      }
    })
    return () => window.electronAPI.providers.removePullProgressListener()
  }, [])

  async function detect(): Promise<void> {
    setDetecting(true)
    const result = await window.electronAPI.providers.detectOllama().catch(() => ({ running: false, modelCount: 0 })) as OllamaStatus
    setStatus(result)
    setDetecting(false)
    if (result.running) loadModels()
  }

  async function loadModels(): Promise<void> {
    const list = await window.electronAPI.providers.getOllamaModels().catch(() => []) as OllamaModel[]
    setModels(list)
  }

  async function handlePull(modelId: string): Promise<void> {
    setPulling(modelId)
    setPullProgress({ model: modelId, status: 'Starting…' })
    window.electronAPI.providers.pullOllamaModel(modelId)
  }

  async function handleDelete(modelId: string): Promise<void> {
    await window.electronAPI.providers.deleteOllamaModel(modelId)
    loadModels()
  }

  const pullPercent = pullProgress?.total
    ? Math.round(((pullProgress.completed ?? 0) / pullProgress.total) * 100)
    : null

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: status?.running ? `1px solid ${meta.color}40` : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16, padding: '20px 22px', marginBottom: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: `${meta.color}18`, border: `1px solid ${meta.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <i className={meta.icon} style={{ fontSize: 15, color: meta.color }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.02em' }}>
              {meta.label}
            </span>
            {status?.running && (
              <span
                style={{
                  padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  color: '#34d399', letterSpacing: '0.05em', textTransform: 'uppercase',
                  background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.30)',
                }}
              >
                Running
              </span>
            )}
            {status && !status.running && (
              <span
                style={{
                  padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  color: '#f87171', letterSpacing: '0.05em', textTransform: 'uppercase',
                  background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)',
                }}
              >
                Not Running
              </span>
            )}
          </div>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>
            {meta.description}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={detect}
            disabled={detecting}
            style={{
              padding: '5px 10px', borderRadius: 7, fontSize: 11, cursor: detecting ? 'not-allowed' : 'pointer',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            {detecting ? <i className="fa-solid fa-spinner fa-spin" /> : 'Detect'}
          </button>
          {(!status || !status.running) && (
            <button
              onClick={() => window.electronAPI.providers.installOllama()}
              style={{
                padding: '6px 14px', borderRadius: 8,
                background: `linear-gradient(135deg, ${meta.color}cc, ${meta.color}99)`,
                border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Install Ollama
            </button>
          )}
        </div>
      </div>

      {/* Not installed guide */}
      {status && !status.running && (
        <div
          style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 16,
            background: `${meta.color}08`, border: `1px solid ${meta.color}18`,
          }}
        >
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
            <strong style={{ color: meta.color }}>How to get Ollama running:</strong>
            <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              <li>Click <strong>Install Ollama</strong> above — it opens the download page in your browser</li>
              <li>Download and run the installer for your platform</li>
              <li>Ollama starts automatically after installation</li>
              <li>Click <strong>Detect</strong> to confirm it's running</li>
            </ol>
          </div>
        </div>
      )}

      {/* Installed models */}
      {status?.running && (
        <>
          {models.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
                Installed Models
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {models.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <i className="fa-solid fa-cube" style={{ fontSize: 10, color: meta.color }} />
                    <span style={{ flex: 1, fontSize: 13, color: '#dde2f0', fontFamily: 'monospace' }}>{m.name}</span>
                    {m.size && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>{formatBytes(m.size)}</span>}
                    <button
                      onClick={() => handleDelete(m.id)}
                      style={{
                        padding: '3px 8px', borderRadius: 5,
                        background: 'rgba(248,113,113,0.08)',
                        border: '1px solid rgba(248,113,113,0.20)',
                        color: '#f87171', fontSize: 10, cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pull progress */}
          {pulling && pullProgress && (
            <div
              style={{
                padding: '10px 12px', borderRadius: 8, marginBottom: 12,
                background: `${meta.color}08`, border: `1px solid ${meta.color}20`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: meta.color, fontWeight: 600 }}>
                  Pulling {pulling}…
                </span>
                {pullPercent !== null && (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{pullPercent}%</span>
                )}
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                <div
                  style={{
                    height: '100%', borderRadius: 2,
                    background: meta.color,
                    width: pullPercent !== null ? `${pullPercent}%` : '60%',
                    transition: 'width 0.3s ease',
                    ...(pullPercent === null && { animation: 'pulse 1.5s ease-in-out infinite' }),
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                {pullProgress.status}
              </div>
            </div>
          )}

          {/* Model suggestions */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
              Add Models
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {OLLAMA_SUGGESTIONS.filter((s) => !models.find((m) => m.id === s.id)).map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <i className="fa-solid fa-cloud-arrow-down" style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#dde2f0' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                      {s.size} · {s.description}
                    </div>
                  </div>
                  <button
                    onClick={() => handlePull(s.id)}
                    disabled={Boolean(pulling)}
                    style={{
                      padding: '5px 10px', borderRadius: 7, fontSize: 11,
                      background: pulling ? 'rgba(255,255,255,0.04)' : `${meta.color}18`,
                      border: `1px solid ${pulling ? 'rgba(255,255,255,0.06)' : meta.color + '35'}`,
                      color: pulling ? 'rgba(255,255,255,0.25)' : meta.color,
                      cursor: pulling ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Pull
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Providers Page ───────────────────────────────────────────────────────
export default function Providers(): React.JSX.Element {
  const [status, setStatus]   = useState<Record<string, ProviderStatus>>({})
  const [meta, setMeta]       = useState<Record<string, ProviderMeta>>({})
  const [globalDefault, setGlobalDefault] = useState<{ provider: string | null; model: string | null }>({ provider: null, model: null })
  const [models, setModels]   = useState<ModelInfo[]>([])

  useEffect(() => {
    load()
  }, [])

  async function load(): Promise<void> {
    const [s, m, gd, mdls] = await Promise.all([
      window.electronAPI.providers.getStatus().catch(() => ({})),
      window.electronAPI.providers.getMeta().catch(() => ({})),
      window.electronAPI.providers.getGlobalDefault().catch(() => ({ provider: null, model: null })),
      window.electronAPI.providers.getModels().catch(() => []),
    ]) as [Record<string, ProviderStatus>, Record<string, ProviderMeta>, { provider: string | null; model: string | null }, ModelInfo[]]
    setStatus(s)
    setMeta(m)
    setGlobalDefault(gd)
    setModels(mdls)
  }

  async function handleSaveKey(provider: string, key: string): Promise<void> {
    await window.electronAPI.providers.setKey(provider, key)
    load()
  }

  async function handleRemoveKey(provider: string): Promise<void> {
    await window.electronAPI.providers.removeKey(provider)
    load()
  }

  async function handleTest(provider: string, key: string): Promise<{ ok: boolean; error?: string; modelCount?: number }> {
    return window.electronAPI.providers.testConnection(provider, key) as Promise<{ ok: boolean; error?: string; modelCount?: number }>
  }

  const configuredCount = PROVIDER_ORDER.filter(
    (p) => p === 'ollama' || status[p]?.configured
  ).length

  const freeModels = models.filter((m) => m.isFree)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 40 }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 26, fontWeight: 800, color: '#eef0f8',
            letterSpacing: '-0.03em', margin: '0 0 6px',
          }}
        >
          AI Providers
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.40)', margin: 0 }}>
          Connect your AI providers. All keys stay on your machine and are never sent to Conductr servers.
        </p>
      </div>

      {/* Summary strip */}
      <div
        style={{
          display: 'flex', gap: 12, marginBottom: 24,
          padding: '12px 16px', borderRadius: 12,
          background: 'rgba(129,140,248,0.06)',
          border: '1px solid rgba(129,140,248,0.16)',
        }}
      >
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#818cf8' }}>
            {PROVIDER_ORDER.filter((p) => p === 'ollama' ? false : status[p]?.configured).length}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Connected</div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>
            {freeModels.length}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Free Models</div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fbbf24' }}>
            {models.length}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Total Models</div>
        </div>
      </div>

      {/* No providers notice */}
      {configuredCount === 1 && (
        <div
          style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 20,
            background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.20)',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}
        >
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#fbbf24', marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.5 }}>
            <strong style={{ color: '#fbbf24' }}>No provider connected yet.</strong>{' '}
            Add OpenRouter for instant access to 100+ models including free ones — recommended for most users.
          </div>
        </div>
      )}

      {/* Provider cards */}
      <div style={{ marginBottom: 28 }}>
        {PROVIDER_ORDER.map((name) => {
          if (name === 'ollama') {
            const m = meta[name]
            if (!m) return null
            return <OllamaSection key={name} meta={m} />
          }
          const m = meta[name]
          const s = status[name]
          if (!m || !s) return null
          return (
            <ProviderCard
              key={name}
              name={name}
              meta={m}
              status={s}
              onSave={(key) => handleSaveKey(name, key)}
              onRemove={() => handleRemoveKey(name)}
              onTest={(key) => handleTest(name, key)}
            />
          )
        })}
      </div>

      {/* Global default model */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: '18px 22px',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Default Model
        </div>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.40)', margin: '0 0 14px' }}>
          Used when no per-agent model is configured. Agents with an assigned model ignore this setting.
        </p>
        {globalDefault.provider && globalDefault.model ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderRadius: 8, background: 'rgba(129,140,248,0.08)',
              border: '1px solid rgba(129,140,248,0.20)',
            }}
          >
            <i className="fa-solid fa-circle-check" style={{ color: '#818cf8', fontSize: 12 }} />
            <span style={{ fontSize: 13, color: '#dde2f0' }}>
              {globalDefault.provider} / {globalDefault.model}
            </span>
            <button
              onClick={async () => {
                await window.electronAPI.providers.setGlobalDefault('', '')
                load()
              }}
              style={{
                marginLeft: 'auto', padding: '3px 8px', borderRadius: 5, fontSize: 10,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.40)', cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.30)', fontStyle: 'italic' }}>
            Auto — uses the first configured provider. Connect a provider to set a specific default.
          </div>
        )}
      </div>
    </div>
  )
}
