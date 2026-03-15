import { create } from 'zustand'
import type { NavPage } from '../App'
import type { ConductorMode } from '../env.d'
import { v4 as uuid } from 'uuid'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  timestamp: string
  read: boolean
}

interface UIStore {
  currentPage: NavPage
  sidebarCollapsed: boolean
  setPage: (page: NavPage) => void
  toggleSidebar: () => void

  // Command palette
  isPaletteOpen: boolean
  openPalette: () => void
  closePalette: () => void

  // Toasts
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void

  // Notification center
  notifications: Notification[]
  isNotifPanelOpen: boolean
  openNotifPanel: () => void
  closeNotifPanel: () => void
  markAllNotifsRead: () => void
  dismissNotification: (id: string) => void
  clearNotifications: () => void

  // Shortcut cheat sheet
  isSheetOpen: boolean
  openSheet: () => void
  closeSheet: () => void

  // Global search
  isSearchOpen: boolean
  openSearch: () => void
  closeSearch: () => void

  // Wallpaper
  wallpaperBrightness: number
  setWallpaperBrightness: (v: number) => void
  wallpaperStyle: string
  setWallpaperStyle: (s: string) => void
  customWallpaperPath: string | null
  setCustomWallpaperPath: (p: string | null) => void

  // Accent color
  accentColor: string
  setAccentColor: (c: string) => void

  // Density
  density: 'comfortable' | 'compact'
  setDensity: (d: 'comfortable' | 'compact') => void

  // Glass card controls
  cardGlassIntensity: number       // 0–1: controls backdrop blur
  setCardGlassIntensity: (v: number) => void
  cardPanelDarkness: number        // 0–1: controls background opacity
  setCardPanelDarkness: (v: number) => void
  cardPanelBrightness: number      // 0–1: controls backdrop brightness (maps to 0.5–1.5x)
  setCardPanelBrightness: (v: number) => void

  // Keyboard shortcuts (customizable)
  keybindings: { palette: string; search: string; sheet: string }
  setKeybinding: (name: 'palette' | 'search' | 'sheet', combo: string) => void

  // Phase 18: Conductor Mode
  mode: ConductorMode
  setMode: (m: ConductorMode) => void
}

/**
 * Apply accent color to all CSS custom properties so every component
 * reacts instantly without manually calling setProperty in each place.
 *
 * Alpha variants use hex+2char syntax (#rrggbbaa):
 *   1f = 12%  |  26 = 15%  |  38 = 22%  |  47 = 28%  |  7a = 48%
 */
function applyGlassBlur(v: number): void {
  const blur = Math.round(v * 72)   // 0–72 px
  document.documentElement.style.setProperty('--card-blur', `${blur}px`)
}

function applyPanelDarkness(v: number): void {
  // Controls white-tint opacity for all glass cards: 0 = transparent, 1 = frosted
  // v=0.20 → 0.04 (Providers default) | v=1 → 0.20 (heavily frosted)
  const alpha     = (v * 0.20).toFixed(3)
  const alphaHov  = (v * 0.20 + 0.03).toFixed(3)
  const alphaDark = (v * 0.14).toFixed(3)
  const s = document.documentElement.style
  s.setProperty('--card-bg',       `rgba(255,255,255,${alpha})`)
  s.setProperty('--card-bg-hover', `rgba(255,255,255,${alphaHov})`)
  s.setProperty('--card-bg-dark',  `rgba(255,255,255,${alphaDark})`)
}

function applyPanelBrightness(v: number): void {
  // v=0 → 0.5 (dark/moody), v=0.5 → 1.0 (neutral), v=1 → 1.5 (bright/airy)
  const brightness = (0.5 + v).toFixed(2)
  document.documentElement.style.setProperty('--card-brightness', brightness)
}

/** @deprecated use applyGlassBlur + applyPanelDarkness */
function applyGlassIntensity(v: number): void {
  applyGlassBlur(v)
  applyPanelDarkness(v)
}

function applyAccentToCSSVars(color: string): void {
  const s = document.documentElement.style
  s.setProperty('--color-accent',        color)
  s.setProperty('--color-accent-glow',   color + '1f')  // 12% — shadows / glow halos
  s.setProperty('--color-accent-subtle', color + '26')  // 15% — very faint tints
  s.setProperty('--color-accent-muted',  color + '38')  // 22% — active nav backgrounds
  s.setProperty('--color-accent-border', color + '47')  // 28% — accent-tinted borders
  s.setProperty('--color-accent-focus',  color + '7a')  // 48% — focus-ring borders
}

export const useUIStore = create<UIStore>((set) => ({
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  setPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  isPaletteOpen: false,
  openPalette: () => set({ isPaletteOpen: true }),
  closePalette: () => set({ isPaletteOpen: false }),

  toasts: [],
  addToast: (message, type = 'info') => {
    const id = uuid()
    const notif: Notification = {
      id,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
    }
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
      notifications: [notif, ...state.notifications],
    }))
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  notifications: [],
  isNotifPanelOpen: false,
  openNotifPanel: () =>
    set((state) => ({
      isNotifPanelOpen: true,
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  closeNotifPanel: () => set({ isNotifPanelOpen: false }),
  markAllNotifsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  dismissNotification: (id) =>
    set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),
  clearNotifications: () => set({ notifications: [] }),

  isSheetOpen: false,
  openSheet: () => set({ isSheetOpen: true }),
  closeSheet: () => set({ isSheetOpen: false }),

  isSearchOpen: false,
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),

  wallpaperBrightness: 0.75,
  setWallpaperBrightness: (v) => set({ wallpaperBrightness: v }),
  wallpaperStyle: 'default',
  setWallpaperStyle: (s) => set({ wallpaperStyle: s }),
  customWallpaperPath: null,
  setCustomWallpaperPath: (p) => set({ customWallpaperPath: p }),

  accentColor: '#8b7cf8',
  setAccentColor: (c) => {
    // Single source-of-truth: update all CSS vars in one call
    applyAccentToCSSVars(c)
    set({ accentColor: c })
  },

  density: 'comfortable',
  setDensity: (d) => {
    document.documentElement.setAttribute('data-density', d)
    set({ density: d })
  },

  cardGlassIntensity: 0.67,
  setCardGlassIntensity: (v) => {
    applyGlassBlur(v)
    set({ cardGlassIntensity: v })
  },
  cardPanelDarkness: 0.20,
  setCardPanelDarkness: (v) => {
    applyPanelDarkness(v)
    set({ cardPanelDarkness: v })
  },
  cardPanelBrightness: 0.50,
  setCardPanelBrightness: (v) => {
    applyPanelBrightness(v)
    set({ cardPanelBrightness: v })
  },

  keybindings: { palette: 'cmd+k', search: 'cmd+shift+f', sheet: 'cmd+/' },
  setKeybinding: (name, combo) =>
    set((state) => ({ keybindings: { ...state.keybindings, [name]: combo } })),

  mode: 'claude-code',
  setMode: (m) => {
    document.documentElement.setAttribute('data-conductor-mode', m)
    set({ mode: m })
  },
}))

// Call anywhere outside React to fire a toast
export const toast = {
  success: (message: string) => useUIStore.getState().addToast(message, 'success'),
  error:   (message: string) => useUIStore.getState().addToast(message, 'error'),
  info:    (message: string) => useUIStore.getState().addToast(message, 'info'),
}
