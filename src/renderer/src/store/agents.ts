import { create } from 'zustand'
import type { Agent } from '../env.d'

interface AgentStore {
  agents: Agent[]
  loading: boolean
  fetchAll: () => Promise<void>
  addAgent: (input: Partial<Agent>) => Promise<Agent>
  updateAgent: (id: string, input: Partial<Agent>) => Promise<void>
  removeAgent: (id: string) => Promise<void>
  getById: (id: string) => Agent | undefined
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const agents = await window.electronAPI.agents.getAll()
    set({ agents, loading: false })
  },

  addAgent: async (input) => {
    const agent = await window.electronAPI.agents.create(input)
    set((state) => ({ agents: [...state.agents, agent] }))
    return agent
  },

  updateAgent: async (id, input) => {
    const updated = await window.electronAPI.agents.update(id, input)
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? updated : a))
    }))
  },

  removeAgent: async (id) => {
    await window.electronAPI.agents.delete(id)
    set((state) => ({ agents: state.agents.filter((a) => a.id !== id) }))
  },

  getById: (id) => get().agents.find((a) => a.id === id)
}))
