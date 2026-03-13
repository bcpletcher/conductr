import { useState } from 'react'
import GradientBackground from './components/GradientBackground'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Workshop from './pages/Workshop'
import Agents from './pages/Agents'
import Chat from './pages/Chat'
import Intelligence from './pages/Intelligence'
import Documents from './pages/Documents'
import Metrics from './pages/Metrics'
import Journal from './pages/Journal'
import Clients from './pages/Clients'

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
  settings: Dashboard
}

export default function App(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard')
  const PageComponent = PAGE_MAP[currentPage]

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
        <div className="flex-1 overflow-y-auto p-6 h-full" data-testid={`page-${currentPage}`}>
          {currentPage === 'dashboard'
            ? <Dashboard onNavigate={setCurrentPage} />
            : <PageComponent />}
        </div>
      </main>
    </div>
  )
}
