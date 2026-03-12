import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Workshop from './pages/Workshop'
import Agents from './pages/Agents'
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
  intelligence: Intelligence,
  workshop: Workshop,
  clients: Clients,
  metrics: Metrics,
  settings: Dashboard // placeholder
}

export default function App(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard')

  const PageComponent = PAGE_MAP[currentPage]

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-base">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <PageComponent />
        </div>
      </main>
    </div>
  )
}
