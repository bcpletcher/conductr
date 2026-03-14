import { useUIStore } from '../store/ui'

/**
 * GradientBackground — layered background system.
 *
 * Layer order (bottom → top):
 *  1. Dark base (#080c20)
 *  2. Accent ambient gradient — three radial blobs driven by the current accent color.
 *     This restores the original Phase-0 "indigo/violet orb" aesthetic, but now the
 *     blob color reacts live whenever the user changes their accent in Settings.
 *     Blob opacity: 35% / 25% / 18% — vivid enough to see, subtle enough to read over.
 *  3. Wallpaper image — only rendered when wallpaperStyle is 'default' or 'custom'.
 *     Placed above the gradient so the image fully covers it when at high brightness.
 *  4. Dark readability overlay — keeps glass panels legible regardless of background.
 */
export default function GradientBackground(): React.JSX.Element {
  const wallpaperBrightness = useUIStore((s) => s.wallpaperBrightness)
  const wallpaperStyle      = useUIStore((s) => s.wallpaperStyle)
  const customWallpaperPath = useUIStore((s) => s.customWallpaperPath)
  const accentColor         = useUIStore((s) => s.accentColor)

  // Reconstruct the original 3-blob ambient gradient using the current accent color.
  // Blob opacity values (hex alpha):  59 = 35%  |  40 = 25%  |  2e = 18%
  // Positions keep blobs from overlapping the main content area.
  const ambientGradient = [
    `radial-gradient(ellipse at 20% 50%, ${accentColor}59 0%, transparent 55%)`,
    `radial-gradient(ellipse at 78% 18%, ${accentColor}40 0%, transparent 50%)`,
    `radial-gradient(ellipse at 55% 88%, ${accentColor}2e 0%, transparent 45%)`,
  ].join(', ')

  const hasDefaultImage = wallpaperStyle === 'default'
  const hasCustomImage  = wallpaperStyle === 'custom' && Boolean(customWallpaperPath)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        background: '#080c20',
        pointerEvents: 'none',
      }}
    >
      {/* Layer 2 — accent ambient gradient (always present, updates with accent) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: ambientGradient,
        }}
      />

      {/* Layer 3 — wallpaper image (only when an image preset is active) */}
      {hasDefaultImage ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(./wallpaper.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: wallpaperBrightness,
          }}
        />
      ) : hasCustomImage ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("${customWallpaperPath}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: wallpaperBrightness,
          }}
        />
      ) : null}

      {/* Layer 4 — dark overlay for glass panel readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(8, 12, 32, 0.55)',
        }}
      />
    </div>
  )
}
