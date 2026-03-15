# Conductr

Autonomous AI orchestration platform. A macOS/Windows desktop app that runs a swarm of specialized AI agents — each with persistent memory, defined skills, and a role in your workflow.

---

## What It Is

Conductr is an Electron app that puts an 11-agent AI team at your desk. Agents run tasks autonomously, remember what they learn, chat with full context, and propose improvements to themselves. Every agent has a defined role, a skill set, and memory that grows with use.

**Core loop:** Create a task → assign an agent → watch it execute step by step → agent extracts learnings → output saved as a document → next task starts smarter.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev

# Type check
npm run typecheck

# Run E2E tests (Playwright)
npm test

# Build production app
npm run build:mac    # macOS DMG
npm run build:win    # Windows NSIS installer
```

### Environment

Create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

Or skip the `.env` and enter your API key in **Settings → API Key** on first launch. The app also supports OpenRouter, OpenAI, Groq, and Ollama — configure providers in **Settings → Providers**.

---

## The Agent Roster

| Agent | Role | Accent | Skills |
|---|---|---|---|
| **Lyra** | Lead Orchestrator | Indigo | Solutions architecture, API design, code review |
| **Nova** | General Intelligence | Violet | Research, docs, data analysis |
| **Scout** | Repository Analyst | Cyan | Technical research, observability, performance |
| **Forge** | Backend Engineer | Orange | Backend, debugging, database, type systems |
| **Pixel** | Frontend Engineer | Pink | UI, UX review, accessibility |
| **Sentinel** | QA & Security | Green | Security audit, code review, QA, incident response |
| **Courier** | Delivery Engineer | Amber | DevOps, CI/CD, release management |
| **Nexus** | Integration Specialist | Sky | API contracts, integrations, migrations *(Phase 14)* |
| **Helm** | DevOps & Infra | Rose | Infrastructure, CI/CD, observability *(Phase 12)* |
| **Atlas** | Project Manager | Purple | Planning, docs, coordination *(Phase 16)* |
| **Ledger** | Financial Intelligence | Gold | Spend analysis, performance, ROI *(Phase 11)* |

Agents marked with a phase number are seeded and visible but become fully active when their phase features ship.

---

## App Structure

```
src/
├── main/                   # Electron main process
│   ├── index.ts            # BrowserWindow, menu, IPC registration
│   ├── db/
│   │   ├── schema.ts       # SQLite init + agent seeding
│   │   ├── agents.ts       # Agent CRUD
│   │   ├── tasks.ts        # Task CRUD + status
│   │   ├── memories.ts     # Agent memory retrieval (RAG)
│   │   ├── agentFiles.ts   # Per-agent file CRUD (SOUL, TOOLS, MEMORY, etc.)
│   │   ├── skillTemplates.ts  # Skill library → agent TOOLS.md + SOUL.md seeds
│   │   ├── settings.ts     # Key-value settings store
│   │   ├── documents.ts    # Documents + activity log
│   │   ├── intelligence.ts # Intelligence insights
│   │   ├── clients.ts      # Client CRUD
│   │   └── journal.ts      # Journal entries
│   └── ipc/
│       ├── tasks.ts        # Task CRUD + streaming runner IPC
│       ├── chat.ts         # Chat streaming (injects agent files + live context)
│       ├── agents.ts       # Agent IPC
│       ├── memories.ts     # Memory IPC + prompt auto-rewrite
│       ├── documents.ts    # Documents + intelligence IPC
│       ├── agentFiles.ts   # Agent files IPC
│       ├── ideas.ts        # Lyra proposals IPC
│       ├── repos.ts        # Connected repo CRUD + file tree/read/write
│       ├── git.ts          # Git status, diff, log, commit, branch
│       ├── github.ts       # GitHub issues + PR management
│       ├── clients.ts      # Clients IPC
│       ├── search.ts       # Global search (FTS5)
│       └── settings.ts     # Settings + API key management
│
├── agents/
│   └── runner.ts           # Task execution engine (injects agent files + memories)
│
├── api/
│   ├── claude.ts           # Anthropic client (direct)
│   ├── router.ts           # Multi-provider router (runWithRouter / routeRequest)
│   └── providers/
│       ├── types.ts        # Shared types (RouteOptions, ModelInfo, etc.)
│       ├── anthropic.ts    # Anthropic provider
│       ├── openrouter.ts   # OpenRouter provider
│       ├── openai-compat.ts # OpenAI / Groq / Ollama (OpenAI-compatible)
│       └── registry.ts     # Provider priority + model selection
│
├── preload/
│   └── index.ts            # contextBridge — exposes window.electronAPI
│
└── renderer/src/
    ├── App.tsx             # Page router + WindowControls
    ├── index.css           # Tailwind 4 @theme tokens + glass utilities
    ├── env.d.ts            # Shared TS types + electronAPI declarations
    ├── store/
    │   └── ui.ts           # Zustand — palette, toasts, notifications, accent, wallpaper
    ├── pages/
    │   ├── Dashboard.tsx
    │   ├── Workshop.tsx    # Task queue — IPC owned here
    │   ├── Agents.tsx      # SWARM OS — Personnel/Protocol/Comms tabs
    │   ├── Chat.tsx        # Per-agent chat + broadcast mode
    │   ├── Blueprint.tsx   # Roadmap phases + Lyra ideas
    │   ├── Metrics.tsx     # API spend + charts
    │   ├── Intelligence.tsx
    │   ├── Documents.tsx
    │   ├── Journal.tsx
    │   ├── Clients.tsx
    │   ├── Providers.tsx   # Multi-provider config
    │   ├── Repos.tsx       # Connected repos + file tree
    │   ├── DevTools.tsx    # Git + GitHub tools
    │   ├── Roadmap.tsx
    │   ├── Memories.tsx
    │   └── Settings.tsx
    └── components/
        ├── Sidebar.tsx
        ├── CommandPalette.tsx  # Cmd+K
        ├── SearchModal.tsx     # Cmd+Shift+F
        ├── Onboarding.tsx      # First-run wizard
        ├── Toast.tsx
        ├── NotificationPanel.tsx
        ├── ShortcutSheet.tsx   # Cmd+/
        ├── GradientBackground.tsx
        └── WindowControls.tsx  # Windows-only title bar
