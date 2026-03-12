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
    getTotalTokens: () => ipcRenderer.invoke('metrics:getTotalTokens'),
    getUsageByTask: (limit?: number) => ipcRenderer.invoke('metrics:getUsageByTask', limit),
    getMostActiveModel: () => ipcRenderer.invoke('metrics:getMostActiveModel')
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

// TypeScript type declaration for renderer
export type ElectronAPI = typeof api
