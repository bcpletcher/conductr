import { useEffect, useState, useRef } from 'react'
import { useUIStore } from '../store/ui'
import { WALLPAPER_PRESETS } from '../constants/wallpapers'
import type { McpServer, McpRegistryEntry, ConductorMode } from '../env.d'

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
  const cardGlassIntensity     = useUIStore((s) => s.cardGlassIntensity)
  const setCardGlassIntensity  = useUIStore((s) => s.setCardGlassIntensity)
  const cardPanelDarkness      = useUIStore((s) => s.cardPanelDarkness)
  const setCardPanelDarkness   = useUIStore((s) => s.setCardPanelDarkness)
  const cardPanelBrightness    = useUIStore((s) => s.cardPanelBrightness)
  const setCardPanelBrightness = useUIStore((s) => s.setCardPanelBrightness)
  const mode                   = useUIStore((s) => s.mode)
  const setMode                = useUIStore((s) => s.setMode)
  const [saving, setSaving]    = useState(false)
  const [saved,  setSaved]     = useState(false)

  // Mode-switch restart modal state
  const [showRestartModal,    setShowRestartModal]    = useState(false)
  const [pendingMode,         setPendingMode]         = useState<ConductorMode | null>(null)
  const [restarting,          setRestarting]          = useState(false)

  // MCP Servers state
  const [mcpServers, setMcpServers] = useState<McpServer[]>([])
  const [mcpRegistry, setMcpRegistry] = useState<McpRegistryEntry[]>([])
  const [showRegistryModal, setShowRegistryModal] = useState(false)
  const [addServerForm, setAddServerForm] = useState<{
    name: string; type: 'stdio' | 'sse'; command: string; args: string; url: string
  }>({ name: '', type: 'stdio', command: '', args: '', url: '' })
  const [addingServer, setAddingServer] = useState(false)
  const [testingServer, setTestingServer] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null)
  const [mcpError, setMcpError] = useState('')

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
    api.settings.get('card_glass_intensity').then((val) => {
      if (val !== null) setCardGlassIntensity(parseFloat(val))
    })
    api.settings.get('card_panel_darkness').then((val) => {
      if (val !== null) setCardPanelDarkness(parseFloat(val))
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
    api.mcp.listServers().then(setMcpServers).catch(() => {})
    api.mcp.getRegistry().then(setMcpRegistry).catch(() => {})
  }, [setWallpaperBrightness, setAccentColor, setDensity, setWallpaperStyle, setCustomWallpaperPath, setCardGlassIntensity, setCardPanelDarkness])

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

  async function handleAddServer(): Promise<void> {
    if (!addServerForm.name.trim()) { setMcpError('Name is required.'); return }
    if (addServerForm.type === 'stdio' && !addServerForm.command.trim()) { setMcpError('Command is required for stdio.'); return }
    if (addServerForm.type === 'sse' && !addServerForm.url.trim()) { setMcpError('URL is required for SSE.'); return }
    setMcpError('')
    setAddingServer(true)
    try {
      const args = addServerForm.args.trim()
        ? addServerForm.args.split(/\s+/).filter(Boolean)
        : []
      const server = await api.mcp.addServer({
        name: addServerForm.name.trim(),
        type: addServerForm.type,
        command: addServerForm.type === 'stdio' ? addServerForm.command.trim() : undefined,
        args: addServerForm.type === 'stdio' ? args : undefined,
        url: addServerForm.type === 'sse' ? addServerForm.url.trim() : undefined,
      })
      setMcpServers(prev => [...prev, server])
      setAddServerForm({ name: '', type: 'stdio', command: '', args: '', url: '' })
    } catch (err) {
      setMcpError(err instanceof Error ? err.message : 'Failed to add server.')
    }
    setAddingServer(false)
  }

  async function handleRemoveServer(id: string): Promise<void> {
    await api.mcp.removeServer(id).catch(() => {})
    setMcpServers(prev => prev.filter(s => s.id !== id))
  }

  async function handleTestServer(id: string): Promise<void> {
    setTestingServer(id)
    setTestResult(null)
    const status = await api.mcp.reconnect(id).catch(() => ({ status: 'error', toolCount: 0, error: 'Failed' }))
    setMcpServers(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    setTestResult({
      id,
      ok: status.status === 'connected',
      msg: status.status === 'connected' ? `Connected — ${status.toolCount} tools available` : (status.error ?? 'Connection failed'),
    })
    setTestingServer(null)
  }

  function handleQuickInstall(entry: McpRegistryEntry): void {
    setAddServerForm({
      name: entry.name,
      type: 'stdio',
      command: entry.command,
      args: (entry.args ?? []).join(' '),
      url: '',
    })
    setShowRegistryModal(false)
  }

  async function handlePickCustomWallpaper(): Promise<void> {
    const filePath = await api.settings.pickWallpaper()
    if (!filePath) return
    setCustomWallpaperPath(filePath)
    await api.settings.set('wallpaper_custom', filePath)
    await saveWallpaperStyle('custom')
  }

  type SettingsSection = 'mode' | 'appearance' | 'notifications' | 'shortcuts' | 'integrations' | 'network' | 'about'
  const [activeSection, setActiveSection] = useState<SettingsSection>('mode')

  const NAV_ITEMS: { id: SettingsSection; label: string; icon: string; description: string }[] = [
    { id: 'mode',          label: 'Mode',          icon: 'fa-solid fa-sliders',          description: 'Claude Code or API Key' },
    { id: 'appearance',    label: 'Appearance',    icon: 'fa-solid fa-palette',          description: 'Theme, colors, wallpaper' },
    { id: 'notifications', label: 'Notifications', icon: 'fa-solid fa-bell',             description: 'Alerts and events' },
    { id: 'shortcuts',     label: 'Shortcuts',     icon: 'fa-solid fa-keyboard',         description: 'Keyboard bindings' },
    { id: 'integrations',  label: 'Integrations',  icon: 'fa-solid fa-plug',             description: 'MCP tool servers' },
    { id: 'network',       label: 'Network',       icon: 'fa-solid fa-network-wired',    description: 'Server mode & Tailscale' },
    { id: 'about',         label: 'About',         icon: 'fa-solid fa-circle-info',      description: 'App info & updates' },
  ]

  function requestModeSwitch(newMode: ConductorMode): void {
    setPendingMode(newMode)
    setShowRestartModal(true)
  }

  async function confirmModeSwitch(): Promise<void> {
    if (!pendingMode) return
    setRestarting(true)
    await api.settings.set('conductor_mode', pendingMode)
    setMode(pendingMode)
    await api.app.relaunch()
  }

  return (<>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure appearance, integrations & preferences</p>
      </div>

      <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>

        {/* ── Left nav ───────────────────────────────────── */}
        <div style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px',
                  borderRadius: 10, cursor: 'pointer',
                  background: isActive ? 'var(--card-bg, rgba(255,255,255,0.04))' : 'transparent',
                  border: isActive ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                  borderLeft: isActive ? `3px solid ${accentColor}` : '3px solid transparent',
                  boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 4px rgba(0,0,0,0.30)' : 'none',
                  transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 10,
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: isActive ? `${accentColor}20` : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${isActive ? `${accentColor}35` : 'rgba(255,255,255,0.09)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.12s',
                  }}
                >
                  <i className={item.icon} style={{ fontSize: 12, color: isActive ? accentColor : 'rgba(255,255,255,0.46)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? '#eef0f8' : 'rgba(255,255,255,0.70)', lineHeight: 1.2 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.30)', marginTop: 1, lineHeight: 1 }}>
                    {item.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Right content ──────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingBottom: 32 }}>

      {/* ── Mode Section ─────────────────────────────────── */}
      {activeSection === 'mode' && (
        <section className="card p-5 mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-1">Conductor Mode</h2>
          <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.40)' }}>
            Choose how Conductr executes agent tasks. A restart is required when switching modes.
          </p>

          {/* Mode cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Claude Code Mode */}
            <div
              onClick={() => mode !== 'claude-code' && requestModeSwitch('claude-code')}
              style={{
                padding: '16px 18px',
                borderRadius: 12,
                border: mode === 'claude-code'
                  ? `2px solid ${accentColor}60`
                  : '2px solid rgba(255,255,255,0.08)',
                background: mode === 'claude-code'
                  ? `${accentColor}0d`
                  : 'rgba(255,255,255,0.02)',
                cursor: mode !== 'claude-code' ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: mode === 'claude-code' ? `${accentColor}20` : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${mode === 'claude-code' ? `${accentColor}40` : 'rgba(255,255,255,0.10)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className="fa-solid fa-code" style={{ fontSize: 14, color: mode === 'claude-code' ? accentColor : 'rgba(255,255,255,0.45)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#eef0f8' }}>Claude Code Mode</span>
                    {mode === 'claude-code' && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                        background: `${accentColor}25`, color: accentColor, letterSpacing: '0.04em',
                      }}>ACTIVE</span>
                    )}
                  </div>
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                    Tasks run via your Claude subscription — no API key needed
                  </p>
                </div>
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 48px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {['Uses Claude Code CLI (claude)','Billed to your Claude subscription','Native context compaction','Agents work on project dirs in ~/.conductr/agents/'].map((f) => (
                  <li key={f} style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-check" style={{ fontSize: 9, color: '#34d399', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              {mode !== 'claude-code' && (
                <div style={{ marginTop: 12, paddingLeft: 48 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); requestModeSwitch('claude-code') }}
                    style={{
                      padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      background: `${accentColor}20`, color: accentColor,
                      border: `1px solid ${accentColor}40`,
                    }}
                  >
                    Switch to Claude Code Mode
                  </button>
                </div>
              )}
            </div>

            {/* API Key Mode */}
            <div
              onClick={() => mode !== 'api-key' && requestModeSwitch('api-key')}
              style={{
                padding: '16px 18px',
                borderRadius: 12,
                border: mode === 'api-key'
                  ? '2px solid rgba(251,191,36,0.45)'
                  : '2px solid rgba(255,255,255,0.08)',
                background: mode === 'api-key'
                  ? 'rgba(251,191,36,0.06)'
                  : 'rgba(255,255,255,0.02)',
                cursor: mode !== 'api-key' ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: mode === 'api-key' ? 'rgba(251,191,36,0.16)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${mode === 'api-key' ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.10)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className="fa-solid fa-key" style={{ fontSize: 13, color: mode === 'api-key' ? '#fbbf24' : 'rgba(255,255,255,0.45)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#eef0f8' }}>API Key Mode</span>
                    {mode === 'api-key' && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                        background: 'rgba(251,191,36,0.18)', color: '#fbbf24', letterSpacing: '0.04em',
                      }}>ACTIVE</span>
                    )}
                  </div>
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                    Direct API access with full provider control and usage metrics
                  </p>
                </div>
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 48px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {['Anthropic, OpenRouter, Groq, Ollama & more','Per-token billing with live cost tracking','Multi-provider routing & fallback','Providers, API Manager & Dev Tools unlocked'].map((f) => (
                  <li key={f} style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-check" style={{ fontSize: 9, color: '#34d399', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              {mode !== 'api-key' && (
                <div style={{ marginTop: 12, paddingLeft: 48 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); requestModeSwitch('api-key') }}
                    style={{
                      padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      background: 'rgba(251,191,36,0.12)', color: '#fbbf24',
                      border: '1px solid rgba(251,191,36,0.30)',
                    }}
                  >
                    Switch to API Key Mode
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeSection === 'appearance' && (
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

        {/* Glass & Display controls */}
        <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-semibold text-text-primary mb-4">Glass &amp; Display</p>

          {/* Row layout — 2-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {/* Wallpaper brightness (moved from above) */}
            {(wallpaperStyle !== 'none') && (
              <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                <div className="flex items-center justify-between mb-2">
                  <p style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.70)' }}>Brightness</p>
                  <span data-testid="brightness-value" style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace' }}>{Math.round(wallpaperBrightness * 100)}%</span>
                </div>
                <input
                  data-testid="brightness-slider"
                  type="range" min={0} max={1} step={0.05}
                  value={wallpaperBrightness}
                  onChange={(e) => saveBrightness(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                />
                <div className="flex justify-between mt-1">
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.26)' }}>Dim</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.26)' }}>Full</span>
                </div>
              </div>
            )}

            {/* Glass blur */}
            <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
              <div className="flex items-center justify-between mb-2">
                <p style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.70)' }}>Glass Blur</p>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace' }}>{Math.round(cardGlassIntensity * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.05}
                value={cardGlassIntensity}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setCardGlassIntensity(v)
                  api.settings.set('card_glass_intensity', String(v)).catch(() => {})
                }}
                style={{ width: '100%', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
              />
              <div className="flex justify-between mt-1">
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.26)' }}>Clear</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.26)' }}>Frosted</span>
              </div>
            </div>

            {/* Panel opacity */}
            <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
              <div className="flex items-center justify-between mb-2">
                <p style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.70)' }}>Panel Opacity</p>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace' }}>{Math.round(cardPanelDarkness * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.05}
                value={cardPanelDarkness}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setCardPanelDarkness(v)
                  api.settings.set('card_panel_darkness', String(v)).catch(() => {})
                }}
                style={{ width: '100%', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
              />
              <div className="flex justify-between mt-1">
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.26)' }}>Ghost</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.26)' }}>Solid</span>
              </div>
            </div>

            {/* Panel brightness */}
            <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
              <div className="flex items-center justify-between mb-2">
                <p style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.70)' }}>Panel Brightness</p>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace' }}>{Math.round((0.5 + cardPanelBrightness) * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.05}
                value={cardPanelBrightness}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setCardPanelBrightness(v)
                  api.settings.set('card_panel_brightness', String(v)).catch(() => {})
                }}
                style={{ width: '100%', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
              />
              <div className="flex justify-between mt-1">
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.26)' }}>Dark</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.26)' }}>Bright</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      )}

      {activeSection === 'notifications' && (
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

      )}

      {activeSection === 'shortcuts' && (
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

      )}

      {activeSection === 'integrations' && (
      <>
      <section className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">MCP Tool Servers</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.36)' }}>
              Connect agents to external tools — filesystem, web, databases, APIs, and more.
            </p>
          </div>
          <button
            onClick={() => setShowRegistryModal(true)}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}40`, color: accentColor, cursor: 'pointer' }}
          >
            <i className="fa-solid fa-store mr-1.5" />Browse Registry
          </button>
        </div>

        {/* Configured servers */}
        {mcpServers.length > 0 && (
          <div className="mb-4" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mcpServers.map(server => {
              const st = server.status
              const isConnected = st?.status === 'connected'
              const isError = st?.status === 'error'
              const isTesting = testingServer === server.id
              const result = testResult?.id === server.id ? testResult : null
              return (
                <div key={server.id} style={{
                  padding: '11px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                    background: isConnected ? '#34d399' : isError ? '#f87171' : isTesting ? accentColor : 'rgba(255,255,255,0.18)',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="text-sm text-text-primary font-medium">{server.name}</span>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4,
                        background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.44)',
                      }}>{server.type}</span>
                      {isConnected && (
                        <span style={{ fontSize: 10, color: '#34d399' }}>{st.toolCount} tool{st.toolCount !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginTop: 2, fontFamily: 'monospace' }}>
                      {server.type === 'stdio' ? `${server.command} ${(server.args ?? []).join(' ')}` : server.url}
                    </div>
                    {result && (
                      <div style={{ fontSize: 11, marginTop: 4, color: result.ok ? '#34d399' : '#f87171' }}>
                        <i className={`fa-solid ${result.ok ? 'fa-circle-check' : 'fa-circle-xmark'} mr-1`} />{result.msg}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleTestServer(server.id)}
                      disabled={isTesting}
                      style={{
                        padding: '4px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.56)',
                      }}
                    >
                      {isTesting ? <i className="fa-solid fa-circle-notch fa-spin" /> : 'Test'}
                    </button>
                    <button
                      onClick={() => handleRemoveServer(server.id)}
                      style={{
                        padding: '4px 8px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                        background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                        color: '#f87171',
                      }}
                    >
                      <i className="fa-solid fa-trash-can" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add server form */}
        <div style={{
          padding: '14px', borderRadius: 10,
          background: 'rgba(255,255,255,0.025)', border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.44)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Add Server
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input
              value={addServerForm.name}
              onChange={e => setAddServerForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Name (e.g. Filesystem)"
              style={{
                padding: '7px 10px', borderRadius: 7, fontSize: 12,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f1f5f9', outline: 'none',
              }}
            />
            <select
              value={addServerForm.type}
              onChange={e => setAddServerForm(p => ({ ...p, type: e.target.value as 'stdio' | 'sse' }))}
              style={{
                padding: '7px 10px', borderRadius: 7, fontSize: 12,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f1f5f9', outline: 'none',
              }}
            >
              <option value="stdio">stdio (local process)</option>
              <option value="sse">SSE (HTTP endpoint)</option>
            </select>
          </div>
          {addServerForm.type === 'stdio' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input
                value={addServerForm.command}
                onChange={e => setAddServerForm(p => ({ ...p, command: e.target.value }))}
                placeholder="Command (e.g. npx)"
                style={{
                  padding: '7px 10px', borderRadius: 7, fontSize: 12,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f1f5f9', outline: 'none', fontFamily: 'monospace',
                }}
              />
              <input
                value={addServerForm.args}
                onChange={e => setAddServerForm(p => ({ ...p, args: e.target.value }))}
                placeholder="Arguments (e.g. -y @mcp/server-fetch)"
                style={{
                  padding: '7px 10px', borderRadius: 7, fontSize: 12,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f1f5f9', outline: 'none', fontFamily: 'monospace',
                }}
              />
            </div>
          ) : (
            <input
              value={addServerForm.url}
              onChange={e => setAddServerForm(p => ({ ...p, url: e.target.value }))}
              placeholder="URL (e.g. http://localhost:3000/sse)"
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 12, marginBottom: 8,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f1f5f9', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box',
              }}
            />
          )}
          {mcpError && (
            <div style={{ fontSize: 11, color: '#f87171', marginBottom: 8 }}>
              <i className="fa-solid fa-circle-xmark mr-1" />{mcpError}
            </div>
          )}
          <button
            onClick={handleAddServer}
            disabled={addingServer}
            style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: `${accentColor}18`, border: `1px solid ${accentColor}40`, color: accentColor,
            }}
          >
            {addingServer ? <><i className="fa-solid fa-circle-notch fa-spin mr-1.5" />Connecting…</> : <><i className="fa-solid fa-plus mr-1.5" />Add & Connect</>}
          </button>
        </div>
      </section>

      {/* Registry Modal */}
      {showRegistryModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowRegistryModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 640, maxHeight: '80vh', borderRadius: 16, overflow: 'hidden',
              background: 'rgba(12,12,20,0.96)', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>MCP Server Registry</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.36)', marginTop: 2 }}>Popular community servers — click to pre-fill the add form</div>
              </div>
              <button onClick={() => setShowRegistryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.44)', fontSize: 16 }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(
                mcpRegistry.reduce<Record<string, McpRegistryEntry[]>>((acc, entry) => {
                  ;(acc[entry.category] ??= []).push(entry)
                  return acc
                }, {})
              ).map(([category, entries]) => (
                <div key={category}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 6, marginTop: 4 }}>
                    {category}
                  </div>
                  {entries.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => handleQuickInstall(entry)}
                      style={{
                        display: 'flex', width: '100%', alignItems: 'flex-start', gap: 12,
                        padding: '11px 12px', borderRadius: 9, marginBottom: 4, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                        textAlign: 'left', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${accentColor}10`)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    >
                      <i className="fa-solid fa-plug" style={{ fontSize: 14, color: accentColor, marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {entry.name}
                          {entry.requiresKey && (
                            <span style={{ fontSize: 10, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                              requires API key
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginTop: 2 }}>{entry.description}</div>
                        <code style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace', marginTop: 3, display: 'block' }}>
                          {entry.command} {(entry.args ?? []).join(' ')}
                        </code>
                      </div>
                      <i className="fa-solid fa-arrow-right" style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 4, flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      </>
      )}

      {activeSection === 'network' && (
        <NetworkTab accent={accentColor} />
      )}

      {activeSection === 'about' && (
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
      )}

        </div> {/* right content */}
      </div> {/* flex row */}
    </div>
  )
}

