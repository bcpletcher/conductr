# 🏗️ Conductr — Architecture

## Overview

Conductr is a **local-first Mac/Windows desktop application** that serves as a single AI operations layer — replacing Claude Desktop, Codex, ChatGPT, and every other AI tool with one unified command centre. All data is stored on-device in SQLite. Multiple LLM providers are supported. All state, history, agent memories, and cost data lives locally — no cloud dependency, no vendor lock-in.

Conductr is also a **living document of itself**: it reads its own roadmap, architecture, and usage patterns to propose its own improvements. Lyra (the lead agent) operates as a Plan Mode Orchestrator — she proposes before she acts.

---

## Current Build Status

**Phases 0–8 complete. 82/82 Playwright tests passing.**

| Phase | Name | Status |
|---|---|---|
| 0 | Project Setup | ✅ Complete |
| 1 | Dashboard | ✅ Complete |
| 2 | Workshop / Task Queue | ✅ Complete |
| 3 | Agents | ✅ Complete |
| 3B | SWARM OS Redesign | 🔄 In progress |
| 4 | API Metrics | ✅ Complete |
| 5 | Intelligence & Documents | ✅ Complete |
| 6 | Clients | ✅ Complete |
| 7 | Polish, Power User & Distribution | ✅ Complete |
| 8 | Chat Interface | ✅ Complete (core) |
| 9 | Agent Memory & Learning | 📋 Planned |
| 10 | Developer Tools | 📋 Planned |
| 11 | MCP Tool Integration | 📋 Planned |
| 12 | Multi-Agent Pipelines | 📋 Planned |
| 13 | Settings & Integrations Hub | 📋 Planned |
| 14 | Intelligence, Documents & Journal | 📋 Planned |
| 14B | App Self-Evolution & Ideas Page | 📋 Planned (pinned) |
| 15 | Multi-Provider LLM Engine | 📋 Planned (OpenRouter pinned) |
| 16 | Scheduled Tasks & Automation | 📋 Planned |

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Desktop shell | Electron 29 | Mac/Windows app packaging, native APIs |
| UI framework | React 18 | Component model, fast iteration |
| Build tool | electron-vite 2 | Fast HMR for Electron renderer |
| Styling | Tailwind CSS 4 | CSS-first `@theme` tokens, utility-first |
| Local DB | SQLite (better-sqlite3) | Fast, local, WAL mode, no setup |
| State | Zustand | Lightweight, no boilerplate |
| AI | Anthropic API (Claude Sonnet 4.6) | Task execution, chat, intelligence |
| Markdown | `react-markdown` + `rehype-highlight` | Rich chat rendering |
| Diagrams | `mermaid` | Flow/sequence diagrams from agent output |
| Charts | Recharts | API metrics visualization |
| Icons | Font Awesome Free | Self-hosted webfonts, `<i>` class syntax |
| Testing | Playwright | E2E via `_electron.launch()` |
| Packaging | electron-builder | .dmg / .app (macOS), NSIS (Windows) |

**Planned additions (future phases):**

| Layer | Technology | Phase |
|---|---|---|
| Git operations | `simple-git` | Phase 10 |
| MCP client | `@modelcontextprotocol/sdk` | Phase 11 |
| GitHub API | Octokit | Phase 10 |
| OpenAI SDK | `openai` | Phase 15 |
| Google AI SDK | `@google/genai` | Phase 15 |
| Local models | Ollama HTTP API | Phase 15 |
| OpenRouter | OpenRouter API (openai-compatible) | Phase 15 (pinned priority) |
| Cron scheduling | `node-cron` | Phase 16 |
| Diff rendering | `react-diff-viewer` | Phase 10 |
| Encrypted storage | Electron `safeStorage` | Phase 13 |

---

## Folder Structure

