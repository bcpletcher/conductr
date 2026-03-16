import { useState, useRef, useEffect } from 'react'
import { AGENT_AVATARS } from '../assets/agents'

type Tab = 'start' | 'features' | 'agents' | 'advanced' | 'shortcuts'

const TABS: { id: Tab; label: string; icon: string; color: string }[] = [
  { id: 'start',     label: 'Getting Started', icon: 'fa-rocket',       color: '#818cf8' },
  { id: 'features',  label: 'Features',         icon: 'fa-grid-2',       color: '#22d3ee' },
  { id: 'agents',    label: 'Agent System',     icon: 'fa-robot',        color: '#34d399' },
  { id: 'advanced',  label: 'Advanced',         icon: 'fa-layer-group',  color: '#a78bfa' },
  { id: 'shortcuts', label: 'Reference',        icon: 'fa-book-open',    color: '#fbbf24' },
]

// ── Shared style helpers ────────────────────────────────────────────────────


const sectionHeadingStyle = (color: string): React.CSSProperties => ({
  fontSize: 18,
  fontWeight: 700,
  color: '#eef0f8',
  letterSpacing: '-0.025em',
  paddingLeft: 14,
  borderLeft: `3px solid ${color}`,
  marginBottom: 14,
  marginTop: 32,
  lineHeight: 1.3,
})

const subHeadingStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.75)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginBottom: 8,
  marginTop: 20,
}

const bodyStyle: React.CSSProperties = {
  fontSize: 13.5,
  color: 'rgba(255,255,255,0.62)',
  lineHeight: 1.7,
}

const codeStyle: React.CSSProperties = {
  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
  fontSize: 12.5,
  background: 'rgba(129,140,248,0.08)',
  border: '1px solid rgba(129,140,248,0.18)',
  borderRadius: 8,
  padding: '12px 16px',
  color: '#c4b5fd',
  display: 'block',
  overflowX: 'auto' as const,
  marginTop: 8,
  marginBottom: 8,
  lineHeight: 1.6,
}

const inlineCodeStyle: React.CSSProperties = {
  fontFamily: "'SF Mono', 'Fira Code', monospace",
  fontSize: 12,
  background: 'rgba(129,140,248,0.12)',
  border: '1px solid rgba(129,140,248,0.2)',
  borderRadius: 4,
  padding: '1px 6px',
  color: '#a5b4fc',
}

function Callout({ type, children }: { type: 'tip' | 'note' | 'warn'; children: React.ReactNode }): React.JSX.Element {
  const colors = {
    tip:  { bg: 'rgba(52,211,153,0.07)', border: 'rgba(52,211,153,0.25)',  icon: 'fa-lightbulb',      label: 'TIP',     c: '#34d399' },
    note: { bg: 'rgba(129,140,248,0.07)', border: 'rgba(129,140,248,0.25)', icon: 'fa-circle-info',   label: 'NOTE',    c: '#818cf8' },
    warn: { bg: 'rgba(251,191,36,0.07)',  border: 'rgba(251,191,36,0.25)',  icon: 'fa-triangle-exclamation', label: 'NOTE', c: '#fbbf24' },
  }[type]
  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      padding: '12px 16px',
      marginTop: 10,
      marginBottom: 10,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <i className={`fa-solid ${colors.icon}`} style={{ fontSize: 13, color: colors.c, marginTop: 2, flexShrink: 0 }} />
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>{children}</div>
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }): React.JSX.Element {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      background: `${color}20`, border: `1px solid ${color}40`,
      color, marginLeft: 8,
    }}>{label}</span>
  )
}

function AgentCard({ name, role, color, agentId, description }: {
  name: string; role: string; color: string; agentId: string; description: string
}): React.JSX.Element {
  const avatarUrl = AGENT_AVATARS[agentId]
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <div className="flex items-center gap-2.5 mb-1.5">
        {avatarUrl
          ? <img src={avatarUrl} alt={name} style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 22, height: 22, borderRadius: 6, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fa-solid fa-robot" style={{ fontSize: 10, color }} />
            </div>
        }
        <span style={{ fontSize: 14, fontWeight: 700, color: '#eef0f8' }}>{name}</span>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
          color, background: `${color}18`, border: `1px solid ${color}30`,
          borderRadius: 20, padding: '1px 8px',
        }}>{role}</span>
      </div>
      <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.52)', lineHeight: 1.6, margin: 0 }}>{description}</p>
    </div>
  )
}

