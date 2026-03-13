# 🏗️ Conductr — Architecture

## Overview

Conductr is a local-first Mac desktop application that aims to be the **single AI operations layer** — replacing Claude Desktop, Codex, ChatGPT, and every other AI tool with one unified command centre. All data is stored on-device in SQLite. Multiple LLM providers are supported. All state, history, agent memories, and cost data lives locally — no cloud dependency, no vendor lock-in.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Desktop shell | Electron 29 | Mac app packaging, native APIs, BrowserView for previews |
| UI framework | React 18 | Component model, fast iteration |
| Build tool | electron-vite 2 | Fast HMR for Electron renderer |
| Styling | Tailwind CSS 4 | CSS-first `@theme` tokens, utility-first |
| Local DB | SQLite (better-sqlite3) | Fast, local, WAL mode, no setup |
| State | Zustand | Lightweight, no boilerplate |
| AI | Anthropic API (Claude) | Task execution, chat, intelligence (Phase 15: add OpenAI, Gemini, Ollama) |
| Markdown | `react-markdown` + `rehype-highlight` / Shiki | Rich chat rendering (Phase 8) |
| Charts | Recharts | API metrics visualization |
| Icons | Font Awesome Free | Self-hosted webfonts, `<i>` class syntax |
| Testing | Playwright | E2E via `_electron.launch()` |
| Packaging | electron-builder | .dmg / .app for macOS |

**Planned additions (future phases):**

| Layer | Technology | Phase |
|---|---|---|
| Git operations | `simple-git` | Phase 10 |
| MCP client | `@modelcontextprotocol/sdk` | Phase 11 |
| GitHub API | Octokit | Phase 10 |
| Jira API | Jira.js | Phase 10 |
| OpenAI SDK | `openai` | Phase 15 |
| Google AI SDK | `@google/genai` | Phase 15 |
| Local models | Ollama HTTP API | Phase 15 |
| Syntax highlighting | Shiki | Phase 8 |
| Diff rendering | `react-diff-viewer` or `diff2html` | Phase 10 |
| Mermaid diagrams | `mermaid` | Phase 8 |
| Cron scheduling | `node-cron` | Phase 16 |
| Encrypted storage | Electron `safeStorage` | Phase 13 |

---

## Folder Structure

