import { useState, useEffect, useRef } from 'react'

interface OnboardingProps {
  onComplete: () => void
}

type ProviderChoice = 'openrouter' | 'anthropic' | 'local' | 'skip'

// Step flow per provider choice:
//  openrouter / anthropic → 0 Welcome → 1 Choose → 2 Key → 3 Roster → 4 Done
//  local                  → 0 Welcome → 1 Choose → 2 Ollama → 3 Roster → 4 Done
//  skip                   → 0 Welcome → 1 Choose → 2 Roster → 3 Done
type Step = 0 | 1 | 2 | 3 | 4

const ALL_AGENTS = [
  // Active agents
  { name: 'Lyra',     role: 'Lead Orchestrator',          icon: 'fa-solid fa-rocket',           color: '#818cf8', active: true,  defaultModel: 'Sonnet 4.6',           defaultProvider: 'OpenRouter' },
  { name: 'Nova',     role: 'Strategy & Communication',   icon: 'fa-solid fa-bolt',             color: '#a78bfa', active: true,  defaultModel: 'Llama 3.3 70B (Free)', defaultProvider: 'OpenRouter' },
  { name: 'Scout',    role: 'Research & Analysis',        icon: 'fa-solid fa-magnifying-glass', color: '#22d3ee', active: true,  defaultModel: 'Gemini Flash (Free)',   defaultProvider: 'OpenRouter' },
  { name: 'Forge',    role: 'Backend Engineering',        icon: 'fa-solid fa-gears',            color: '#f97316', active: true,  defaultModel: 'Llama 3.3 70B (Free)', defaultProvider: 'OpenRouter' },
  { name: 'Pixel',    role: 'Frontend & Design',          icon: 'fa-solid fa-paintbrush',       color: '#ec4899', active: true,  defaultModel: 'Llama 3.3 70B (Free)', defaultProvider: 'OpenRouter' },
  { name: 'Sentinel', role: 'QA & Security',              icon: 'fa-solid fa-shield-halved',    color: '#34d399', active: true,  defaultModel: 'Llama 3.3 70B (Free)', defaultProvider: 'OpenRouter' },
  { name: 'Courier',  role: 'Comms & Delivery',           icon: 'fa-solid fa-box',              color: '#fbbf24', active: true,  defaultModel: 'Llama 3.1 8B (Fast)',  defaultProvider: 'Groq' },
  // Phase-locked agents
  { name: 'Nexus',    role: 'Integration & Data',         icon: 'fa-solid fa-plug',             color: '#0ea5e9', active: false, defaultModel: 'Phase 14',             defaultProvider: '' },
  { name: 'Helm',     role: 'DevOps & Infrastructure',    icon: 'fa-solid fa-compass',          color: '#f43f5e', active: false, defaultModel: 'Phase 12',             defaultProvider: '' },
  { name: 'Atlas',    role: 'Project Management',         icon: 'fa-solid fa-map',              color: '#9333ea', active: false, defaultModel: 'Phase 16',             defaultProvider: '' },
  { name: 'Ledger',   role: 'Financial Intelligence',     icon: 'fa-solid fa-coins',            color: '#eab308', active: false, defaultModel: 'Phase 11',             defaultProvider: '' },
]

