import { useEffect, useState, useRef } from 'react'
import type { Document } from '../env.d'

const api = window.electronAPI

const DOC_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  output:  { label: 'Output',  color: '#34d399' },
  recap:   { label: 'Recap',   color: '#a78bfa' },
  manual:  { label: 'Manual',  color: '#64748b' },
}

function parseTags(tags: string): string[] {
  try { return JSON.parse(tags) } catch { return [] }
}

export default function Documents(): React.JSX.Element {
  const [documents, setDocuments] = useState<Document[]>([])
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedDoc = documents.find(d => d.id === selectedId) || null

  // Collect all unique tags across documents
  const allTags = Array.from(
    new Set(documents.flatMap(d => parseTags(d.tags)))
  ).filter(t => t !== 'auto-generated')

  async function loadDocuments(q = '', tag: string | null = null) {
    let docs: Document[]
    if (tag) {
      docs = await api.documents.getByTag(tag) as Document[]
    } else if (q) {
      docs = await api.documents.search(q) as Document[]
    } else {
      docs = await api.documents.getAll() as Document[]
    }
    setDocuments(docs)
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      loadDocuments(query, activeTag)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, activeTag])

  // Listen for documents auto-created by task runner
  useEffect(() => {
    api.documents.onCreated(({ document }) => {
      setDocuments(prev => [document as Document, ...prev])
    })
    return () => api.documents.removeCreatedListener()
  }, [])

  async function handleDelete(id: string) {
    await api.documents.delete(id)
    setDocuments(prev => prev.filter(d => d.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div data-testid="documents-page" className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="page-header flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Files, briefs, and AI-generated outputs</p>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 mb-3">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" style={{ fontSize: 12 }} />
          <input
            data-testid="documents-search"
            type="text"
            placeholder="Search documents…"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveTag(null) }}
            className="w-full pl-8 pr-4 py-2 rounded-xl text-sm text-text-primary placeholder-text-muted outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
        </div>
      </div>

      {/* Tag pills */}
      {allTags.length > 0 && (
        <div className="flex-shrink-0 flex gap-2 flex-wrap mb-3">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                background: activeTag === tag ? 'rgba(139,124,248,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${activeTag === tag ? 'rgba(139,124,248,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: activeTag === tag ? '#8b7cf8' : '#64748b',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Two-panel layout */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* List */}
        <div
          data-testid="document-list"
          className="flex flex-col gap-2 overflow-y-auto flex-shrink-0 rounded-2xl p-2"
          style={{
            width: 320,
            background: 'var(--card-bg, rgba(255,255,255,0.04))',
            backdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.2) brightness(var(--card-brightness, 1))',
            WebkitBackdropFilter: 'blur(var(--card-blur, 48px)) saturate(1.2) brightness(var(--card-brightness, 1))',
            border: '1px solid rgba(255,255,255,0.07)',
            borderTopColor: 'rgba(255,255,255,0.11)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.40)',
          }}
        >
          {documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <i className="fa-solid fa-file-lines text-xl" style={{ color: 'rgba(255,255,255,0.30)' }} />
              <span className="text-sm">No documents yet</span>
            </div>
          ) : (
            documents.map(doc => {
              const badge = DOC_TYPE_BADGE[doc.doc_type] || DOC_TYPE_BADGE.manual
              const tags = parseTags(doc.tags).filter(t => t !== 'auto-generated')
              const isSelected = doc.id === selectedId

              return (
                <div
                  key={doc.id}
                  data-testid="document-card"
                  onClick={() => setSelectedId(isSelected ? null : doc.id)}
                  className="p-3.5 cursor-pointer transition-all"
                  style={{
                    borderRadius: 10,
                    border: isSelected
                      ? '1px solid rgba(139,124,248,0.35)'
                      : '1px solid transparent',
                    background: isSelected ? 'rgba(139,124,248,0.10)' : 'rgba(0,0,0,0.12)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{doc.title}</div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {new Date(doc.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </div>
                    </div>
                    <span
                      className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-semibold"
                      style={{ background: `${badge.color}18`, color: badge.color, fontSize: 10 }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {tags.map(t => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b', fontSize: 10 }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Preview */}
        <div className="flex-1 min-w-0">
          {selectedDoc ? (
            <div className="card h-full flex flex-col overflow-hidden">
              {/* Preview header */}
              <div
                className="flex items-center justify-between flex-shrink-0 px-5 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary truncate">{selectedDoc.title}</div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {new Date(selectedDoc.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(selectedDoc.id)}
                  className="ml-3 flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:bg-red-500/10"
                  style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                >
                  <i className="fa-solid fa-trash mr-1.5" style={{ fontSize: 10 }} />
                  Delete
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {selectedDoc.content ? (
                  <pre
                    className="text-sm text-text-secondary leading-relaxed"
                    style={{
                      fontFamily: 'var(--font-sans)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {selectedDoc.content}
                  </pre>
                ) : (
                  <div className="text-sm text-text-muted italic">No content</div>
                )}
              </div>
            </div>
          ) : (
            <div className="card h-full flex flex-col items-center justify-center gap-3 text-center">
              <i className="fa-solid fa-arrow-left text-text-muted" style={{ fontSize: 20 }} />
              <div style={{ fontSize: 13, color: '#64748b' }}>Select a document to preview</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
