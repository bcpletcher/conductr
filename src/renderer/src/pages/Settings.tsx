import { useEffect, useState, useRef } from 'react'
import { useUIStore } from '../store/ui'
import { WALLPAPER_PRESETS } from '../constants/wallpapers'

const api = window.electronAPI

// ── Keybinding helpers ────────────────────────────────────────────────────────
function formatBinding(binding: string): string {
  const parts = binding.toLowerCase().split('+')
  const key   = parts[parts.length - 1]
  const isMac = navigator.platform.includes('Mac')
  const mod   = parts.includes('cmd')   ? (isMac ? '⌘' : 'Ctrl+') : ''
  const shift = parts.includes('shift') ? (isMac ? '⇧' : 'Shift+') : ''
  const alt   = parts.includes('alt')   ? (isMac ? '⌥' : 'Alt+')  : ''
  return `${mod}${shift}${alt}${key.length === 1 ? key.toUpperCase() : key}`
}

function eventToBinding(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push('cmd')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey)   parts.push('alt')
  parts.push(e.key.toLowerCase())
  return parts.join('+')
}

// ── KeybindingRow ─────────────────────────────────────────────────────────────
function KeybindingRow({
  label,
  description,
  bindingKey,
  accent,
}: {
  label: string
  description: string
  bindingKey: 'palette' | 'search' | 'sheet'
  accent: string
}): React.JSX.Element {
  const binding       = useUIStore((s) => s.keybindings[bindingKey])
  const setKeybinding = useUIStore((s) => s.setKeybinding)
  const [recording, setRecording] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!recording) return
    const handler = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') { setRecording(false); return }
      // Ignore modifier-only keys
      if (['Meta', 'Control', 'Shift', 'Alt'].includes(e.key)) return
      const combo = eventToBinding(e)
      setKeybinding(bindingKey, combo)
      api.settings.set(`kb_${bindingKey}`, combo)
      setRecording(false)
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [recording, bindingKey, setKeybinding])

  const parts = formatBinding(binding).split(/(?=[⌘⇧⌥]|Ctrl\+|Shift\+|Alt\+)/)

  return (
    <div className="flex items-center justify-between py-1">
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <p className="text-sm text-text-primary">{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.36)' }}>{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {recording ? (
          <div
            ref={overlayRef}
            style={{
              padding: '4px 10px',
              background: `${accent}18`,
              border: `1px solid ${accent}50`,
              borderRadius: 7,
              fontSize: 11,
              color: accent,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              animation: 'pulse 1s infinite',
            }}
          >
            Press keys… (Esc to cancel)
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              {formatBinding(binding).split('').map((char, i) => (
                <kbd
                  key={i}
                  style={{
                    padding: '2px 6px',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 5,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.72)',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                >
                  {char}
                </kbd>
              ))}
            </div>
            <button
              onClick={() => setRecording(true)}
              style={{
                padding: '3px 9px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 6,
                fontSize: 11,
                color: 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  )
}

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

      {/* ── Keyboard Shortcuts ──────────────────────────── */}
      <section className="card p-5 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Keyboard Shortcuts</h2>
        <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.36)' }}>
          Click Edit on any shortcut, then press your desired key combo to reassign it
        </p>
        <div className="space-y-4">
          <KeybindingRow
            label="Command Palette"
            description="Quick navigation, task creation, agent switch"
            bindingKey="palette"
            accent={accentColor}
          />
          <KeybindingRow
            label="Global Search"
            description="Search across tasks, agents, documents, and chat"
            bindingKey="search"
            accent={accentColor}
          />
          <KeybindingRow
            label="Shortcut Sheet"
            description="Show all keyboard shortcuts overlay"
            bindingKey="sheet"
            accent={accentColor}
          />
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
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <UpdateButton accent={accentColor} />
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

function UpdateButton({ accent }: { accent: string }): React.JSX.Element {
  const [status, setStatus] = useState<'idle' | 'checking' | 'up-to-date' | 'available' | 'error'>('idle')

  async function checkForUpdates(): Promise<void> {
    setStatus('checking')
    const result = await api.update.check()
    if (result.status === 'dev-mode') {
      setStatus('up-to-date')
    } else if (result.status === 'checked' && result.version) {
      setStatus('available')
    } else if (result.status === 'checked') {
      setStatus('up-to-date')
    } else {
      setStatus('error')
    }
    setTimeout(() => setStatus('idle'), 4000)
  }

  const label = status === 'checking'  ? 'Checking…'
              : status === 'up-to-date' ? 'Up to date'
              : status === 'available'  ? 'Update available!'
              : status === 'error'      ? 'No update server configured'
              : 'Check for Updates'

  const color = status === 'available' ? '#34d399'
              : status === 'error'     ? 'rgba(255,255,255,0.32)'
              : accent

  return (
    <button
      onClick={checkForUpdates}
      disabled={status === 'checking'}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '6px 14px',
        background: `${color}14`,
        border: `1px solid ${color}35`,
        borderRadius: 8,
        fontSize: 12,
        color,
        cursor: status === 'checking' ? 'default' : 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <i className={`fa-solid ${status === 'checking' ? 'fa-spinner fa-spin' : status === 'available' ? 'fa-circle-check' : 'fa-arrow-rotate-right'}`} style={{ fontSize: 11 }} />
      {label}
    </button>
  )
}
