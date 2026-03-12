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

export interface Document {
  id: string
  title: string
  content: string | null
  task_id: string | null
  client_id: string | null
  created_at: string
}

export interface TaskCounts {
  queued: number
  active: number
  complete: number
  failed: number
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
        getTotalTokens: () => Promise<{
          input_tokens: number
          output_tokens: number
          total_tokens: number
        }>
        getUsageByTask: (limit?: number) => Promise<ApiUsageEntry[]>
        getMostActiveModel: () => Promise<string>
      }
    }
  }
}
