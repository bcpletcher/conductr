import { create } from 'zustand'
import type { Task, TaskCounts } from '../env.d'

interface TaskStore {
  tasks: Task[]
  counts: TaskCounts
  loading: boolean
  fetchAll: () => Promise<void>
  fetchCounts: () => Promise<void>
  addTask: (input: Partial<Task>) => Promise<Task>
  startTask: (id: string) => Promise<void>
  updateStatus: (id: string, status: Task['status']) => void
  updateProgress: (id: string, progress: number) => void
  removeTask: (id: string) => Promise<void>
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  counts: { queued: 0, active: 0, complete: 0, failed: 0 },
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const tasks = await window.electronAPI.tasks.getAll()
    const counts = await window.electronAPI.tasks.getCounts()
    set({ tasks, counts, loading: false })
  },

  fetchCounts: async () => {
    const counts = await window.electronAPI.tasks.getCounts()
    set({ counts })
  },

  addTask: async (input) => {
    const task = await window.electronAPI.tasks.create(input)
    set((state) => ({
      tasks: [task, ...state.tasks],
      counts: { ...state.counts, queued: state.counts.queued + 1 }
    }))
    return task
  },

  startTask: async (id) => {
    await window.electronAPI.tasks.start(id)
  },

  updateStatus: (id, status) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t))
    }))
    get().fetchCounts()
  },

  updateProgress: (id, progress) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, progress } : t))
    }))
  },

  removeTask: async (id) => {
    await window.electronAPI.tasks.delete(id)
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id)
    }))
    get().fetchCounts()
  }
}))
