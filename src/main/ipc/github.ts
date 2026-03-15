import { ipcMain, shell } from 'electron'
import { getSecureSetting, setSecureSetting, setSetting } from '../db/settings'

// Lazy-load Octokit to avoid startup cost
async function getOctokit(token?: string) {
  const { Octokit } = await import('@octokit/rest')
  const key = token ?? getSecureSetting('github_token')
  if (!key) throw new Error('No GitHub token configured')
  return new Octokit({ auth: key })
}

function parseRepoUrl(remoteUrl: string): { owner: string; repo: string } | null {
  // Handles https://github.com/owner/repo.git and git@github.com:owner/repo.git
  const https = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/)
  if (!https) return null
  return { owner: https[1], repo: https[2] }
}

export function registerGithubHandlers(): void {

  // ── Token management ───────────────────────────────────────────────────────

  ipcMain.handle('github:getToken', () => {
    const token = getSecureSetting('github_token')
    return token ? { configured: true, masked: `${token.slice(0, 4)}...${token.slice(-4)}` } : { configured: false, masked: null }
  })

  ipcMain.handle('github:setToken', (_e, token: string) => {
    setSecureSetting('github_token', token)
    return true
  })

  ipcMain.handle('github:removeToken', () => {
    setSetting('github_token', '') // clear the encrypted blob
    return true
  })

  ipcMain.handle('github:testToken', async (_e, token?: string) => {
    try {
      const octokit = await getOctokit(token)
      const { data } = await octokit.rest.users.getAuthenticated()
      return { ok: true, login: data.login, name: data.name }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  // ── Open GitHub token settings in browser ─────────────────────────────────

  ipcMain.handle('github:openTokenPage', () => {
    shell.openExternal('https://github.com/settings/tokens/new?scopes=repo,read:user&description=Conductr')
    return true
  })

  // ── Issues ────────────────────────────────────────────────────────────────

  ipcMain.handle('github:getIssues', async (_e, remoteUrl: string, state: 'open' | 'closed' | 'all' = 'open') => {
    try {
      const parsed = parseRepoUrl(remoteUrl)
      if (!parsed) return { error: 'Could not parse GitHub repo URL' }
      const octokit = await getOctokit()
      const { data } = await octokit.rest.issues.listForRepo({
        ...parsed,
        state,
        per_page: 50,
        sort: 'updated',
      })
      return data
        .filter((i) => !i.pull_request) // exclude PRs from issues list
        .map((i) => ({
          number: i.number,
          title: i.title,
          body: i.body ?? '',
          state: i.state,
          labels: i.labels.map((l) => (typeof l === 'string' ? l : l.name ?? '')),
          assignee: i.assignee?.login ?? null,
          url: i.html_url,
          created_at: i.created_at,
          updated_at: i.updated_at,
        }))
    } catch (err) {
      return { error: String(err) }
    }
  })

  // ── Create PR ─────────────────────────────────────────────────────────────

  ipcMain.handle('github:createPR', async (_e, opts: {
    remoteUrl: string
    head: string
    base: string
    title: string
    body: string
    issueNumber?: number
  }) => {
    try {
      const parsed = parseRepoUrl(opts.remoteUrl)
      if (!parsed) return { error: 'Could not parse GitHub repo URL' }
      const octokit = await getOctokit()
      const { data } = await octokit.rest.pulls.create({
        ...parsed,
        head: opts.head,
        base: opts.base,
        title: opts.title,
        body: opts.body,
      })
      return { ok: true, url: data.html_url, number: data.number }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  // ── List PRs ──────────────────────────────────────────────────────────────

  ipcMain.handle('github:getPRs', async (_e, remoteUrl: string) => {
    try {
      const parsed = parseRepoUrl(remoteUrl)
      if (!parsed) return { error: 'Could not parse GitHub repo URL' }
      const octokit = await getOctokit()
      const { data } = await octokit.rest.pulls.list({
        ...parsed,
        state: 'open',
        per_page: 20,
      })
      return data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        head: pr.head.ref,
        base: pr.base.ref,
        url: pr.html_url,
        created_at: pr.created_at,
      }))
    } catch (err) {
      return { error: String(err) }
    }
  })

  // ── Repo info ─────────────────────────────────────────────────────────────

  ipcMain.handle('github:getRepoInfo', async (_e, remoteUrl: string) => {
    try {
      const parsed = parseRepoUrl(remoteUrl)
      if (!parsed) return null
      const octokit = await getOctokit()
      const { data } = await octokit.rest.repos.get(parsed)
      return {
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        defaultBranch: data.default_branch,
        isPrivate: data.private,
        stars: data.stargazers_count,
        url: data.html_url,
      }
    } catch {
      return null
    }
  })
}
