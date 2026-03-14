import { useState, useEffect, useRef, useCallback } from 'react'
import { useUIStore } from '../store/ui'
import type { NavPage } from '../App'
import type { SearchResult, SearchResultType } from '../env.d'

interface SearchModalProps {
  onNavigate: (page: NavPage) => void
}

const TYPE_META: Record<SearchResultType, { label: string; icon: string; page: NavPage; color: string }> = {
  task:     { label: 'Tasks',    icon: 'fa-solid fa-gears',        page: 'workshop',  color: '#fbbf24' },
  agent:    { label: 'Agents',   icon: 'fa-solid fa-robot',        page: 'agents',    color: '#8b7cf8' },
  document: { label: 'Documents',icon: 'fa-solid fa-file-lines',   page: 'documents', color: '#22d3ee' },
  journal:  { label: 'Journal',  icon: 'fa-solid fa-book',         page: 'journal',   color: '#34d399' },
  message:  { label: 'Chat',     icon: 'fa-solid fa-message',      page: 'chat',      color: '#a78bfa' },
}

const TYPE_ORDER: SearchResultType[] = ['task', 'agent', 'document', 'journal', 'message']

export default function SearchModal({ onNavigate }: SearchModalProps): React.JSX.Element | null {
  const isOpen    = useUIStore((s) => s.isSearchOpen)
  const closeSearch = useUIStore((s) => s.closeSearch)
  const accentColor = useUIStore((s) => s.accentColor)

  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [focused,  setFocused]  = useState(-1)
  const inputRef  = useRef<HTMLInputElement>(null)
  const debouncer = useRef<ReturnType<typeof setTimeout>>()

  // Grouped results in display order
  const grouped = TYPE_ORDER
    .map((type) => ({ type, items: results.filter((r) => r.type === type) }))
    .filter((g) => g.items.length > 0)

  // Flat list for keyboard navigation
  const flat = grouped.flatMap((g) => g.items)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setFocused(-1)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Debounced search
  const runSearch = useCallback((q: string): void => {
    if (debouncer.current) clearTimeout(debouncer.current)
    if (!q.trim() || q.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    debouncer.current = setTimeout(async () => {
      try {
        const res = await window.electronAPI.search.global(q.trim())
        setResults(res)
        setFocused(-1)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 220)
  }, [])

  useEffect(() => {
    runSearch(query)
  }, [query, runSearch])

  function handleSelect(result: SearchResult): void {
    onNavigate(TYPE_META[result.type].page)
    closeSearch()
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Escape') { closeSearch(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocused((f) => Math.min(f + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocused((f) => Math.max(f - 1, 0))
    } else if (e.key === 'Enter' && focused >= 0 && flat[focused]) {
      handleSelect(flat[focused])
    }
  }

  if (!isOpen) return null

  return (
    <div
      onClick={closeSearch}
      style={{
        position: 'fixed', inset: 0, zIndex: 8000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 120,
        background: 'rgba(4, 4, 10, 0.80)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } as React.CSSProperties}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 600,
          background: 'rgba(10, 10, 22, 0.97)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderTopColor: 'rgba(255,255,255,0.18)',
          borderRadius: 18,
          boxShadow: '0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(139,124,248,0.08)',
          overflow: 'hidden',
          animation: 'fade-in 0.15s ease',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input row */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <i
            className={loading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-magnifying-glass'}
            style={{ fontSize: 16, color: loading ? accentColor : 'rgba(255,255,255,0.35)', flexShrink: 0 }}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, agents, documents, messages…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#eef0f8', fontSize: 16, letterSpacing: '-0.01em',
            }}
          />
          <kbd
            style={{
              padding: '2px 7px', borderRadius: 5,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'inherit',
            }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {query.trim().length < 2 ? (
            /* Empty / hint state */
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 28, color: 'rgba(255,255,255,0.10)', marginBottom: 12, display: 'block' }} />
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.28)', margin: 0 }}>
                Search across all tasks, agents, documents,<br />journal entries, and chat messages
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
                {TYPE_ORDER.map((type) => {
                  const m = TYPE_META[type]
                  return (
                    <div
                      key={type}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 10px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 8,
                        fontSize: 12, color: 'rgba(255,255,255,0.35)',
                      }}
                    >
                      <i className={m.icon} style={{ fontSize: 11, color: m.color }} />
                      {m.label}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : results.length === 0 && !loading ? (
            /* No results */
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.30)', margin: 0 }}>
                No results for <strong style={{ color: 'rgba(255,255,255,0.55)' }}>"{query}"</strong>
              </p>
            </div>
          ) : (
            /* Result groups */
            grouped.map((group) => {
              const meta = TYPE_META[group.type]
              return (
                <div key={group.type}>
                  {/* Group header */}
                  <div
                    style={{
                      padding: '8px 20px 4px',
                      display: 'flex', alignItems: 'center', gap: 7,
                    }}
                  >
                    <i className={meta.icon} style={{ fontSize: 10, color: meta.color }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {meta.label}
                    </span>
                  </div>

                  {/* Result items */}
                  {group.items.map((result) => {
                    const flatIdx = flat.indexOf(result)
                    const isFocused = flatIdx === focused
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setFocused(flatIdx)}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '10px 20px',
                          background: isFocused ? 'rgba(139,124,248,0.10)' : 'transparent',
                          border: 'none',
                          borderLeft: isFocused ? `2px solid ${accentColor}` : '2px solid transparent',
                          cursor: 'pointer',
                          display: 'block',
                          transition: 'background 0.1s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#dde2f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {result.title}
                          </span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', flexShrink: 0, textTransform: 'capitalize' }}>
                            {result.subtitle}
                          </span>
                        </div>
                        {result.snippet && (
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {result.snippet}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div
            style={{
              padding: '8px 20px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 16,
            }}
          >
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
              <kbd style={{ padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', marginRight: 4, fontSize: 10 }}>↑↓</kbd>
              Navigate
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
              <kbd style={{ padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', marginRight: 4, fontSize: 10 }}>↵</kbd>
              Open
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
