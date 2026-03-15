import { ipcMain, app } from 'electron'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { getAgentFile } from '../db/agentFiles'
import { getAgentById, getAllAgents } from '../db/agents'

function buildClaudeMd(agentId: string): string {
  const agent = getAgentById(agentId)
  if (!agent) return ''

  const soul     = getAgentFile(agentId, 'SOUL.md')
  const identity = getAgentFile(agentId, 'IDENTITY.md')
  const tools    = getAgentFile(agentId, 'TOOLS.md')

  const sections: string[] = [
    `# ${agent.name} — Agent Configuration`,
    ``,
    `## Role`,
    agent.operational_role?.split('\n')[0] ?? '',
    ``,
    `## System Directive`,
    agent.system_directive ?? 'You are an autonomous AI agent.',
    ``,
  ]

  if (soul?.content?.trim()) {
    sections.push(`## Soul`, soul.content.trim(), ``)
  }
  if (identity?.content?.trim()) {
    sections.push(`## Identity`, identity.content.trim(), ``)
  }
  if (tools?.content?.trim()) {
    sections.push(`## Tools`, tools.content.trim(), ``)
  }

  return sections.join('\n')
}

export function registerClaudeCodeHandlers(): void {
  // ── CLI detection ──────────────────────────────────────────────────────────
  ipcMain.handle('claudecode:checkCli', async () => {
    try {
      const cliPath = execSync('which claude', { encoding: 'utf8', timeout: 5000 }).trim()
      return { installed: !!cliPath, path: cliPath }
    } catch {
      return { installed: false, path: null }
    }
  })

  // ── Agent directory ────────────────────────────────────────────────────────
  ipcMain.handle('claudecode:getAgentDir', async (_, agentId: string) => {
    const dir = path.join(app.getPath('home'), '.conductr', 'agents', agentId)
    return { path: dir }
  })

  // ── Sync single agent CLAUDE.md ────────────────────────────────────────────
  ipcMain.handle('claudecode:syncAgent', async (_, agentId: string) => {
    try {
      const agentDir = path.join(app.getPath('home'), '.conductr', 'agents', agentId)
      fs.mkdirSync(agentDir, { recursive: true })

      const content = buildClaudeMd(agentId)
      if (!content) return { ok: false, error: 'Agent not found' }

      const claudeMdPath = path.join(agentDir, 'CLAUDE.md')
      fs.writeFileSync(claudeMdPath, content, 'utf8')

      return { ok: true, path: claudeMdPath }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  })

  // ── Sync all agents ────────────────────────────────────────────────────────
  ipcMain.handle('claudecode:syncAllAgents', async () => {
    try {
      const agents = getAllAgents()
      let synced = 0

      for (const agent of agents) {
        const agentDir = path.join(app.getPath('home'), '.conductr', 'agents', agent.id)
        fs.mkdirSync(agentDir, { recursive: true })

        const content = buildClaudeMd(agent.id)
        if (!content) continue

        const claudeMdPath = path.join(agentDir, 'CLAUDE.md')
        fs.writeFileSync(claudeMdPath, content, 'utf8')
        synced++
      }

      return { ok: true, count: synced }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  })

  // ── App relaunch (mode change) ─────────────────────────────────────────────
  ipcMain.handle('app:relaunch', async () => {
    app.relaunch()
    app.exit(0)
  })
}
