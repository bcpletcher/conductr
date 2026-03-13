import { useState, useEffect } from 'react'
import GradientBackground from './components/GradientBackground'
import Sidebar from './components/Sidebar'
import CommandPalette from './components/CommandPalette'
import ToastContainer from './components/Toast'
import ShortcutSheet from './components/ShortcutSheet'
import NotificationPanel from './components/NotificationPanel'
import WindowControls from './components/WindowControls'
import { useUIStore } from './store/ui'
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
  | 'settings'

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
  settings: Settings,
}

export default function App(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard')
  const PageComponent = PAGE_MAP[currentPage]
  const openPalette            = useUIStore((s) => s.openPalette)
  const openSheet              = useUIStore((s) => s.openSheet)
  const setWallpaperBrightness = useUIStore((s) => s.setWallpaperBrightness)
  const setAccentColor         = useUIStore((s) => s.setAccentColor)
  const setDensity             = useUIStore((s) => s.setDensity)
  const setWallpaperStyle      = useUIStore((s) => s.setWallpaperStyle)
  const setCustomWallpaperPath = useUIStore((s) => s.setCustomWallpaperPath)

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
  }, [setWallpaperBrightness, setAccentColor, setDensity, setWallpaperStyle, setCustomWallpaperPath])

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openPalette()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        openSheet()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openPalette, openSheet])

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
      {/* Custom title-bar close/min/max — only rendered on Windows */}
      <WindowControls />
    </div>
  )
}