```
conductr/
│
├── src/
│   ├── main/                        # Electron main process (Node.js)
│   │   ├── index.ts                 # App entry, BrowserWindow setup, IPC registration
│   │   ├── ipc/                     # IPC handlers (bridge to renderer)
│   │   │   ├── tasks.ts             # Task CRUD + streaming runner
│   │   │   ├── agents.ts            # Agent CRUD
│   │   │   ├── metrics.ts           # API usage queries
│   │   │   ├── chat.ts              # Chat send/receive/stream
│   │   │   ├── repo.ts              # (Phase 10) File system + git operations
│   │   │   ├── shell.ts             # (Phase 10) Terminal execution sandbox
│   │   │   ├── mcp.ts               # (Phase 11) MCP server management
│   │   │   └── scheduler.ts         # (Phase 16) Cron + webhook task scheduling
│   │   ├── db/                      # SQLite setup & queries
│   │   │   ├── schema.ts            # DB init, table creation, default agent seed
│   │   │   ├── tasks.ts             # Task queries
│   │   │   ├── agents.ts            # Agent queries
│   │   │   ├── messages.ts          # Chat message queries
│   │   │   ├── memories.ts          # (Phase 9) Agent memory queries
│   │   │   ├── documents.ts         # Document queries
│   │   │   └── activity.ts          # Activity log queries
│   │   ├── providers/               # (Phase 15) Multi-LLM provider abstraction
│   │   │   ├── index.ts             # Provider router (picks provider based on agent config)
│   │   │   ├── anthropic.ts         # Anthropic API client (refactored from api/claude.ts)
│   │   │   ├── openai.ts            # OpenAI API client
│   │   │   ├── google.ts            # Google Gemini API client
│   │   │   └── ollama.ts            # Ollama/LM Studio local HTTP client
│   │   └── services/                # Cross-cutting services
│   │       ├── learner.ts           # (Phase 9) Post-task learning extraction
│   │       ├── prompt-analyzer.ts   # (Phase 9) Prompt quality analysis
│   │       └── rate-limiter.ts      # (Phase 13) Rate limit detection + backoff
│   │
│   ├── renderer/                    # React app (Vite + HMR)
│   │   ├── index.html               # CSP, FA font-src, title
│   │   └── src/
│   │       ├── main.tsx             # React root, FA CSS imports
│   │       ├── index.css            # Tailwind @theme tokens, glass utilities, components
│   │       ├── App.tsx              # Page router (NavPage union, PAGE_MAP)
│   │       ├── env.d.ts             # Shared TS types + window.electronAPI declarations
│   │       ├── assets/
│   │       │   └── agents/          # SVG avatars for default agents
│   │       │       ├── index.ts     # AGENT_AVATARS barrel export
│   │       │       └── *.svg        # 7 default agent SVGs
│   │       ├── pages/
│   │       │   ├── Dashboard.tsx
│   │       │   ├── Workshop.tsx
│   │       │   ├── Agents.tsx
│   │       │   ├── Chat.tsx
│   │       │   ├── Intelligence.tsx
│   │       │   ├── Documents.tsx
│   │       │   ├── Metrics.tsx
│   │       │   ├── Journal.tsx
│   │       │   ├── Clients.tsx
│   │       │   └── Settings.tsx     # (Phase 13) All settings + integrations
│   │       └── components/
│   │           ├── Sidebar.tsx
│   │           ├── TopBar.tsx
│   │           ├── TaskCard.tsx
│   │           ├── AgentCard.tsx
│   │           ├── StatusBadge.tsx
│   │           ├── MetricCard.tsx
│   │           ├── ActivityFeed.tsx
│   │           ├── Modal.tsx
│   │           ├── MarkdownRenderer.tsx  # (Phase 8) Rich markdown + code blocks
│   │           ├── DiffViewer.tsx        # (Phase 10) Side-by-side code diff
│   │           ├── FileTree.tsx          # (Phase 10) Repo file browser
│   │           ├── Terminal.tsx          # (Phase 10) Embedded terminal output
│   │           ├── CommandPalette.tsx    # (Phase 7) Cmd+K quick actions
│   │           ├── NotificationCenter.tsx # (Phase 7) Toast + panel
│   │           └── ContextMeter.tsx      # (Phase 8) Token usage visualization
│   │
│   ├── preload/
│   │   └── index.ts                 # contextBridge — exposes window.electronAPI to renderer
│   │
│   ├── api/
│   │   └── claude.ts                # Anthropic SDK client (Phase 15: moves to providers/)
│   │
│   └── agents/
│       ├── runner.ts                # Task execution engine (Claude streaming + DB logging)
│       ├── personas/
│       │   └── lyra.ts              # Lyra system prompt builder
│       └── skills/                  # Reusable agent skill definitions (Phase 12)
│
├── tests/                           # Playwright E2E specs
│   ├── fixtures.ts
│   └── *.spec.ts
│
├── docs/
│   ├── README.md
│   ├── roadmap.md
│   ├── architecture.md
│   ├── v1spec.md
│   └── context.md
│
├── .env.example
├── .npmrc
├── electron.vite.config.ts
├── electron-builder.yml
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

---

## Data Model (SQLite — `conductr.db`)

### Current Tables

#### tasks
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'queued',     -- queued | active | complete | failed
  priority TEXT DEFAULT 'normal',   -- (Phase 16) urgent | high | normal | low
  agent_id TEXT,
  client_id TEXT,
  parent_task_id TEXT,              -- (Phase 12) for pipeline subtasks
  pipeline_id TEXT,                 -- (Phase 12) links to pipeline
  tags TEXT,                        -- JSON array string
  progress INTEGER DEFAULT 0,
  schedule TEXT,                    -- (Phase 16) cron expression or null
  created_at TEXT,
  started_at TEXT,
  completed_at TEXT
);
```

