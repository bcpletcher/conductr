import { ipcMain, dialog, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { pathToFileURL } from 'url'
import { getSetting, setSetting } from '../db/settings'
import { resetAnthropicClient } from '../../api/claude'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', (_e, key: string) => getSetting(key))

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    setSetting(key, value)
    return true
  })

  /** Returns whether an Anthropic API key is available and its source */
  ipcMain.handle('settings:check-api-key', (): { configured: boolean; source: 'env' | 'settings' | null } => {
    if (process.env.ANTHROPIC_API_KEY) return { configured: true, source: 'env' }
    const stored = getSetting('anthropic_api_key')
    if (stored) return { configured: true, source: 'settings' }
    return { configured: false, source: null }
  })

  /** Saves the Anthropic API key to settings and resets the cached client */
  ipcMain.handle('settings:set-api-key', (_e, key: string) => {
    setSetting('anthropic_api_key', key.trim())
    resetAnthropicClient()
    return true
  })

  // Opens a native file picker, copies the selected image to userData, returns a file:// URL
  ipcMain.handle('settings:pick-wallpaper', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choose Wallpaper Image',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const src  = result.filePaths[0]
    const ext  = path.extname(src)
    const dest = path.join(app.getPath('userData'), 'wallpapers', `custom${ext}`)

    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)

    // Proper cross-platform file URL (handles Windows drive letters like C:\...)
    return pathToFileURL(dest).href
  })
}