// ── NetworkTab ─────────────────────────────────────────────────────────────────

function NetworkTab({ accent }: { accent: string }): React.JSX.Element {
  const [status, setStatus] = useState<import('../env.d').NetworkStatus | null>(null)
  const [peers, setPeers] = useState<import('../env.d').PeerInfo[]>([])
  const [showConnectForm, setShowConnectForm] = useState(false)
  const [connectIp, setConnectIp] = useState('')
  const [connectCode, setConnectCode] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [hostConnected, setHostConnected] = useState(true)

  useEffect(() => {
    api.network.getStatus().then(setStatus).catch(() => {})
    api.network.getTailscalePeers().then(setPeers).catch(() => {})

    api.network.onStatusChange((s) => setStatus(s as import('../env.d').NetworkStatus))
    api.network.onConnectionStatus(({ connected }) => setHostConnected(connected))

    return () => {
      api.network.removeAllListeners()
    }
  }, [])

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: '16px 18px',
    marginBottom: 14,
  }

  const label14: React.CSSProperties = {
    fontSize: 12,
    color: 'rgba(255,255,255,0.40)',
    marginBottom: 3,
    letterSpacing: '0.03em',
    textTransform: 'uppercase' as const,
    fontWeight: 600,
  }

  const infoValue: React.CSSProperties = {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'monospace',
    wordBreak: 'break-all' as const,
  }

  // Status color for the top border
  const modeColor = status?.mode === 'host' ? '#818cf8'
                  : status?.mode === 'client' ? '#34d399'
                  : 'rgba(255,255,255,0.18)'

  const modeLabel = status?.mode === 'host' ? 'Host'
                  : status?.mode === 'client' ? 'Client'
                  : 'Standalone'

  async function handleEnableHost(): Promise<void> {
    const res = await api.network.enableHostMode()
    setStatus(await api.network.getStatus())
    if (!res.ok) return
  }

  async function handleDisableHost(): Promise<void> {
    await api.network.disableHostMode()
    setStatus(await api.network.getStatus())
  }

  async function handleRegen(): Promise<void> {
    await api.network.regeneratePairingCode()
    setStatus(await api.network.getStatus())
  }

  async function handleConnect(): Promise<void> {
    if (!connectIp.trim() || !connectCode.trim()) return
    setConnecting(true)
    setConnectError('')
    const res = await api.network.connectToHost(connectIp.trim(), connectCode.trim())
    setConnecting(false)
    if (res.ok) {
      setShowConnectForm(false)
      setConnectIp('')
      setConnectCode('')
      setStatus(await api.network.getStatus())
    } else {
      setConnectError(res.error ?? 'Connection failed')
    }
  }

  async function handleDisconnect(): Promise<void> {
    await api.network.disconnectFromHost()
    setStatus(await api.network.getStatus())
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 11px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 8,
    fontSize: 13,
    color: '#f1f5f9',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* ── Status card ──────────────────────────────────── */}
      <div style={{
        ...card,
        borderTop: `2px solid ${modeColor}`,
        background: `rgba(255,255,255,0.035)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 className="text-sm font-semibold text-text-primary">Network Mode</h2>
          <span style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            padding: '3px 9px',
            borderRadius: 20,
            background: `${modeColor}20`,
            border: `1px solid ${modeColor}50`,
            color: modeColor,
          }}>
            {modeLabel}
          </span>
        </div>

        {/* IPs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={label14}>LAN IP</div>
            <div style={infoValue}>{status?.lanIp ?? '—'}</div>
          </div>
          <div>
            <div style={label14}>Tailscale IP</div>
            <div style={infoValue}>{status?.tailscaleIp ?? '—'}</div>
          </div>
        </div>

        {/* Actions — standalone mode */}
        {status?.mode === 'standalone' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleEnableHost}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: `${accent}18`, border: `1px solid ${accent}45`, color: accent,
              }}
            >
              <i className="fa-solid fa-server mr-1.5" style={{ fontSize: 10 }} />
              Enable Host Mode
            </button>
            <button
              onClick={() => { setShowConnectForm(true); setConnectError('') }}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.65)',
              }}
            >
              <i className="fa-solid fa-plug mr-1.5" style={{ fontSize: 10 }} />
              Connect to Host
            </button>
          </div>
        )}
      </div>

      {/* ── Connect-to-host form ─────────────────────────── */}
      {status?.mode === 'standalone' && showConnectForm && (
        <div style={card}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>
            Connect to Host
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ ...label14, marginBottom: 5 }}>Host IP</div>
              <input
                type="text"
                placeholder="192.168.1.x or Tailscale IP"
                value={connectIp}
                onChange={(e) => setConnectIp(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ ...label14, marginBottom: 5 }}>6-Digit Pairing Code</div>
              <input
                type="text"
                placeholder="123456"
                value={connectCode}
                onChange={(e) => setConnectCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                style={inputStyle}
              />
            </div>
            {connectError && (
              <div style={{ fontSize: 12, color: '#f87171', padding: '6px 10px', background: 'rgba(239,68,68,0.10)', borderRadius: 7, border: '1px solid rgba(239,68,68,0.25)' }}>
                {connectError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button
                onClick={() => void handleConnect()}
                disabled={connecting || !connectIp || connectCode.length < 6}
                style={{
                  padding: '7px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  background: connecting ? 'rgba(255,255,255,0.06)' : `${accent}20`,
                  border: `1px solid ${accent}45`,
                  color: connecting ? 'rgba(255,255,255,0.35)' : accent,
                  opacity: !connectIp || connectCode.length < 6 ? 0.5 : 1,
                }}
              >
                {connecting
                  ? <><i className="fa-solid fa-spinner fa-spin mr-1.5" style={{ fontSize: 10 }} />Connecting…</>
                  : 'Connect'}
              </button>
              <button
                onClick={() => { setShowConnectForm(false); setConnectError('') }}
                style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Host Mode section ─────────────────────────────── */}
      {status?.mode === 'host' && (
        <>
          {/* Pairing code card */}
          <div style={{ ...card, background: 'rgba(0,0,0,0.20)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>Pairing Code</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
                  Share with your client machine. Expires when host mode is disabled.
                </div>
              </div>
              <button
                onClick={() => void handleRegen()}
                style={{
                  padding: '5px 11px', borderRadius: 7, fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                <i className="fa-solid fa-arrows-rotate mr-1" style={{ fontSize: 10 }} />
                Regenerate
              </button>
            </div>
            <div style={{
              fontSize: 30,
              fontFamily: 'monospace',
              letterSpacing: '0.22em',
              color: '#eef0f8',
              padding: '10px 0 6px',
              textAlign: 'center',
            }}>
              {status.pairingCode ?? '——————'}
            </div>
          </div>

          {/* Host info row */}
          <div style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <div style={label14}>Server Port</div>
              <div style={infoValue}>9876</div>
            </div>
            <div>
              <div style={label14}>Connected Clients</div>
              <div style={infoValue}>{status.connectedClients}</div>
            </div>
            <div>
              <div style={label14}>Server Running</div>
              <div style={{ fontSize: 13, color: status.hostServerRunning ? '#34d399' : '#f87171' }}>
                <i className={`fa-solid ${status.hostServerRunning ? 'fa-circle-check' : 'fa-circle-xmark'} mr-1.5`} />
                {status.hostServerRunning ? 'Active' : 'Stopped'}
              </div>
            </div>
          </div>

          {/* Disable button */}
          <button
            onClick={() => void handleDisableHost()}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', marginBottom: 14,
            }}
          >
            <i className="fa-solid fa-stop mr-1.5" style={{ fontSize: 10 }} />
            Disable Host Mode
          </button>
        </>
      )}

      {/* ── Client Mode section ───────────────────────────── */}
      {status?.mode === 'client' && (
        <>
          {/* Offline warning */}
          {!hostConnected && (
            <div style={{
              padding: '9px 14px', marginBottom: 10,
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.28)',
              borderRadius: 9, fontSize: 12, color: '#fbbf24',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <i className="fa-solid fa-triangle-exclamation" />
              Host unreachable — running with local data only.
            </div>
          )}

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>
                  Connected Host
                </div>
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.65)' }}>
                  {status.lanIp ?? 'Unknown IP'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: hostConnected ? '#34d399' : '#f87171',
                    boxShadow: hostConnected ? '0 0 6px #34d399' : 'none',
                    animation: hostConnected ? 'pulse 2s infinite' : 'none',
                  }} />
                  <span style={{ color: hostConnected ? '#34d399' : '#f87171' }}>
                    {hostConnected ? 'Connected' : 'Offline'}
                  </span>
                </span>
                <button
                  onClick={() => void handleDisconnect()}
                  style={{
                    padding: '5px 11px', borderRadius: 7, fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    color: '#f87171',
                  }}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Tailscale section ─────────────────────────────── */}
      <div style={{ ...card, marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>Tailscale</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
              Secure remote access without port forwarding
            </div>
          </div>
          {!status?.tailscaleIp && (
            <button
              onClick={() => void api.network.installTailscale()}
              style={{
                padding: '5px 11px', borderRadius: 7, fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                background: `${accent}14`, border: `1px solid ${accent}35`, color: accent,
              }}
            >
              <i className="fa-solid fa-arrow-up-right-from-square mr-1" style={{ fontSize: 9 }} />
              Install Tailscale
            </button>
          )}
        </div>

        {status?.tailscaleIp ? (
          <div style={{ marginBottom: peers.length > 0 ? 12 : 0 }}>
            <div style={label14}>Your Tailscale IP</div>
            <div style={{ ...infoValue, color: '#34d399' }}>{status.tailscaleIp}</div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: peers.length > 0 ? 12 : 0 }}>
            Tailscale not detected on this machine.
          </div>
        )}

        {peers.length > 0 && (
          <div>
            <div style={{ ...label14, marginBottom: 8 }}>Network Peers ({peers.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {peers.map((peer) => (
                <div
                  key={peer.ip}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12.5, color: '#f1f5f9' }}>{peer.name}</div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>{peer.ip}</div>
                  </div>
                  {peer.isConductrHost && (
                    <button
                      onClick={() => { setConnectIp(peer.ip); setShowConnectForm(true) }}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        background: `${accent}14`, border: `1px solid ${accent}35`, color: accent,
                      }}
                    >
                      Connect
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* ── Restart Required Modal ─────────────────────────────── */}
    {showRestartModal && (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.70)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={() => !restarting && setShowRestartModal(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 420, padding: '28px 28px 24px',
            background: 'rgba(12,13,26,0.96)',
            backdropFilter: 'blur(48px) saturate(1.4)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16,
            boxShadow: '0 32px 80px rgba(0,0,0,0.80)',
          }}
        >
          {/* Icon + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, flexShrink: 0,
              background: 'rgba(251,191,36,0.14)',
              border: '1px solid rgba(251,191,36,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 16, color: '#fbbf24' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#eef0f8' }}>Restart Required</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>
                Switching to {pendingMode === 'claude-code' ? 'Claude Code Mode' : 'API Key Mode'}
              </div>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, marginBottom: 20 }}>
            {pendingMode === 'claude-code'
              ? 'Conductr will switch to using the Claude Code CLI for all task execution. Make sure you have the claude CLI installed before switching.'
              : 'Conductr will unlock Providers, API Manager, and Dev Tools. You\'ll need to configure at least one API key to run tasks.'
            }
            {' '}The app will restart automatically to apply the change.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowRestartModal(false)}
              disabled={restarting}
              style={{
                padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirmModeSwitch}
              disabled={restarting}
              style={{
                padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: restarting ? 'default' : 'pointer',
                background: restarting ? 'rgba(251,191,36,0.14)' : 'rgba(251,191,36,0.20)',
                color: '#fbbf24',
                border: '1px solid rgba(251,191,36,0.35)',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              {restarting
                ? <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 11 }} /> Restarting…</>
                : <><i className="fa-solid fa-arrow-rotate-right" style={{ fontSize: 11 }} /> Switch & Restart</>
              }
            </button>
          </div>
        </div>
      </div>
    )}
  </>)
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
