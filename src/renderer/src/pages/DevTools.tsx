import { useState, useEffect, useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useUIStore } from '../store/ui'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Repo {
  id: string
  name: string
  path: string
  remote_url: string | null
  created_at: string
}

interface FileEntry {
  name: string
  path: string
  isDir: boolean
}

interface GitStatus {
  branch: string | null
  tracking: string | null
  ahead: number
  behind: number
  staged: string[]
  modified: string[]
  not_added: string[]
  deleted: string[]
  isClean: boolean
  error?: string
}

interface GitCommit {
  hash: string
  message: string
  author: string
  date: string
}

interface GithubIssue {
  number: number
  title: string
  body: string
  state: string
  labels: string[]
  url: string
  created_at: string
}

type DevTab = 'repos' | 'terminal' | 'git' | 'github'

// ─── DevTools page ────────────────────────────────────────────────────────────

export default function DevTools(): React.JSX.Element {
  const [tab, setTab] = useState<DevTab>('repos')
  const accentColor = useUIStore((s) => s.accentColor)

  const tabs: { id: DevTab; label: string; icon: string }[] = [
    { id: 'repos',    label: 'Repos',    icon: 'fa-solid fa-folder-open' },
    { id: 'terminal', label: 'Terminal', icon: 'fa-solid fa-terminal' },
    { id: 'git',      label: 'Git',      icon: 'fa-solid fa-code-branch' },
    { id: 'github',   label: 'GitHub',   icon: 'fa-brands fa-github' },
  ]

  return (
    <div data-testid="devtools-page" className="flex flex-col h-full" style={{ gap: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#eef0f8', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Developer Tools
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>
            Connect repos, run commands, manage git and GitHub
          </p>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: 20,
          background: 'rgba(129,140,248,0.10)', border: '1px solid rgba(129,140,248,0.20)',
          fontSize: 12, color: accentColor, fontWeight: 600,
        }}>
          <i className="fa-solid fa-code mr-2" />Phase 12
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12, padding: 4,
      }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '8px 0',
              borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              background: tab === t.id ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: tab === t.id ? '#eef0f8' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.15s',
              boxShadow: tab === t.id ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
            }}
          >
            <i className={`${t.icon} mr-2`} style={{ fontSize: 12 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'repos'    && <ReposTab />}
        {tab === 'terminal' && <TerminalTab />}
        {tab === 'git'      && <GitTab />}
        {tab === 'github'   && <GithubTab />}
      </div>
    </div>
  )
}

// ─── Repos Tab ────────────────────────────────────────────────────────────────

