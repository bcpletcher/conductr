import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getDb } from '../db/schema'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'

export function registerRepoHandlers(win: BrowserWindow): void {

  // ── Repo CRUD ──────────────────────────────────────────────────────────────

  ipcMain.handle('repos:getAll', () => {
    const db = getDb()
    return db.prepare(`SELECT * FROM repos ORDER BY name ASC`).all()
  })

  ipcMain.handle('repos:add', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Connect Repository',
      properties: ['openDirectory'],
    })
    if (result.canceled || !result.filePaths[0]) return null

    const repoPath = result.filePaths[0]
    const name = path.basename(repoPath)
    const db = getDb()

    // Check if already connected
    const existing = db.prepare(`SELECT id FROM repos WHERE path = ?`).get(repoPath)
    if (existing) return existing

    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`INSERT INTO repos (id, name, path, created_at) VALUES (?, ?, ?, ?)`)
      .run(id, name, repoPath, now)
    return db.prepare(`SELECT * FROM repos WHERE id = ?`).get(id)
  })

  ipcMain.handle('repos:remove', (_e, id: string) => {
    const db = getDb()
    db.prepare(`DELETE FROM repos WHERE id = ?`).run(id)
    return true
  })

  // ── File tree ──────────────────────────────────────────────────────────────

  ipcMain.handle('repos:getTree', (_e, repoPath: string, subPath = '') => {
    const target = path.join(repoPath, subPath)
    if (!target.startsWith(repoPath)) return [] // path traversal guard
    try {
      const entries = fs.readdirSync(target, { withFileTypes: true })
      return entries
        .filter((e) => !IGNORE_DIRS.has(e.name))
        .map((e) => ({
          name: e.name,
          path: path.join(subPath, e.name),
          isDir: e.isDirectory(),
        }))
        .sort((a, b) => {
          // Dirs first, then files, then alpha
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
          return a.name.localeCompare(b.name)
        })
    } catch {
      return []
    }
  })

  // ── File read ──────────────────────────────────────────────────────────────

  ipcMain.handle('repos:readFile', (_e, repoPath: string, filePath: string) => {
    const target = path.join(repoPath, filePath)
    if (!target.startsWith(repoPath)) return null // path traversal guard
    try {
      const stat = fs.statSync(target)
      if (stat.size > 1_000_000) return { error: 'File too large (>1 MB)' }
      return { content: fs.readFileSync(target, 'utf-8'), path: filePath }
    } catch {
      return null
    }
  })

  // ── File write ─────────────────────────────────────────────────────────────

  ipcMain.handle('repos:writeFile', (_e, repoPath: string, filePath: string, content: string) => {
    const target = path.join(repoPath, filePath)
    if (!target.startsWith(repoPath)) return { ok: false, error: 'Path traversal denied' }
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, content, 'utf-8')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  // ── Find file by name (for @file: syntax) ─────────────────────────────────

  ipcMain.handle('repos:findFile', (_e, repoPath: string, query: string) => {
    const results: { path: string; name: string }[] = []
    walkDir(repoPath, repoPath, query.toLowerCase(), results, 0)
    return results.slice(0, 20)
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'out', 'build', '.cache',
  '__pycache__', '.venv', 'venv', '.DS_Store', 'coverage', '.nyc_output',
])

function walkDir(
  root: string,
  dir: string,
  query: string,
  results: { path: string; name: string }[],
  depth: number
): void {
  if (depth > 8 || results.length >= 20) return
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      if (IGNORE_DIRS.has(e.name)) continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        walkDir(root, full, query, results, depth + 1)
      } else if (e.name.toLowerCase().includes(query)) {
        results.push({ path: path.relative(root, full), name: e.name })
      }
    }
  } catch { /* permission error */ }
}