```
conductr/
│
├── src/
│   ├── main/                        # Electron main process (Node.js)
│   │   ├── index.ts                 # App entry, BrowserWindow setup, IPC registration, tray
│   │   ├── tray.ts                  # System tray / menu-bar launcher (pure-Node PNG, IPC events)
│   │   ├── ipc/                     # IPC handlers (bridge to renderer)
│   │   │   ├── tasks.ts             # Task CRUD + streaming runner + auto-save hook
│   │   │   ├── agents.ts            # Agent CRUD
│   │   │   ├── metrics.ts           # API usage queries (budget, agent spend, monthly)
│   │   │   ├── chat.ts              # Chat send/receive/stream (agentId in every event)
│   │   │   ├── documents.ts         # Documents, journal, intelligence IPC handlers
│   │   │   ├── clients.ts           # Client CRUD + getTasks, getDocuments, getActivityLog
│   │   │   ├── settings.ts          # settings:get / settings:set / settings:pick-wallpaper
│   │   │   ├── search.ts            # search:global — unified search across all tables
│   │   │   ├── repo.ts              # (Phase 10) File system + git operations
│   │   │   ├── shell.ts             # (Phase 10) Terminal execution sandbox
│   │   │   ├── mcp.ts               # (Phase 11) MCP server management
│   │   │   └── scheduler.ts         # (Phase 16) Cron + webhook task scheduling
│   │   ├── db/                      # SQLite setup & queries
│   │   │   ├── schema.ts            # DB init, table creation, 7-agent seed + directive migration
│   │   │   ├── tasks.ts             # Task queries
│   │   │   ├── agents.ts            # Agent queries
│   │   │   ├── messages.ts          # Chat message queries
│   │   │   ├── documents.ts         # Document queries
│   │   │   ├── journal.ts           # Journal entry queries
│   │   │   ├── intelligence.ts      # Intelligence insight queries
│   │   │   ├── clients.ts           # Client queries
│   │   │   ├── settings.ts          # getSetting / setSetting key/value store
│   │   │   ├── memories.ts          # (Phase 9) Agent memory queries
│   │   │   └── activity.ts          # Activity log queries
│   │   └── providers/               # (Phase 15) Multi-LLM provider abstraction
│   │       ├── index.ts             # Provider router (picks provider based on agent config)
│   │       ├── anthropic.ts         # Anthropic API client (refactored from api/claude.ts)
│   │       ├── openai.ts            # OpenAI + OpenRouter + any OpenAI-compatible endpoint
│   │       ├── google.ts            # Google Gemini API client
│   │       ├── groq.ts              # Groq Cloud (OpenAI-compatible, fastest inference)
│   │       └── ollama.ts            # Ollama/LM Studio local HTTP client
│   │
│   ├── renderer/                    # React app (Vite + HMR)
│   │   ├── index.html               # CSP headers, FA font-src, title
│   │   └── src/
│   │       ├── main.tsx             # React root, FA CSS imports
│   │       ├── index.css            # Tailwind 4 @theme tokens, glass utilities, nav-item
│   │       ├── App.tsx              # NavPage union type + PAGE_MAP router + WindowControls
│   │       ├── env.d.ts             # Shared TS types + window.electronAPI declarations
│   │       ├── assets/
│   │       │   └── agents/
│   │       │       └── index.ts     # AGENT_AVATARS + AGENT_COLORS + getAgentColor()
│   │       ├── store/
│   │       │   └── ui.ts            # Zustand: palette, toasts, notifications, accentColor,
│   │       │                        #   wallpaperBrightness, wallpaperStyle, density
│   │       ├── constants/
│   │       │   └── wallpapers.ts    # WALLPAPER_PRESETS (id, label, gradient, preview)
│   │       ├── pages/
│   │       │   ├── Dashboard.tsx    # Bird's eye: metric cards, activity feed, widgets
│   │       │   ├── Workshop.tsx     # Task queue — list + Kanban board views, IPC owner
│   │       │   ├── Agents.tsx       # SWARM OS: Personnel / Protocol / Comms tabs
│   │       │   ├── Chat.tsx         # Per-agent chat + broadcast mode + markdown rendering
│   │       │   ├── Intelligence.tsx # AI-synthesized insights feed
│   │       │   ├── Documents.tsx    # File list + search + tag pills + preview panel
│   │       │   ├── Journal.tsx      # Session log with decisions and timestamps
│   │       │   ├── Clients.tsx      # Client portfolio + per-client detail panel
│   │       │   ├── Metrics.tsx      # API usage: spend, tokens, budget controls, bar charts
│   │       │   ├── Settings.tsx     # Accent color, density, wallpaper, brightness, about
│   │       │   └── Ideas.tsx        # (Phase 14B) Lyra's proposals — approve/deny/pin/refine
│   │       └── components/
│   │           ├── Sidebar.tsx      # Nav sidebar: logo, hover card, nav items, popover
│   │           ├── GradientBackground.tsx  # 4-layer background: dark base, accent blobs,
│   │           │                           #   wallpaper image, dark readability overlay
│   │           ├── CommandPalette.tsx      # Cmd+K: pages, tasks, agents, quick actions
│   │           ├── Toast.tsx               # Bottom-right glass toasts (3.5s auto-dismiss)
│   │           ├── ShortcutSheet.tsx       # Cmd+/ keyboard shortcut cheat sheet overlay
│   │           ├── NotificationPanel.tsx   # Bell-triggered slide-out notification panel
│   │           ├── WindowControls.tsx      # Windows-only custom title bar (min/max/close)
│   │           ├── SearchModal.tsx         # Cmd+Shift+F global search: tasks/agents/docs/chat
│   │           ├── Onboarding.tsx          # First-run wizard (skippable via VITE_SKIP_ONBOARDING)
│   │           ├── Modal.tsx               # Generic modal wrapper
│   │           ├── ActivityFeed.tsx        # Live activity log component
│   │           ├── MetricCard.tsx          # Stat card with icon + value + trend
│   │           ├── MarkdownRenderer.tsx    # react-markdown + rehype-highlight + Mermaid
│   │           ├── AgentCard.tsx           # Agent roster item
│   │           ├── TaskCard.tsx            # Task card (Workshop)
│   │           ├── DiffViewer.tsx          # (Phase 10) Side-by-side code diff
│   │           ├── FileTree.tsx            # (Phase 10) Repo file browser
│   │           └── Terminal.tsx            # (Phase 10) Embedded terminal output
│   │
│   ├── preload/
│   │   └── index.ts                 # contextBridge — exposes window.electronAPI to renderer
│   │                                # Exposes: tasks, agents, chat, documents, clients,
│   │                                #   metrics, settings, app (platform, isTest, tray events)
│   │
│   ├── api/
│   │   └── claude.ts                # Anthropic SDK client (Phase 15: refactors into providers/)
│   │
│   └── agents/
│       ├── runner.ts                # Task execution engine (Claude streaming + DB logging)
│       └── personas/
│           └── nova.ts              # Lyra persona export (system directive seed reference)
│
├── src/renderer/public/             # Static assets served by Vite renderer
│   ├── conductr.webp                # App logo (sidebar header, system icons)
│   ├── wallpaper.png                # Default wallpaper preset
│   └── agent-*.webp                 # 7 default agent avatars (lyra, nova, scout, forge,
│                                    #   pixel, sentinel, courier)
│
├── public/                          # Electron packaging assets only
│   ├── icon.icns                    # macOS app icon
│   ├── icon.ico                     # Windows app icon
│   └── icon.png                     # Linux / generic
│
├── tests/                           # Playwright E2E specs (82 tests, all passing)
│   ├── fixtures.ts                  # Electron harness via _electron.launch()
│   └── *.spec.ts
│
├── docs/
│   ├── readme.md
│   ├── roadmap.md                   # Phase roadmap (living document — updated by Ideas system)
│   ├── architecture.md              # This file — Lyra reads this for self-knowledge
│   ├── v1spec.md
│   └── context.md
│
├── scripts/
│   └── generate-icons.mjs           # Generates icon.icns + icon.ico from PNG source
│
├── .env                             # API keys + VITE_SKIP_ONBOARDING flag
├── .env.example
├── electron.vite.config.ts
├── electron-builder.yml             # macOS DMG + Windows NSIS targets
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

---

## Data Model (SQLite — `conductr.db`)

### Current Tables (live in production)

#### tasks
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'queued',     -- queued | active | complete | failed
  agent_id TEXT,
  client_id TEXT,
  tags TEXT,                        -- JSON array string e.g. '["auth","backend"]'
  progress INTEGER DEFAULT 0,
  created_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT
);
```