```

---

## How Agent Memory Works

Every task execution builds a layered system prompt:

```
1. Agent system_directive    — core mission and behavior rules
2. Agent Memory & Skills
   ├── SOUL.md               — character core (who they are)
   ├── IDENTITY.md           — project context (editable per client)
   ├── TOOLS.md              — skill methodology (from skill library)
   └── MEMORY.md             — accumulated learnings from past tasks
3. Relevant Past Learnings   — top-8 memories from agent_memories (RAG)
4. Live Context (chat only)  — active task counts, recent completions
```

After each task completes, the runner automatically extracts 3–5 reusable learnings and writes them to `agent_memories`. Over time, agents develop genuine expertise scoped per client — Vue.js patterns learned for Client A never bleed into Client B tasks.

### Agent Files

Each agent has five standard files editable in the Agent Files UI (Agents → Files tab):

| File | Purpose |
|------|---------|
| `SOUL.md` | Core values, beliefs, working style |
| `IDENTITY.md` | Current project/client context — update this per engagement |
| `TOOLS.md` | Skill capabilities (pre-seeded from skill library) |
| `MEMORY.md` | Human-readable summary of accumulated learnings |
| `HEARTBEAT.md` | Runtime state and status |

`IDENTITY.md` is the key customization lever: write the project's stack and conventions here, and the agent adapts automatically. Example:

```markdown
# Identity — Forge
Working on Acme's Next.js 14 monorepo.
Stack: Next.js App Router, Prisma, tRPC, shadcn/ui, Tailwind v3.
Follow the monorepo's ESLint config. Prefer server components in App Router.
All DB queries go through the Prisma client in lib/db.ts — no raw SQL.
```

---

## Multi-Provider Routing

All AI calls go through `src/api/router.ts`. Provider priority (configurable in Settings):

1. **OpenRouter** — recommended default, 100+ models, free tier available
2. **Anthropic** — direct SDK, prompt caching supported
3. **OpenAI** — GPT-4o and variants
4. **Groq** — fast inference
5. **Ollama** — local models, no API key

Per-agent model overrides are supported — assign a cheap model to Courier, Sonnet to Forge, etc.

```typescript
// All AI calls use this — never call providers directly
import { runWithRouter } from '../api/router'
const result = await runWithRouter(systemPrompt, userPrompt, { maxTokens: 4096 })
```

---

## Key Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette |
| `Cmd+Shift+F` | Global search |
| `Cmd+/` | Shortcut cheat sheet |
| `N` | New task (Workshop page) |
| `↑↓` | Navigate sidebar |

---

## Database

SQLite at `~/Library/Application Support/conductr/conductr.db` (macOS).

Key tables: `agents`, `tasks`, `agent_memories`, `agent_files`, `knowledge_base`, `messages`, `documents`, `journal_entries`, `intelligence_insights`, `ideas`, `api_usage`, `clients`, `repos`, `settings`, `prompt_templates`.

FTS5 virtual tables for full-text search: `tasks_fts`, `documents_fts`, `journal_fts`, `messages_fts`, `agents_fts`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 29 |
| Frontend | React 18, Tailwind 4 (CSS-first), Zustand |
| Build | electron-vite, Vite 5 |
| Database | better-sqlite3 (WAL mode, FTS5) |
| AI | Anthropic SDK, OpenRouter, OpenAI-compat |
| Testing | Playwright (E2E, Electron) |
| Icons | Font Awesome 7 (self-hosted webfonts) |
| Charts | Recharts |
| Markdown | react-markdown + remark-gfm + rehype-highlight + rehype-katex |
| Diagrams | Mermaid |
| Git | simple-git + @octokit/rest |

---

## Scripts

```bash
npm run dev              # Start dev (hot reload)
npm run build            # Production build (renderer + main + preload)
npm run build:mac        # Build + package macOS DMG
npm run build:win        # Build + package Windows NSIS installer
npm run typecheck        # TypeScript strict check (no emit)
npm test                 # Build + run Playwright E2E suite
npm run generate-icons   # Regenerate app icons (icns + ico + png)
```

---

## Development Notes

- **IPC pattern:** Streaming events use `ipcMain.on` → `win.webContents.send`. Request/response uses `ipcMain.handle` → `ipcRenderer.invoke`. All listeners live in top-level page components and are cleaned up on unmount.
- **Tailwind 4:** No `tailwind.config.js`. All tokens are in `src/renderer/src/index.css` inside `@theme {}`.
- **Font Awesome:** Use `<i className="fa-solid fa-icon-name" />` — never import FA as React components.
- **Glass cards:** `backdrop-filter: blur(24px) saturate(1.2)` + `rgba` background + inset highlight border.
- **Windows:** Custom title bar (`WindowControls` component), no vibrancy — CSS `backdrop-filter` provides the glass effect instead.
- **Agent avatars:** Rounded rectangles (`rounded-xl`/`rounded-2xl`) — not circles.
