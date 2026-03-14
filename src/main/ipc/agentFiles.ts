import { ipcMain } from 'electron'
import { getAgentFiles, getAgentFile, saveAgentFile, deleteAgentFile } from '../db/agentFiles'

export function registerAgentFileHandlers(): void {
  ipcMain.handle('agentFiles:getAll', (_e, agentId: string) =>
    getAgentFiles(agentId)
  )

  ipcMain.handle('agentFiles:get', (_e, agentId: string, filename: string) =>
    getAgentFile(agentId, filename)
  )

  ipcMain.handle('agentFiles:save', (_e, agentId: string, filename: string, content: string) =>
    saveAgentFile(agentId, filename, content)
  )

  ipcMain.handle('agentFiles:delete', (_e, agentId: string, filename: string) =>
    deleteAgentFile(agentId, filename)
  )
}
