/**
 * tray.ts — System tray / menu-bar launcher for Conductr.
 *
 * macOS  → icon sits in the menu bar; click/right-click shows context menu.
 * Windows → icon sits in the taskbar notification area; double-click opens app.
 *
 * The tray icon is a 16×16 white circle PNG built entirely in memory
 * (zlib + pure PNG binary) so no external image assets are required.
 */

import { app, Tray, Menu, nativeImage } from 'electron'
import type { BrowserWindow } from 'electron'
import zlib from 'zlib'
import { getTaskCounts } from './db/tasks'

let tray: Tray | null = null

// ─── Minimal PNG builder (no deps) ───────────────────────────────────────────

/** CRC-32 lookup table using the PNG/ZIP standard polynomial 0xEDB88320. */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf  = Buffer.alloc(4)
  const crcBuf  = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

/**
 * Build a 16×16 RGBA PNG with a white anti-aliased circle on a transparent
 * background.  On macOS, calling `setTemplateImage(true)` makes the OS
 * automatically invert it for dark / light menu-bar themes.
 */
function buildTrayPng(): Buffer {
  const SZ  = 16
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  // IHDR — width, height, 8-bit RGBA, no interlace
  const ihdr = Buffer.alloc(13, 0)
  ihdr.writeUInt32BE(SZ, 0)
  ihdr.writeUInt32BE(SZ, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // colour type: RGBA

  // Raw scanlines: [filter=0, R, G, B, A, ...] per row
  const cx = (SZ - 1) / 2
  const cy = (SZ - 1) / 2
  const R  = SZ / 2 - 1.8  // circle radius with anti-alias feather room

  const scanlines = Buffer.alloc(SZ * (1 + SZ * 4), 0)
  let pos = 0
  for (let y = 0; y < SZ; y++) {
    scanlines[pos++] = 0  // filter byte: None
    for (let x = 0; x < SZ; x++) {
      const dist  = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      const alpha = dist <= R         ? 255
                  : dist <= R + 1.5  ? Math.round(255 * (R + 1.5 - dist) / 1.5)
                  : 0
      scanlines[pos++] = 255   // R
      scanlines[pos++] = 255   // G
      scanlines[pos++] = 255   // B
      scanlines[pos++] = alpha // A
    }
  }

  const idat = zlib.deflateSync(scanlines, { level: 6 })

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ─── Tray helpers ─────────────────────────────────────────────────────────────

/** Rebuild and apply the context menu with fresh task counts. */
export function updateTrayMenu(mainWindow: BrowserWindow): void {
  const counts = getTaskCounts()

  let statusLabel: string
  if (counts.active > 0) {
    statusLabel = `${counts.active} task${counts.active === 1 ? '' : 's'} running`
  } else if (counts.queued > 0) {
    statusLabel = `${counts.queued} task${counts.queued === 1 ? '' : 's'} queued`
  } else {
    statusLabel = 'No active tasks'
  }

  function focusAndNavigate(page: string): void {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('tray:navigate', page)
  }

  const menu = Menu.buildFromTemplate([
    { label: 'Conductr', enabled: false },
    { label: statusLabel,  enabled: false },
    { type: 'separator' },
    {
      label: 'Open Conductr',
      click: (): void => {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      },
    },
    { type: 'separator' },
    {
      label: 'Dashboard',
      click: (): void => focusAndNavigate('dashboard'),
    },
    {
      label: 'Workshop',
      click: (): void => focusAndNavigate('workshop'),
    },
    {
      label: 'Chat',
      click: (): void => focusAndNavigate('chat'),
    },
    { type: 'separator' },
    {
      label: 'Quit Conductr',
      click: (): void => app.quit(),
    },
  ])

  tray?.setContextMenu(menu)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function createTray(mainWindow: BrowserWindow): void {
  const pngBuf = buildTrayPng()
  const icon   = nativeImage.createFromBuffer(pngBuf)
  // macOS template image: OS re-colours it automatically for dark/light menu bar
  icon.setTemplateImage(true)

  tray = new Tray(icon)
  tray.setToolTip('Conductr')

  // Rebuild menu just before it appears so task counts are always fresh
  tray.on('right-click', () => updateTrayMenu(mainWindow))

  if (process.platform === 'darwin') {
    // macOS: left-click also pops up the context menu (standard Mac app behaviour)
    tray.on('click', () => {
      updateTrayMenu(mainWindow)
      tray?.popUpContextMenu()
    })
  } else {
    // Windows: single-click focuses the app; double-click also for discoverability
    tray.on('click', () => {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    })
    tray.on('double-click', () => {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    })
  }

  updateTrayMenu(mainWindow)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
