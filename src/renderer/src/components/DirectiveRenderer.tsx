/**
 * DirectiveRenderer — parses a structured agent directive into coloured
 * section-block cards with pill headers and ◆ bullet points.
 *
 * Expects section headers of the form "ALL CAPS TITLE:" on their own line,
 * followed by "- bullet" lines.  Falls back to plain text when no sections
 * are detected.
 */

const SECTION_COLORS = ['#818cf8', '#22d3ee', '#34d399', '#f97316', '#a78bfa', '#fbbf24']

type DirectiveItem = { text: string; type: 'bullet' | 'text' }
type DirectiveGroup = { header: string; color: string; items: DirectiveItem[] }

interface DirectiveRendererProps {
  text: string
  /** Agent accent color — reserved for future tinting; currently unused. */
  accent?: string
  /** Number of columns to render section cards in. Defaults to 1 (stacked). */
  columns?: 1 | 2 | 3
}

export default function DirectiveRenderer({ text, columns = 1 }: DirectiveRendererProps): React.JSX.Element {
  const groups: DirectiveGroup[] = []
  let current: DirectiveGroup | null = null

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (/^[A-Z][A-Z\s\-&/:]+:$/.test(line)) {
      const color = SECTION_COLORS[groups.length % SECTION_COLORS.length]
      current = { header: line.replace(/:$/, ''), color, items: [] }
      groups.push(current)
    } else if (line.startsWith('- ') && current) {
      current.items.push({ text: line.slice(2), type: 'bullet' })
    } else if (line && current) {
      current.items.push({ text: line, type: 'text' })
    }
  }

  if (groups.length === 0) {
    return (
      <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.60)', lineHeight: 1.7, margin: 0 }}>
        {text}
      </p>
    )
  }

  const gridStyle: React.CSSProperties = columns > 1
    ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 8, alignItems: 'start' }
    : { display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={gridStyle}>
      {groups.map((group, gi) => (
        <div
          key={gi}
          style={{
            borderRadius: 10,
            background: `${group.color}07`,
            border: `1px solid ${group.color}1a`,
            overflow: 'hidden',
          }}
        >
          {/* Section pill header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 12px',
            background: `${group.color}0e`,
            borderBottom: `1px solid ${group.color}14`,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              background: group.color, boxShadow: `0 0 5px ${group.color}99`,
            }} />
            <span style={{
              fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: group.color,
            }}>
              {group.header}
            </span>
          </div>

          {/* Bullet items */}
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {group.items.map((item, ii) =>
              item.type === 'bullet' ? (
                <div key={ii} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{
                    fontSize: 8, color: group.color, marginTop: 5.5, flexShrink: 0, opacity: 0.75,
                  }}>◆</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>
                    {item.text}
                  </span>
                </div>
              ) : (
                <p key={ii} style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', lineHeight: 1.6, margin: 0 }}>
                  {item.text}
                </p>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