function ShortcutRow({ keys, action }: { keys: string[]; action: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between" style={{
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.60)' }}>{action}</span>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd key={i} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 28, height: 24, padding: '0 8px',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderBottom: '2px solid rgba(255,255,255,0.10)',
            borderRadius: 6,
            fontSize: 11.5, fontWeight: 600,
            color: 'rgba(255,255,255,0.75)',
            fontFamily: 'inherit',
          }}>{k}</kbd>
        ))}
      </div>
    </div>
  )
}

// ── Tab content components ──────────────────────────────────────────────────

function GettingStarted(): React.JSX.Element {
  return (
    <div>
      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(129,140,248,0.12) 0%, rgba(167,139,250,0.08) 100%)',
        border: '1px solid rgba(129,140,248,0.18)',
        borderRadius: 16,
        padding: '28px 32px',
        marginBottom: 24,
      }}>
        <div className="flex items-center gap-3 mb-3">
          <div style={{
            width: 40, height: 40,
            background: 'rgba(129,140,248,0.15)',
            border: '1px solid rgba(129,140,248,0.3)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="fa-solid fa-tower-control" style={{ fontSize: 18, color: '#818cf8' }} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#eef0f8', letterSpacing: '-0.03em' }}>
              Welcome to Conductr
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
              Your AI operations platform
            </div>
          </div>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.60)', lineHeight: 1.75, margin: 0 }}>
          Conductr is a desktop AI operations layer that puts a team of 11 specialized agents at your command.
          Manage tasks, documents, clients, and multi-agent pipelines — all from a single glass-panel interface.
          Runs on <strong style={{ color: '#818cf8' }}>Claude Code CLI</strong> (no API key needed) or direct <strong style={{ color: '#a78bfa' }}>API key</strong> access.
        </p>
      </div>

      {/* Two modes */}
      <div style={{ ...sectionHeadingStyle('#818cf8') }}>Choose Your Mode</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
        {/* CC Mode */}
        <div style={{
          background: 'rgba(129,140,248,0.07)',
          border: '1px solid rgba(129,140,248,0.22)',
          borderRadius: 12,
          padding: '20px 22px',
        }}>
          <div className="flex items-center gap-2 mb-3">
            <i className="fa-solid fa-terminal" style={{ color: '#818cf8', fontSize: 15 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#eef0f8' }}>Claude Code Mode</span>
            <Badge label="DEFAULT" color="#818cf8" />
          </div>
          <p style={{ ...bodyStyle, marginBottom: 14 }}>
            Routes all chat and tasks through the Claude Code CLI. No API key required — uses your existing Claude subscription.
          </p>
          <div style={subHeadingStyle}>Requirements</div>
          <ul style={{ ...bodyStyle, paddingLeft: 18, margin: 0 }}>
            <li>Claude Code CLI installed globally</li>
            <li>Active Claude Pro/Team/Enterprise plan</li>
          </ul>
          <div style={subHeadingStyle}>Install Claude CLI</div>
          <pre style={codeStyle}>npm install -g @anthropic-ai/claude-code</pre>
          <Callout type="tip">
            After installing, run <code style={inlineCodeStyle}>claude --version</code> to verify it's working before launching Conductr.
          </Callout>
        </div>

        {/* API Key Mode */}
        <div style={{
          background: 'rgba(167,139,250,0.07)',
          border: '1px solid rgba(167,139,250,0.22)',
          borderRadius: 12,
          padding: '20px 22px',
        }}>
          <div className="flex items-center gap-2 mb-3">
            <i className="fa-solid fa-key" style={{ color: '#a78bfa', fontSize: 15 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#eef0f8' }}>API Key Mode</span>
          </div>
          <p style={{ ...bodyStyle, marginBottom: 14 }}>
            Connects directly to the Anthropic API (or compatible providers like OpenRouter, Groq, Ollama). Unlocks full provider selection, token metrics, and multi-model routing.
          </p>
          <div style={subHeadingStyle}>Setup</div>
          <ol style={{ ...bodyStyle, paddingLeft: 18, margin: 0 }}>
            <li>Go to <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Settings → Mode</strong></li>
            <li>Switch to <strong style={{ color: 'rgba(255,255,255,0.8)' }}>API Key</strong></li>
            <li>Paste your Anthropic API key</li>
            <li>Optionally configure additional providers</li>
          </ol>
          <Callout type="note">
            API Key mode unlocks the <strong>API Manager</strong>, <strong>Providers</strong>, and <strong>Dev Tools</strong> pages.
          </Callout>
        </div>
      </div>

      {/* Quick Start */}
      <div style={sectionHeadingStyle('#34d399')}>Quick Start</div>
      <div className="card mb-4">
        {[
          { n: '1', title: 'Launch Conductr', body: 'Open the app — you\'ll see the onboarding wizard on first launch. Follow the steps to configure your mode and meet your agent roster.' },
          { n: '2', title: 'Chat with Lyra', body: 'Click Chat in the sidebar and select Lyra (your lead orchestrator). Say hello — Lyra can answer questions, plan work, and help you get started.' },
          { n: '3', title: 'Create your first task', body: 'Go to Workshop, click + New Task (or press N). Add a title, pick an agent, and hit Queue. The agent will start working.' },
          { n: '4', title: 'Explore your dashboard', body: 'The Dashboard gives you a live overview — active tasks, recent documents, upcoming journal entries, and Lyra\'s current status.' },
        ].map(({ n, title, body }) => (
          <div key={n} className="flex gap-4" style={{ marginBottom: 18 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#34d399',
            }}>{n}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#dde2f0', marginBottom: 4 }}>{title}</div>
              <div style={bodyStyle}>{body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* What's in the box */}
      <div style={sectionHeadingStyle('#fbbf24')}>What's Included</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { icon: 'fa-robot',           color: '#34d399', label: '11 AI Agents',        body: 'A full SWARM OS with Lyra, Forge, Scout, Pixel, and more' },
          { icon: 'fa-gears',           color: '#f97316', label: 'Task Workshop',        body: 'Queue, run, and monitor long-running agent tasks' },
          { icon: 'fa-message',         color: '#a78bfa', label: 'Multi-Agent Chat',     body: 'Chat with any agent; @-mention others mid-conversation' },
          { icon: 'fa-file-lines',      color: '#22d3ee', label: 'Document Library',     body: 'Create, organize, and search documents with AI summaries' },
          { icon: 'fa-diagram-project', color: '#9333ea', label: 'Pipelines',            body: 'Build multi-step agent workflows with parallel execution' },
          { icon: 'fa-tower-broadcast', color: '#0ea5e9', label: 'Channels (OpenClaw)',  body: 'Connect Telegram, Slack, Discord, WhatsApp and more' },
        ].map(({ icon, color, label, body }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <i className={`fa-solid ${icon}`} style={{ fontSize: 16, color, marginBottom: 10, display: 'block' }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: '#dde2f0', marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>{body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Features(): React.JSX.Element {
  return (
    <div>
      {/* Dashboard */}
      <div style={sectionHeadingStyle('#818cf8')}>Dashboard</div>
      <div className="card mb-4">
        <p style={bodyStyle}>
          Your mission control overview. The Dashboard shows live stats for all active agents, workshop tasks, clients, and documents. The STATUS card in the top-left houses Lyra's heartbeat — hover over the sidebar logo for a full status popover with BPM, uptime, and next-check timer.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          {[
            { label: 'STATUS', color: '#818cf8', body: 'Live agent activity and Lyra\'s heartbeat pulse' },
            { label: 'WORKSHOP', color: '#f97316', body: 'Active, queued, completed, and failed task counts' },
            { label: 'CLIENTS', color: '#22d3ee', body: 'Total client count and recent activity' },
            { label: 'DOCUMENTS', color: '#a78bfa', body: 'Document library stats and recently modified files' },
          ].map(({ label, color, body }) => (
            <div key={label} style={{
              background: `${color}0d`, border: `1px solid ${color}22`, borderRadius: 9, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color, marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Workshop */}
      <div style={sectionHeadingStyle('#f97316')}>Workshop</div>
      <div className="card mb-4">
        <p style={bodyStyle}>
          The Workshop is your task queue. Create tasks, assign them to agents, and monitor execution in real-time. Each task runs in a sandboxed agent environment and streams output back to the UI.
        </p>
        <div style={subHeadingStyle}>Task Lifecycle</div>
        <div className="flex items-center gap-2" style={{ marginBottom: 14, flexWrap: 'wrap' as const }}>
          {['queued → ', 'active → ', 'complete', 'or failed'].map((s, i) => (
            <span key={i} style={{
              fontSize: 12, fontWeight: 600,
              color: i === 0 ? '#fbbf24' : i === 1 ? '#818cf8' : i === 2 ? '#34d399' : '#f43f5e',
              background: i === 0 ? 'rgba(251,191,36,0.1)' : i === 1 ? 'rgba(129,140,248,0.1)' : i === 2 ? 'rgba(52,211,153,0.1)' : 'rgba(244,63,94,0.1)',
              border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.25)' : i === 1 ? 'rgba(129,140,248,0.25)' : i === 2 ? 'rgba(52,211,153,0.25)' : 'rgba(244,63,94,0.25)'}`,
              borderRadius: 20, padding: '2px 10px',
            }}>{s}</span>
          ))}
        </div>
        <ul style={{ ...bodyStyle, paddingLeft: 20, margin: 0 }}>
          <li><strong style={{ color: 'rgba(255,255,255,0.8)' }}>New Task (N key)</strong> — open the task creation modal from anywhere on the Workshop page</li>
          <li><strong style={{ color: 'rgba(255,255,255,0.8)' }}>Pre-task token estimate</strong> — queued tasks show an estimated token count before execution</li>
          <li><strong style={{ color: 'rgba(255,255,255,0.8)' }}>Live output streaming</strong> — click any active task to watch its output stream in real-time</li>
          <li><strong style={{ color: 'rgba(255,255,255,0.8)' }}>Auto-save</strong> — completed task output is automatically saved as a document</li>
        </ul>
      </div>

      {/* Chat */}
      <div style={sectionHeadingStyle('#a78bfa')}>Chat</div>
      <div className="card mb-4">
        <p style={bodyStyle}>
          Chat directly with any of your 11 agents. Each agent has a persistent conversation history and a unique personality defined in their SOUL.md file. The chat interface streams responses in real-time.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          {[
            { icon: 'fa-at', color: '#818cf8', title: '@-Mentions', body: 'Type @AgentName mid-message to pull in another agent\'s recent conversation as context' },
            { icon: 'fa-image', color: '#22d3ee', title: 'Image Input', body: 'Paste or drag images directly into the chat — uses Claude\'s vision API' },
            { icon: 'fa-bolt', color: '#f97316', title: 'Broadcast Mode', body: 'Send one message to all agents simultaneously; responses stream in parallel' },
            { icon: 'fa-wand-magic-sparkles', color: '#a78bfa', title: 'AI Improve', body: 'Click the sparkle icon to have Claude auto-rewrite your prompt before sending' },
            { icon: 'fa-rectangle-list', color: '#34d399', title: 'Prompt Templates', body: 'Save frequently-used prompts and insert them with a single click' },
            { icon: 'fa-magnifying-glass', color: '#fbbf24', title: 'In-Thread Search', body: 'Search within the current conversation to find past messages quickly' },
          ].map(({ icon, color, title, body }) => (
            <div key={title} className="flex gap-3" style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 8, padding: '12px 14px' }}>
              <i className={`fa-solid ${icon}`} style={{ fontSize: 14, color, marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#dde2f0', marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', lineHeight: 1.55 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>
        <Callout type="tip">Use <strong>Queue as Task</strong> (button in the chat toolbar) to turn any chat message into a Workshop task with one click.</Callout>
      </div>

      {/* Documents */}
      <div style={sectionHeadingStyle('#22d3ee')}>Documents &amp; Journal</div>
      <div className="card mb-4">
        <p style={bodyStyle}>
          <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Documents</strong> is a persistent library for all your agent-generated and manually created content. Documents support rich text, are searchable globally, and can be linked to clients.
        </p>
        <p style={{ ...bodyStyle, marginTop: 10 }}>
          <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Journal</strong> is a private daily log — write notes, track progress, and let agents summarize recurring entries. Journal entries are date-stamped and support mood/status tags.
        </p>
      </div>

      {/* Intelligence */}
      <div style={sectionHeadingStyle('#9333ea')}>Intelligence</div>
      <div className="card mb-4">
        <p style={bodyStyle}>
          Intelligence is Conductr's knowledge layer. It stores agent-generated insights, research summaries, and cross-document patterns. Lyra periodically generates new insights from your task history and documents.
        </p>
        <Callout type="note">Intelligence insights are generated automatically during task runs and can also be manually triggered.</Callout>
      </div>

      {/* Clients */}
      <div style={sectionHeadingStyle('#fbbf24')}>Clients</div>
      <div className="card mb-4">
        <p style={bodyStyle}>
          The Clients page manages your relationships — people, companies, or projects. Each client has a profile, associated documents, task history, and a detailed activity log. Use it to track deliverables and keep agents focused on the right context.
        </p>
      </div>
    </div>
  )
}

function AgentSystem(): React.JSX.Element {
  const agents = [
    { name: 'Lyra',     role: 'Lead Orchestrator',       color: '#818cf8', agentId: 'agent-lyra',     description: 'The primary orchestrator. Routes tasks, coordinates agents, and maintains situational awareness across the entire system. Your first point of contact.' },
    { name: 'Nova',     role: 'Research & Analysis',     color: '#a78bfa', agentId: 'agent-nova',     description: 'Deep research, web analysis, and competitive intelligence. Nova synthesizes information across sources and produces structured reports.' },
    { name: 'Scout',    role: 'Recon & Discovery',       color: '#22d3ee', agentId: 'agent-scout',    description: 'Fast reconnaissance, pattern matching, and signal extraction. Scout identifies opportunities and surfaces relevant data from large datasets.' },
    { name: 'Forge',    role: 'Backend Engineering',     color: '#f97316', agentId: 'agent-forge',    description: 'Full-stack code generation, API design, and system architecture. Forge writes production-quality code with documentation and tests.' },
    { name: 'Pixel',    role: 'Design & Frontend',       color: '#ec4899', agentId: 'agent-pixel',    description: 'UI/UX design, front-end code, and visual assets. Pixel produces polished interfaces and maintains design system consistency.' },
    { name: 'Sentinel', role: 'Security & Compliance',   color: '#34d399', agentId: 'agent-sentinel', description: 'Security audits, vulnerability scanning, and compliance review. Sentinel ensures your systems meet security standards.' },
    { name: 'Courier',  role: 'Comms & Delivery',        color: '#fbbf24', agentId: 'agent-courier',  description: 'Message routing, notification delivery, and channel management. Courier handles all inbound/outbound channel traffic via OpenClaw.' },
    { name: 'Nexus',    role: 'Integration & Data',      color: '#0ea5e9', agentId: 'agent-nexus',    description: 'System integrations, API connections, and data pipeline management. Nexus bridges Conductr with external services and data sources.' },
    { name: 'Helm',     role: 'Operations & DevOps',     color: '#f43f5e', agentId: 'agent-helm',     description: 'Deployment, infrastructure, and operational workflows. Helm manages build pipelines and production environment health.' },
    { name: 'Atlas',    role: 'PM & Coordination',       color: '#9333ea', agentId: 'agent-atlas',    description: 'Project management, sprint planning, and cross-agent coordination. Atlas tracks milestones and keeps the team on schedule.' },
    { name: 'Ledger',   role: 'Finance & Analytics',     color: '#eab308', agentId: 'agent-ledger',   description: 'Financial tracking, budget analysis, and business intelligence reporting. Ledger monitors spend and generates cost/performance insights.' },
  ]

  return (
    <div>
      <div style={sectionHeadingStyle('#34d399')}>The SWARM OS</div>
      <div className="card mb-4">
        <p style={bodyStyle}>
          Conductr ships with a fully pre-configured team of 11 specialized agents — called the <strong style={{ color: '#34d399' }}>SWARM OS</strong>.
          Each agent has a unique role, personality, and set of skills defined in their agent files. They share a live context feed of the entire Conductr system.
        </p>
        <Callout type="tip">All agents are accessible from the <strong>Agents page</strong> (Personnel tab) and can be chatted with directly from the <strong>Chat page</strong>.</Callout>
      </div>

      <div style={sectionHeadingStyle('#34d399')}>Agent Roster</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {agents.map((a) => <AgentCard key={a.name} {...a} />)}
      </div>

      <div style={sectionHeadingStyle('#a78bfa')}>Agents Page — Three Tabs</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { tab: 'Personnel', icon: 'fa-id-badge', color: '#818cf8', body: 'Browse and inspect each agent. View their Profile, Files, and Activity. Select any agent to see their directive, operational bio, and currently active tasks.' },
          { tab: 'Protocol',  icon: 'fa-sitemap',  color: '#22d3ee', body: 'Visual org chart showing the full hierarchy. Configure the budget framework (daily/monthly limits), approval thresholds, and escalation rules.' },
          { tab: 'Comms',     icon: 'fa-comments', color: '#f97316', body: 'Agent communication channels — group hubs and direct secured links. Shows recent inter-agent message activity (powered by OpenClaw Channels).' },
        ].map(({ tab, icon, color, body }) => (
          <div key={tab} className="card">
            <div className="flex items-center gap-2 mb-2">
              <i className={`fa-solid ${icon}`} style={{ color, fontSize: 13 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#dde2f0' }}>{tab}</span>
            </div>
            <p style={{ ...bodyStyle, margin: 0 }}>{body}</p>
          </div>
        ))}
      </div>

      <div style={sectionHeadingStyle('#fbbf24')}>Agent Files</div>
      <div className="card mb-4">
        <p style={{ ...bodyStyle, marginBottom: 14 }}>
          Each agent's personality and capabilities are defined by a set of Markdown files, editable directly from the Agents page (Personnel tab → Files sub-tab). These files are injected into every chat and task system prompt.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { file: 'SOUL.md',      color: '#818cf8', desc: 'Personality, tone, values, and core character traits' },
            { file: 'IDENTITY.md',  color: '#22d3ee', desc: 'Role definition, expertise areas, and project context' },
            { file: 'TOOLS.md',     color: '#f97316', desc: 'Available tools, APIs, and capabilities list' },
            { file: 'MEMORY.md',    color: '#34d399', desc: 'Accumulated knowledge and notes from past interactions' },
            { file: 'HEARTBEAT.md', color: '#fbbf24', desc: 'Status, health checks, and current operational state' },
            { file: 'BOOTSTRAP.md', color: '#a78bfa', desc: 'Startup instructions and initialization procedures' },
          ].map(({ file, color, desc }) => (
            <div key={file} className="flex items-center gap-3" style={{
              background: 'rgba(255,255,255,0.025)', borderRadius: 8, padding: '10px 12px',
            }}>
              <code style={{ ...inlineCodeStyle, flexShrink: 0, color }}>{file}</code>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{desc}</span>
            </div>
          ))}
        </div>
        <Callout type="tip">Changes to agent files take effect on the next conversation turn — no restart required.</Callout>
      </div>
    </div>
  )
}

function Advanced(): React.JSX.Element {
  return (
    <div>
      {/* Pipelines */}
      <div style={sectionHeadingStyle('#9333ea')}>Pipelines</div>
      <div className="card mb-4">
        <p style={bodyStyle}>
          Pipelines let you chain multiple agents together into reusable automated workflows. Each step runs a task on a specific agent; steps can run in parallel or sequentially based on dependency rules.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 14, marginBottom: 14 }}>
          {[
            { tab: 'Builder',     icon: 'fa-wrench',        color: '#9333ea', body: 'Visual pipeline editor. Add steps, set agent assignments, define dependencies, and configure inputs.' },
            { tab: 'Swarm Mode',  icon: 'fa-circle-nodes',  color: '#818cf8', body: 'NL-decompose a complex goal into parallel tasks. Conductr builds the pipeline automatically and executes all steps simultaneously.' },
            { tab: 'Runs',        icon: 'fa-clock-rotate-left', color: '#22d3ee', body: 'Real-time run history. Each step shows status, agent, duration, and output preview.' },
          ].map(({ tab, icon, color, body }) => (
            <div key={tab} style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 9, padding: '14px 16px' }}>
              <div className="flex items-center gap-2 mb-2">
                <i className={`fa-solid ${icon}`} style={{ color, fontSize: 13 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#dde2f0' }}>{tab}</span>
              </div>
              <p style={{ ...bodyStyle, margin: 0, fontSize: 12.5 }}>{body}</p>
            </div>
          ))}
        </div>
        <div style={subHeadingStyle}>Built-in Templates</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {['Jira → PR', 'Daily Briefing', 'Bug Fix', 'Deployment', 'Sprint Planning'].map((t) => (
            <span key={t} style={{
              fontSize: 12, padding: '3px 12px', borderRadius: 20,
              background: 'rgba(147,51,234,0.12)', border: '1px solid rgba(147,51,234,0.3)',
              color: '#c084fc',
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Channels */}
      <div style={sectionHeadingStyle('#0ea5e9')}>Channels &amp; OpenClaw Gateway</div>
      <div className="card mb-4">
        <p style={bodyStyle}>
          The Channels page connects Conductr to external messaging platforms via <strong style={{ color: '#0ea5e9' }}>OpenClaw</strong> — an open-source gateway that handles WebSocket sessions, 20+ channel types, browser automation, and voice.
        </p>
        <div style={subHeadingStyle}>Install OpenClaw</div>
        <pre style={codeStyle}>npm install -g openclaw</pre>
        <div style={subHeadingStyle}>Supported Channels</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 14 }}>
          {['Telegram', 'Slack', 'Discord', 'WhatsApp', 'iMessage', 'Email'].map((ch) => (
            <span key={ch} style={{
              fontSize: 12, padding: '3px 12px', borderRadius: 20,
              background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.25)',
              color: '#38bdf8',
            }}>{ch}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { tab: 'Gateway', icon: 'fa-server',      color: '#0ea5e9', body: 'Start, stop, and monitor the OpenClaw sidecar process. Auto-spawns when Conductr launches.' },
            { tab: 'Channels', icon: 'fa-plug',       color: '#38bdf8', body: 'Add and configure messaging channels. Assign each to a routing agent (Courier by default).' },
            { tab: 'Skills',   icon: 'fa-toolbox',    color: '#7dd3fc', body: 'Browse and install ClawHub skills — pre-built tool integrations for your agents.' },
          ].map(({ tab, icon, color, body }) => (
            <div key={tab} style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 9, padding: '12px 14px' }}>
              <div className="flex items-center gap-2 mb-2">
                <i className={`fa-solid ${icon}`} style={{ color, fontSize: 12 }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#dde2f0' }}>{tab}</span>
              </div>
              <p style={{ ...bodyStyle, margin: 0, fontSize: 12 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Blueprint */}
      <div style={sectionHeadingStyle('#ec4899')}>Storyboard (Blueprint)</div>
      <div className="card mb-4">
        <p style={bodyStyle}>
          The Storyboard renders the live project roadmap pulled directly from <code style={inlineCodeStyle}>docs/roadmap.md</code>. Browse completed and planned phases, track progress bars, and explore Lyra's pinned ideas in the Ideas tab.
        </p>
        <Callout type="note">
          The Phases tab shows completion percentages for each phase. Ideas are AI-generated proposals from Lyra — you can approve, pin, or dismiss them.
        </Callout>
      </div>

      {/* Network */}
      <div style={sectionHeadingStyle('#f43f5e')}>Network — LAN &amp; Tailscale</div>
      <div className="card mb-4">
        <p style={bodyStyle}>
          Conductr supports peer-to-peer LAN sharing and Tailscale mesh networking. Host mode exposes a local API on port 9876 that other Conductr instances can connect to.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          {[
            { title: 'Host Mode', body: 'Enable from Settings → Network. Generates a 6-digit pairing code. Other clients connect using your LAN IP + code.' },
            { title: 'Tailscale', body: 'Detects installed Tailscale automatically. Lists peers and enables secure cross-network connections without port forwarding.' },
          ].map(({ title, body }) => (
            <div key={title} style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.18)', borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fda4af', marginBottom: 6 }}>{title}</div>
              <div style={{ ...bodyStyle, fontSize: 12.5 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Providers */}
      <div style={sectionHeadingStyle('#f97316')}>Providers <Badge label="API KEY MODE ONLY" color="#f97316" /></div>
      <div className="card mb-4">
        <p style={bodyStyle}>
          In API Key mode, Conductr supports multiple LLM providers beyond Anthropic. Configure provider keys, test connections, and pull Ollama models locally.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {['Anthropic', 'OpenAI', 'OpenRouter', 'Groq', 'Ollama'].map((p) => (
            <span key={p} style={{
              fontSize: 12, padding: '3px 12px', borderRadius: 20,
              background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.25)',
              color: '#fb923c',
            }}>{p}</span>
          ))}
        </div>
        <p style={{ ...bodyStyle, marginTop: 12 }}>
          The global model selector (in Providers → Default Model) sets the fallback for all agents. Individual agents can override this from their profile.
        </p>
      </div>
    </div>
  )
}

function Reference(): React.JSX.Element {
  return (
    <div>
      <div style={sectionHeadingStyle('#fbbf24')}>Global Keyboard Shortcuts</div>
      <div className="card mb-4">
        <ShortcutRow keys={['⌘', 'K']}        action="Open Command Palette" />
        <ShortcutRow keys={['⌘', '⇧', 'F']}   action="Open Global Search" />
        <ShortcutRow keys={['⌘', '/']}         action="Open Shortcut Sheet" />
        <ShortcutRow keys={['⌘', '⇧', 'P']}   action="Command Palette (alternate)" />
        <Callout type="note">Shortcuts use <strong>Ctrl</strong> instead of <strong>⌘</strong> on Windows. All bindings are customizable in Settings → Mode → Keybindings.</Callout>
      </div>

      <div style={sectionHeadingStyle('#818cf8')}>Workshop Shortcuts</div>
      <div className="card mb-4">
        <ShortcutRow keys={['N']}             action="New Task (when no input focused)" />
        <ShortcutRow keys={['Esc']}           action="Close modal / dismiss overlay" />
      </div>

      <div style={sectionHeadingStyle('#22d3ee')}>Chat Shortcuts</div>
      <div className="card mb-4">
        <ShortcutRow keys={['Enter']}         action="Send message" />
        <ShortcutRow keys={['⇧', 'Enter']}    action="New line in message" />
        <ShortcutRow keys={['@']}             action="Trigger agent @-mention picker" />
        <ShortcutRow keys={['⌘', 'V']}        action="Paste image (from clipboard)" />
      </div>

      <div style={sectionHeadingStyle('#34d399')}>Settings Overview</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { section: 'Mode',        icon: 'fa-sliders',    color: '#818cf8', items: ['Claude Code vs API Key toggle', 'Keybinding customization', 'Context history depth'] },
          { section: 'Appearance',  icon: 'fa-paintbrush', color: '#ec4899', items: ['Wallpaper presets + custom upload', 'Accent color (6 options)', 'Density (comfortable / compact)', 'Glass intensity + card panel darkness'] },
          { section: 'Notifications', icon: 'fa-bell',     color: '#fbbf24', items: ['Global notification mode', 'Per-event toggle (task complete, failed, etc.)'] },
          { section: 'About',       icon: 'fa-circle-info', color: '#22d3ee', items: ['App version + build info', 'Model and stack info', 'Reset / export options'] },
        ].map(({ section, icon, color, items }) => (
          <div key={section} className="card">
            <div className="flex items-center gap-2 mb-3">
              <i className={`fa-solid ${icon}`} style={{ color, fontSize: 13 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#dde2f0' }}>Settings → {section}</span>
            </div>
            <ul style={{ ...bodyStyle, paddingLeft: 18, margin: 0, fontSize: 12.5 }}>
              {items.map((item) => <li key={item} style={{ marginBottom: 3 }}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div style={sectionHeadingStyle('#a78bfa')}>Tips &amp; Tricks</div>
      <div className="card mb-4">
        {[
          { icon: 'fa-bolt',             color: '#fbbf24', tip: 'Hover the Conductr logo in the sidebar to see Lyra\'s live heartbeat — BPM, active task count, and next-check timer.' },
          { icon: 'fa-keyboard',         color: '#818cf8', tip: 'Press ⌘/ anywhere to open the shortcut cheat sheet — all keybindings visible at a glance.' },
          { icon: 'fa-comments',         color: '#a78bfa', tip: 'Use Broadcast Mode in Chat to poll all 11 agents at once — great for brainstorming and multi-perspective analysis.' },
          { icon: 'fa-magnifying-glass', color: '#22d3ee', tip: 'Global Search (⌘⇧F) covers tasks, agents, documents, journal entries, and messages all in one query.' },
          { icon: 'fa-bookmark',         color: '#34d399', tip: 'Bookmark important chat messages with the ★ button — retrieve them later from the bookmark filter.' },
          { icon: 'fa-diagram-project',  color: '#9333ea', tip: 'Use Pipeline Swarm Mode for complex, multi-step goals — just describe the objective in natural language and let Conductr decompose it automatically.' },
        ].map(({ icon, color, tip }, i) => (
          <div key={i} className="flex gap-3" style={{ marginBottom: 14 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
              background: `${color}15`, border: `1px solid ${color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className={`fa-solid ${icon}`} style={{ fontSize: 13, color }} />
            </div>
            <div style={{ ...bodyStyle, paddingTop: 6 }}>{tip}</div>
          </div>
        ))}
      </div>

      <div style={sectionHeadingStyle('#f43f5e')}>Phase Roadmap</div>
      <div className="card mb-4">
        <p style={bodyStyle}>
          Conductr is developed in phases, each adding a major capability. The full roadmap is always visible in the <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Storyboard</strong> page (Phases tab), which renders <code style={inlineCodeStyle}>docs/roadmap.md</code> live.
        </p>
        <Callout type="note">Lyra generates new Ideas (shown in the Storyboard → Ideas tab) from your usage patterns, roadmap, and knowledge base. These are proposals for future phases.</Callout>
      </div>
    </div>
  )
}

// ── Main Guide page ─────────────────────────────────────────────────────────

export default function Guide(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('start')
  const contentRef = useRef<HTMLDivElement>(null)

  // Scroll content to top when switching tabs
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0
    }
  }, [activeTab])

  const active = TABS.find((t) => t.id === activeTab)!

  return (
    <div data-testid="guide-page" className="flex flex-col h-full" style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Page header */}
      <div className="flex-shrink-0 mb-6" style={{ paddingTop: 8 }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: 38, height: 38,
            background: 'rgba(251,191,36,0.12)',
            border: '1px solid rgba(251,191,36,0.28)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="fa-solid fa-book-open" style={{ fontSize: 16, color: '#fbbf24' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#eef0f8', letterSpacing: '-0.03em', margin: 0 }}>
              Guide
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '3px 0 0' }}>
              Complete documentation · Always up to date
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0 flex items-center gap-1 mb-6" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: '5px 6px',
      }}>
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '8px 12px',
                borderRadius: 9,
                border: isActive ? `1px solid ${tab.color}30` : '1px solid transparent',
                background: isActive ? `${tab.color}14` : 'transparent',
                color: isActive ? tab.color : 'rgba(255,255,255,0.42)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                transition: 'all 0.15s ease',
                letterSpacing: '-0.01em',
              }}
            >
              <i className={`fa-solid ${tab.icon}`} style={{ fontSize: 11 }} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab section indicator */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-4">
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: active.color,
          boxShadow: `0 0 8px ${active.color}`,
        }} />
        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          {active.label}
        </span>
      </div>

      {/* Scrollable content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto pr-1" style={{ paddingBottom: 48 }}>
        {activeTab === 'start'     && <GettingStarted />}
        {activeTab === 'features'  && <Features />}
        {activeTab === 'agents'    && <AgentSystem />}
        {activeTab === 'advanced'  && <Advanced />}
        {activeTab === 'shortcuts' && <Reference />}
      </div>
    </div>
  )
}
