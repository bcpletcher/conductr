import { contextBridge, ipcRenderer } from 'electron'

// Expose typed API to renderer via window.electronAPI
const api = {
  // Tasks
  tasks: {
    getAll: () => ipcRenderer.invoke('tasks:getAll'),
    getByStatus: (status: string) => ipcRenderer.invoke('tasks:getByStatus', status),
    getById: (id: string) => ipcRenderer.invoke('tasks:getById', id),
    create: (input: unknown) => ipcRenderer.invoke('tasks:create', input),
    updateStatus: (id: string, status: string, progress?: number) =>
      ipcRenderer.invoke('tasks:updateStatus', id, status, progress),
    updateProgress: (id: string, progress: number) =>
      ipcRenderer.invoke('tasks:updateProgress', id, progress),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
    getCounts: () => ipcRenderer.invoke('tasks:getCounts'),
    getActivityLog: (taskId?: string) => ipcRenderer.invoke('tasks:getActivityLog', taskId),
    start: (taskId: string) => ipcRenderer.invoke('tasks:start', taskId),

    // IPC event listeners
    onLogUpdate: (callback: (data: { taskId: string; message: string }) => void) => {
      ipcRenderer.on('tasks:logUpdate', (_e, data) => callback(data))
    },
    onProgressUpdate: (callback: (data: { taskId: string; progress: number }) => void) => {
      ipcRenderer.on('tasks:progressUpdate', (_e, data) => callback(data))
    },
    onStatusUpdate: (callback: (data: { taskId: string; status: string }) => void) => {
      ipcRenderer.on('tasks:statusUpdate', (_e, data) => callback(data))
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('tasks:logUpdate')
      ipcRenderer.removeAllListeners('tasks:progressUpdate')
      ipcRenderer.removeAllListeners('tasks:statusUpdate')
    }
  },

  // Agents
  agents: {
    getAll: () => ipcRenderer.invoke('agents:getAll'),
    getById: (id: string) => ipcRenderer.invoke('agents:getById', id),
    create: (input: unknown) => ipcRenderer.invoke('agents:create', input),
    update: (id: string, input: unknown) => ipcRenderer.invoke('agents:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('agents:delete', id),
    getActivityLog: (agentId: string, limit?: number) =>
      ipcRenderer.invoke('agents:getActivityLog', agentId, limit)
  },

  // Metrics
  metrics: {
    getTodaySpend: () => ipcRenderer.invoke('metrics:getTodaySpend'),
    get7DaySpend: () => ipcRenderer.invoke('metrics:get7DaySpend'),
    getMonthlySpend: () => ipcRenderer.invoke('metrics:getMonthlySpend'),
    getTotalTokens: () => ipcRenderer.invoke('metrics:getTotalTokens'),
    getUsageByTask: (limit?: number) => ipcRenderer.invoke('metrics:getUsageByTask', limit),
    getMostActiveModel: () => ipcRenderer.invoke('metrics:getMostActiveModel'),
    getBudget: () => ipcRenderer.invoke('metrics:getBudget'),
    setBudget: (data: { daily: number | null; monthly: number | null }) =>
      ipcRenderer.invoke('metrics:setBudget', data),
    getAgentSpend: () => ipcRenderer.invoke('metrics:getAgentSpend')
  },

  // Chat
  chat: {
    getMessages: (agentId: string) => ipcRenderer.invoke('chat:getMessages', agentId),
    clearMessages: (agentId: string) => ipcRenderer.invoke('chat:clearMessages', agentId),
    send: (agentId: string, content: string) =>
      ipcRenderer.send('chat:send', { agentId, content }),
    onChunk: (cb: (data: { agentId: string; chunk: string }) => void) =>
      ipcRenderer.on('chat:chunk', (_e, data) => cb(data)),
    onDone: (cb: (data: { agentId: string; message: unknown }) => void) =>
      ipcRenderer.on('chat:done', (_e, data) => cb(data)),
    onError: (cb: (data: { agentId: string; error: string }) => void) =>
      ipcRenderer.on('chat:error', (_e, data) => cb(data)),
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('chat:chunk')
      ipcRenderer.removeAllListeners('chat:done')
      ipcRenderer.removeAllListeners('chat:error')
    }
  },

  // Documents
  documents: {
    getAll: (limit?: number) => ipcRenderer.invoke('documents:getAll', limit),
    getById: (id: string) => ipcRenderer.invoke('documents:getById', id),
    create: (input: unknown) => ipcRenderer.invoke('documents:create', input),
    delete: (id: string) => ipcRenderer.invoke('documents:delete', id),
    search: (query: string) => ipcRenderer.invoke('documents:search', query),
    getByTag: (tag: string) => ipcRenderer.invoke('documents:getByTag', tag),
    getByTask: (taskId: string) => ipcRenderer.invoke('documents:getByTask', taskId),
    getByAgent: (agentId: string) => ipcRenderer.invoke('documents:getByAgent', agentId),
    onCreated: (cb: (data: { document: unknown }) => void) =>
      ipcRenderer.on('documents:created', (_e, data) => cb(data)),
    removeCreatedListener: () => ipcRenderer.removeAllListeners('documents:created'),
  },

  // Journal
  journal: {
    getAll: (limit?: number) => ipcRenderer.invoke('journal:getAll', limit),
    getByDate: (date: string) => ipcRenderer.invoke('journal:getByDate', date),
    create: (input: unknown) => ipcRenderer.invoke('journal:create', input),
    update: (id: string, content: string) => ipcRenderer.invoke('journal:update', id, content),
    delete: (id: string) => ipcRenderer.invoke('journal:delete', id),
    search: (query: string) => ipcRenderer.invoke('journal:search', query),
  },

  // Clients
  clients: {
    getAll: () => ipcRenderer.invoke('clients:getAll'),
    getById: (id: string) => ipcRenderer.invoke('clients:getById', id),
    create: (input: unknown) => ipcRenderer.invoke('clients:create', input),
    update: (id: string, input: unknown) => ipcRenderer.invoke('clients:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('clients:delete', id),
    getTaskCount: (clientId: string) => ipcRenderer.invoke('clients:getTaskCount', clientId),
    getDocCount: (clientId: string) => ipcRenderer.invoke('clients:getDocCount', clientId),
    getTasks: (clientId: string) => ipcRenderer.invoke('clients:getTasks', clientId),
    getDocuments: (clientId: string) => ipcRenderer.invoke('clients:getDocuments', clientId),
    getActivityLog: (clientId: string, limit?: number) =>
      ipcRenderer.invoke('clients:getActivityLog', clientId, limit),
  },

  // Agent Files
  agentFiles: {
    getAll: (agentId: string) =>
      ipcRenderer.invoke('agentFiles:getAll', agentId),
    get: (agentId: string, filename: string) =>
      ipcRenderer.invoke('agentFiles:get', agentId, filename),
    save: (agentId: string, filename: string, content: string) =>
      ipcRenderer.invoke('agentFiles:save', agentId, filename, content),
    delete: (agentId: string, filename: string) =>
      ipcRenderer.invoke('agentFiles:delete', agentId, filename),
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    pickWallpaper: () => ipcRenderer.invoke('settings:pick-wallpaper'),
    checkApiKey: () => ipcRenderer.invoke('settings:check-api-key'),
    setApiKey: (key: string) => ipcRenderer.invoke('settings:set-api-key', key),
  },

  // Global search
  search: {
    global: (query: string) => ipcRenderer.invoke('search:global', query),
  },

  // App-level push events from main process
  app: {
    /** Current OS platform — used by renderer to show/hide Windows title bar controls */
    platform: process.platform,
    /** True when running under Playwright (NODE_ENV=test) — skips first-run onboarding */
    isTest: process.env.NODE_ENV === 'test',
    onOpenShortcutSheet: (cb: () => void) =>
      ipcRenderer.on('open-shortcut-sheet', () => cb()),
    removeShortcutSheetListener: () =>
      ipcRenderer.removeAllListeners('open-shortcut-sheet'),
    /** Fired by the system tray / menu-bar when the user picks a navigation item */
    onTrayNavigate: (cb: (page: string) => void) =>
      ipcRenderer.on('tray:navigate', (_e, page: string) => cb(page)),
    removeTrayNavigateListener: () =>
      ipcRenderer.removeAllListeners('tray:navigate'),
  },

  // Window controls — used by custom title bar on Windows
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close:    () => ipcRenderer.send('window:close'),
  },

  // Intelligence
  intelligence: {
    getAll: (limit?: number) => ipcRenderer.invoke('intelligence:getAll', limit),
    getUnread: () => ipcRenderer.invoke('intelligence:getUnread'),
    markRead: (id: string) => ipcRenderer.invoke('intelligence:markRead', id),
    markAllRead: () => ipcRenderer.invoke('intelligence:markAllRead'),
    delete: (id: string) => ipcRenderer.invoke('intelligence:delete', id),
    generate: (type: 'insight' | 'recap') =>
      ipcRenderer.send('intelligence:generate', { type }),
    onChunk: (cb: (data: { chunk: string }) => void) =>
      ipcRenderer.on('intelligence:chunk', (_e, data) => cb(data)),
    onDone: (cb: (data: { insight: unknown }) => void) =>
      ipcRenderer.on('intelligence:done', (_e, data) => cb(data)),
    onError: (cb: (data: { error: string }) => void) =>
      ipcRenderer.on('intelligence:error', (_e, data) => cb(data)),
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('intelligence:chunk')
      ipcRenderer.removeAllListeners('intelligence:done')
      ipcRenderer.removeAllListeners('intelligence:error')
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)

// TypeScript type declaration for renderer
export type ElectronAPI = typeof api
