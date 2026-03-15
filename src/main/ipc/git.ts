import { ipcMain } from 'electron'
import { simpleGit, SimpleGit } from 'simple-git'
import path from 'path'

function git(repoPath: string): SimpleGit {
  return simpleGit(repoPath, { maxConcurrentProcesses: 2 })
}

export function registerGitHandlers(): void {

  // ── Status ─────────────────────────────────────────────────────────────────

  ipcMain.handle('git:status', async (_e, repoPath: string) => {
    try {
      const g = git(repoPath)
      const status = await g.status()
      return {
        branch: status.current,
        tracking: status.tracking,
        ahead: status.ahead,
        behind: status.behind,
        staged: status.staged,
        modified: status.modified,
        not_added: status.not_added,
        deleted: status.deleted,
        conflicted: status.conflicted,
        isClean: status.isClean(),
      }
    } catch (err) {
      return { error: String(err) }
    }
  })

  // ── Log ────────────────────────────────────────────────────────────────────

  ipcMain.handle('git:log', async (_e, repoPath: string, limit = 20) => {
    try {
      const result = await git(repoPath).log({ maxCount: limit })
      return result.all.map((c) => ({
        hash: c.hash.slice(0, 7),
        message: c.message,
        author: c.author_name,
        date: c.date,
      }))
    } catch (err) {
      return { error: String(err) }
    }
  })

  // ── Branches ───────────────────────────────────────────────────────────────

  ipcMain.handle('git:branches', async (_e, repoPath: string) => {
    try {
      const result = await git(repoPath).branch()
      return {
        current: result.current,
        all: result.all,
      }
    } catch (err) {
      return { error: String(err) }
    }
  })

  // ── Create branch ──────────────────────────────────────────────────────────

  ipcMain.handle('git:createBranch', async (_e, repoPath: string, branchName: string) => {
    try {
      await git(repoPath).checkoutLocalBranch(branchName)
      return { ok: true, branch: branchName }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  // ── Checkout ───────────────────────────────────────────────────────────────

  ipcMain.handle('git:checkout', async (_e, repoPath: string, branch: string) => {
    try {
      await git(repoPath).checkout(branch)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  // ── Diff (staged + unstaged) ───────────────────────────────────────────────

  ipcMain.handle('git:diff', async (_e, repoPath: string, staged = false, filePath?: string) => {
    try {
      const g = git(repoPath)
      const args: string[] = staged ? ['--staged'] : []
      if (filePath) args.push('--', filePath)
      const diffText = staged
        ? await g.diff(['--staged', ...(filePath ? ['--', filePath] : [])])
        : await g.diff(filePath ? ['--', filePath] : [])
      return { diff: diffText }
    } catch (err) {
      return { error: String(err) }
    }
  })

  // ── Stage files ────────────────────────────────────────────────────────────

  ipcMain.handle('git:add', async (_e, repoPath: string, files: string[]) => {
    try {
      await git(repoPath).add(files)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  // ── Commit ─────────────────────────────────────────────────────────────────

  ipcMain.handle('git:commit', async (_e, repoPath: string, message: string) => {
    try {
      const result = await git(repoPath).commit(message)
      return { ok: true, hash: result.commit }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  // ── Push ───────────────────────────────────────────────────────────────────

  ipcMain.handle('git:push', async (_e, repoPath: string, remote = 'origin', branch?: string) => {
    try {
      const g = git(repoPath)
      if (branch) {
        await g.push(remote, branch)
      } else {
        await g.push()
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  // ── Create Conductr task branch ────────────────────────────────────────────

  ipcMain.handle('git:createTaskBranch', async (_e, repoPath: string, taskId: string, taskTitle: string) => {
    try {
      const slug = taskTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40)
      const branchName = `conductr/${taskId.slice(0, 8)}-${slug}`
      await git(repoPath).checkoutLocalBranch(branchName)
      return { ok: true, branch: branchName }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  // ── Check if directory is a git repo ──────────────────────────────────────

  ipcMain.handle('git:isRepo', async (_e, repoPath: string) => {
    try {
      const result = await git(repoPath).checkIsRepo()
      return result
    } catch {
      return false
    }
  })
}
