import { ipcMain, dialog, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { pathToFileURL } from 'url'
import { getSetting, setSetting, getSecureSetting, setSecureSetting } from '../db/settings'
import { resetAnthropicClient } from '../../api/claude'
import { SENSITIVE_KEYS } from '../security'

const ALLOWED_WALLPAPER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const MAX_WALLPAPER_BYTES = 20 * 1024 * 1024 // 20 MB

export function registerSettingsHandlers(): void {
  // General settings read — sensitive keys are blocked; use dedicated handlers instead
  ipcMain.handle('settings:get', (_e, key: string) => {
    if (SENSITIVE_KEYS.has(key)) return null
    return getSetting(key)
  })

  // General settings write — sensitive keys are blocked; use dedicated handlers instead
  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    if (SENSITIVE_KEYS.has(key)) throw new Error(`Use the dedicated handler to update ${key}`)
    setSetting(key, value)
    return true
  })

  /** Returns whether an Anthropic API key is available and its source */
  ipcMain.handle('settings:check-api-key', (): { configured: boolean; source: 'env' | 'settings' | null } => {
    if (process.env.ANTHROPIC_API_KEY) return { configured: true, source: 'env' }
    const stored = getSecureSetting('anthropic_api_key')
    if (stored) return { configured: true, source: 'settings' }
    return { configured: false, source: null }
  })

  /** Saves the Anthropic API key to secure storage and resets the cached client */
  ipcMain.handle('settings:set-api-key', (_e, key: string) => {
    setSecureSetting('anthropic_api_key', key.trim())
    resetAnthropicClient()
    return true
  })

  // Opens a native file picker, validates the image, copies it to userData, returns a file:// URL
  ipcMain.handle('settings:pick-wallpaper', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choose Wallpaper Image',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const src = result.filePaths[0]
    const ext = path.extname(src).toLowerCase()

    // Server-side validation — dialog filter is UI-only and can be bypassed
    if (!ALLOWED_WALLPAPER_EXTENSIONS.has(ext)) {
      throw new Error(`Unsupported image format: ${ext}`)
    }

    const stat = fs.statSync(src)
    if (stat.size > MAX_WALLPAPER_BYTES) {
      throw new Error('Image file is too large (max 20 MB)')
    }

    const dest = path.join(app.getPath('userData'), 'wallpapers', `custom${ext}`)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)

    return pathToFileURL(dest).href
  })
}