#### agents
```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,                       -- emoji fallback for custom agents
  system_directive TEXT,             -- full persona instruction (rich, multi-paragraph)
  operational_role TEXT,             -- one-liner role description
  provider TEXT DEFAULT 'anthropic', -- (Phase 15) which LLM provider
  model TEXT,                        -- (Phase 15) model override
  created_at TEXT,
  updated_at TEXT
);
-- 7 agents seeded via INSERT OR IGNORE on schema init.
-- Migration UPDATE runs after seed to patch old one-liner directives with rich versions.
-- Patch is conditional: only updates if directive still matches original default value.
```

**Default agents (seeded):**
- `agent-lyra` — Lead Intelligence Orchestrator + Plan Mode agent
- `agent-nova` — General-purpose intelligence
- `agent-scout` — Codebase & repository analyst
- `agent-forge` — Senior backend engineer
- `agent-pixel` — Senior frontend engineer
- `agent-sentinel` — QA & security engineer
- `agent-courier` — Delivery & release engineer

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
  doc_type TEXT DEFAULT 'manual',   -- output | recap | manual
  tags TEXT,                        -- JSON array string
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
  metadata TEXT,                     -- JSON: {tokens, model, bookmarked}
  created_at TEXT NOT NULL
);
```

#### journal_entries
```sql
CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

