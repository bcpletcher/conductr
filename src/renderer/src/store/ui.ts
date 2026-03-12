import { create } from 'zustand'
import type { NavPage } from '../App'

interface UIStore {
  currentPage: NavPage
  sidebarCollapsed: boolean
  setPage: (page: NavPage) => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  currentPage: 'dashboard',
  sidebarCollapsed: false,

  setPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
}))
