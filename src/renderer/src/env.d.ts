/// <reference types="vite/client" />

// Mission Control design token types
export type TaskStatus = 'queued' | 'active' | 'complete' | 'failed'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  agent_id: string | null
  client_id: string | null
  tags: string // JSON array string
  progress: number
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface Agent {
  id: string
  name: string
  avatar: string
  system_directive: string | null
  operational_role: string | null
  created_at: string
}

export interface ActivityLogEntry {
  id: string
  task_id: string | null
  agent_id: string | null
  message: string
  timestamp: string
  agent_name?: string
  task_title?: string
}

export interface ApiUsageEntry {
  id: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  task_id: string | null
  agent_id: string | null
  timestamp: string
  task_title?: string
  agent_name?: string
}

export interface AgentSpendEntry {
  agent_id: string | null
  agent_name: string | null
  agent_avatar: string | null
  total_tokens: number
  total_cost: number
}

export interface Budget {
  daily: number | null
  monthly: number | null
}

export interface Document {
  id: string
  title: string
  content: string | null
  task_id: string | null
  agent_id: string | null
  client_id: string | null
  tags: string        // JSON array string
  doc_type: string    // 'output' | 'recap' | 'manual'
  created_at: string
  updated_at: string | null
}

export interface JournalEntry {
  id: string
  date: string
  title: string
  content: string
  entry_type: 'manual' | 'task_complete' | 'recap' | 'system'
  task_id: string | null
  agent_id: string | null
  created_at: string
  updated_at: string | null
  task_title?: string
  agent_name?: string
}

export interface IntelligenceInsight {
  id: string
  content: string
  insight_type: 'pattern' | 'anomaly' | 'recommendation' | 'recap'
  period_start: string | null
  period_end: string | null
  agent_ids: string   // JSON array string
  task_ids: string    // JSON array string
  is_read: number     // 0 | 1
  generated_at: string
}

export interface Client {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface TaskCounts {
  queued: number
  active: number
  complete: number
  failed: number
}

export interface Message {
  id: string
  agent_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// Window electronAPI type
declare global {
  interface Window {
    electronAPI: {
      tasks: {
        getAll: () => Promise<Task[]>
        getByStatus: (status: string) => Promise<Task[]>
        getById: (id: string) => Promise<Task | null>
        create: (input: Partial<Task>) => Promise<Task>
        updateStatus: (id: string, status: string, progress?: number) => Promise<void>
        updateProgress: (id: string, progress: number) => Promise<void>
        delete: (id: string) => Promise<void>
        getCounts: () => Promise<TaskCounts>
        getActivityLog: (taskId?: string) => Promise<ActivityLogEntry[]>
        start: (taskId: string) => Promise<Task>
        onLogUpdate: (cb: (data: { taskId: string; message: string }) => void) => void
        onProgressUpdate: (cb: (data: { taskId: string; progress: number }) => void) => void
        onStatusUpdate: (cb: (data: { taskId: string; status: string }) => void) => void
        removeAllListeners: () => void
      }
      agents: {
        getAll: () => Promise<Agent[]>
        getById: (id: string) => Promise<Agent | null>
        create: (input: Partial<Agent>) => Promise<Agent>
        update: (id: string, input: Partial<Agent>) => Promise<Agent>
        delete: (id: string) => Promise<void>
        getActivityLog: (agentId: string, limit?: number) => Promise<ActivityLogEntry[]>
      }
      metrics: {
        getTodaySpend: () => Promise<number>
        get7DaySpend: () => Promise<{ date: string; total: number }[]>
        getMonthlySpend: () => Promise<number>
        getTotalTokens: () => Promise<{
          input_tokens: number
          output_tokens: number
          total_tokens: number
        }>
        getUsageByTask: (limit?: number) => Promise<ApiUsageEntry[]>
        getMostActiveModel: () => Promise<string>
        getBudget: () => Promise<Budget>
        setBudget: (data: { daily: number | null; monthly: number | null }) => Promise<boolean>
        getAgentSpend: () => Promise<AgentSpendEntry[]>
      }
      chat: {
        getMessages: (agentId: string) => Promise<Message[]>
        clearMessages: (agentId: string) => Promise<boolean>
        send: (agentId: string, content: string) => void
        onChunk: (cb: (data: { agentId: string; chunk: string }) => void) => void
        onDone: (cb: (data: { agentId: string; message: Message }) => void) => void
        onError: (cb: (data: { agentId: string; error: string }) => void) => void
        removeAllListeners: () => void
      }
      documents: {
        getAll: (limit?: number) => Promise<Document[]>
        getById: (id: string) => Promise<Document | null>
        create: (input: Partial<Document>) => Promise<Document>
        delete: (id: string) => Promise<void>
        search: (query: string) => Promise<Document[]>
        getByTag: (tag: string) => Promise<Document[]>
        getByTask: (taskId: string) => Promise<Document[]>
        getByAgent: (agentId: string) => Promise<Document[]>
        onCreated: (cb: (data: { document: Document }) => void) => void
        removeCreatedListener: () => void
      }
      journal: {
        getAll: (limit?: number) => Promise<JournalEntry[]>
        getByDate: (date: string) => Promise<JournalEntry[]>
        create: (input: Partial<JournalEntry>) => Promise<JournalEntry>
        update: (id: string, content: string) => Promise<JournalEntry>
        delete: (id: string) => Promise<void>
        search: (query: string) => Promise<JournalEntry[]>
      }
      intelligence: {
        getAll: (limit?: number) => Promise<IntelligenceInsight[]>
        getUnread: () => Promise<IntelligenceInsight[]>
        markRead: (id: string) => Promise<void>
        markAllRead: () => Promise<void>
        delete: (id: string) => Promise<void>
        generate: (type: 'insight' | 'recap') => void
        onChunk: (cb: (data: { chunk: string }) => void) => void
        onDone: (cb: (data: { insight: IntelligenceInsight }) => void) => void
        onError: (cb: (data: { error: string }) => void) => void
        removeAllListeners: () => void
      }
      clients: {
        getAll: () => Promise<Client[]>
        getById: (id: string) => Promise<Client | null>
        create: (input: { name: string; description?: string }) => Promise<Client>
        update: (id: string, input: { name?: string; description?: string }) => Promise<Client>
        delete: (id: string) => Promise<void>
        getTaskCount: (clientId: string) => Promise<number>
        getDocCount: (clientId: string) => Promise<number>
        getTasks: (clientId: string) => Promise<Task[]>
        getDocuments: (clientId: string) => Promise<Document[]>
        getActivityLog: (clientId: string, limit?: number) => Promise<ActivityLogEntry[]>
      }
      settings: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: string) => Promise<boolean>
        pickWallpaper: () => Promise<string | null>
      }
      app: {
        /** Current OS platform string, e.g. 'darwin' | 'win32' | 'linux' */
        platform: string
        onOpenShortcutSheet: (cb: () => void) => void
        removeShortcutSheetListener: () => void
        /** Fired when the user picks a page from the system tray / menu-bar menu */
        onTrayNavigate: (cb: (page: string) => void) => void
        removeTrayNavigateListener: () => void
      }
      /** Custom window controls — used by renderer on Windows (frame is hidden) */
      window: {
        minimize: () => void
        maximize: () => void
        close: () => void
      }
    }
  }
}