#### intelligence_insights
```sql
CREATE TABLE intelligence_insights (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  tags TEXT,                         -- JSON array
  created_at TEXT NOT NULL
);
```

#### clients
```sql
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

#### settings
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT
);
-- Active keys: wallpaper_brightness, wallpaper_style, wallpaper_custom,
--              accent_color, density, onboarding_complete,
--              budget_daily, budget_monthly,
--              notif_mode, notif_task_complete, notif_task_failed, notif_budget_alert
```

---

### Planned Tables (Future Phases)

#### agent_memories — Phase 9
```sql
CREATE TABLE agent_memories (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  client_id TEXT,                    -- NULL = global (applies to all clients)
                                     -- set = client-scoped (isolated per client)
  domain_tags TEXT,                  -- JSON: e.g. '["vue","composition-api","pinia"]'
  skill_tags TEXT,                   -- JSON: e.g. '["state-management","component-design"]'
  content TEXT NOT NULL,             -- distilled insight / learned pattern
  relevance_score REAL DEFAULT 1.0,  -- decays if unused; boosted on re-use
  access_count INTEGER DEFAULT 0,
  source_task_id TEXT,               -- which task produced this memory
  created_at TEXT NOT NULL,
  last_used_at TEXT
);
-- Key design: client_id filter applied BEFORE relevance scoring.
-- Vue.js patterns for Client A never appear in Client B queries.
-- Global memories (client_id IS NULL) apply to all tasks regardless of client.
```

#### knowledge_base — Phase 9
```sql
CREATE TABLE knowledge_base (
  id TEXT PRIMARY KEY,
  source_agent_id TEXT,              -- which agent wrote this entry
  client_id TEXT,                    -- scoped same as agent_memories
  domain_tags TEXT,                  -- JSON array
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
-- Shared across agents. Scout writes codebase analysis here.
-- All agents can read entries relevant to their current task's scope.
```