#### agents
```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  system_directive TEXT,
  operational_role TEXT,
  provider TEXT DEFAULT 'anthropic', -- (Phase 15) anthropic | openai | google | ollama
  model TEXT,                        -- (Phase 15) override global model, e.g. 'claude-opus-4'
  created_at TEXT
);
```

#### activity_log
```sql
CREATE TABLE activity_log (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  agent_id TEXT,
  message TEXT,
  timestamp TEXT
);
```

#### documents
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  task_id TEXT,
  client_id TEXT,
  created_at TEXT
);
```

#### api_usage
```sql
CREATE TABLE api_usage (
  id TEXT PRIMARY KEY,
  provider TEXT DEFAULT 'anthropic', -- (Phase 15) which provider was used
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd REAL,
  task_id TEXT,
  agent_id TEXT,
  timestamp TEXT
);
```

#### messages
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL,                -- 'user' | 'assistant'
  content TEXT NOT NULL,
  metadata TEXT,                     -- (Phase 8) JSON: {tokens, model, bookmarked, branch_id}
  created_at TEXT NOT NULL
);
```

---

### Planned Tables (Future Phases)

#### agent_memories — Phase 9
```sql
CREATE TABLE agent_memories (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  source_task_id TEXT,
  content TEXT NOT NULL,             -- distilled learning/insight
  tags TEXT,                         -- JSON: domain tags (auth, UI, testing, etc.)
  relevance_score REAL DEFAULT 1.0,  -- decays over time if unused
  access_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  last_used_at TEXT
);
```

#### knowledge_base — Phase 9
```sql
CREATE TABLE knowledge_base (
  id TEXT PRIMARY KEY,
  author_agent_id TEXT,
  scope TEXT DEFAULT 'shared',       -- 'shared' | 'private'
  content TEXT NOT NULL,
  tags TEXT,
  created_at TEXT NOT NULL
);
```

#### prompt_analysis — Phase 9
```sql
CREATE TABLE prompt_analysis (
  id TEXT PRIMARY KEY,
  original_prompt TEXT NOT NULL,
  quality_score REAL,                -- 0.0 to 1.0
  suggestions TEXT,                  -- JSON array of improvement suggestions
  task_id TEXT,
  agent_id TEXT,
  outcome TEXT,                      -- 'success' | 'partial' | 'failed' (populated post-task)
  created_at TEXT NOT NULL
);
```

#### clients — Phase 6
```sql
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  created_at TEXT
);
```

#### skills — Phase 12
```sql
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  agent_id TEXT,
  tags TEXT,
  use_count INTEGER DEFAULT 0,
  created_at TEXT
);
```

#### pipelines — Phase 12
```sql
CREATE TABLE pipelines (
  id TEXT PRIMARY KEY,
  parent_task_id TEXT,
  name TEXT,
  steps TEXT NOT NULL,               -- JSON: [{agent_id, description, depends_on, mode}]
  status TEXT DEFAULT 'pending',
  created_at TEXT
);
```

#### mcp_servers — Phase 11
```sql
CREATE TABLE mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  args TEXT,
  env TEXT,
  enabled INTEGER DEFAULT 1,
  created_at TEXT
);
```

#### scheduled_tasks — Phase 16
```sql
CREATE TABLE scheduled_tasks (
  id TEXT PRIMARY KEY,
  task_template_id TEXT,             -- links to a skill/template
  cron_expression TEXT,              -- cron format: '0 9 * * *'
  agent_id TEXT,
  enabled INTEGER DEFAULT 1,
  last_run_at TEXT,
  next_run_at TEXT,
  created_at TEXT
);
```

