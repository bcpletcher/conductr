import { app, BrowserWindow, shell, Menu, ipcMain } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { initDb } from './db/schema'
import { registerTaskHandlers } from './ipc/tasks'
import { registerAgentHandlers } from './ipc/agents'
import { registerMetricsHandlers } from './ipc/metrics'
import { registerChatHandlers } from './ipc/chat'
import { registerDocumentHandlers } from './ipc/documents'
import { registerClientHandlers } from './ipc/clients'
import { registerSettingsHandlers } from './ipc/settings'
import { registerAgentFileHandlers } from './ipc/agentFiles'
import { registerSearchHandlers } from './ipc/search'
import { registerIdeasHandlers } from './ipc/ideas'
import { registerMemoryHandlers } from './ipc/memories'
import { registerProviderHandlers } from './ipc/providers'
import { registerRepoHandlers } from './ipc/repos'
import { registerTerminalHandlers } from './ipc/terminal'
import { registerGitHandlers } from './ipc/git'
import { registerGithubHandlers } from './ipc/github'
import { createTray, destroyTray } from './tray'

const isMac = process.platform === 'darwin'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    // macOS: traffic lights visible inside frame; Windows: fully hidden frame,
    // renderer draws its own close/min/max buttons
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac && { trafficLightPosition: { x: 18, y: 14 } }),
    // macOS-only OS-level blur — Windows keeps the CSS backdrop-filter glass look
    ...(isMac && { vibrancy: 'under-window' }),
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (process.env.NODE_ENV === 'test') {
      mainWindow?.setPosition(-99999, 0)
      mainWindow?.showInactive()
    } else {
      mainWindow?.show()
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// Auto-updater — silently check on launch; send status to renderer
function setupAutoUpdater(): void {
  if (is.dev || process.env.NODE_ENV === 'test') return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update:status', { type: 'available', version: info.version })
  })
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update:status', { type: 'downloaded', version: info.version })
  })
  autoUpdater.on('error', () => {
    // No release server configured yet — ignore silently
  })

  // Check once, 5 seconds after launch (gives app time to fully load)
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000)
}

// Window control IPC — used by custom title bar on Windows
function registerWindowHandlers(): void {
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.restore()
    else mainWindow?.maximize()
  })
  ipcMain.on('window:close', () => mainWindow?.close())
}

function buildMenu(): void {
  // On Windows the custom title bar owns close/min/max, so we tailor the menu
  // per platform — skipping the macOS-specific app-name top-level menu item.
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: 'Conductr',
            submenu: [
              { label: 'About Conductr', role: 'about' as const },
              { type: 'separator' as const },
              { label: 'Hide Conductr', role: 'hide' as const },
              { label: 'Hide Others', role: 'hideOthers' as const },
              { label: 'Show All', role: 'unhide' as const },
              { type: 'separator' as const },
              { label: 'Quit', role: 'quit' as const, accelerator: 'Command+Q' }
            ]
          }
        ]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        ...(isMac
          ? [
              { role: 'zoom' as const },
              { type: 'separator' as const },
              { role: 'front' as const }
            ]
          : [{ role: 'close' as const }])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Conductr on GitHub',
          click: () => shell.openExternal('https://github.com/bcpletcher/conductr')
        },
        { type: 'separator' as const },
        {
          label: 'Keyboard Shortcuts',
          accelerator: isMac ? 'Command+/' : 'Ctrl+/',
          click: () => mainWindow?.webContents.send('open-shortcut-sheet')
        },
        { type: 'separator' as const },
        {
          label: 'Check for Updates…',
          click: () => {
            if (!is.dev) {
              autoUpdater.checkForUpdates().catch(() => {
                mainWindow?.webContents.send('update:status', { type: 'error' })
              })
            }
          }
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// IPC: manual update trigger from renderer (Settings page)
ipcMain.handle('update:check', async () => {
  if (is.dev) return { status: 'dev-mode' }
  try {
    const result = await autoUpdater.checkForUpdates()
    return { status: 'checked', version: result?.updateInfo?.version ?? null }
  } catch {
    return { status: 'error' }
  }
})

ipcMain.on('update:install', () => {
  autoUpdater.quitAndInstall()
})

app.whenReady().then(() => {
  initDb()

  buildMenu()
  createWindow()
  registerWindowHandlers()
  setupAutoUpdater()

  registerAgentHandlers()
  registerAgentFileHandlers()
  registerMetricsHandlers()
  registerClientHandlers()
  registerSettingsHandlers()
  registerSearchHandlers()
  registerProviderHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  if (mainWindow) {
    registerTaskHandlers(mainWindow)
    registerChatHandlers(mainWindow)
    registerDocumentHandlers(mainWindow)
    registerIdeasHandlers(mainWindow)
    registerMemoryHandlers()
    registerRepoHandlers(mainWindow)
    registerTerminalHandlers(mainWindow)
    createTray(mainWindow)
  }

  registerGitHandlers()
  registerGithubHandlers()

  // Test-only IPC: run a prompt through the LLM router without opening the UI
  if (process.env.NODE_ENV === 'test') {
    ipcMain.handle('test:runPrompt', async (_, system: string, user: string, opts: Record<string, unknown>) => {
      const { runWithRouter } = await import('../api/router')
      return runWithRouter(system, user, opts as Parameters<typeof runWithRouter>[2])
    })
  }
})

app.on('before-quit', () => destroyTray())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
