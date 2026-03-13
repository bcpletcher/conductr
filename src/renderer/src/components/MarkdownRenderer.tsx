import { useEffect, useId, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Components } from 'react-markdown'
import mermaid from 'mermaid'

// Initialise Mermaid once at module scope (dark theme matching Conductr)
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    background: 'transparent',
    primaryColor: '#818cf8',
    primaryTextColor: '#f1f5f9',
    primaryBorderColor: 'rgba(129,140,248,0.4)',
    lineColor: 'rgba(255,255,255,0.3)',
    secondaryColor: 'rgba(255,255,255,0.04)',
    tertiaryColor: 'rgba(255,255,255,0.03)',
    nodeBorder: 'rgba(255,255,255,0.1)',
    clusterBkg: 'rgba(255,255,255,0.03)',
    titleColor: '#f1f5f9',
    edgeLabelBackground: 'rgba(0,0,0,0.6)',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '13px',
  },
})

// ── Text extraction (for copy button) ──────────────────────────────────────
function extractText(node: React.ReactNode): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node === 'object' && 'props' in (node as object)) {
    return extractText((node as React.ReactElement<{ children?: React.ReactNode }>).props.children)
  }
  return ''
}

// ── Mermaid diagram block ───────────────────────────────────────────────────
function MermaidBlock({ code }: { code: string }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const rawId = useId()
  const id = `mermaid-${rawId.replace(/:/g, '')}`
  const [error, setError] = useState<string | null>(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setRendered(false)

    mermaid.render(id, code)
      .then(({ svg }) => {
        if (cancelled || !ref.current) return
        ref.current.innerHTML = svg
        // Make the SVG fill the container and remove background
        const svgEl = ref.current.querySelector('svg')
        if (svgEl) {
          svgEl.style.maxWidth = '100%'
          svgEl.style.height = 'auto'
          svgEl.setAttribute('background', 'transparent')
        }
        setRendered(true)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to render diagram')
      })

    return () => { cancelled = true }
  }, [code, id])

  if (error) {
    // Fallback to code block on render error
    return (
      <div
        className="my-3 rounded-xl overflow-hidden"
        style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-xs font-mono" style={{ color: '#f87171' }}>
            <i className="fa-solid fa-triangle-exclamation mr-1.5" />mermaid (render error)
          </span>
        </div>
        <pre className="overflow-x-auto m-0 px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>
          {code}
        </pre>
      </div>
    )
  }

  return (
    <div
      className="my-3 rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Label bar */}
      <div
        className="flex items-center px-4 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <i className="fa-solid fa-diagram-project mr-2 text-xs" style={{ color: '#818cf8' }} />
        <span className="text-xs font-mono" style={{ color: '#64748b' }}>mermaid</span>
      </div>

      {/* Diagram */}
      <div
        ref={ref}
        className="flex justify-center p-4"
        style={{
          minHeight: rendered ? undefined : 60,
          opacity: rendered ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />

      {/* Loading shimmer */}
      {!rendered && (
        <div className="flex items-center justify-center py-6">
          <i className="fa-solid fa-spinner animate-spin text-sm" style={{ color: '#64748b' }} />
        </div>
      )}
    </div>
  )
}

// ── Code block (pre wrapper) ────────────────────────────────────────────────
type CodeChild = React.ReactElement<{ className?: string; children?: React.ReactNode }>

function findCodeChild(children: React.ReactNode): CodeChild | null {
  const arr = Array.isArray(children) ? children : [children]
  return arr.find((c): c is CodeChild =>
    typeof c === 'object' && c !== null && 'props' in (c as object)
  ) ?? null
}

function CodeBlock({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const codeEl = findCodeChild(children)
  const rawClass = codeEl?.props?.className ?? ''
  const lang = rawClass.match(/language-(\w+)/)?.[1] ?? ''

  function copy(): void {
    const text = extractText(codeEl?.props?.children).trim()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="my-3 rounded-xl overflow-hidden"
      style={{
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-xs font-mono" style={{ color: '#64748b' }}>
          {lang || 'code'}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: copied ? '#34d399' : '#64748b' }}
          onMouseEnter={(e) => { if (!copied) (e.currentTarget as HTMLElement).style.color = '#cbd5e1' }}
          onMouseLeave={(e) => { if (!copied) (e.currentTarget as HTMLElement).style.color = '#64748b' }}
        >
          <i className={`fa-solid fa-${copied ? 'check' : 'copy'}`} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code content */}
      <pre
        className="overflow-x-auto m-0"
        style={{ padding: '1rem', fontSize: '0.8rem', lineHeight: 1.65, background: 'transparent' }}
      >
        {children}
      </pre>
    </div>
  )
}

// ── Inline code ─────────────────────────────────────────────────────────────
function InlineCode({ children }: { children?: React.ReactNode }): React.JSX.Element {
  return (
    <code
      style={{
        fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
        fontSize: '0.8em',
        padding: '0.15em 0.4em',
        borderRadius: 5,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#a78bfa',
      }}
    >
      {children}
    </code>
  )
}

// ── External link ───────────────────────────────────────────────────────────
function ExternalLink({ href, children }: { href?: string; children?: React.ReactNode }): React.JSX.Element {
  function handleClick(e: React.MouseEvent): void {
    e.preventDefault()
    if (href) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shell = (window as any).__electronShell
      if (shell?.openExternal) shell.openExternal(href)
      else window.open(href, '_blank', 'noopener')
    }
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      style={{ color: '#818cf8', textDecoration: 'underline', textUnderlineOffset: 3 }}
    >
      {children}
    </a>
  )
}

