import { ipcMain } from 'electron'
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientTaskCount,
  getClientDocCount,
  getClientTasks,
  getClientDocuments,
  getClientActivityLog
} from '../db/clients'
import { getAllAgents } from '../db/agents'
import { deleteAgentFile } from '../db/agentFiles'

export function registerClientHandlers(): void {
  ipcMain.handle('clients:getAll', () => getAllClients())

  ipcMain.handle('clients:getById', (_e, id: string) => getClientById(id))

  ipcMain.handle('clients:create', (_e, input) => createClient(input))

  ipcMain.handle('clients:update', (_e, id: string, input) => updateClient(id, input))

  ipcMain.handle('clients:delete', (_e, id: string) => {
    const result = deleteClient(id)
    // Cascade: remove client-scoped identity files from all agents
    const agents = getAllAgents()
    const filename = `IDENTITY-${id}.md`
    for (const agent of agents) {
      deleteAgentFile(agent.id, filename)
    }
    return result
  })

  ipcMain.handle('clients:getTaskCount', (_e, clientId: string) => getClientTaskCount(clientId))

  ipcMain.handle('clients:getDocCount', (_e, clientId: string) => getClientDocCount(clientId))

  ipcMain.handle('clients:getTasks', (_e, clientId: string) => getClientTasks(clientId))

  ipcMain.handle('clients:getDocuments', (_e, clientId: string) => getClientDocuments(clientId))

  ipcMain.handle('clients:getActivityLog', (_e, clientId: string, limit?: number) =>
    getClientActivityLog(clientId, limit)
  )
}