export default function Onboarding({ onComplete }: OnboardingProps): React.JSX.Element {
  const [step,     setStep]     = useState<Step>(0)
  const [provider, setProvider] = useState<ProviderChoice | null>(null)

  // Key entry state
  const [keyInput,   setKeyInput]   = useState('')
  const [showKey,    setShowKey]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState('')
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Ollama state
  const [ollamaStatus,  setOllamaStatus]  = useState<'detecting' | 'running' | 'not-running' | null>(null)
  const [pulling,       setPulling]       = useState<string | null>(null)
  const [pullPercent,   setPullPercent]   = useState<number | null>(null)
  const [ollamaModels,  setOllamaModels]  = useState<string[]>([])

  // Auto-focus key input
  useEffect(() => {
    if (step === 2 && (provider === 'openrouter' || provider === 'anthropic')) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
    if (step === 2 && provider === 'local') {
      detectOllama()
    }
    // Pull progress listener
    window.electronAPI.providers.onPullProgress((data) => {
      if (data.total && data.completed) {
        setPullPercent(Math.round((data.completed / data.total) * 100))
      }
      if (data.status === 'done') {
        setPulling(null)
        setPullPercent(null)
        detectOllama()
      }
      if (data.status === 'error') {
        setPulling(null)
        setPullPercent(null)
      }
    })
    return () => window.electronAPI.providers.removePullProgressListener()
  }, [step, provider])

  async function detectOllama(): Promise<void> {
    setOllamaStatus('detecting')
    const result = await window.electronAPI.providers.detectOllama().catch(() => ({ running: false, modelCount: 0 })) as { running: boolean; modelCount: number }
    setOllamaStatus(result.running ? 'running' : 'not-running')
    if (result.running) {
      const models = await window.electronAPI.providers.getOllamaModels().catch(() => []) as { id: string }[]
      setOllamaModels(models.map((m) => m.id))
    }
  }

  async function handleSaveKey(): Promise<void> {
    if (!keyInput.trim()) return
    setSaving(true)
    setSaveError('')
    setTestResult(null)
    try {
      const result = await window.electronAPI.providers.testConnection(
        provider as string,
        keyInput.trim()
      ).catch(() => ({ ok: false, error: 'Connection test failed' })) as { ok: boolean; error?: string }
      setTestResult(result)
      if (!result.ok) {
        setSaveError(result.error ?? 'Connection failed — check your key and try again')
        setSaving(false)
        return
      }
      await window.electronAPI.providers.setKey(provider as string, keyInput.trim())
      // Set as global default
      const defaultModel = provider === 'openrouter'
        ? 'meta-llama/llama-3.3-70b-instruct:free'
        : 'claude-sonnet-4-6'
      await window.electronAPI.providers.setGlobalDefault(provider as string, defaultModel).catch(() => {})
      goNext()
    } catch {
      setSaveError('Failed to save — try again')
    } finally {
      setSaving(false)
    }
  }

  function goNext(): void {
    if (provider === 'skip') {
      // skip → 0 → 1 → 2(roster) → 3(done)
      if (step === 1) setStep(2)
      else if (step === 2) setStep(3)
      else setStep((s) => (s + 1) as Step)
    } else if (provider === 'local') {
      // local → 0 → 1 → 2(ollama) → 3(roster) → 4(done)
      setStep((s) => (s + 1) as Step)
    } else {
      // openrouter/anthropic → 0 → 1 → 2(key) → 3(roster) → 4(done)
      setStep((s) => (s + 1) as Step)
    }
  }

  function getStepCount(): number {
    return provider === 'skip' ? 4 : 5
  }

  function getActiveDot(): number {
    // Map the step to the dot index for the current path
    return step
  }

  async function handleComplete(): Promise<void> {
    await window.electronAPI.settings.set('onboarding_complete', '1').catch(() => {})
    onComplete()
  }

  // ── Panel wrapper ─────────────────────────────────────────────────────────
  const panel = (children: React.ReactNode, wide = false): React.JSX.Element => (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(4,4,12,0.72)',
        backdropFilter: 'blur(48px) saturate(1.8) brightness(0.55)',
        WebkitBackdropFilter: 'blur(48px) saturate(1.8) brightness(0.55)',
      } as React.CSSProperties}
    >
      <div
        style={{
          width: '100%',
          maxWidth: wide ? 600 : 480,
          background: 'linear-gradient(160deg, rgba(20,18,40,0.97) 0%, rgba(10,10,22,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderTopColor: 'rgba(255,255,255,0.20)',
          borderRadius: 22,
          padding: wide ? '32px 32px 28px' : '36px 36px 32px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.80), 0 0 0 1px rgba(139,124,248,0.12), inset 0 1px 0 rgba(255,255,255,0.07)',
          animation: 'fade-in 0.2s ease',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
          {Array.from({ length: getStepCount() }, (_, i) => (
            <div
              key={i}
              style={{
                width: i === getActiveDot() ? 20 : 6,
                height: 6, borderRadius: 3,
                background: i === getActiveDot() ? '#8b7cf8' : 'rgba(255,255,255,0.15)',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>
        {children}
      </div>
    </div>
  )

  // ── Step 0: Welcome ───────────────────────────────────────────────────────
  if (step === 0) return panel(
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'linear-gradient(145deg, #a78bfa 0%, #8b7cf8 100%)',
          boxShadow: '0 0 40px #8b7cf840, 0 4px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}
      >
        <i className="fa-solid fa-rocket" style={{ fontSize: 28, color: '#fff' }} />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#eef0f8', letterSpacing: '-0.03em', margin: '0 0 10px' }}>
        Welcome to Conductr
      </h1>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.46)', lineHeight: 1.6, margin: '0 0 8px' }}>
        Your AI operating system — 11 specialist agents ready to work for you.
      </p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)', margin: '0 0 32px' }}>
        Let's get you set up in under 60 seconds.
      </p>
      <button
        onClick={() => setStep(1)}
        style={{
          width: '100%', padding: '13px 0',
          background: 'linear-gradient(135deg, #9b8cfa 0%, #7c6df4 100%)',
          border: 'none', borderRadius: 12,
          color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          letterSpacing: '-0.01em',
          boxShadow: '0 4px 20px rgba(139,124,248,0.45)',
        }}
      >
        Get Started →
      </button>
    </div>
  )

  // ── Step 1: Choose Your AI ────────────────────────────────────────────────
  if (step === 1) return panel(
    <div>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#eef0f8', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          Connect Your AI
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: 0 }}>
          Choose how you want to power your agents
        </p>
      </div>

      {/* OpenRouter */}
      <ProviderOptionCard
        icon="fa-solid fa-route"
        color="#818cf8"
        label="OpenRouter"
        badge="Recommended"
        badgeColor="#818cf8"
        description="One key unlocks 100+ models — free Llama 3.3, Gemini Flash, GPT-4o, Claude, and more. Zero cost on day one."
        onClick={() => { setProvider('openrouter'); goNext() }}
      />

      {/* Anthropic */}
      <ProviderOptionCard
        icon="fa-solid fa-a"
        color="#f97316"
        label="Anthropic Direct"
        description="Direct Claude access. Best if you already have an Anthropic subscription."
        onClick={() => { setProvider('anthropic'); goNext() }}
      />

      {/* Local / Free */}
      <ProviderOptionCard
        icon="fa-solid fa-server"
        color="#22d3ee"
        label="Local AI (Ollama)"
        badge="Free forever"
        badgeColor="#34d399"
        description="Run AI completely locally. No keys, no costs, no data leaving your machine."
        onClick={() => { setProvider('local'); goNext() }}
      />

      {/* Skip */}
      <button
        onClick={() => { setProvider('skip'); goNext() }}
        style={{
          width: '100%', padding: '11px 0', marginTop: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.28)', fontSize: 13,
        }}
      >
        Skip — I'll add keys in Settings later
      </button>
    </div>
  )

  // ── Step 2 (key entry): OpenRouter or Anthropic ───────────────────────────
  if (step === 2 && (provider === 'openrouter' || provider === 'anthropic')) {
    const providerLabel = provider === 'openrouter' ? 'OpenRouter' : 'Anthropic'
    const keyPrefix     = provider === 'openrouter' ? 'sk-or-' : 'sk-ant-'
    const placeholder   = provider === 'openrouter' ? 'sk-or-v1-…' : 'sk-ant-api03-…'
    const color         = provider === 'openrouter' ? '#818cf8' : '#f97316'
    const docsNote      = provider === 'openrouter'
      ? 'Get your free key at openrouter.ai/keys — create a free account, generate a key, paste here. Includes Llama 3.3 70B and Gemini Flash at zero cost.'
      : 'Get your key at console.anthropic.com/settings/keys. Requires an Anthropic account with billing enabled.'

    return panel(
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: `${color}18`, border: `1px solid ${color}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className={provider === 'openrouter' ? 'fa-solid fa-route' : 'fa-solid fa-a'} style={{ fontSize: 16, color }} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.025em', margin: 0 }}>
              {providerLabel} API Key
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '3px 0 0' }}>
              Stays local — never leaves your machine
            </p>
          </div>
        </div>

        {/* How to get key */}
        <div
          style={{
            padding: '10px 12px', borderRadius: 9, marginBottom: 14,
            background: `${color}0a`, border: `1px solid ${color}20`,
            fontSize: 12.5, color: 'rgba(255,255,255,0.48)', lineHeight: 1.55,
          }}
        >
          <i className="fa-solid fa-circle-info" style={{ color, marginRight: 6 }} />
          {docsNote}
        </div>

        {/* Key input */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); setSaveError(''); setTestResult(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
              placeholder={placeholder}
              style={{
                width: '100%', padding: '11px 42px 11px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${saveError ? 'rgba(248,113,113,0.5)' : testResult?.ok ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 10, outline: 'none',
                color: '#eef0f8', fontSize: 14, fontFamily: 'monospace', boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = `${color}80`)}
              onBlur={(e) => {
                if (!saveError && !testResult) e.target.style.borderColor = 'rgba(255,255,255,0.12)'
              }}
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.35)', padding: 2,
              }}
            >
              <i className={`fa-regular fa-${showKey ? 'eye-slash' : 'eye'}`} style={{ fontSize: 12 }} />
            </button>
          </div>
          {saveError && (
            <p style={{ fontSize: 12, color: '#f87171', margin: '6px 0 0' }}>{saveError}</p>
          )}
          {testResult?.ok && (
            <p style={{ fontSize: 12, color: '#34d399', margin: '6px 0 0' }}>
              <i className="fa-solid fa-circle-check" style={{ marginRight: 5 }} />
              Connected successfully
            </p>
          )}
        </div>

        <button
          onClick={handleSaveKey}
          disabled={saving || !keyInput.trim()}
          style={{
            width: '100%', padding: '12px 0',
            background: saving || !keyInput.trim()
              ? `${color}30`
              : `linear-gradient(135deg, ${color}cc, ${color}99)`,
            border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: saving || !keyInput.trim() ? 'not-allowed' : 'pointer',
            boxShadow: saving || !keyInput.trim() ? 'none' : `0 4px 16px ${color}35`,
            marginBottom: 10,
          }}
        >
          {saving
            ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Testing & saving…</>
            : 'Save & Continue →'}
        </button>

        <p style={{ textAlign: 'center', margin: 0 }}>
          <button
            onClick={goNext}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.30)', fontSize: 13 }}
          >
            Skip for now
          </button>
        </p>
      </div>
    )
  }

  // ── Step 2 (Ollama setup) ─────────────────────────────────────────────────
  if (step === 2 && provider === 'local') return panel(
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <i className="fa-solid fa-server" style={{ fontSize: 16, color: '#22d3ee' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.025em', margin: 0 }}>
            Local AI Setup
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '3px 0 0' }}>
            Ollama — runs AI on your machine
          </p>
        </div>
      </div>

      {/* Detect status */}
      {ollamaStatus === 'detecting' && (
        <StatusPill color="rgba(255,255,255,0.35)" icon="fa-solid fa-spinner fa-spin" text="Checking for Ollama…" />
      )}
      {ollamaStatus === 'running' && (
        <StatusPill color="#34d399" icon="fa-solid fa-circle-check" text={`Ollama is running${ollamaModels.length > 0 ? ` · ${ollamaModels.length} model${ollamaModels.length !== 1 ? 's' : ''} installed` : ''}`} />
      )}
      {ollamaStatus === 'not-running' && (
        <StatusPill color="#f87171" icon="fa-solid fa-circle-xmark" text="Ollama not detected" />
      )}

      {/* Install guide */}
      {(ollamaStatus === 'not-running' || ollamaStatus === null) && (
        <div
          style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 14,
            background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)',
            fontSize: 12.5, color: 'rgba(255,255,255,0.48)', lineHeight: 1.65,
          }}
        >
          <strong style={{ color: '#22d3ee' }}>Install Ollama in 3 steps:</strong>
          <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            <li>Click <strong>Download Ollama</strong> below — opens the download page</li>
            <li>Run the installer for your platform (macOS or Windows)</li>
            <li>Come back and click <strong>Detect</strong> — it starts automatically</li>
          </ol>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {ollamaStatus === 'not-running' || ollamaStatus === null ? (
          <button
            onClick={() => window.electronAPI.providers.installOllama()}
            style={{
              flex: 1, padding: '10px 0',
              background: 'linear-gradient(135deg, rgba(34,211,238,0.7), rgba(34,211,238,0.5))',
              border: 'none', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 3px 12px rgba(34,211,238,0.25)',
            }}
          >
            <i className="fa-solid fa-arrow-down-to-bracket" style={{ marginRight: 6 }} />
            Download Ollama
          </button>
        ) : null}
        <button
          onClick={detectOllama}
          disabled={ollamaStatus === 'detecting'}
          style={{
            padding: '10px 16px', borderRadius: 9,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.60)', fontSize: 13, cursor: ollamaStatus === 'detecting' ? 'not-allowed' : 'pointer',
          }}
        >
          {ollamaStatus === 'detecting'
            ? <i className="fa-solid fa-spinner fa-spin" />
            : 'Detect'}
        </button>
      </div>

      {/* Model pull suggestions */}
      {ollamaStatus === 'running' && (
        <div>
          {ollamaModels.length === 0 && (
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', margin: '0 0 10px' }}>
              No models installed yet. Pull a starter model to get going:
            </p>
          )}
          {[{ id: 'llama3.2:3b', name: 'Llama 3.2 3B', size: '~2 GB', description: 'Recommended starter — fast and lightweight' }]
            .filter((s) => !ollamaModels.includes(s.id))
            .map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 9, marginBottom: 8,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <i className="fa-solid fa-cube" style={{ fontSize: 10, color: '#22d3ee' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#dde2f0' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{s.size} · {s.description}</div>
                </div>
                {pulling === s.id ? (
                  <div style={{ minWidth: 80 }}>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginBottom: 3 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: '#22d3ee', width: pullPercent !== null ? `${pullPercent}%` : '50%', transition: 'width 0.3s ease' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'right' }}>
                      {pullPercent !== null ? `${pullPercent}%` : '…'}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setPulling(s.id)
                      window.electronAPI.providers.pullOllamaModel(s.id)
                    }}
                    style={{
                      padding: '5px 12px', borderRadius: 7,
                      background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.30)',
                      color: '#22d3ee', fontSize: 11, cursor: 'pointer',
                    }}
                  >
                    Pull
                  </button>
                )}
              </div>
            ))}
        </div>
      )}

      <button
        onClick={goNext}
        style={{
          width: '100%', marginTop: 8, padding: '12px 0',
          background: ollamaStatus === 'running'
            ? 'linear-gradient(135deg, rgba(34,211,238,0.7), rgba(34,211,238,0.5))'
            : 'rgba(255,255,255,0.08)',
          border: ollamaStatus === 'running' ? 'none' : '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}
      >
        {ollamaStatus === 'running' ? 'Continue →' : 'Continue without Ollama →'}
      </button>
    </div>
  )

  // ── Roster step: step 2 for 'skip', step 3 for others ────────────────────
  const isRosterStep = (provider === 'skip' && step === 2) || (provider !== 'skip' && step === 3)
  if (isRosterStep) return panel(
    <div>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#eef0f8', letterSpacing: '-0.03em', margin: '0 0 5px' }}>
          Your Intelligence Roster
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: 0 }}>
          11 specialist agents — 7 active now, 4 unlock as you build
        </p>
      </div>

      {/* Active agents grid */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Active Swarm
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {ALL_AGENTS.filter((a) => a.active).map((agent) => (
            <AgentRosterCard key={agent.name} agent={agent} />
          ))}
        </div>
      </div>

      {/* Phase-locked agents */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Expansion Agents — Unlock Later
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {ALL_AGENTS.filter((a) => !a.active).map((agent) => (
            <AgentRosterCard key={agent.name} agent={agent} locked />
          ))}
        </div>
      </div>

      <button
        onClick={goNext}
        style={{
          width: '100%', padding: '13px 0',
          background: 'linear-gradient(135deg, #9b8cfa 0%, #7c6df4 100%)',
          border: 'none', borderRadius: 12,
          color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(139,124,248,0.40)',
        }}
      >
        Looks Good →
      </button>
    </div>,
    true // wide panel
  )

  // ── Done: step 3 for 'skip', step 4 for others ───────────────────────────
  return panel(
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(52,211,153,0.12)',
          border: '2px solid rgba(52,211,153,0.40)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 0 32px rgba(52,211,153,0.20)',
        }}
      >
        <i className="fa-solid fa-check" style={{ fontSize: 28, color: '#34d399' }} />
      </div>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: '#eef0f8', letterSpacing: '-0.03em', margin: '0 0 10px' }}>
        Your swarm is ready
      </h2>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.46)', lineHeight: 1.6, margin: '0 0 8px' }}>
        {provider === 'local'
          ? 'Local AI is configured. Your agents run completely offline.'
          : provider === 'skip'
          ? 'You can add API keys anytime in Settings → Providers.'
          : `Your agents are connected via ${provider === 'openrouter' ? 'OpenRouter' : 'Anthropic'}.`}
      </p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', margin: '0 0 28px' }}>
        Start by chatting with Lyra or queue a task in Workshop.
      </p>
      <button
        onClick={handleComplete}
        style={{
          width: '100%', padding: '13px 0',
          background: 'linear-gradient(135deg, #9b8cfa 0%, #7c6df4 100%)',
          border: 'none', borderRadius: 12,
          color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(139,124,248,0.45)',
        }}
      >
        Open Conductr
      </button>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', marginTop: 14 }}>
        Add providers and configure agent models in Settings → Providers
      </p>
    </div>
  )
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function ProviderOptionCard({
  icon, color, label, badge, badgeColor, description, onClick
}: {
  icon: string; color: string; label: string; badge?: string; badgeColor?: string
  description: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '14px 16px', marginBottom: 8,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 13, cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = `${color}40`
        e.currentTarget.style.background = `${color}08`
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
      }}
    >
      <div
        style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: `${color}18`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <i className={icon} style={{ fontSize: 14, color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#eef0f8' }}>{label}</span>
          {badge && (
            <span
              style={{
                padding: '1px 6px', borderRadius: 10, fontSize: 9.5, fontWeight: 700,
                color: badgeColor, background: `${badgeColor}18`,
                border: `1px solid ${badgeColor}30`, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', lineHeight: 1.4 }}>{description}</div>
      </div>
      <i className="fa-solid fa-chevron-right" style={{ fontSize: 10, color: 'rgba(255,255,255,0.20)', flexShrink: 0 }} />
    </button>
  )
}

function StatusPill({ color, icon, text }: { color: string; icon: string; text: string }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 9, marginBottom: 12,
        background: `${color}12`, border: `1px solid ${color}30`,
      }}
    >
      <i className={icon} style={{ fontSize: 12, color }} />
      <span style={{ fontSize: 12.5, color, fontWeight: 600 }}>{text}</span>
    </div>
  )
}

function AgentRosterCard({
  agent, locked = false
}: {
  agent: typeof ALL_AGENTS[0]; locked?: boolean
}) {
  return (
    <div
      style={{
        padding: '10px 11px',
        background: locked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
        border: locked ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        opacity: locked ? 0.5 : 1,
        display: 'flex', alignItems: 'center', gap: 9,
      }}
    >
      <div
        style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: `${agent.color}18`,
          border: `1px solid ${agent.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <i className={agent.icon} style={{ fontSize: 11, color: agent.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#dde2f0', letterSpacing: '-0.01em', lineHeight: 1 }}>
          {agent.name}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', marginTop: 2, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {locked ? agent.defaultModel : agent.role}
        </div>
      </div>
    </div>
  )
}
