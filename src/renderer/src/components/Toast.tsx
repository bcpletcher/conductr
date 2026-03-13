import { useEffect } from 'react'
import { useUIStore } from '../store/ui'
import type { Toast as ToastType } from '../store/ui'

const CONFIG = {
  success: { icon: 'fa-circle-check', color: '#34d399', glow: 'rgba(52,211,153,0.18)' },
  error:   { icon: 'fa-circle-xmark', color: '#f87171', glow: 'rgba(248,113,113,0.18)' },
  info:    { icon: 'fa-circle-info',  color: '#8b7cf8', glow: 'rgba(139,124,248,0.18)' },
}

function ToastItem({ toast }: { toast: ToastType }): React.JSX.Element {
  const removeToast = useUIStore((s) => s.removeToast)
  const cfg = CONFIG[toast.type]

  useEffect(() => {
    const t = setTimeout(() => removeToast(toast.id), 3500)
    return () => clearTimeout(t)
  }, [toast.id, removeToast])

  return (
    <div
      data-testid="toast"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '11px 14px',
        minWidth: 260,
        maxWidth: 360,
        background: 'rgba(8, 10, 28, 0.88)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 12,
        boxShadow: `0 8px 32px rgba(0,0,0,0.55), 0 0 24px ${cfg.glow}`,
        animation: 'toast-in 0.2s ease',
      }}
    >
      <i className={`fa-solid ${cfg.icon} mt-px`} style={{ color: cfg.color, fontSize: 14, flexShrink: 0 }} />
      <span style={{ color: '#eef0f8', fontSize: 13, lineHeight: 1.45, flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.30)', fontSize: 12, flexShrink: 0, marginTop: 1 }}
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  )
}

export default function ToastContainer(): React.JSX.Element | null {
  const toasts = useUIStore((s) => s.toasts)
  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  )
}