#### settings — Phase 13
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,               -- JSON-encoded value
  updated_at TEXT
);
-- Keys: 'anthropic_key', 'openai_key', 'google_key', 'github_token',
--        'daily_budget', 'monthly_budget', 'default_model', 'accent_color', etc.
-- Sensitive values encrypted via Electron safeStorage before insert
```

---

## IPC Architecture (Electron)

All communication between the React renderer and Node.js main process goes through Electron's contextBridge. The renderer **never has direct access** to Node APIs, SQLite, API keys, or the filesystem.

```
Renderer (React)
    ↓ window.electronAPI.tasks.create(payload)
Preload (contextBridge)
    ↓ ipcRenderer.invoke('tasks:create', payload)
Main Process (Node.js)
    ↓ ipcMain.handle('tasks:create', handler)
SQLite / LLM Provider / Git / Shell / MCP Server
```

### IPC Namespaces

| Namespace | Handler file | Pattern |
|---|---|---|
| `tasks:*` | `ipc/tasks.ts` | handle + send (streaming events) |
| `agents:*` | `ipc/agents.ts` | handle only |
| `metrics:*` | `ipc/metrics.ts` | handle only |
| `chat:*` | `ipc/chat.ts` | handle + send (streaming) |
| `repo:*` | `ipc/repo.ts` *(Phase 10)* | handle only |
| `shell:*` | `ipc/shell.ts` *(Phase 10)* | handle + send (streaming) |
| `mcp:*` | `ipc/mcp.ts` *(Phase 11)* | handle + send |
| `scheduler:*` | `ipc/scheduler.ts` *(Phase 16)* | handle only |
| `settings:*` | `ipc/settings.ts` *(Phase 13)* | handle only |

### Streaming Pattern

For long-running operations (task execution, chat, shell commands), the main process streams events back via `win.webContents.send`:

```
ipcMain.on('chat:send', async (_, { agentId, content }) => {
  for await (const chunk of stream) {
    win.webContents.send('chat:chunk', { agentId, chunk })
  }
  win.webContents.send('chat:done', { agentId, message })
})
```

**Critical rule:** All IPC listeners for a page must be owned by that page's top-level component and removed on unmount — never inside child components.

All API keys and secrets live in the main process only — never passed to the renderer.

---

## Agent Architecture

Conductr uses a **named agent model**. Each agent has a persona, system directive, operational role, LLM provider/model override, and specialization. The system ships with 7 default agents but supports **unlimited custom agents**.

### Default Agents

| Agent | ID | Role | Specialization |
|---|---|---|---|
| **Lyra** | `agent-lyra` | Lead Orchestrator | Delegates objectives, ensures mission success, commands the centre |
| **Nova** | `agent-nova` | General Intelligence | Broad-purpose research, analysis, and content generation |
| **Scout** | `agent-scout` | Repository Analyst | Codebase exploration, dependency auditing, architecture mapping |
| **Forge** | `agent-forge` | Backend Engineer | API design, database work, server-side implementation |
| **Pixel** | `agent-pixel` | Frontend Engineer | UI/UX implementation, component design, styling |
| **Sentinel** | `agent-sentinel` | QA & Security | Testing, vulnerability scanning, code review |
| **Courier** | `agent-courier` | Delivery & Ops | CI/CD, deployments, PR creation, release management |

### Agent Context Construction (progressive enrichment)

When an agent executes a task or responds in Chat, its context is built in layers:

```
Layer 1 — Static Identity (always present)
  ├── System directive (persona instruction from DB)
  └── Operational role (responsibility description from DB)

Layer 2 — Accumulated Intelligence (Phase 9)
  ├── Top N agent_memories (scored by relevance, recency, access_count)
  ├── Top M shared knowledge_base entries (tag-matched to current task)
  └── Prompt intelligence suggestions (if prompt analysis is enabled)

Layer 3 — Live System State (Phase 8 future)
  ├── Active task count + recent activity summary
  ├── Agent status (who's busy, who's idle)
  └── @-mentioned file contents or agent knowledge

