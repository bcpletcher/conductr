import { ipcMain, dialog, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { pathToFileURL } from 'url'
import { getSetting, setSetting } from '../db/settings'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', (_e, key: string) => getSetting(key))

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    setSetting(key, value)
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
