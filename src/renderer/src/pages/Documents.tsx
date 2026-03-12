import { useEffect, useState } from 'react'
import type { Document } from '../env.d'

const api = window.electronAPI

export default function Documents(): React.JSX.Element {
  const [documents, setDocuments] = useState<Document[]>([])

  useEffect(() => {
    // Documents come from the db via the documents IPC — for now we show empty state
    // Will be wired in Phase 5
    setDocuments([])
  }, [])

  return (
    <div data-testid="documents-page">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Files, briefs, and AI-generated outputs</p>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="card flex items-center justify-center py-24 text-text-muted text-sm">
          No documents yet — completed tasks will generate documents here
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="card p-4 cursor-pointer transition-all hover:bg-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-text-primary">{doc.title}</div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                </div>
                <i className="fa-solid fa-arrow-right text-text-muted text-sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