function ReposTab(): React.JSX.Element {
  const [repos, setRepos] = useState<Repo[]>([])
  const [selected, setSelected] = useState<Repo | null>(null)
  const [tree, setTree] = useState<FileEntry[]>([])
  const [breadcrumb, setBreadcrumb] = useState<string[]>([])
  const [fileContent, setFileContent] = useState<{ path: string; content: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const addToast = useUIStore((s) => s.addToast)

  useEffect(() => {
    window.electronAPI.repos.getAll().then(setRepos).catch(() => {})
  }, [])

  const loadTree = useCallback(async (repo: Repo, subPath = '') => {
    setLoading(true)
    const entries = await window.electronAPI.repos.getTree(repo.path, subPath)
    setTree(entries as FileEntry[])
    setBreadcrumb(subPath ? subPath.split('/').filter(Boolean) : [])
    setFileContent(null)
    setLoading(false)
  }, [])

  const handleSelectRepo = (repo: Repo): void => {
    setSelected(repo)
    loadTree(repo, '')
  }

  const handleEntry = async (entry: FileEntry): Promise<void> => {
    if (!selected) return
    if (entry.isDir) {
      loadTree(selected, entry.path)
    } else {
      const result = await window.electronAPI.repos.readFile(selected.path, entry.path)
      if (result && 'content' in result) {
        setFileContent({ path: entry.path, content: result.content })
      }
    }
  }

  const handleAdd = async (): Promise<void> => {
    const repo = await window.electronAPI.repos.add()
    if (repo) {
      setRepos((r) => [...r.filter((x) => x.id !== (repo as Repo).id), repo as Repo])
      addToast(`Connected: ${(repo as Repo).name}`, 'success')
    }
  }

  const handleRemove = async (id: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    await window.electronAPI.repos.remove(id)
    setRepos((r) => r.filter((x) => x.id !== id))
    if (selected?.id === id) { setSelected(null); setTree([]); setFileContent(null) }
  }

  return (
    <div className="flex gap-4 h-full" style={{ minHeight: 0 }}>
      {/* Repo list */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Connected Repos
          </span>
          <button onClick={handleAdd} className="glass-btn" style={{ fontSize: 11, padding: '4px 10px' }}>
            <i className="fa-solid fa-plus mr-1" />Connect
          </button>
        </div>
        <div className="space-y-1.5">
          {repos.length === 0 && (
            <div style={{ padding: '20px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
              No repos connected.<br />Click Connect to add one.
            </div>
          )}
          {repos.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelectRepo(r)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 12px',
                borderRadius: 10, border: 'none', cursor: 'pointer',
                background: selected?.id === r.id ? 'rgba(129,140,248,0.12)' : 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background 0.15s',
              }}
            >
              <i className="fa-solid fa-folder" style={{ fontSize: 13, color: '#fbbf24', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 13, fontWeight: 500, color: '#eef0f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.path}
                </div>
              </div>
              <button
                onClick={(e) => handleRemove(r.id, e)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: 2, flexShrink: 0 }}
              >
                <i className="fa-solid fa-xmark" style={{ fontSize: 11 }} />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* File tree */}
      {selected && !fileContent && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 mb-3">
            {breadcrumb.length > 0 && (
              <button
                onClick={() => loadTree(selected, breadcrumb.slice(0, -1).join('/'))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: '2px 6px' }}
              >
                <i className="fa-solid fa-arrow-left" style={{ fontSize: 12 }} />
              </button>
            )}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {selected.name}{breadcrumb.length > 0 ? ' / ' + breadcrumb.join(' / ') : ''}
            </span>
            {loading && <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }} />}
          </div>
          <div className="space-y-0.5">
            {tree.map((entry) => (
              <button
                key={entry.path}
                onClick={() => handleEntry(entry)}
                style={{
                  width: '100%', textAlign: 'left', padding: '6px 10px',
                  borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: 'transparent', display: 'flex', alignItems: 'center', gap: 8,
                  color: '#eef0f8', fontSize: 13,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <i
                  className={entry.isDir ? 'fa-solid fa-folder' : getFileIcon(entry.name)}
                  style={{ fontSize: 12, color: entry.isDir ? '#fbbf24' : 'rgba(255,255,255,0.45)', flexShrink: 0, width: 14 }}
                />
                <span>{entry.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File viewer */}
      {fileContent && (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setFileContent(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: '2px 6px' }}
            >
              <i className="fa-solid fa-arrow-left" style={{ fontSize: 12 }} />
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{fileContent.path}</span>
          </div>
          <pre style={{
            flex: 1, overflow: 'auto',
            background: 'rgba(0,0,0,0.35)', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '14px 16px', margin: 0,
            fontSize: 12, color: '#c9d1e0',
            fontFamily: 'monospace', lineHeight: 1.6,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {fileContent.content}
          </pre>
        </div>
      )}

      {!selected && repos.length > 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
          Select a repo to browse its files
        </div>
      )}
    </div>
  )
}

// ─── Terminal Tab ─────────────────────────────────────────────────────────────

function TerminalTab(): React.JSX.Element {
  const [repos, setRepos] = useState<Repo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
  const [command, setCommand] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [sessions, setSessions] = useState<{ id: string; command: string; output: string; exitCode: number | null; running: boolean }[]>([])
  const outputRef = useRef<HTMLDivElement>(null)
  const addToast = useUIStore((s) => s.addToast)

  useEffect(() => {
    window.electronAPI.repos.getAll().then((r) => {
      setRepos(r as Repo[])
      if ((r as Repo[]).length > 0) setSelectedRepo((r as Repo[])[0])
    }).catch(() => {})

    window.electronAPI.terminal.onOutput(({ sessionId, data, type }) => {
      setSessions((prev) => prev.map((s) =>
        s.id === sessionId
          ? { ...s, output: s.output + (type === 'stderr' ? `\x1b[31m${data}\x1b[0m` : data) }
          : s
      ))
    })
    window.electronAPI.terminal.onDone(({ sessionId, exitCode }) => {
      setSessions((prev) => prev.map((s) =>
        s.id === sessionId ? { ...s, running: false, exitCode } : s
      ))
    })
    return () => window.electronAPI.terminal.removeAllListeners()
  }, [])

  useEffect(() => {
    if (selectedRepo) {
      window.electronAPI.terminal.getSuggestions(selectedRepo.path).then(setSuggestions).catch(() => {})
    }
  }, [selectedRepo])

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [sessions])

  const run = async (): Promise<void> => {
    if (!command.trim() || !selectedRepo) return
    const sessionId = uuidv4()
    setSessions((prev) => [...prev, { id: sessionId, command, output: '', exitCode: null, running: true }])
    setCommand('')
    const result = await window.electronAPI.terminal.run({
      cwd: selectedRepo.path,
      command: command.trim(),
      sessionId,
      timeoutMs: 120_000,
    })
    if ((result as { exitCode: number | null }).exitCode !== 0) {
      addToast(`Command exited with code ${(result as { exitCode: number | null }).exitCode}`, 'error')
    }
  }

  const killSession = async (id: string): Promise<void> => {
    await window.electronAPI.terminal.kill(id)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Repo picker + command input */}
      <div className="flex gap-3 items-center">
        <select
          value={selectedRepo?.id ?? ''}
          onChange={(e) => setSelectedRepo(repos.find((r) => r.id === e.target.value) ?? null)}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 8, color: '#eef0f8', padding: '7px 10px', fontSize: 13,
            flexShrink: 0, minWidth: 160,
          }}
        >
          {repos.length === 0 && <option value="">No repos connected</option>}
          {repos.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <div className="flex-1 flex gap-2">
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') run() }}
            placeholder="Enter command… (e.g. npm run build)"
            list="cmd-suggestions"
            style={{
              flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 8, color: '#eef0f8', padding: '7px 12px', fontSize: 13,
              fontFamily: 'monospace', outline: 'none',
            }}
          />
          <datalist id="cmd-suggestions">
            {suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
          <button
            onClick={run}
            disabled={!command.trim() || !selectedRepo}
            className="glass-btn"
            style={{ padding: '7px 16px', fontSize: 13, opacity: (!command.trim() || !selectedRepo) ? 0.4 : 1 }}
          >
            <i className="fa-solid fa-play mr-1.5" style={{ fontSize: 11 }} />Run
          </button>
        </div>
      </div>

      {/* Session outputs */}
      <div ref={outputRef} className="flex-1 overflow-y-auto space-y-3">
        {sessions.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13, paddingTop: 40 }}>
            No commands run yet. Type a command above and press Run.
          </div>
        )}
        {[...sessions].reverse().map((s) => (
          <div key={s.id} style={{
            background: 'rgba(0,0,0,0.35)', borderRadius: 10,
            border: `1px solid ${s.running ? 'rgba(129,140,248,0.3)' : s.exitCode === 0 ? 'rgba(52,211,153,0.25)' : s.exitCode === null ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                <i className="fa-solid fa-dollar-sign mr-2" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                {s.command}
              </span>
              <div className="flex items-center gap-2">
                {s.running
                  ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 11, color: '#818cf8' }} />
                    <button onClick={() => killSession(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.7)', fontSize: 11 }}>
                      <i className="fa-solid fa-stop" />
                    </button></>
                  : <span style={{ fontSize: 11, color: s.exitCode === 0 ? '#34d399' : s.exitCode === null ? 'rgba(255,255,255,0.3)' : '#f87171', fontWeight: 600 }}>
                      exit {s.exitCode ?? 'killed'}
                    </span>
                }
              </div>
            </div>
            <pre style={{
              margin: 0, padding: '10px 16px', fontSize: 12, lineHeight: 1.6,
              color: '#c9d1e0', fontFamily: 'monospace',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              maxHeight: 300, overflowY: 'auto',
            }}>
              {s.output || <span style={{ color: 'rgba(255,255,255,0.2)' }}>Running…</span>}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Git Tab ──────────────────────────────────────────────────────────────────

function GitTab(): React.JSX.Element {
  const [repos, setRepos] = useState<Repo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [log, setLog] = useState<GitCommit[]>([])
  const [branches, setBranches] = useState<{ current: string; all: string[] } | null>(null)
  const [commitMsg, setCommitMsg] = useState('')
  const [newBranch, setNewBranch] = useState('')
  const [diff, setDiff] = useState('')
  const [loadingStatus, setLoadingStatus] = useState(false)
  const addToast = useUIStore((s) => s.addToast)

  useEffect(() => {
    window.electronAPI.repos.getAll().then((r) => {
      setRepos(r as Repo[])
      if ((r as Repo[]).length > 0) setSelectedRepo((r as Repo[])[0])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedRepo) loadStatus()
  }, [selectedRepo])

  const loadStatus = async (): Promise<void> => {
    if (!selectedRepo) return
    setLoadingStatus(true)
    const [s, l, b] = await Promise.all([
      window.electronAPI.git.status(selectedRepo.path),
      window.electronAPI.git.log(selectedRepo.path, 10),
      window.electronAPI.git.branches(selectedRepo.path),
    ])
    setStatus(s as GitStatus)
    setLog(Array.isArray(l) ? l as GitCommit[] : [])
    setBranches(b as { current: string; all: string[] } | null)
    setLoadingStatus(false)
  }

  const stageAll = async (): Promise<void> => {
    if (!selectedRepo) return
    await window.electronAPI.git.add(selectedRepo.path, ['.'])
    await loadStatus()
    addToast('All changes staged', 'success')
  }

  const commit = async (): Promise<void> => {
    if (!selectedRepo || !commitMsg.trim()) return
    const result = await window.electronAPI.git.commit(selectedRepo.path, commitMsg.trim())
    if ((result as { ok: boolean; error?: string }).ok) {
      setCommitMsg('')
      await loadStatus()
      addToast('Committed', 'success')
    } else {
      addToast((result as { ok: boolean; error?: string }).error ?? 'Commit failed', 'error')
    }
  }

  const push = async (): Promise<void> => {
    if (!selectedRepo) return
    const result = await window.electronAPI.git.push(selectedRepo.path)
    if ((result as { ok: boolean; error?: string }).ok) {
      addToast('Pushed to remote', 'success')
      await loadStatus()
    } else {
      addToast((result as { ok: boolean; error?: string }).error ?? 'Push failed', 'error')
    }
  }

  const createBranch = async (): Promise<void> => {
    if (!selectedRepo || !newBranch.trim()) return
    const result = await window.electronAPI.git.createBranch(selectedRepo.path, newBranch.trim())
    if ((result as { ok: boolean; error?: string }).ok) {
      setNewBranch('')
      await loadStatus()
      addToast(`Switched to ${newBranch}`, 'success')
    } else {
      addToast((result as { ok: boolean; error?: string }).error ?? 'Branch failed', 'error')
    }
  }

  const loadDiff = async (): Promise<void> => {
    if (!selectedRepo) return
    const result = await window.electronAPI.git.diff(selectedRepo.path, false)
    setDiff((result as { diff?: string; error?: string }).diff ?? (result as { diff?: string; error?: string }).error ?? '')
  }

  const hasChanges = status && (!status.isClean || (status.staged?.length ?? 0) > 0)

  return (
    <div className="flex gap-5 h-full">
      {/* Left: status + commit */}
      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Repo picker */}
        <select
          value={selectedRepo?.id ?? ''}
          onChange={(e) => setSelectedRepo(repos.find((r) => r.id === e.target.value) ?? null)}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 8, color: '#eef0f8', padding: '7px 10px', fontSize: 13,
          }}
        >
          {repos.length === 0 && <option value="">No repos connected</option>}
          {repos.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        {/* Branch info */}
        {status && !status.error && (
          <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.04))', backdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)', WebkitBackdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 16px rgba(0,0,0,0.30)' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Branch</span>
              {loadingStatus && <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }} />}
              <button onClick={loadStatus} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                <i className="fa-solid fa-rotate-right" />
              </button>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#818cf8', marginBottom: 6 }}>
              <i className="fa-solid fa-code-branch mr-2" style={{ fontSize: 12 }} />
              {status.branch ?? 'detached HEAD'}
            </div>
            {status.tracking && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                ↑{status.ahead} ↓{status.behind} · {status.tracking}
              </div>
            )}
            <div className="mt-3 space-y-1">
              {status.staged.map((f) => (
                <div key={f} style={{ fontSize: 11, color: '#34d399' }}>
                  <i className="fa-solid fa-plus mr-1.5" style={{ fontSize: 9 }} />{f}
                </div>
              ))}
              {status.modified.map((f) => (
                <div key={f} style={{ fontSize: 11, color: '#fbbf24' }}>
                  <i className="fa-solid fa-pencil mr-1.5" style={{ fontSize: 9 }} />{f}
                </div>
              ))}
              {status.not_added.map((f) => (
                <div key={f} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  <i className="fa-solid fa-question mr-1.5" style={{ fontSize: 9 }} />{f}
                </div>
              ))}
              {status.deleted.map((f) => (
                <div key={f} style={{ fontSize: 11, color: '#f87171' }}>
                  <i className="fa-solid fa-minus mr-1.5" style={{ fontSize: 9 }} />{f}
                </div>
              ))}
              {status.isClean && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Working tree clean</div>
              )}
            </div>
          </div>
        )}

        {/* Commit */}
        {hasChanges && (
          <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.04))', backdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)', WebkitBackdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 16px rgba(0,0,0,0.30)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>
              Commit
            </div>
            {(status?.modified?.length ?? 0) + (status?.not_added?.length ?? 0) > 0 && (
              <button onClick={stageAll} className="glass-btn" style={{ fontSize: 11, padding: '5px 12px', marginBottom: 8, width: '100%' }}>
                <i className="fa-solid fa-plus mr-1.5" />Stage All
              </button>
            )}
            <textarea
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              placeholder="Commit message…"
              rows={3}
              style={{
                width: '100%', background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7,
                color: '#eef0f8', padding: '8px 10px', fontSize: 12,
                fontFamily: 'inherit', resize: 'none', outline: 'none', marginBottom: 8,
                boxSizing: 'border-box',
              }}
            />
            <div className="flex gap-2">
              <button onClick={commit} disabled={!commitMsg.trim()} className="glass-btn" style={{ flex: 1, fontSize: 12, padding: '6px 0', opacity: commitMsg.trim() ? 1 : 0.4 }}>
                Commit
              </button>
              <button onClick={push} className="glass-btn" style={{ flex: 1, fontSize: 12, padding: '6px 0' }}>
                Push
              </button>
            </div>
          </div>
        )}

        {/* New branch */}
        <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.04))', backdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)', WebkitBackdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 16px rgba(0,0,0,0.30)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>
            New Branch
          </div>
          <div className="flex gap-2">
            <input
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createBranch() }}
              placeholder="branch-name"
              style={{
                flex: 1, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 7, color: '#eef0f8', padding: '6px 8px', fontSize: 12,
                fontFamily: 'monospace', outline: 'none',
              }}
            />
            <button onClick={createBranch} disabled={!newBranch.trim()} className="glass-btn" style={{ fontSize: 12, padding: '6px 10px', opacity: newBranch.trim() ? 1 : 0.4 }}>
              Create
            </button>
          </div>
        </div>
      </div>

      {/* Right: log + diff */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Commit log */}
        <div style={{ background: 'var(--card-bg-dark, rgba(255,255,255,0.03))', backdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)', WebkitBackdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', padding: '12px 14px', flex: '0 0 auto', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 16px rgba(0,0,0,0.30)' }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Recent Commits
            </span>
          </div>
          {log.length === 0
            ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>No commits yet</div>
            : log.slice(0, 5).map((c) => (
              <div key={c.hash} className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#818cf8', flexShrink: 0, marginTop: 1 }}>{c.hash}</span>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 12, color: '#eef0f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.message}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{c.author} · {new Date(c.date).toLocaleDateString()}</div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Diff viewer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Diff
            </span>
            <button onClick={loadDiff} className="glass-btn" style={{ fontSize: 11, padding: '4px 10px' }}>
              <i className="fa-solid fa-eye mr-1" />View Changes
            </button>
          </div>
          <pre style={{
            flex: 1, overflow: 'auto',
            background: 'rgba(0,0,0,0.3)', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '12px 14px', margin: 0,
            fontSize: 11, fontFamily: 'monospace', lineHeight: 1.7,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {diff
              ? diff.split('\n').map((line, i) => (
                <span key={i} style={{
                  display: 'block',
                  color: line.startsWith('+') && !line.startsWith('+++') ? '#34d399'
                    : line.startsWith('-') && !line.startsWith('---') ? '#f87171'
                    : line.startsWith('@@') ? '#818cf8'
                    : 'rgba(255,255,255,0.55)',
                }}>
                  {line}
                </span>
              ))
              : <span style={{ color: 'rgba(255,255,255,0.2)' }}>Click "View Changes" to see unstaged diff</span>
            }
          </pre>
        </div>
      </div>
    </div>
  )
}

// ─── GitHub Tab ───────────────────────────────────────────────────────────────

function GithubTab(): React.JSX.Element {
  const [token, setToken] = useState<{ configured: boolean; masked: string | null } | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [repos, setRepos] = useState<Repo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
  const [issues, setIssues] = useState<GithubIssue[]>([])
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [testing, setTesting] = useState(false)
  const [user, setUser] = useState<string | null>(null)
  const addToast = useUIStore((s) => s.addToast)

  useEffect(() => {
    window.electronAPI.github.getToken().then((t) => setToken(t as { configured: boolean; masked: string | null })).catch(() => {})
    window.electronAPI.repos.getAll().then((r) => {
      setRepos(r as Repo[])
      if ((r as Repo[]).length > 0) setSelectedRepo((r as Repo[])[0])
    }).catch(() => {})
  }, [])

  const saveToken = async (): Promise<void> => {
    if (!tokenInput.trim()) return
    setTesting(true)
    const result = await window.electronAPI.github.testToken(tokenInput.trim())
    if ((result as { ok: boolean; login?: string; error?: string }).ok) {
      await window.electronAPI.github.setToken(tokenInput.trim())
      setToken({ configured: true, masked: `${tokenInput.slice(0, 4)}...${tokenInput.slice(-4)}` })
      setUser((result as { ok: boolean; login?: string }).login ?? null)
      setTokenInput('')
      addToast(`GitHub connected as ${(result as { ok: boolean; login?: string }).login}`, 'success')
    } else {
      addToast((result as { ok: boolean; error?: string }).error ?? 'Invalid token', 'error')
    }
    setTesting(false)
  }

  const loadIssues = async (): Promise<void> => {
    if (!selectedRepo?.remote_url) {
      addToast('This repo has no remote URL configured', 'error')
      return
    }
    setLoadingIssues(true)
    const result = await window.electronAPI.github.getIssues(selectedRepo.remote_url)
    setIssues(Array.isArray(result) ? result as GithubIssue[] : [])
    setLoadingIssues(false)
  }

  const importAsTask = async (issue: GithubIssue): Promise<void> => {
    await window.electronAPI.tasks.create({
      title: `[#${issue.number}] ${issue.title}`,
      description: issue.body?.slice(0, 500) ?? '',
      status: 'queued',
      tags: JSON.stringify(issue.labels),
    } as Parameters<typeof window.electronAPI.tasks.create>[0])
    addToast(`Imported issue #${issue.number} as task`, 'success')
  }

  return (
    <div className="flex gap-5 h-full">
      {/* Left: token + repo */}
      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Token card */}
        <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.04))', backdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)', WebkitBackdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 16px rgba(0,0,0,0.30)' }}>
          <div className="flex items-center gap-2 mb-3">
            <i className="fa-brands fa-github" style={{ fontSize: 16, color: '#eef0f8' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#eef0f8' }}>GitHub Token</span>
            {token?.configured && (
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: 10 }}>
                Connected
              </span>
            )}
          </div>

          {token?.configured
            ? <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
                  Key: {token.masked}{user ? ` · @${user}` : ''}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => { await window.electronAPI.github.removeToken(); setToken({ configured: false, masked: null }); setUser(null) }}
                    style={{ flex: 1, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, color: '#f87171', fontSize: 12, padding: '6px 0', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            : <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
                  Needs repo scope to read issues and create PRs.
                </div>
                <input
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveToken() }}
                  type="password"
                  placeholder="ghp_…"
                  style={{
                    width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 7, color: '#eef0f8', padding: '6px 10px', fontSize: 12,
                    fontFamily: 'monospace', outline: 'none', marginBottom: 8, boxSizing: 'border-box',
                  }}
                />
                <div className="flex gap-2">
                  <button onClick={saveToken} disabled={!tokenInput.trim() || testing} className="glass-btn" style={{ flex: 1, fontSize: 12, padding: '6px 0', opacity: tokenInput.trim() ? 1 : 0.4 }}>
                    {testing ? <i className="fa-solid fa-circle-notch fa-spin mr-1" /> : null}Connect
                  </button>
                  <button
                    onClick={() => window.electronAPI.github.openTokenPage()}
                    style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 7, color: 'rgba(255,255,255,0.55)', fontSize: 12, padding: '6px 0', cursor: 'pointer' }}
                  >
                    Get Token
                  </button>
                </div>
              </div>
          }
        </div>

        {/* Repo picker */}
        <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.04))', backdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)', WebkitBackdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 16px rgba(0,0,0,0.30)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>
            Repo
          </div>
          <select
            value={selectedRepo?.id ?? ''}
            onChange={(e) => setSelectedRepo(repos.find((r) => r.id === e.target.value) ?? null)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 8, color: '#eef0f8', padding: '7px 10px', fontSize: 13, boxSizing: 'border-box',
            }}
          >
            {repos.length === 0 && <option value="">No repos connected</option>}
            {repos.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button
            onClick={loadIssues}
            disabled={!token?.configured || !selectedRepo || loadingIssues}
            className="glass-btn"
            style={{ width: '100%', marginTop: 8, fontSize: 12, padding: '7px 0', opacity: (token?.configured && selectedRepo) ? 1 : 0.4 }}
          >
            {loadingIssues
              ? <><i className="fa-solid fa-circle-notch fa-spin mr-2" />Loading…</>
              : <><i className="fa-brands fa-github mr-2" />Load Issues</>
            }
          </button>
        </div>
      </div>

      {/* Right: issues list */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {issues.length === 0
          ? <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13, paddingTop: 60 }}>
              {token?.configured ? 'Select a repo and click "Load Issues"' : 'Connect a GitHub token to load issues'}
            </div>
          : issues.map((issue) => (
            <div key={issue.number} style={{
              background: 'var(--card-bg, rgba(255,255,255,0.04))', borderRadius: 10,
              backdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)',
              WebkitBackdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.1)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 12px rgba(0,0,0,0.25)',
              padding: '12px 16px', marginBottom: 8,
            }}>
              <div className="flex items-start gap-3">
                <span style={{ fontSize: 11, color: '#818cf8', flexShrink: 0, marginTop: 1, fontWeight: 600 }}>
                  #{issue.number}
                </span>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 13, color: '#eef0f8', fontWeight: 500, marginBottom: 4 }}>{issue.title}</div>
                  {issue.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {issue.labels.map((l) => (
                        <span key={l} style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.07)', padding: '2px 7px', borderRadius: 8 }}>
                          {l}
                        </span>
                      ))}
                    </div>
                  )}
                  {issue.body && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {issue.body}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => importAsTask(issue)}
                    className="glass-btn"
                    style={{ fontSize: 11, padding: '5px 10px', whiteSpace: 'nowrap' }}
                  >
                    <i className="fa-solid fa-plus mr-1" />Import
                  </button>
                  <button
                    onClick={() => window.open(issue.url)}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: 'rgba(255,255,255,0.4)', fontSize: 11, padding: '5px 10px', cursor: 'pointer' }}
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square" />
                  </button>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'fa-solid fa-file-code', tsx: 'fa-solid fa-file-code',
    js: 'fa-solid fa-file-code', jsx: 'fa-solid fa-file-code',
    json: 'fa-solid fa-file-code', md: 'fa-solid fa-file-lines',
    css: 'fa-solid fa-file-code', html: 'fa-solid fa-file-code',
    py: 'fa-solid fa-file-code', rs: 'fa-solid fa-file-code',
    go: 'fa-solid fa-file-code', java: 'fa-solid fa-file-code',
    sh: 'fa-solid fa-file-code', yaml: 'fa-solid fa-file-code',
    yml: 'fa-solid fa-file-code', toml: 'fa-solid fa-file-code',
    png: 'fa-solid fa-file-image', jpg: 'fa-solid fa-file-image',
    svg: 'fa-solid fa-file-image', gif: 'fa-solid fa-file-image',
    pdf: 'fa-solid fa-file-pdf', zip: 'fa-solid fa-file-zipper',
  }
  return map[ext] ?? 'fa-solid fa-file'
}