#### ideas — Phase 14B
```sql
CREATE TABLE ideas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  what TEXT,                         -- specific change or action proposed
  why TEXT,                          -- benefit or problem solved
  risks TEXT,                        -- tradeoffs, gotchas, implementation concerns
  effort TEXT,                       -- 'S' | 'M' | 'L' | 'XL'
  phase TEXT,                        -- roadmap phase it belongs to
  source_agent TEXT,                 -- which agent proposed it
  status TEXT DEFAULT 'pending',     -- pending | approved | denied | pinned
  deny_reason TEXT,
  task_id TEXT,                      -- linked Workshop task (set on approval)
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
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
  outcome TEXT,                      -- 'success' | 'partial' | 'failed'
  created_at TEXT NOT NULL
);
```

#### pipelines — Phase 12
```sql
CREATE TABLE pipelines (
  id TEXT PRIMARY KEY,
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
| `chat:*` | `ipc/chat.ts` | handle + send (streaming, agentId in every event) |
| `documents:*` | `ipc/documents.ts` | handle only (documents + journal + intelligence) |
| `clients:*` | `ipc/clients.ts` | handle only (CRUD + getTasks/getDocuments/getActivityLog) |
| `settings:*` | `ipc/settings.ts` | handle only (get/set/pick-wallpaper) |
| `search:global` | `ipc/search.ts` | handle only (unified cross-table search) |
| `window:*` | `main/index.ts` | handle only (minimize/maximize/close — Windows only) |
| `tray:navigate` | `main/tray.ts` → renderer | send only (tray menu → page navigation) |
| `app:open-shortcut-sheet` | `main/index.ts` → renderer | send only (macOS menu trigger) |
| `repo:*` | `ipc/repo.ts` *(Phase 10)* | handle only |
| `shell:*` | `ipc/shell.ts` *(Phase 10)* | handle + send (streaming) |
| `mcp:*` | `ipc/mcp.ts` *(Phase 11)* | handle + send |
| `ideas:*` | `ipc/ideas.ts` *(Phase 14B)* | handle only |
| `scheduler:*` | `ipc/scheduler.ts` *(Phase 16)* | handle only |

### Streaming Pattern

For long-running operations (task execution, chat), the main process streams events back via `win.webContents.send`. Every streaming event includes `agentId` to support parallel broadcast streams without IPC conflicts:

```
ipcMain.on('chat:send', async (_, { agentId, content }) => {
  for await (const chunk of stream) {
    win.webContents.send('chat:chunk', { agentId, chunk })   // ← agentId always present
  }
  win.webContents.send('chat:done', { agentId, message })
})
```

**Critical rules:**
- All IPC listeners for a page must be owned by that page's **top-level component** and removed on unmount — never inside child components (Workshop lesson: duplicated listener bug)
- All API keys and secrets live in the **main process only** — never passed to the renderer
- Streaming events always carry `agentId` — broadcast mode relies on this for routing

---

## Agent Architecture

### Lyra — Plan Mode Orchestrator

Lyra is the strategic brain and the only agent with an explicit dual-mode identity:

**Execution Mode** (default): Runs tasks autonomously, delegates to specialists, logs steps with `[Step N]` markers, summarizes outcomes.

**Strategy / Plan Mode**: Thinks before acting. Every proposal is structured with exactly five fields:
1. **What** — the specific change or action
2. **Why** — the benefit or problem it solves
3. **Risks / Gotchas** — tradeoffs, what could go wrong
4. **Effort** — S / M / L / XL
5. **Approval gate** — explicit statement that nothing happens until confirmed

Lyra also generates the Ideas page proposals (Phase 14B) — she reads `roadmap.md`, `architecture.md`, and usage telemetry, then produces structured proposals in this exact format.

### Default Agent Roster

| Agent | ID | Mode | Specialization |
|---|---|---|---|
| **Lyra** | `agent-lyra` | Execution + Strategy/Plan | Orchestration, planning, self-evolution proposals |
| **Nova** | `agent-nova` | Execution | General intelligence, research, synthesis |
| **Scout** | `agent-scout` | Execution | Codebase analysis, architecture mapping, technical intelligence |
| **Forge** | `agent-forge` | Execution | Backend engineering, APIs, DB schemas |
| **Pixel** | `agent-pixel` | Execution | Frontend engineering, UI, design fidelity |
| **Sentinel** | `agent-sentinel` | Execution | QA, security auditing, testing |
| **Courier** | `agent-courier` | Execution | PRs, changelogs, release management |

### Agent Context Construction (progressive enrichment)

When an agent executes a task or responds in Chat, its context is built in layers:

```
Layer 1 — Static Identity (live now)
  ├── system_directive (rich persona instruction from DB)
  └── operational_role (responsibility description)

