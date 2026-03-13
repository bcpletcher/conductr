import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: string
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-2xl'
}: ModalProps): React.JSX.Element | null {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      data-testid="modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      {/* Modal panel */}
      <div
        className={`relative z-10 w-full ${width} mx-4 max-h-[85vh] flex flex-col rounded-2xl shadow-2xl`}
        style={{
          background: 'rgba(6, 8, 22, 0.72)',
          backdropFilter: 'blur(48px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(48px) saturate(1.1)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          borderTopColor: 'rgba(255, 255, 255, 0.13)',
          boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.07), 0 24px 80px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            <button
              data-testid="modal-close"
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors text-lg leading-none"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
