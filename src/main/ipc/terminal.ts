import { ipcMain, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'

// Active terminal sessions: sessionId → child process
const sessions = new Map<string, ChildProcess>()

// Commands that are never allowed regardless of config
const BLOCKED_COMMANDS = [
  /rm\s+-rf\s+[/~]/,           // rm -rf /  or  rm -rf ~/
  /dd\s+if=/,                  // disk dump
  /mkfs/,                      // format disk
  /:\(\)\{\s*:\|:\s*&\s*\}/,  // fork bomb
  />\s*\/dev\/sd/,             // write to raw disk
]

export function registerTerminalHandlers(win: BrowserWindow): void {

  // ── Run a command (one-shot, streamed output) ──────────────────────────────

  ipcMain.handle('terminal:run', async (
    _e,
    opts: { cwd: string; command: string; sessionId: string; timeoutMs?: number }
  ) => {
    const { cwd, command, sessionId, timeoutMs = 30_000 } = opts

    // Block dangerous commands
    for (const pattern of BLOCKED_COMMANDS) {
      if (pattern.test(command)) {
        win.webContents.send('terminal:output', { sessionId, data: `\r\n⛔ Command blocked: ${command}\r\n`, type: 'stderr' })
        return { exitCode: 1, error: 'Command blocked by security policy' }
      }
    }

    return new Promise<{ exitCode: number | null; error?: string }>((resolve) => {
      const child = spawn(command, {
        cwd: cwd || process.env.HOME,
        shell: true,
        env: { ...process.env },
      })

      sessions.set(sessionId, child)

      const timer = setTimeout(() => {
        child.kill('SIGTERM')
        win.webContents.send('terminal:output', { sessionId, data: '\r\n⏱ Command timed out\r\n', type: 'stderr' })
        resolve({ exitCode: null, error: 'Timeout' })
      }, timeoutMs)

      child.stdout?.on('data', (data: Buffer) => {
        win.webContents.send('terminal:output', { sessionId, data: data.toString(), type: 'stdout' })
      })

      child.stderr?.on('data', (data: Buffer) => {
        win.webContents.send('terminal:output', { sessionId, data: data.toString(), type: 'stderr' })
      })

      child.on('close', (code) => {
        clearTimeout(timer)
        sessions.delete(sessionId)
        win.webContents.send('terminal:done', { sessionId, exitCode: code })
        resolve({ exitCode: code })
      })

      child.on('error', (err) => {
        clearTimeout(timer)
        sessions.delete(sessionId)
        win.webContents.send('terminal:output', { sessionId, data: `\r\nError: ${err.message}\r\n`, type: 'stderr' })
        resolve({ exitCode: 1, error: err.message })
      })
    })
  })

  // ── Kill a running session ─────────────────────────────────────────────────

  ipcMain.handle('terminal:kill', (_e, sessionId: string) => {
    const child = sessions.get(sessionId)
    if (child) {
      child.kill('SIGTERM')
      sessions.delete(sessionId)
      return true
    }
    return false
  })

  // ── Write stdin to a session ───────────────────────────────────────────────

  ipcMain.on('terminal:stdin', (_e, opts: { sessionId: string; data: string }) => {
    const child = sessions.get(opts.sessionId)
    child?.stdin?.write(opts.data)
  })

  // ── Get suggested commands for a repo ─────────────────────────────────────

  ipcMain.handle('terminal:getSuggestions', (_e, repoPath: string) => {
    const suggestions: string[] = []
    const check = (file: string, cmds: string[]): void => {
      try {
        const fs = require('fs') as typeof import('fs')
        if (fs.existsSync(path.join(repoPath, file))) suggestions.push(...cmds)
      } catch { /* */ }
    }
    check('package.json',    ['npm install', 'npm run dev', 'npm run build', 'npm test', 'npm run lint'])
    check('Cargo.toml',      ['cargo build', 'cargo test', 'cargo run'])
    check('requirements.txt',['pip install -r requirements.txt', 'python -m pytest'])
    check('Makefile',        ['make', 'make test', 'make build'])
    check('docker-compose.yml', ['docker-compose up', 'docker-compose down'])
    check('go.mod',          ['go build ./...', 'go test ./...'])
    return suggestions
  })
}
