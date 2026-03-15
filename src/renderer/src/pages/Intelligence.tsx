import { useEffect, useState } from 'react'
import type { IntelligenceInsight } from '../env.d'

const api = window.electronAPI

const INSIGHT_TYPE_BADGE: Record<string, { label: string; color: string; icon: string }> = {
  pattern:        { label: 'Pattern',        color: '#8b7cf8', icon: 'fa-solid fa-chart-line' },
  anomaly:        { label: 'Anomaly',        color: '#fbbf24', icon: 'fa-solid fa-triangle-exclamation' },
  recommendation: { label: 'Recommendation', color: '#22d3ee', icon: 'fa-solid fa-lightbulb' },
  recap:          { label: 'Weekly Recap',   color: '#a78bfa', icon: 'fa-solid fa-calendar-week' },
}

export default function Intelligence(): React.JSX.Element {
  const [insights, setInsights] = useState<IntelligenceInsight[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const [generatingType, setGeneratingType] = useState<'insight' | 'recap' | null>(null)

  useEffect(() => {
    async function load() {
      const data = await api.intelligence.getAll() as IntelligenceInsight[]
      setInsights(data)
    }
    load()
  }, [])

  // IPC streaming listeners — must live here in top-level component
  useEffect(() => {
    api.intelligence.onChunk(({ chunk }) => {
      setStreamBuffer(prev => prev + chunk)
    })
    api.intelligence.onDone(({ insight }) => {
      setIsGenerating(false)
      setStreamBuffer('')
      setGeneratingType(null)
      setInsights(prev => [insight as IntelligenceInsight, ...prev])
    })
    api.intelligence.onError(({ error }) => {
      setIsGenerating(false)
      setStreamBuffer('')
      setGeneratingType(null)
      console.error('Intelligence generation error:', error)
    })
    return () => api.intelligence.removeAllListeners()
  }, [])

  function handleGenerate(type: 'insight' | 'recap') {
    if (isGenerating) return
    setIsGenerating(true)
    setStreamBuffer('')
    setGeneratingType(type)
    api.intelligence.generate(type)
  }

  async function handleMarkRead(id: string) {
    await api.intelligence.markRead(id)
    setInsights(prev => prev.map(i => i.id === id ? { ...i, is_read: 1 } : i))
  }

  async function handleDelete(id: string) {
    await api.intelligence.delete(id)
    setInsights(prev => prev.filter(i => i.id !== id))
  }

  const unreadCount = insights.filter(i => i.is_read === 0).length

  return (
    <div data-testid="intelligence-page" className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="page-header flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="page-title">Intelligence</h1>
          <p className="page-subtitle">AI-generated insights and analysis</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleGenerate('insight')}
            disabled={isGenerating}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            style={{ fontSize: 13, padding: '8px 14px' }}
          >
            <i className="fa-solid fa-lightbulb" style={{ fontSize: 11 }} />
            Generate Insight
          </button>
          <button
            onClick={() => handleGenerate('recap')}
            disabled={isGenerating}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
            style={{ fontSize: 13, padding: '8px 14px' }}
          >
            <i className="fa-solid fa-calendar-week" style={{ fontSize: 11 }} />
            Generate Recap
          </button>
        </div>
      </div>

      <div className="card flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
        {/* Streaming card */}
        {isGenerating && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#8b7cf8', boxShadow: '0 0 6px rgba(139,124,248,0.9)' }}
              />
              <span className="section-label">
                {generatingType === 'recap' ? 'Generating weekly recap…' : 'Generating insight…'}
              </span>
            </div>
            {streamBuffer && (
              <pre
                className="text-sm text-text-secondary leading-relaxed"
                style={{
                  fontFamily: 'var(--font-sans)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: 320,
                  overflowY: 'auto',
                }}
              >
                {streamBuffer}
              </pre>
            )}
          </div>
        )}

        {/* Unread banner */}
        {unreadCount > 0 && !isGenerating && (
          <div
            className="flex items-center justify-between px-4 py-2 rounded-xl"
            style={{ background: 'rgba(139,124,248,0.08)', border: '1px solid rgba(139,124,248,0.2)' }}
          >
            <span style={{ fontSize: 12, color: '#8b7cf8' }}>
              {unreadCount} unread insight{unreadCount !== 1 ? 's' : ''}
            </span>
            <button
              onClick={async () => {
                await api.intelligence.markAllRead()
                setInsights(prev => prev.map(i => ({ ...i, is_read: 1 })))
              }}
              style={{ fontSize: 12, color: '#8b7cf8' }}
              className="hover:opacity-80"
            >
              Mark all read
            </button>
          </div>
        )}

        {/* Empty state */}
        {insights.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <i className="fa-solid fa-brain" style={{ fontSize: 16, color: 'rgba(255,255,255,0.32)' }} />
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              No insights yet —<br />generate one to analyse your recent activity
            </div>
          </div>
        )}

        {/* Insight cards */}
        {insights.map(insight => {
          const badge = INSIGHT_TYPE_BADGE[insight.insight_type] || INSIGHT_TYPE_BADGE.pattern
          const isUnread = insight.is_read === 0

          return (
            <div
              key={insight.id}
              className="card p-4 cursor-pointer transition-all"
              style={{ opacity: isUnread ? 1 : 0.7 }}
              onClick={() => isUnread && handleMarkRead(insight.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {isUnread && (
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: '#8b7cf8', boxShadow: '0 0 4px rgba(139,124,248,0.8)', marginTop: 2 }}
                    />
                  )}
                  <span
                    className="px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    style={{ background: `${badge.color}18`, color: badge.color }}
                  >
                    <i className={badge.icon} style={{ fontSize: 9 }} />
                    {badge.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    {new Date(insight.generated_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(insight.id) }}
                  className="p-1 rounded transition-all hover:bg-red-500/10 flex-shrink-0"
                  style={{ color: '#64748b' }}
                >
                  <i className="fa-solid fa-xmark" style={{ fontSize: 11 }} />
                </button>
              </div>

              <div
                className="mt-3 text-sm text-text-secondary leading-relaxed"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {insight.content}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
