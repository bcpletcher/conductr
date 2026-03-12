import { ipcMain } from 'electron'
import {
  getAllAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  getActivityLogForAgent
} from '../db/agents'

export function registerAgentHandlers(): void {
  ipcMain.handle('agents:getAll', () => getAllAgents())

  ipcMain.handle('agents:getById', (_e, id: string) => getAgentById(id))

  ipcMain.handle('agents:create', (_e, input) => createAgent(input))

  ipcMain.handle('agents:update', (_e, id: string, input) => {
    updateAgent(id, input)
    return getAgentById(id)
  })

  ipcMain.handle('agents:delete', (_e, id: string) => deleteAgent(id))

  ipcMain.handle('agents:getActivityLog', (_e, agentId: string, limit?: number) =>
    getActivityLogForAgent(agentId, limit)
  )
}
