/**
 * WindowControls — custom title-bar buttons for Windows.
 * Rendered only when `window.electronAPI.app.platform === 'win32'`.
 * Positioned top-right, above the drag strip, with pointer-events enabled.
 */

const api = window.electronAPI

export default function WindowControls(): React.JSX.Element | null {
  if (api.app.platform !== 'win32') return null

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 46,
    height: 32,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.65)',
    cursor: 'pointer',
    fontSize: 11,
    transition: 'background 0.1s, color 0.1s',
    // Ensure clicks pass through the drag region
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties

  return (
    <div
      data-testid="window-controls"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'row',
        // no-drag so buttons capture mouse events even when inside drag zone
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      {/* Minimize */}
      <button
        data-testid="win-btn-minimize"
        title="Minimize"
        style={btnBase}
        onClick={() => api.window.minimize()}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
          ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.90)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'
        }}
      >
        <i className="fa-solid fa-minus" style={{ fontSize: 10 }} />
      </button>

      {/* Maximize / Restore */}
      <button
        data-testid="win-btn-maximize"
        title="Maximize"
        style={btnBase}
        onClick={() => api.window.maximize()}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
          ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.90)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'
        }}
      >
        <i className="fa-regular fa-square" style={{ fontSize: 10 }} />
      </button>

      {/* Close */}
      <button
        data-testid="win-btn-close"
        title="Close"
        style={btnBase}
        onClick={() => api.window.close()}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = '#e81123'
          ;(e.currentTarget as HTMLElement).style.color = '#fff'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'
        }}
      >
        <i className="fa-solid fa-xmark" style={{ fontSize: 12 }} />
      </button>
    </div>
  )
}
