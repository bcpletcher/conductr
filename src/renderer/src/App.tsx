import { useState, useEffect } from 'react'
import GradientBackground from './components/GradientBackground'
import Sidebar from './components/Sidebar'
import CommandPalette from './components/CommandPalette'
import ToastContainer from './components/Toast'
import ShortcutSheet from './components/ShortcutSheet'
import NotificationPanel from './components/NotificationPanel'
import WindowControls from './components/WindowControls'
import Onboarding from './components/Onboarding'
import SearchModal from './components/SearchModal'
import { useUIStore } from './store/ui'

// Keybinding helper — 'cmd' means metaKey OR ctrlKey (cross-platform)
function matchesBinding(e: KeyboardEvent, binding: string): boolean {
  const parts  = binding.toLowerCase().split('+')
  const key    = parts[parts.length - 1]
  const hasMod = e.metaKey || e.ctrlKey
  const wantsMod   = parts.includes('cmd')
  const wantsShift = parts.includes('shift')
  const wantsAlt   = parts.includes('alt')
  return hasMod === wantsMod
    && e.shiftKey === wantsShift
    && e.altKey   === wantsAlt
    && e.key.toLowerCase() === key
}

import Dashboard from './pages/Dashboard'
import Workshop from './pages/Workshop'
import Agents from './pages/Agents'
import Chat from './pages/Chat'
import Intelligence from './pages/Intelligence'
import Documents from './pages/Documents'
import Metrics from './pages/Metrics'
import Journal from './pages/Journal'
import Clients from './pages/Clients'
import Settings from './pages/Settings'
import Storyboard from './pages/Blueprint'
import Providers from './pages/Providers'
import DevTools from './pages/DevTools'

export type NavPage =
  | 'dashboard'
  | 'journal'
  | 'documents'
  | 'agents'
  | 'chat'
  | 'intelligence'
  | 'workshop'
  | 'clients'
  | 'metrics'
  | 'providers'
  | 'devtools'
  | 'settings'
  | 'blueprint'

const PAGE_MAP: Record<NavPage, React.ComponentType> = {
  dashboard: Dashboard,
  journal: Journal,
  documents: Documents,
  agents: Agents,
  chat: Chat,
  intelligence: Intelligence,
  workshop: Workshop,
  clients: Clients,
  metrics: Metrics,
  providers: Providers,
  devtools: DevTools,
  settings: Settings,
  blueprint: Storyboard,
}

export default function App(): React.JSX.Element {
  const [currentPage,    setCurrentPage]    = useState<NavPage>('dashboard')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const PageComponent = PAGE_MAP[currentPage]
  const openPalette            = useUIStore((s) => s.openPalette)
  const openSheet              = useUIStore((s) => s.openSheet)
  const openSearch             = useUIStore((s) => s.openSearch)
  const setWallpaperBrightness = useUIStore((s) => s.setWallpaperBrightness)
  const setAccentColor         = useUIStore((s) => s.setAccentColor)
  const setDensity             = useUIStore((s) => s.setDensity)
  const setWallpaperStyle      = useUIStore((s) => s.setWallpaperStyle)
  const setCustomWallpaperPath = useUIStore((s) => s.setCustomWallpaperPath)
  const keybindings            = useUIStore((s) => s.keybindings)
  const setKeybinding          = useUIStore((s) => s.setKeybinding)

  // Show onboarding on first launch (if not completed; skip in test mode or when env var is set)
  useEffect(() => {
    if (window.electronAPI.app.isTest) return
    if (import.meta.env.VITE_SKIP_ONBOARDING === 'true') return
    window.electronAPI.settings.get('onboarding_complete').then((val) => {
      if (!val) setShowOnboarding(true)
    }).catch(() => {})
  }, [])

  // Load persisted settings on first mount
  useEffect(() => {
    window.electronAPI.settings.get('wallpaper_brightness').then((val) => {
      if (val !== null) setWallpaperBrightness(parseFloat(val))
    })
    window.electronAPI.settings.get('accent_color').then((val) => {
      if (val !== null) setAccentColor(val)  // store.setAccentColor handles all CSS vars
    })
    window.electronAPI.settings.get('density').then((val) => {
      if (val === 'compact' || val === 'comfortable') setDensity(val)
    })
    window.electronAPI.settings.get('wallpaper_style').then((val) => {
      if (val) setWallpaperStyle(val)
    })
    window.electronAPI.settings.get('wallpaper_custom').then((val) => {
      if (val) setCustomWallpaperPath(val)
    })
    window.electronAPI.settings.get('kb_palette').then((val) => {
      if (val) setKeybinding('palette', val)
    })
    window.electronAPI.settings.get('kb_search').then((val) => {
      if (val) setKeybinding('search', val)
    })
    window.electronAPI.settings.get('kb_sheet').then((val) => {
      if (val) setKeybinding('sheet', val)
    })
  }, [setWallpaperBrightness, setAccentColor, setDensity, setWallpaperStyle, setCustomWallpaperPath, setKeybinding])

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (matchesBinding(e, keybindings.palette)) { e.preventDefault(); openPalette() }
      if (matchesBinding(e, keybindings.sheet))   { e.preventDefault(); openSheet() }
      if (matchesBinding(e, keybindings.search))  { e.preventDefault(); openSearch() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openPalette, openSheet, openSearch, keybindings])

  // Listen for shortcut sheet trigger from macOS menu bar
  useEffect(() => {
    window.electronAPI.app.onOpenShortcutSheet(() => openSheet())
    return () => window.electronAPI.app.removeShortcutSheetListener()
  }, [openSheet])

  // Listen for navigation requests from the system tray / menu-bar launcher
  useEffect(() => {
    window.electronAPI.app.onTrayNavigate((page) => {
      if (page in PAGE_MAP) setCurrentPage(page as NavPage)
    })
    return () => window.electronAPI.app.removeTrayNavigateListener()
  }, [])

  // Auto-updater status → toast
  const addToast = useUIStore((s) => s.addToast)
  useEffect(() => {
    window.electronAPI.update.onStatus(({ type, version }) => {
      if (type === 'available')
        addToast(`Update ${version ?? ''} available — downloading…`, 'info')
      else if (type === 'downloaded')
        addToast(`Update ${version ?? ''} ready — restart to install`, 'success')
    })
    return () => window.electronAPI.update.removeStatusListener()
  }, [addToast])

  return (
    <div className="flex h-screen w-screen overflow-hidden" data-testid="app">
      <GradientBackground />
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 flex flex-col overflow-hidden relative" data-testid="main-content">
        {/* Invisible drag strip — sits on top, allows dragging the window from the content header area */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 52,
            WebkitAppRegion: 'drag',
            zIndex: 10,
            pointerEvents: 'none',
          } as React.CSSProperties}
        />
        <div className="flex-1 overflow-y-auto h-full" style={{ padding: 'var(--page-pad, 1.5rem)' }} data-testid={`page-${currentPage}`}>
          {currentPage === 'dashboard'
            ? <Dashboard onNavigate={setCurrentPage} />
            : <PageComponent />}
        </div>
      </main>
      <CommandPalette onNavigate={setCurrentPage} />
      <ToastContainer />
      <ShortcutSheet />
      <NotificationPanel />
      <SearchModal onNavigate={setCurrentPage} />
      {/* Custom title-bar close/min/max — only rendered on Windows */}
      <WindowControls />
      {/* First-run onboarding — shown once, dismissed by completing wizard */}
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
    </div>
  )
}
