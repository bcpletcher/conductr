import { ipcMain } from 'electron'
import { getAgentFiles, getAgentFile, saveAgentFile, deleteAgentFile } from '../db/agentFiles'
import { getAllAgents } from '../db/agents'

// Only allow safe filenames — alphanumeric, hyphens, underscores, dots, max 64 chars.
// Prevents path traversal (e.g. '../evil.md') and other injection attacks.
function assertValidFilename(name: string): void {
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(name)) {
    throw new Error(`Invalid filename: ${name}`)
  }
}

export function registerAgentFileHandlers(): void {
  ipcMain.handle('agentFiles:getAll', (_e, agentId: string) =>
    getAgentFiles(agentId)
  )

  ipcMain.handle('agentFiles:get', (_e, agentId: string, filename: string) => {
    assertValidFilename(filename)
    return getAgentFile(agentId, filename)
  })

  ipcMain.handle('agentFiles:save', (_e, agentId: string, filename: string, content: string) => {
    assertValidFilename(filename)
    return saveAgentFile(agentId, filename, content)
  })

  ipcMain.handle('agentFiles:delete', (_e, agentId: string, filename: string) => {
    assertValidFilename(filename)
    deleteAgentFile(agentId, filename)
    return true
  })

  // Removes IDENTITY-{clientId}.md from all agents — call when a client is removed
  // or when a repo path changes and the context is stale
  ipcMain.handle('agentFiles:clearClientIdentity', (_e, clientId: string) => {
    const agents = getAllAgents()
    const filename = `IDENTITY-${clientId}.md`
    assertValidFilename(filename)
    for (const agent of agents) {
      deleteAgentFile(agent.id, filename)
    }
    return true
  })
}