Layer 4 — External Context (Phase 10-11)
  ├── Repo file contents (if file attached or @-mentioned)
  ├── MCP tool definitions (tools available to this agent)
  └── Pipeline context (output from previous pipeline step)
```

The richer this context becomes, the more capable agents get without requiring user re-explanation. **This is the core advantage over Claude/ChatGPT — context persists and grows.**

---

## Multi-Provider LLM Engine (Phase 15)

### Architecture

```
Agent runner / Chat handler
    ↓ reads agent.provider + agent.model (or falls back to global default)
Provider Router (src/main/providers/index.ts)
    ↓ dispatches to correct provider client
┌───────────────┬───────────────┬───────────────┬───────────────┐
│  Anthropic    │   OpenAI      │   Google      │   Ollama      │
│  claude.ts    │   openai.ts   │   google.ts   │   ollama.ts   │
│  SDK stream   │   SDK stream  │   SDK stream  │   HTTP stream │
└───────────────┴───────────────┴───────────────┴───────────────┘
    ↓ unified streaming interface: { chunk, done, error, usage }
Activity log / Chat / Cost tracker
```

### Unified Provider Interface

All providers implement the same interface:

```typescript
interface LLMProvider {
  id: string                          // 'anthropic' | 'openai' | 'google' | 'ollama'
  stream(params: StreamParams): AsyncIterable<StreamEvent>
  supportsVision: boolean
  supportsTools: boolean
  calculateCost(usage: TokenUsage): number
}
```

This means the task runner and chat handler don't care which provider powers an agent — they all look the same at the IPC layer.

### Rate Limit Management
- Each provider client tracks rate limits from response headers
- On 429: exponential backoff + automatic retry
- If multiple API keys configured: rotate to next key
- Rate limit status visible in Settings dashboard

---

---

## Design Principles

### Open-Ended by Design
Conductr is an **AI operations layer**, not a point solution. The same infrastructure supports code generation, research automation, monitoring, client intelligence, and workflows that haven't been imagined yet.

### Never Switch Away
The app must have feature parity with Claude Desktop (rendering), Claude Code (code execution), Codex (multi-agent + automation), and Cursor (live preview) — so users never need to open another AI tool.

### Progressive Intelligence
The system genuinely gets smarter the more you use it — through agent memories, shared knowledge, prompt analysis, and codebase indexing.

### Local Sovereignty
All data, memories, keys, and decision-making stay on your machine. No cloud sync required. No vendor can take your data.

---

## Design System

- **Background**: `#08080d` (deep space)
- **Surface**: `rgba(255,255,255,0.03)` (frosted glass)
- **Card**: `rgba(255,255,255,0.04)` with `backdrop-filter: blur(24px) saturate(1.2)` + inset highlight
- **Border**: `rgba(255,255,255,0.06)` (white-alpha)
- **Accent primary**: `#818cf8` (indigo)
- **Accent secondary**: `#a78bfa` (violet)
- **Accent green**: `#34d399` (active states)
- **Accent cyan**: `#22d3ee`
- **Accent pink**: `#f472b6`
- **Text primary**: `#f1f5f9`
- **Text secondary**: `#cbd5e1`
- **Text muted**: `#64748b`
- **Font**: Inter Variable (self-hosted, cross-platform)
- **Sidebar width**: 240px fixed
- **Card radius**: 14px
- **Icons**: Font Awesome (self-hosted webfonts, `<i className="fa-solid fa-xxx" />`)
- **Agent avatars**: Rounded rectangle (not circle), SVG for defaults / emoji fallback for custom
- **Glass effect**: Apple Liquid Glass — semi-transparent backgrounds + backdrop-blur + white-alpha inset highlights + radial ambient glow
- **Code blocks**: Shiki syntax highlighting, glass card background, copy button, language label
- **Diffs**: Side-by-side with per-hunk accept/reject, green/red line highlighting
