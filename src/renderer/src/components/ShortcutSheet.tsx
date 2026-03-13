import { useEffect } from 'react'
import { useUIStore } from '../store/ui'

interface ShortcutRow {
  keys: string[]
  description: string
}

interface ShortcutGroup {
  title: string
  rows: ShortcutRow[]
}

const GROUPS: ShortcutGroup[] = [
  {
    title: 'Global',
    rows: [
      { keys: ['⌘', 'K'],   description: 'Open command palette' },
      { keys: ['⌘', '/'],   description: 'Open this shortcut sheet' },
      { keys: ['Esc'],       description: 'Close modal / palette' },
    ],
  },
  {
    title: 'Workshop',
    rows: [
      { keys: ['N'],         description: 'New task' },
    ],
  },
  {
    title: 'Command Palette',
    rows: [
      { keys: ['↑', '↓'],   description: 'Navigate results' },
      { keys: ['Enter'],     description: 'Select item' },
      { keys: ['Esc'],       description: 'Close palette' },
    ],
  },
  {
    title: 'Chat',
    rows: [
      { keys: ['Enter'],     description: 'Send message' },
      { keys: ['⇧', 'Enter'], description: 'New line' },
    ],
  },
]

export default function ShortcutSheet(): React.JSX.Element | null {
  const isOpen = useUIStore((s) => s.isSheetOpen)
  const closeSheet = useUIStore((s) => s.closeSheet)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeSheet()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, closeSheet])

  if (!isOpen) return null

  return (
    <div
      data-testid="shortcut-sheet"
      onClick={closeSheet}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(4, 4, 16, 0.70)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fade-in 0.12s ease',
      } as React.CSSProperties}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxHeight: '80vh',
          overflowY: 'auto',
          background: 'rgba(14, 14, 28, 0.92)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          animation: 'palette-drop 0.18s cubic-bezier(0.16,1,0.3,1)',
          padding: '20px 0',
        } as React.CSSProperties}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
              Keyboard Shortcuts
            </h2>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Press Esc to close</p>
          </div>
          <button
            onClick={closeSheet}
            style={{ color: 'rgba(255,255,255,0.35)', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        {/* Groups */}
        <div className="px-5 pt-4 space-y-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(255,255,255,0.30)', marginBottom: 8 }}>
                {group.title}
              </p>
              <div className="space-y-1">
                {group.rows.map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.68)' }}>{row.description}</span>
                    <div className="flex items-center gap-1">
                      {row.keys.map((k, j) => (
                        <kbd
                          key={j}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 24,
                            height: 22,
                            padding: '0 6px',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 5,
                            fontSize: 11,
                            fontFamily: 'inherit',
                            color: '#e2e8f0',
                            boxShadow: '0 1px 0 rgba(0,0,0,0.4)',
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pt-4 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', textAlign: 'center' }}>
            More shortcuts coming in future updates
          </p>
        </div>
      </div>
    </div>
  )
}
