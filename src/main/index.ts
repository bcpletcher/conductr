import { app, BrowserWindow, shell, Menu, ipcMain } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import { initDb } from './db/schema'
import { registerTaskHandlers } from './ipc/tasks'
import { registerAgentHandlers } from './ipc/agents'
import { registerMetricsHandlers } from './ipc/metrics'
import { registerChatHandlers } from './ipc/chat'
import { registerDocumentHandlers } from './ipc/documents'
import { registerClientHandlers } from './ipc/clients'
import { registerSettingsHandlers } from './ipc/settings'
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
      mainWindow?.setPosition(-2560, 0)
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
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  initDb()

  buildMenu()
  createWindow()
  registerWindowHandlers()

  registerAgentHandlers()
  registerMetricsHandlers()
  registerClientHandlers()
  registerSettingsHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  if (mainWindow) {
    registerTaskHandlers(mainWindow)
    registerChatHandlers(mainWindow)
    registerDocumentHandlers(mainWindow)
    createTray(mainWindow)
  }
})

app.on('before-quit', () => destroyTray())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
