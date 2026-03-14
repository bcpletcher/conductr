import { useState, useEffect, useRef } from 'react'
import type { ApiKeyStatus } from '../env.d'

interface OnboardingProps {
  onComplete: () => void
}

type Step = 0 | 1 | 2 | 3

const LYRA = { name: 'Lyra', role: 'Lead Orchestrator', icon: 'fa-solid fa-rocket', color: '#8b7cf8' }

const SUB_AGENTS = [
  { name: 'Forge',    role: 'Backend Engineer',     icon: 'fa-solid fa-gears',             color: '#f97316' },
  { name: 'Scout',    role: 'Codebase Analyst',     icon: 'fa-solid fa-magnifying-glass',  color: '#22d3ee' },
  { name: 'Pixel',    role: 'Frontend Engineer',    icon: 'fa-solid fa-paintbrush',        color: '#ec4899' },
  { name: 'Sentinel', role: 'QA & Security',        icon: 'fa-solid fa-shield-halved',     color: '#34d399' },
  { name: 'Nova',     role: 'General Executor',     icon: 'fa-solid fa-bolt',              color: '#fbbf24' },
  { name: 'Courier',  role: 'Delivery Engineer',    icon: 'fa-solid fa-box',               color: '#a78bfa' },
]

export default function Onboarding({ onComplete }: OnboardingProps): React.JSX.Element {
  const [step,       setStep]       = useState<Step>(0)
  const [keyStatus,  setKeyStatus]  = useState<ApiKeyStatus | null>(null)
  const [keyInput,   setKeyInput]   = useState('')
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState('')
  const [showKey,    setShowKey]    = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Check API key status when reaching step 1
  useEffect(() => {
    if (step === 1 && keyStatus === null) {
      window.electronAPI.settings.checkApiKey()
        .then(setKeyStatus)
        .catch(() => setKeyStatus({ configured: false, source: null }))
    }
  }, [step, keyStatus])

  // Auto-focus key input
  useEffect(() => {
    if (step === 1 && keyStatus?.configured === false) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [step, keyStatus])

  async function handleSaveKey(): Promise<void> {
    if (!keyInput.trim() || !keyInput.startsWith('sk-ant-')) {
      setSaveError('Key should start with sk-ant-…')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await window.electronAPI.settings.setApiKey(keyInput.trim())
      setKeyStatus({ configured: true, source: 'settings' })
      setTimeout(() => setStep(2), 600)
    } catch {
      setSaveError('Failed to save — try again')
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete(): Promise<void> {
    await window.electronAPI.settings.set('onboarding_complete', '1').catch(() => {})
    onComplete()
  }

  // ── Panel wrapper ─────────────────────────────────────────────────────────
  const panel = (children: React.ReactNode): React.JSX.Element => (
    <div
      style={{
        position: 'fixed', inset: 0,
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        // Stronger blur + saturate for true frosted glass — app visible but heavily softened
        background: 'rgba(4, 4, 12, 0.72)',
        backdropFilter: 'blur(48px) saturate(1.8) brightness(0.55)',
        WebkitBackdropFilter: 'blur(48px) saturate(1.8) brightness(0.55)',
      } as React.CSSProperties}
    >
      <div
        style={{
          width: '100%', maxWidth: 480,
          background: 'linear-gradient(160deg, rgba(20,18,40,0.97) 0%, rgba(10,10,22,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderTopColor: 'rgba(255,255,255,0.20)',
          borderRadius: 22,
          padding: '36px 36px 32px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.80), 0 0 0 1px rgba(139,124,248,0.12), inset 0 1px 0 rgba(255,255,255,0.07)',
          animation: 'fade-in 0.2s ease',
        }}
      >
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
          {([0, 1, 2, 3] as Step[]).map((s) => (
            <div
              key={s}
              style={{
                width: s === step ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: s === step ? '#8b7cf8' : 'rgba(255,255,255,0.15)',
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
          width: 72, height: 72,
          borderRadius: 20,
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
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.46)', lineHeight: 1.6, margin: '0 0 32px' }}>
        Your AI operating system — 7 specialist agents ready to work for you. Let's get set up in 30 seconds.
      </p>

      <button
        onClick={() => setStep(1)}
        style={{
          width: '100%', padding: '13px 0',
          background: 'linear-gradient(135deg, #9b8cfa 0%, #7c6df4 100%)',
          border: 'none', borderRadius: 12,
          color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', letterSpacing: '-0.01em',
          boxShadow: '0 4px 20px rgba(139,124,248,0.45)',
          transition: 'opacity 0.15s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.opacity = '0.88')}
        onMouseOut={(e)  => (e.currentTarget.style.opacity = '1')}
      >
        Get Started →
      </button>
    </div>
  )

  // ── Step 1: API Key ───────────────────────────────────────────────────────
  if (step === 1) return panel(
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(139,124,248,0.15)',
            border: '1px solid rgba(139,124,248,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <i className="fa-solid fa-key" style={{ fontSize: 18, color: '#8b7cf8' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.025em', margin: 0 }}>
            Connect Claude
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', margin: '3px 0 0' }}>
            Anthropic API key — stays local, never leaves your machine
          </p>
        </div>
      </div>

      {keyStatus === null ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />
          Checking…
        </div>
      ) : keyStatus.configured ? (
        /* Already configured */
        <div>
          <div
            style={{
              padding: '14px 16px',
              background: 'rgba(52,211,153,0.08)',
              border: '1px solid rgba(52,211,153,0.25)',
              borderRadius: 10, marginBottom: 24,
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <i className="fa-solid fa-circle-check" style={{ color: '#34d399', fontSize: 16 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#34d399' }}>API key detected</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
                {keyStatus.source === 'env' ? 'Loaded from your .env file' : 'Saved in app settings'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setStep(2)}
            style={{
              width: '100%', padding: '13px 0',
              background: 'linear-gradient(135deg, #9b8cfa 0%, #7c6df4 100%)',
              border: 'none', borderRadius: 12,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(139,124,248,0.40)',
            }}
          >
            Continue →
          </button>
        </div>
      ) : (
        /* Needs configuration */
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Anthropic API Key
            </label>
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => { setKeyInput(e.target.value); setSaveError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                placeholder="sk-ant-api03-…"
                style={{
                  width: '100%', padding: '11px 44px 11px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${saveError ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 10, outline: 'none',
                  color: '#eef0f8', fontSize: 14,
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#8b7cf880')}
                onBlur={(e)  => (e.target.style.borderColor = saveError ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)')}
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.35)', padding: 2,
                }}
              >
                <i className={`fa-regular fa-${showKey ? 'eye-slash' : 'eye'}`} style={{ fontSize: 13 }} />
              </button>
            </div>
            {saveError && (
              <p style={{ fontSize: 12, color: '#f87171', margin: '6px 0 0' }}>{saveError}</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleSaveKey}
              disabled={saving || !keyInput.trim()}
              style={{
                flex: 1, padding: '12px 0',
                background: saving || !keyInput.trim()
                  ? 'rgba(139,124,248,0.30)'
                  : 'linear-gradient(135deg, #9b8cfa 0%, #7c6df4 100%)',
                border: 'none', borderRadius: 10,
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: saving || !keyInput.trim() ? 'not-allowed' : 'pointer',
                boxShadow: saving || !keyInput.trim() ? 'none' : '0 4px 16px rgba(139,124,248,0.35)',
              }}
            >
              {saving ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 6 }} />Saving…</> : 'Save & Continue →'}
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: 14 }}>
            <button
              onClick={() => setStep(2)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.32)', fontSize: 13 }}
            >
              Skip for now — I'll add it in Settings
            </button>
          </p>
        </div>
      )}
    </div>
  )

  // ── Step 2: Meet your agents ──────────────────────────────────────────────
  if (step === 2) return panel(
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#eef0f8', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          Your Intelligence Roster
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: 0 }}>
          Lyra commands your specialist swarm
        </p>
      </div>

      {/* ── Lyra — commander card ────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 0 }}>
        <div
          style={{
            width: '72%',
            padding: '14px 18px',
            background: 'linear-gradient(135deg, rgba(139,124,248,0.18) 0%, rgba(139,124,248,0.08) 100%)',
            border: '1px solid rgba(139,124,248,0.40)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 0 24px rgba(139,124,248,0.14)',
            position: 'relative',
          }}
        >
          {/* Commander badge */}
          <div
            style={{
              position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
              padding: '2px 10px', borderRadius: 20,
              background: '#8b7cf8',
              fontSize: 9, fontWeight: 800, color: '#fff',
              letterSpacing: '0.10em', textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Commander
          </div>
          <div
            style={{
              width: 40, height: 40, borderRadius: 11, flexShrink: 0,
              background: 'linear-gradient(145deg, #a78bfa 0%, #8b7cf8 100%)',
              boxShadow: '0 0 16px rgba(139,124,248,0.40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="fa-solid fa-rocket" style={{ fontSize: 16, color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#eef0f8', letterSpacing: '-0.02em', lineHeight: 1 }}>Lyra</div>
            <div style={{ fontSize: 12, color: 'rgba(139,124,248,0.85)', marginTop: 3 }}>Lead Orchestrator</div>
          </div>
        </div>
      </div>

      {/* ── Connecting line ──────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0', gap: 0 }}>
        {/* Vertical line */}
        <div style={{ width: 1, height: 16, background: 'linear-gradient(to bottom, rgba(139,124,248,0.60), rgba(139,124,248,0.25))' }} />
        {/* Horizontal spread line */}
        <div style={{ position: 'relative', width: '88%', height: 1 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(139,124,248,0.25)' }} />
          {/* Left drop */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 10, background: 'rgba(139,124,248,0.25)' }} />
          {/* Right drop */}
          <div style={{ position: 'absolute', right: 0, top: 0, width: 1, height: 10, background: 'rgba(139,124,248,0.25)' }} />
          {/* Center drop */}
          <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: 10, background: 'rgba(139,124,248,0.30)' }} />
        </div>
      </div>

      {/* ── Sub-agents box ───────────────────────────────────────── */}
      <div
        style={{
          marginTop: 8, marginBottom: 18,
          padding: 10,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(139,124,248,0.18)',
          borderRadius: 14,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
          {SUB_AGENTS.map((agent) => (
            <div
              key={agent.name}
              style={{
                padding: '9px 10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `${agent.color}1a`,
                  border: `1px solid ${agent.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i className={agent.icon} style={{ fontSize: 11, color: agent.color }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#dde2f0', lineHeight: 1 }}>{agent.name}</div>
                <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.32)', marginTop: 2, lineHeight: 1.2 }}>{agent.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setStep(3)}
        style={{
          width: '100%', padding: '13px 0',
          background: 'linear-gradient(135deg, #9b8cfa 0%, #7c6df4 100%)',
          border: 'none', borderRadius: 12,
          color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(139,124,248,0.40)',
        }}
      >
        Looks Good →
      </button>
    </div>
  )

  // ── Step 3: Done ─────────────────────────────────────────────────────────
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
        You're all set!
      </h2>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.46)', lineHeight: 1.6, margin: '0 0 32px' }}>
        Your 7 agents are ready. Start by chatting with Lyra or queue a task in Workshop.
      </p>

      <button
        onClick={handleComplete}
        style={{
          width: '100%', padding: '13px 0',
          background: 'linear-gradient(135deg, #9b8cfa 0%, #7c6df4 100%)',
          border: 'none', borderRadius: 12,
          color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(139,124,248,0.45)',
        }}
      >
        Open Conductr
      </button>

      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>
        You can update your API key anytime in Settings
      </p>
    </div>
  )
}