Layer 2 — Accumulated Intelligence (Phase 9)
  ├── agent_memories WHERE agent_id = X AND (client_id = task.client_id OR client_id IS NULL)
  │   → sorted by relevance_score × recency × access_count
  │   → top N entries only (configurable token budget, default 2,000 tokens)
  ├── knowledge_base entries (tag-matched to current task domain)
  └── Prompt intelligence suggestions (if enabled)

Layer 3 — Live System State
  ├── Active task count + recent activity (already injected via runner.ts context)
  ├── Agent status (who's busy)
  └── @-mentioned file/agent content (Phase 8 — @-mention syntax)

Layer 4 — External Context (Phase 10-11)
  ├── Repo file contents (if file attached or @-mentioned)
  ├── MCP tool definitions available to this agent
  └── Pipeline context (output from previous step, Phase 12)

Layer 5 — Self-Knowledge (Phase 14B — Lyra only)
  ├── roadmap.md (current phase status, pinned ideas)
  ├── architecture.md (this file — system structure, data model)
  └── Usage telemetry (most-used agents, common failures, cost patterns)
```

**Key principle:** Client-scoped memory isolation means agent skills never bleed between clients. A frontend agent can be a Vue 3 expert for Client A and a React/Tailwind expert for Client B, with zero cross-contamination — the `client_id` filter is applied before any scoring.

---

## Multi-Provider LLM Engine (Phase 15)

**Priority: OpenRouter as the default gateway** (pinned user decision).

OpenRouter provides access to 100+ models through a single API key, including free models, making it the recommended first-setup path — zero cost day one.

### Provider Abstraction

```
Agent runner / Chat handler
    ↓ reads agent.provider + agent.model (falls back to global default)
Provider Router (src/main/providers/index.ts)
    ↓ dispatches to correct provider client
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│Anthropic │ OpenAI   │ Google   │  Groq    │ Ollama   │OpenRouter│
│(current) │ GPT-4o   │ Gemini   │ Llama 3  │ (local)  │(gateway) │
│          │ o3/o4    │ Flash    │ (free)   │ (free)   │100+models│
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
    ↓ unified interface: AsyncIterable<{chunk, done, error, usage}>
Activity log / Chat / Cost tracker
```

All providers implement `LLMProvider`:
```typescript
interface LLMProvider {
  id: string
  stream(params: StreamParams): AsyncIterable<StreamEvent>
  listModels(): Promise<Model[]>
  supportsVision: boolean
  supportsTools: boolean
  calculateCost(usage: TokenUsage): number
}
```

**Recommended routing strategy:**
- Lyra (orchestration) → Claude Sonnet 4 (Anthropic)
- Scout (codebase analysis) → Gemini Flash free tier (cheap, long context)
- Memory extraction passes → Groq Llama 3 (free, 500+ tok/sec)
- Background tasks → Ollama local (free, private, no data leaves machine)

---

## Cross-Platform Support

### macOS
- `titleBarStyle: 'hiddenInset'` with custom `trafficLightPosition`
- `vibrancy: 'under-window'` for native OS-level sidebar blur
- Standard macOS menu bar (Conductr / File / Edit / View / Window / Help)
- System tray launcher with quick navigation

### Windows
- `titleBarStyle: 'hidden'` — no native traffic lights
- Custom `WindowControls` component (min/max/close buttons via IPC)
- CSS `backdrop-filter: blur(24px) saturate(1.2)` replicates glass effect
- `WebkitAppRegion: 'drag'` on sidebar, `'no-drag'` on interactive elements
- `pathToFileURL(path).href` for file:// URLs (handles Windows drive letters)
- NSIS installer via electron-builder

---

## Design System

### Visual Language: Apple Liquid Glass

Every surface uses a layered glass approach:
- **Background** (Layer 1): `#08080d` deep space base
- **Accent blobs** (Layer 2): Three radial gradients using the current accent color (configurable, default `#8b7cf8` indigo). Updates live when user changes accent in Settings.
- **Wallpaper** (Layer 3): Optional image at user-controlled brightness
- **Dark overlay** (Layer 4): `rgba(8, 12, 32, 0.55)` — ensures glass panels remain legible over any wallpaper

**Glass card**: `background: rgba(6, 8, 22, 0.74)` + `backdrop-filter: blur(48px) saturate(1.1)` + `border: 1px solid rgba(255,255,255,0.07)` + `border-top: 1px solid rgba(255,255,255,0.11)` + `box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.60)`

### Tokens

| Token | Value |
|---|---|
| Background | `#080c20` |
| Card background | `rgba(6, 8, 22, 0.74)` |
| Border | `rgba(255,255,255,0.07)` |
| Border top highlight | `rgba(255,255,255,0.11)` |
| Accent (default) | `#8b7cf8` (indigo — live-updates from Settings) |
| Green | `#34d399` |
| Violet | `#a78bfa` |
| Cyan | `#22d3ee` |
| Text primary | `#f1f5f9` |
| Text muted | `#64748b` |
| Font | Inter Variable (self-hosted) |
| Sidebar width | 248px |
| Card radius | 14px |
| Icon syntax | `<i className="fa-solid fa-xxx" />` — never FA React components |

### Agent Avatars
- Default agents: `.webp` files in `src/renderer/public/` — `./agent-lyra.webp` etc.
- Shape: **rounded rectangle** (rounded-xl/2xl) — NOT circles
- Fallback for custom agents: emoji character

### CSS Architecture
- Tailwind 4 **CSS-first config**: no `tailwind.config.js` — all tokens in `@theme {}` block in `index.css`
- Plugin: `@tailwindcss/vite` in `electron.vite.config.ts`
- Glass utilities in `@layer components` in `index.css`

---

## Environment Variables

```env
ANTHROPIC_API_KEY=...              # Required for current AI features
FONTAWESOME_PACKAGE_TOKEN=...      # Required for FA Pro (optional, free works without)
VITE_SKIP_ONBOARDING=false         # Set 'true' to skip first-run wizard in dev/testing
```

Planned (Phase 15): `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`

---

## Design Principles

### Living Document
Conductr is a living document of itself. It reads `roadmap.md`, `architecture.md`, and its own usage data to propose improvements. Lyra (Strategy Mode) is the primary author of these proposals. Approved ideas become Workshop tasks. Completed tasks check themselves off the roadmap. The app's history is always accessible inside the app.

### Never Switch Away
The app must have feature parity with Claude Desktop (rich rendering), Claude Code (code execution + agentic), Codex (multi-agent automation), and Cursor (live preview + inline edits) — so users never need to open another AI tool.

### Progressive Intelligence
The system genuinely gets smarter the more you use it — through client-scoped agent memories, shared knowledge pools, prompt quality tracking, and codebase self-indexing. Skill isolation ensures a frontend agent can be a Vue 3 expert for one client and a React expert for another, with no cross-contamination.

### Local Sovereignty
All data, memories, API keys, and decision-making stay on the user's machine. No cloud sync required. No vendor can take the data.

### Open-Ended by Design
Conductr is an AI operations layer, not a point solution. The same infrastructure supports code generation, research automation, client intelligence, scheduled monitoring, and workflows that haven't been imagined yet. Every phase makes the platform more capable — no phase is a dead end.

### Token Efficiency First
Every system layer should minimize token consumption:
- Relevance-filtered memory injection (never dump everything)
- Anthropic prompt caching for static system context (~90% cost reduction on cached hits)
- Use cheap/fast models (Groq, Gemini Flash, Haiku) for extraction passes
- Skill consolidation reduces future context size over time
- Pre-task token estimation before spending
