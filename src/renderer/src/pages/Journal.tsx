import { useEffect, useState, useRef } from 'react'
import type { JournalEntry } from '../env.d'

const api = window.electronAPI

const ENTRY_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  manual:        { label: 'Manual',        color: '#64748b' },
  task_complete: { label: 'Task Complete', color: '#34d399' },
  recap:         { label: 'Recap',         color: '#a78bfa' },
  system:        { label: 'System',        color: '#60a5fa' },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function Journal(): React.JSX.Element {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [query, setQuery] = useState('')
  const [composing, setComposing] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadEntries(q = '') {
    const data = q
      ? await api.journal.search(q) as JournalEntry[]
      : await api.journal.getAll() as JournalEntry[]
    setEntries(data)
  }

  useEffect(() => { loadEntries() }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadEntries(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  async function handleCreate() {
    if (!newTitle.trim()) return
    const entry = await api.journal.create({
      title: newTitle.trim(),
      content: newContent.trim(),
      entry_type: 'manual',
    }) as JournalEntry
    setEntries(prev => [entry, ...prev])
    setNewTitle('')
    setNewContent('')
    setComposing(false)
  }

  async function handleUpdate(id: string) {
    const updated = await api.journal.update(id, editContent) as JournalEntry
    setEntries(prev => prev.map(e => e.id === id ? updated : e))
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    await api.journal.delete(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  // Group entries by date
  const grouped = entries.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
    const key = entry.date
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div data-testid="journal-page" className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="page-header flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="page-title">Journal</h1>
          <p className="page-subtitle">Session log and decision history</p>
        </div>
        <button
          data-testid="journal-new-entry-btn"
          onClick={() => setComposing(true)}
          className="btn-primary flex items-center gap-2"
          style={{ fontSize: 13, padding: '8px 14px' }}
        >
          <i className="fa-solid fa-plus" style={{ fontSize: 11 }} />
          New Entry
        </button>
      </div>

      {/* Search — outside the card, like Documents */}
      <div className="flex-shrink-0 mb-3">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" style={{ fontSize: 12 }} />
          <input
            type="text"
            placeholder="Search journal…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-8 pr-4 py-2 rounded-xl text-sm text-text-primary placeholder-text-muted outline-none"
            style={{
              background: 'rgba(0,0,0,0.12)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
        </div>
      </div>

      <div className="card flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
        {/* New entry compose form */}
        {composing && (
          <div className="card p-4 space-y-3">
            <div className="text-sm font-semibold text-text-primary">New Journal Entry</div>
            <input
              data-testid="journal-entry-title"
              type="text"
              placeholder="Title…"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-text-primary placeholder-text-muted outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              autoFocus
            />
            <textarea
              data-testid="journal-entry-content"
              placeholder="Write your entry…"
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm text-text-primary placeholder-text-muted outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            <div className="flex gap-2">
              <button
                data-testid="journal-entry-submit"
                onClick={handleCreate}
                className="btn-primary text-sm px-3 py-1.5"
              >
                Save Entry
              </button>
              <button
                onClick={() => { setComposing(false); setNewTitle(''); setNewContent('') }}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {entries.length === 0 && !composing && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <i className="fa-solid fa-book-open" style={{ fontSize: 16, color: 'rgba(255,255,255,0.32)' }} />
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              No journal entries yet —<br />completed tasks will be logged here automatically
            </div>
          </div>
        )}

        {/* Entries grouped by date */}
        {sortedDates.map(date => (
          <div key={date}>
            <div className="section-label mb-2 px-1">{formatDate(date)}</div>
            <div className="space-y-2">
              {grouped[date].map(entry => {
                const badge = ENTRY_TYPE_BADGE[entry.entry_type] || ENTRY_TYPE_BADGE.manual
                const isEditing = editingId === entry.id

                return (
                  <div key={entry.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-text-primary">{entry.title}</span>
                          <span
                            className="px-1.5 py-0.5 rounded text-xs font-medium"
                            style={{ background: `${badge.color}18`, color: badge.color, fontSize: 10 }}
                          >
                            {badge.label}
                          </span>
                        </div>
                        {entry.task_title && (
                          <div className="text-xs text-text-muted mt-0.5">
                            <i className="fa-solid fa-gears mr-1" style={{ fontSize: 9 }} />
                            {entry.task_title}
                          </div>
                        )}
                        <div className="text-xs text-text-muted mt-0.5">
                          {new Date(entry.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {entry.entry_type === 'manual' && !isEditing && (
                          <button
                            onClick={() => { setEditingId(entry.id); setEditContent(entry.content) }}
                            className="p-1.5 rounded-lg transition-all hover:bg-white/5"
                            style={{ color: '#64748b' }}
                          >
                            <i className="fa-solid fa-pen" style={{ fontSize: 11 }} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1.5 rounded-lg transition-all hover:bg-red-500/10"
                          style={{ color: '#64748b' }}
                        >
                          <i className="fa-solid fa-xmark" style={{ fontSize: 11 }} />
                        </button>
                      </div>
                    </div>

                    {/* Content or editor */}
                    {isEditing ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 rounded-lg text-sm text-text-primary outline-none resize-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdate(entry.id)} className="btn-primary text-xs px-3 py-1.5">Save</button>
                          <button onClick={() => setEditingId(null)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      entry.content && (
                        <div
                          className="mt-2 text-sm text-text-secondary leading-relaxed"
                          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        >
                          {entry.content.length > 300
                            ? entry.content.slice(0, 300) + '…'
                            : entry.content}
                        </div>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
