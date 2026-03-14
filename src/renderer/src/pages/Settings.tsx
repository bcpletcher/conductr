import { useEffect, useState } from 'react'
import { useUIStore } from '../store/ui'
import { WALLPAPER_PRESETS } from '../constants/wallpapers'

const api = window.electronAPI

// ── Toggle switch component ───────────────────────────────────────────────────
function ToggleSwitch({
  checked,
  onChange,
  accent,
  testid,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  accent: string
  testid?: string
}): React.JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={checked}
      data-testid={testid}
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: checked ? accent : 'rgba(255,255,255,0.12)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
          transition: 'left 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
          display: 'block',
        }}
      />
    </button>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  accent,
  testid,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  accent: string
  testid?: string
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between py-1">
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <p className="text-sm text-text-primary">{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.36)' }}>{description}</p>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} accent={accent} testid={testid} />
    </div>
  )
}

const ACCENT_COLORS = [
  { name: 'Indigo',   value: '#8b7cf8' },
  { name: 'Violet',   value: '#a78bfa' },
  { name: 'Cyan',     value: '#22d3ee' },
  { name: 'Rose',     value: '#fb7185' },
  { name: 'Amber',    value: '#fbbf24' },
  { name: 'Emerald',  value: '#34d399' },
]

export default function Settings(): React.JSX.Element {
  const wallpaperBrightness    = useUIStore((s) => s.wallpaperBrightness)
  const setWallpaperBrightness = useUIStore((s) => s.setWallpaperBrightness)
  const wallpaperStyle         = useUIStore((s) => s.wallpaperStyle)
  const setWallpaperStyle      = useUIStore((s) => s.setWallpaperStyle)
  const customWallpaperPath    = useUIStore((s) => s.customWallpaperPath)
  const setCustomWallpaperPath = useUIStore((s) => s.setCustomWallpaperPath)
  const accentColor            = useUIStore((s) => s.accentColor)
  const setAccentColor         = useUIStore((s) => s.setAccentColor)
  const density                = useUIStore((s) => s.density)
  const setDensity             = useUIStore((s) => s.setDensity)
  const [saving, setSaving]    = useState(false)
  const [saved,  setSaved]     = useState(false)

  // Notification preferences
  const [notifMode,          setNotifMode]          = useState<'always' | 'background' | 'never'>('always')
  const [notifTaskComplete,  setNotifTaskComplete]  = useState(true)
  const [notifTaskFailed,    setNotifTaskFailed]    = useState(true)
  const [notifBudgetAlert,   setNotifBudgetAlert]   = useState(false)

  // Brightness only matters when an image wallpaper is active
  const hasImage = wallpaperStyle === 'default' || wallpaperStyle === 'custom'

  // Load persisted settings on mount
  useEffect(() => {
    api.settings.get('wallpaper_brightness').then((val) => {
      if (val !== null) setWallpaperBrightness(parseFloat(val))
    })
    api.settings.get('accent_color').then((val) => {
      if (val !== null) setAccentColor(val)  // store handles CSS vars
    })
    api.settings.get('density').then((val) => {
      if (val === 'compact' || val === 'comfortable') setDensity(val)
    })
    api.settings.get('wallpaper_style').then((val) => {
      if (val) setWallpaperStyle(val)
    })
    api.settings.get('wallpaper_custom').then((val) => {
      if (val) setCustomWallpaperPath(val)
    })
    api.settings.get('notif_mode').then((val) => {
      if (val === 'always' || val === 'background' || val === 'never') setNotifMode(val)
    })
    api.settings.get('notif_task_complete').then((val) => {
      if (val !== null) setNotifTaskComplete(val === '1')
    })
    api.settings.get('notif_task_failed').then((val) => {
      if (val !== null) setNotifTaskFailed(val === '1')
    })
    api.settings.get('notif_budget_alert').then((val) => {
      if (val !== null) setNotifBudgetAlert(val === '1')
    })
  }, [setWallpaperBrightness, setAccentColor, setDensity, setWallpaperStyle, setCustomWallpaperPath])

  // setAccentColor (from store) sets all CSS vars automatically — no manual setProperty needed

  async function saveAccent(color: string): Promise<void> {
    setAccentColor(color)
    await api.settings.set('accent_color', color)
  }

  async function saveDensity(d: 'comfortable' | 'compact'): Promise<void> {
    setDensity(d)
    await api.settings.set('density', d)
  }

  async function saveBrightness(v: number): Promise<void> {
    setWallpaperBrightness(v)
    setSaving(true)
    await api.settings.set('wallpaper_brightness', String(v))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  async function saveWallpaperStyle(style: string): Promise<void> {
    setWallpaperStyle(style)
    await api.settings.set('wallpaper_style', style)
  }

  async function saveNotifMode(mode: 'always' | 'background' | 'never'): Promise<void> {
    setNotifMode(mode)
    await api.settings.set('notif_mode', mode)
  }

  async function saveNotifEvent(
    key: string,
    value: boolean,
    setter: (v: boolean) => void,
  ): Promise<void> {
    setter(value)
    await api.settings.set(key, value ? '1' : '0')
  }

  async function handlePickCustomWallpaper(): Promise<void> {
    const filePath = await api.settings.pickWallpaper()
    if (!filePath) return
    setCustomWallpaperPath(filePath)
    await api.settings.set('wallpaper_custom', filePath)
    await saveWallpaperStyle('custom')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Appearance & preferences</p>
      </div>

      {/* ── Appearance ──────────────────────────────────── */}
      <section className="card p-5 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-5">Appearance</h2>

        {/* Accent color */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-text-primary">Accent color</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.36)' }}>
                Tints buttons, highlights, active states, and the ambient background glow
              </p>
            </div>
            <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.40)' }}>
              {accentColor}
            </span>
          </div>
          <div className="flex items-center gap-2.5" data-testid="accent-swatches">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.value}
                data-testid={`accent-swatch-${c.name.toLowerCase()}`}
                title={c.name}
                onClick={() => saveAccent(c.value)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: c.value,
                  border: accentColor === c.value
                    ? '2px solid #fff'
                    : '2px solid transparent',
                  boxShadow: accentColor === c.value
                    ? `0 0 0 3px ${c.value}55, 0 2px 8px rgba(0,0,0,0.4)`
                    : '0 2px 6px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                  transform: accentColor === c.value ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />

        {/* Density toggle */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-text-primary">Density</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.36)' }}>
                Controls spacing and text size throughout the app
              </p>
            </div>
          </div>
          <div
            className="flex rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', width: 'fit-content' }}
            data-testid="density-toggle"
          >
            {(['comfortable', 'compact'] as const).map((d) => (
              <button
                key={d}
                data-testid={`density-${d}`}
                onClick={() => saveDensity(d)}
                style={{
                  padding: '6px 16px',
                  fontSize: 12.5,
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  background: density === d ? 'var(--color-accent)' : 'transparent',
                  color: density === d ? '#fff' : 'rgba(255,255,255,0.46)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                  textTransform: 'capitalize',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />

        {/* Wallpaper selector — image options only */}
        <div className="mb-5">
          <div className="mb-3">
            <p className="text-sm text-text-primary">Wallpaper</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.36)' }}>
              Choose an image wallpaper or use the accent-color ambient gradient
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap" data-testid="wallpaper-presets">
            {/* None + Default preset swatches */}
            {WALLPAPER_PRESETS.map((preset) => {
              const isActive = wallpaperStyle === preset.id
              return (
                <button
                  key={preset.id}
                  data-testid={`wallpaper-preset-${preset.id}`}
                  onClick={() => saveWallpaperStyle(preset.id)}
                  title={preset.label}
                  style={{
                    width: 68,
                    height: 46,
                    borderRadius: 10,
                    background: preset.preview,
                    border: isActive
                      ? '2px solid rgba(255,255,255,0.85)'
                      : '2px solid rgba(255,255,255,0.10)',
                    boxShadow: isActive
                      ? `0 0 0 2px var(--color-accent), 0 4px 14px rgba(0,0,0,0.5)`
                      : '0 2px 8px rgba(0,0,0,0.35)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'border 0.15s, box-shadow 0.15s, transform 0.12s',
                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                    flexShrink: 0,
                  }}
                >
                  {/* Label overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0, left: 0, right: 0,
                      padding: '2px 0 3px',
                      background: 'rgba(0,0,0,0.55)',
                      fontSize: 9,
                      color: 'rgba(255,255,255,0.85)',
                      textAlign: 'center',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {preset.label}
                  </div>
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 4, right: 4,
                        width: 14, height: 14,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <i className="fa-solid fa-check" style={{ fontSize: 7, color: '#08080d' }} />
                    </div>
                  )}
                </button>
              )
            })}

            {/* Custom image upload slot */}
            <button
              data-testid="wallpaper-custom-btn"
              onClick={handlePickCustomWallpaper}
              title="Upload a custom wallpaper image"
              style={{
                width: 68,
                height: 46,
                borderRadius: 10,
                background: wallpaperStyle === 'custom' && customWallpaperPath
                  ? `url("${customWallpaperPath}") center / cover`
                  : 'rgba(255,255,255,0.04)',
                border: wallpaperStyle === 'custom'
                  ? '2px solid rgba(255,255,255,0.85)'
                  : '2px dashed rgba(255,255,255,0.18)',
                boxShadow: wallpaperStyle === 'custom'
                  ? `0 0 0 2px var(--color-accent), 0 4px 14px rgba(0,0,0,0.5)`
                  : 'none',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                color: 'rgba(255,255,255,0.45)',
                transition: 'border 0.15s, box-shadow 0.15s, transform 0.12s',
                transform: wallpaperStyle === 'custom' ? 'scale(1.05)' : 'scale(1)',
                flexShrink: 0,
              }}
            >
              {!(wallpaperStyle === 'custom' && customWallpaperPath) && (
                <>
                  <i className="fa-solid fa-camera" style={{ fontSize: 13 }} />
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.02em' }}>Custom</span>
                </>
              )}
              {wallpaperStyle === 'custom' && customWallpaperPath && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    padding: '2px 0 3px',
                    background: 'rgba(0,0,0,0.55)',
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.85)',
                    textAlign: 'center',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                  }}
                >
                  Custom
                </div>
              )}
              {wallpaperStyle === 'custom' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 4, right: 4,
                    width: 14, height: 14,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className="fa-solid fa-check" style={{ fontSize: 7, color: '#08080d' }} />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Wallpaper brightness — only shown when an image is active */}
        {hasImage && (
          <>
            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />

            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-text-primary">Wallpaper brightness</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.36)' }}>
                  Controls how bright the background image appears
                </p>
              </div>
              <span className="text-sm font-mono text-text-secondary" data-testid="brightness-value">
                {Math.round(wallpaperBrightness * 100)}%
              </span>
            </div>

            <input
              data-testid="brightness-slider"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={wallpaperBrightness}
              onChange={(e) => saveBrightness(parseFloat(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--color-accent)',
                cursor: 'pointer',
              }}
            />

            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.26)' }}>Off</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.26)' }}>Full</span>
            </div>

            {(saving || saved) && (
              <p className="text-xs mt-2" style={{ color: saving ? 'rgba(255,255,255,0.36)' : 'var(--color-accent-green)' }}>
                {saving ? 'Saving…' : 'Saved'}
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Notifications ───────────────────────────────── */}
      <section className="card p-5 mb-4" data-testid="notif-section">
        <h2 className="text-sm font-semibold text-text-primary mb-5">Notifications</h2>

        {/* Notification mode */}
        <div className="mb-5">
          <div className="mb-3">
            <p className="text-sm text-text-primary">Notification mode</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.36)' }}>
              Control when the app sends native OS notifications
            </p>
          </div>
          <div
            className="flex rounded-xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              width: 'fit-content',
            }}
            data-testid="notif-mode-toggle"
          >
            {(['always', 'background', 'never'] as const).map((mode) => (
              <button
                key={mode}
                data-testid={`notif-mode-${mode}`}
                onClick={() => saveNotifMode(mode)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12.5,
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  background: notifMode === mode ? 'var(--color-accent)' : 'transparent',
                  color: notifMode === mode ? '#fff' : 'rgba(255,255,255,0.46)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {mode === 'background' ? 'Background only' : mode === 'always' ? 'Always' : 'Never'}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />

        {/* Per-event toggles */}
        <div>
          <p className="text-sm font-medium text-text-primary mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Events
          </p>
          <div className="space-y-4">
            <ToggleRow
              label="Task complete"
              description="When an agent finishes a task successfully"
              checked={notifTaskComplete}
              onChange={(v) => saveNotifEvent('notif_task_complete', v, setNotifTaskComplete)}
              accent={accentColor}
              testid="notif-toggle-task-complete"
            />
            <ToggleRow
              label="Task failed"
              description="When a task encounters an error"
              checked={notifTaskFailed}
              onChange={(v) => saveNotifEvent('notif_task_failed', v, setNotifTaskFailed)}
              accent={accentColor}
              testid="notif-toggle-task-failed"
            />
            <ToggleRow
              label="Budget alert"
              description="When spending approaches or exceeds your set limits"
              checked={notifBudgetAlert}
              onChange={(v) => saveNotifEvent('notif_budget_alert', v, setNotifBudgetAlert)}
              accent={accentColor}
              testid="notif-toggle-budget-alert"
            />
          </div>
        </div>
      </section>

      {/* ── About ───────────────────────────────────────── */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">About</h2>
        <div className="space-y-3">
          <Row label="App"        value="Conductr" />
          <Row label="Version"    value="1.0.0" />
          <Row label="Model"      value="claude-sonnet-4-6" />
          <Row label="Built with" value="Electron · React · SQLite" />
        </div>
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.46)' }}>{label}</span>
      <span className="text-sm text-text-secondary">{value}</span>
    </div>
  )
}