// ── Blockquote ──────────────────────────────────────────────────────────────
function Blockquote({ children }: { children?: React.ReactNode }): React.JSX.Element {
  return (
    <blockquote
      style={{
        margin: '0.75rem 0',
        paddingLeft: '1rem',
        borderLeft: '3px solid rgba(129,140,248,0.5)',
        color: '#94a3b8',
        fontStyle: 'italic',
      }}
    >
      {children}
    </blockquote>
  )
}

// ── Table ────────────────────────────────────────────────────────────────────
function Table({ children }: { children?: React.ReactNode }): React.JSX.Element {
  return (
    <div className="overflow-x-auto my-3">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
        {children}
      </table>
    </div>
  )
}

function Th({ children }: { children?: React.ReactNode }): React.JSX.Element {
  return (
    <th
      style={{
        padding: '0.5rem 0.75rem',
        textAlign: 'left',
        fontSize: '0.75em',
        color: '#64748b',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {children}
    </th>
  )
}

function Td({ children }: { children?: React.ReactNode }): React.JSX.Element {
  return (
    <td
      style={{
        padding: '0.5rem 0.75rem',
        color: '#cbd5e1',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {children}
    </td>
  )
}

// ── Main renderer ───────────────────────────────────────────────────────────
const components: Components = {
  pre: ({ children }) => {
    // Intercept mermaid code blocks and render as diagrams
    const codeEl = findCodeChild(children)
    const className = codeEl?.props?.className ?? ''
    if (className.includes('language-mermaid')) {
      const code = extractText(codeEl?.props?.children).trim()
      return <MermaidBlock code={code} />
    }
    return <CodeBlock>{children}</CodeBlock>
  },
  code: ({ className, children, ...props }) => {
    // Block code is handled by CodeBlock via <pre>. Inline code has no className.
    if (!className) return <InlineCode {...props}>{children}</InlineCode>
    return <code className={className} {...props}>{children}</code>
  },
  a: ({ href, children }) => <ExternalLink href={href}>{children}</ExternalLink>,
  blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
  table: ({ children }) => <Table>{children}</Table>,
  th: ({ children }) => <Th>{children}</Th>,
  td: ({ children }) => <Td>{children}</Td>,
  h1: ({ children }) => <h1 style={{ fontSize: '1.25em', fontWeight: 700, color: '#f1f5f9', margin: '1em 0 0.4em' }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: '1.1em', fontWeight: 600, color: '#f1f5f9', margin: '0.9em 0 0.35em' }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: '1em', fontWeight: 600, color: '#e2e8f0', margin: '0.8em 0 0.3em' }}>{children}</h3>,
  p: ({ children }) => <p style={{ margin: '0.5em 0', color: '#cbd5e1', lineHeight: 1.65 }}>{children}</p>,
  ul: ({ children }) => <ul style={{ margin: '0.5em 0', paddingLeft: '1.4em', color: '#cbd5e1' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: '0.5em 0', paddingLeft: '1.4em', color: '#cbd5e1' }}>{children}</ol>,
  li: ({ children }) => <li style={{ margin: '0.2em 0', lineHeight: 1.6 }}>{children}</li>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '1em 0' }} />,
  strong: ({ children }) => <strong style={{ color: '#f1f5f9', fontWeight: 600 }}>{children}</strong>,
  em: ({ children }) => <em style={{ color: '#cbd5e1', fontStyle: 'italic' }}>{children}</em>,
}

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps): React.JSX.Element {
  return (
    <div style={{ lineHeight: 1.65, fontSize: '0.875rem' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
