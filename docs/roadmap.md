# 🗺️ Conductr — Roadmap

---

## 📌 Pinned Ideas
> High-priority concepts worth fast-tracking regardless of phase order. These are approved directions, not speculation.

**OpenRouter as the default gateway** *(pinned by user — Phase 15)*
- Make OpenRouter the recommended first-setup path in onboarding: one key, 100+ models, includes free options, no commitment
- Default global model: `meta-llama/llama-3.1-8b-instruct:free` via OpenRouter (free, capable, zero cost on day one)
- Users upgrade to paid models per-agent as needed — reduces barrier to first meaningful use to zero
- Surface OpenRouter's live model catalog in Settings so users can browse and assign models without leaving the app

**App Self-Evolution / Ideas page** *(pinned by user — Phase 14B)*
- Conductr should study itself — read its own roadmap, architecture docs, and usage patterns, then propose enhancements
- Every suggestion surfaced with: benefits, risks, gotchas, effort estimate, and which phase it belongs to
- User approves → task created in Workshop automatically; user denies → archived with reason; user pins → stays visible
- Lyra is the primary author of these proposals (as Plan Mode Orchestrator — see Phase 3B)

---

## Phase 0 — Project Setup ✅
> Get the skeleton running locally as a Mac app

- [x] Initialize Electron + React project
- [x] Set up Tailwind CSS with dark theme tokens (Tailwind 4 CSS-first `@theme`)
- [x] Configure electron-builder for macOS packaging
- [x] Set up local SQLite database (better-sqlite3, WAL mode)
- [x] Create `.env` config for API keys
- [x] Establish folder structure per ARCHITECTURE.md
- [x] Basic window chrome — sidebar nav, top bar, content area
- [x] Hot reload dev environment working
- [x] Font Awesome Free (self-hosted webfonts, `<i>` class syntax)
- [x] Apple Glass UI (vibrancy + backdrop-blur + rgba panels)
- [x] Playwright E2E test harness (Electron via `_electron.launch()`)
- [x] Rename app to **Conductr**, lead agent to **Lyra**

---

## Phase 1 — Dashboard ✅
> The home screen — bird's eye view of everything

- [x] Left sidebar with navigation links (flush, glass, FA icons)
- [x] Top header with app title + status indicator (green glass pill)
- [x] Status cards row (Queued, Active, Completed, Spend, 7-Day, Tokens)
- [x] Live Activity feed widget (polling local DB)
- [x] Recent Documents widget
- [x] Quick Links widget (navigates to pages)
- [x] Responsive card grid layout (flex, fills viewport)
- [x] Empty states for all widgets (icon + label)
- [x] Inter Variable font (self-hosted, cross-platform)

---

## Phase 2 — Workshop / Task Queue ✅
> The engine room — queue and run autonomous tasks

- [x] Task list view with Queued / Active / Complete tabs
- [x] Task cards with: title, description, tags, progress %, Start button
- [x] Task detail modal/panel (description, dates, activity log)
- [x] Create new task form (title, description, tags, assign agent)
- [x] Task status management (queued → active → complete)
- [x] Claude API integration for task execution (streaming, cost tracking)
- [x] Progress logging to SQLite
- [x] Real-time live feed (IPC streaming to activity log in modal, progress on cards)
- [x] Glass design system applied to Workshop page
- [x] Board view — Kanban columns (Queued / Active / Complete / Failed) with compact cards + view toggle (List | Board) in header
- [ ] Task templates — save a task configuration (title, description, tags, agent) for reuse
- [ ] Task duplication — right-click duplicate a task card with all settings
- [ ] Batch operations — select multiple tasks to bulk-assign, bulk-delete, or bulk-start

---

## Phase 3 — Agents ✅
> Define and manage AI personas

- [x] Agent list view with avatar, name, role
- [x] Agent detail panel (system directives, operational role, activity history)
- [x] Create / edit agent form
- [x] Assign agents to tasks in Workshop
- [x] Agent activity history
- [x] **Lyra** default agent pre-configured (orchestrator)
- [x] All 7 default agents seeded (Nova, Scout, Forge, Pixel, Sentinel, Courier) via `INSERT OR IGNORE`
- [x] Glass design system applied to Agents page
- [x] SVG avatars for all 7 default agents (self-hosted in `src/renderer/src/assets/agents/`)

---

## Phase 3B — SWARM OS: Agents Page Redesign
> Transform the Agents page into a full "SWARM OS" control center matching the reference video. Three-tab layout replacing the current flat list.

**Lyra — Plan Mode Orchestrator (formalized here):**
Lyra is not just a chat agent — she is the strategic brain of Conductr. She operates in two explicit modes:
- **Execution Mode** (default): Runs tasks, orchestrates specialist agents, streams output to Workshop
- **Strategy / Plan Mode**: Proposes plans, feature ideas, and task decompositions WITHOUT executing. Presents structured proposals awaiting your approval. This is analogous to Claude Code's plan mode — Lyra thinks first, acts only with a green light.

When Lyra operates in Strategy Mode she always outputs:
1. **What** she proposes to do
2. **Why** — the benefit/goal
3. **Risks or gotchas** — what could go wrong or what to watch out for
4. **Effort estimate** — rough token/time cost
5. **Approval gate** — task is not created until explicitly confirmed

Lyra also generates the self-evolution proposals on the Ideas page (Phase 14B) — she reads the roadmap, architecture docs, and usage patterns and drafts enhancement proposals in exactly this structured format.

**SWARM OS header + tab structure:**
- [ ] "SWARM OS" branding pill at top of Agents page with 3 tabs: **Personnel** | **Protocol** | **Comms**

**Full agent roster — all 11 seeded in DB (7 active now, 4 activate with their phase):**

| Agent | Role | Color | Avatar | Phase |
|---|---|---|---|---|
| **Lyra** | Lead Intelligence Orchestrator | `#818cf8` indigo | ✦ | Active |
| **Nova** | General-Purpose Intelligence | `#a78bfa` violet | ⚡ | Active |
| **Scout** | Repository & Codebase Analyst | `#22d3ee` cyan | 🔍 | Active |
| **Forge** | Senior Backend Engineer | `#f97316` orange | ⚙️ | Active |
| **Pixel** | Senior Frontend Engineer | `#ec4899` pink | 🎨 | Active |
| **Sentinel** | QA & Security Engineer | `#34d399` green | 🛡️ | Active |
| **Courier** | Delivery & Release Engineer | `#fbbf24` amber | 📦 | Active |
| **Nexus** | Integration & Data Intelligence | `#0ea5e9` sky | 🌐 | Phase 11 |
| **Helm** | DevOps & Infrastructure | `#f43f5e` rose | 🧭 | Phase 10/11 |
| **Atlas** | Project Manager & Ops Coordinator | `#9333ea` purple | 📋 | Phase 12 |
| **Ledger** | Financial Intelligence & Cost Optimization | `#eab308` gold | ⚖️ | Phase 4 ext. |

**Personnel tab:**
- [ ] Left panel: "Intelligence Roster" — scrollable agent list with app-style icon, name, role label, online/idle/offline status dot
- [ ] Right panel: full agent profile card when agent selected:
  - Large dark app-style icon (80px, rounded-2xl, dark bg) using each agent's avatar symbol
  - Big agent name (40px+, bold)
  - Role badge pill (e.g. "Lead Intelligence Orchestrator" in accent color)
  - Online/Offline status badge (green/amber pill, top right)
  - Tagline pulled from `operational_role` field
  - **Mission Directives** section — agent's `system_directive` (first paragraph)
  - **Operational Bio** section — full `operational_role` description + responsibilities
  - **Active Task** side panel — current task name, progress %, subtask checklist

**Protocol tab:**
- [ ] **Organizational Chart** — visual hierarchy tree:
  - CEO/Leader card at top (amber/orange, user's name + company — pulled from Settings)
  - Lead Intelligence Orchestrator below (indigo card, **Lyra**)
  - Specialist grid below Lyra (show active agents in full color, phase-locked agents dimmed/badge):
    - Row 1 (Core): Nova (violet) · Scout (cyan) · Forge (orange) · Pixel (pink) · Sentinel (green) · Courier (amber)
    - Row 2 (Expansion): Nexus (sky, Phase 11 badge) · Helm (rose, Phase 11 badge) · Atlas (purple, Phase 12 badge) · Ledger (gold, Phase 4 ext. badge)
  - Each card: role label (small caps), agent name, short tagline, status dot
- [ ] **Budget Framework** section below org chart:
  - Daily Budget display (shared pool amount — pulled from settings `budget_daily`)
  - Lyra auto-approves tasks under threshold · User approves above threshold
  - Overrun Threshold → auto-pause & escalate rule
- [ ] **Agent Routing** section:
  - Default agent for Chat (configurable, default: Lyra)
  - Switch command syntax: `/agent <agent-name>` in Chat
  - Available agents listed with colored names and role labels
- [ ] **Agent Creation Protocol** document section:
  - Core Philosophy rules (colored section headers)
  - Required Agent Components (SOUL.md, TOOLS.md, MEMORY.md, IDENTITY.md, HEARTBEAT.md)
  - Training Process steps
  - Anti-Patterns to Avoid

**Comms tab (Intelligence Channels):**
- [ ] Left panel: "Intelligence Channels" — two sections:
  - **Group Hubs** — broadcast channels (all agents, or custom subsets)
  - **Direct** — one-per-agent: Lyra · Nova · Scout · Forge · Pixel · Sentinel · Courier · Nexus · Helm · Atlas · Ledger (each with role subtitle; phase-locked agents shown dimmed)
- [ ] Right panel: active channel chat area with message input at bottom
- [ ] Clicking a Direct channel opens that agent's persistent chat thread (reuses Chat page IPC)
- [ ] "Secured Link" badge on Direct channels
- [ ] This replaces the current Chat page's flat dropdown — same IPC, new layout

**Agent files system (per-agent):**
- [ ] Files tab on agent detail: list of agent definition files with size + last-modified
  - SOUL.md, TOOLS.md, MEMORY.md, IDENTITY.md, HEARTBEAT.md, BOOTSTRAP.md
- [ ] Click file to view/edit in an inline markdown editor
- [ ] New agent creation generates file scaffolds from templates
- [ ] Files stored in SQLite as key-value or as `agent_files` table

---

## Phase 4 — API Metrics ✅
> Real-time financial and token intelligence

- [x] Today's spend card
- [x] 7-day billing trend chart (Recharts BarChart)
- [x] Per-agent token usage breakdown
- [x] Per-task cost tracking (SQLite api_usage table)
- [x] Budget alerts / thresholds (inline-editable daily/monthly limits, color-coded progress bars, exceeded banner)
- [x] Monthly spend tracking (settings key/value store, `budget_daily` + `budget_monthly`)
- [x] Agent spend breakdown (30-day proportional bars per agent)
- [x] Glass design system applied to Metrics page
- [ ] Provider-level cost breakdown (Phase 15 integration — show spend per LLM provider)
- [ ] **Ledger agent activation** — once Metrics data is rich enough, Ledger's cost optimization reports become genuinely useful; wire `agent-ledger` to read from `api_usage` and `settings` budget keys

---

## Phase 5 — Intelligence & Documents ✅
> Knowledge base and AI-generated insights

- [x] Documents list with search and tagging
- [x] Auto-save: agents auto-generate documents from completed task output
- [x] Weekly Recaps — auto-generated summaries of tasks, costs, agent performance
- [x] Intelligence feed — AI-synthesized patterns and insights across all activity
- [x] Journal — session log with decisions, rationale, and timestamps
- [x] File linking to tasks and agents
- [x] Search across all documents and activity logs

---

## Phase 6 — Clients ✅
> Client-specific project tracking

- [x] Client list view
- [x] Client detail page (projects, tasks, documents)
- [x] Link tasks and agents to specific clients
- [x] Client intelligence panel (per-client knowledge, activity, insights)

---

## Phase 7 — Polish, Power User & Distribution
> Make it feel like a real Mac app that power users never want to leave

**Desktop polish:**
- [x] macOS menu bar integration (standard File/Edit/View/Window/Help menu + Keyboard Shortcuts item)
- [x] System tray / menu bar launcher — quick task status + navigation (Dashboard / Workshop / Chat) without opening full app
- [x] App icon + branding — conductor-wave logo rendered at 1024×1024 via pure-Node PNG generator; packaged as `.icns` (macOS) + `.ico` (Windows, 16/32/48/256); `npm run generate-icons`
- [ ] Electron auto-updater
- [ ] `.dmg` build for distribution
- [x] Onboarding wizard — first-run setup (API key entry, guided tour, agent roster with Lyra-as-commander hierarchy)
- [x] Electron vibrancy — true OS-level blur for sidebar (`vibrancy: 'under-window'`)

**Command palette (Cmd+K):**
- [x] Quick task creation ("create task: build auth module")
- [x] Quick agent switch ("talk to Forge")
- [x] Quick navigation (jump to any page)
- [x] Quick search (search tasks, agents, memories, documents, chat)
- [x] Quick actions — Open Settings, New Task, View Keyboard Shortcuts (action kind in palette with direct callbacks)

**Global search:**
- [x] Unified search across tasks, agents, documents, journal entries, chat messages (`search:global` IPC + `SearchModal`)
- [x] Search results grouped by category with inline previews, keyboard nav (↑↓ Enter Esc)
- [x] Cmd+Shift+F shortcut + sidebar search button
- [ ] Fuzzy matching + relevance ranking (currently LIKE-based, upgrade to FTS5 in Phase 9)

**Keyboard shortcuts:**
- [x] Full keyboard navigation (Tab through sidebar, ArrowUp/ArrowDown between nav items)
- [x] Per-page shortcuts (Workshop: N for new task)
- [ ] Customizable keybindings (stored in settings)
- [x] Shortcut cheat sheet overlay (Cmd+/)

**Notification center:**
- [x] In-app toast notifications (bottom-right glass toasts)
- [x] Notification center panel (bell icon in sidebar footer, slide-out panel)
- [x] macOS native notifications — OS-level toast on task complete (chime) and task failed (silent) via `Notification.isSupported()` guard in `tasks:start` handler
- [x] Configurable per-event: task complete, task failed, budget alert (toggle switches in Settings)
- [x] Notification modes: always / background only / never (segmented control in Settings; main process checks `notif_mode` + per-event keys before sending OS notification)

**Appearance:**
- [x] Accent color picker (indigo default, selectable palette)
- [x] Compact vs comfortable density toggle
- [x] Wallpaper selector — choose from built-in options or upload one custom image (single slot, replaces previous; default: `wallpaper.png`)
- [x] Wallpaper brightness slider — user-controlled opacity + overlay darkness (stored in settings, live preview)

**Cross-platform & Distribution:**
- [x] Windows support — custom title-bar controls (min / max / close), NSIS installer via electron-builder, Mac-like glass aesthetic preserved via CSS `backdrop-filter`
- [ ] macOS `.dmg` build for distribution
- [ ] Windows NSIS installer build
- [x] App icon — `.icns` (macOS) + `.ico` (Windows) — generated by `scripts/generate-icons.mjs`
- [ ] Electron auto-updater (Squirrel.Mac + NSIS delta updates)

---

## Phase 8 — Chat Interface 🔄
> Talk to any agent with full system context — the primary way to interact with the system. The goal is feature parity with Claude Desktop / ChatGPT so users never switch away.

**Done:**
- [x] Persistent chat panel accessible from sidebar nav
- [x] Agent switcher — select which agent you're talking to (any of the 7 defaults or custom)
- [x] Each agent responds with its own system directive loaded automatically
- [x] Full conversation history stored in SQLite (`messages` table), restored across sessions
- [x] Streaming responses with typewriter effect (IPC streaming, same pattern as Workshop)

**Rich rendering (critical — plain text is the #1 reason to switch back to Claude Desktop):**
- [x] Markdown rendering — headers, bold, italic, lists, blockquotes, tables (`react-markdown` + `remark-gfm`)
- [x] Syntax-highlighted code blocks with language label + copy button (`rehype-highlight` / highlight.js github-dark-dimmed theme)
- [x] Inline code spans with monospace styling (violet tint, glass background)
- [x] Context meter — token count + capacity bar in chat header
- [x] Links open in external browser (Electron shell)
- [ ] Diff rendering — inline + side-by-side for code changes (Phase 10 integration)
- [x] Mermaid diagram rendering (flowcharts, sequence diagrams from agent output)
- [ ] LaTeX math rendering (optional, for research tasks)
- [ ] Link previews (clickable URLs with title/favicon)

**Per-message actions:**
- [x] Copy button — hover-reveal copy button on every message bubble (clipboard, green check feedback)
- [x] Export conversation as markdown (full thread, Blob download, timestamped filename)
- [x] Save conversation as Document — persists to Documents page (`doc_type: 'recap'`) + toast confirmation

**Multimodal input:**
- [ ] Image/screenshot paste (Cmd+V) → sent to Claude vision API for analysis
- [ ] Drag-and-drop images into chat
- [ ] Screenshot capture button (Electron `desktopCapturer`) → paste into thread
- [ ] File drag-and-drop — attach code files, PDFs, documents inline
- [ ] Image preview thumbnails in message thread

**Action awareness (chat → system actions):**
- [ ] Phrases like "queue that as a task" or "start the Jira workflow for MC-42" trigger confirmation chips
- [ ] User confirms → system action executes in background
- [ ] Result echoed back as system message in thread
- [ ] "Run this" on code blocks → execute in terminal (Phase 10 integration)
- [x] "Save this as a document" → create document from message content

**Context intelligence:**
- [x] Context window indicator — token count per message, remaining capacity bar
- [x] Auto-enriched system prompt: active task count, recent activity, agent status
- [ ] @-mention syntax: `@Scout` to pull in another agent's knowledge, `@file:auth.ts` to inject file content
- [ ] Context budget visualization — see exactly what's filling the context window

**Conversation management:**
- [ ] Search across all conversation threads (per-agent + global)
- [x] Export conversation as markdown (full thread or selection)
- [ ] Conversation branching — fork at any message (create alternate thread from that point)
- [ ] Message bookmarks / pinning (star important messages for quick reference)
- [ ] Message annotations — add notes to any message

**Broadcast mode:**
- [x] Fan a single message to all agents simultaneously (parallel IPC send, responses stream in concurrently)
- [x] Multi-column response view (one column per agent, 280px glass card, streaming + done states)
- [x] Agent chip selector — toggle individual agents in/out of the broadcast before sending
- [x] Select best response and continue that thread ("Continue with {Agent}" button per column)
- [ ] Compare responses side-by-side (diff/highlight key differences — Phase 15)

**Code execution in chat (Phase 10 integration):**
- [ ] "Run" button on code blocks → execute in connected repo's terminal
- [ ] Output displayed inline below the code block
- [ ] Iterative fix loop: agent sees error output, proposes fix, user approves, re-runs

---

## Phase 9 — Agent Memory & Learning System
> Agents that get smarter with every task they complete — with isolated skill scopes per client and domain

This is the core intelligence layer. Without persistent memory, agents start from scratch every task. With it, Conductr becomes a genuinely learning system — the longer you use it, the more capable it gets.

**Memory schema — scoped from the start:**
- [ ] `agent_memories` table with columns: `id`, `agent_id`, `client_id` (nullable), `domain_tags` (JSON array), `skill_tags` (JSON array), `content`, `relevance_score`, `created_at`, `last_used_at`
- [ ] Memories are scoped at write time — every extracted insight is tagged with the active `client_id` and domain (e.g. `["vue", "composition-api"]` or `["react", "tailwind"]`)
- [ ] Skill isolation: Vue.js patterns learned for Client A are never injected into a Client B task — `client_id` filter is applied before relevance scoring
- [ ] Global memories (no `client_id`) contain agent-wide expertise that applies across all clients (e.g. "always prefer named exports", "never mutate props")

**Adaptive context injection (RAG-based, not flat file dumps):**
- [ ] On task start: query `agent_memories` filtered by `agent_id` + `client_id` (if set) + ranked by tag overlap with the task's own tags and description
- [ ] Only inject the top-N highest-scoring memories — configurable memory budget (e.g. 2,000 tokens max for injected context)
- [ ] Memory score = `relevance_to_task × recency_weight × usage_frequency` — older or less-used skills rank lower
- [ ] Result: an agent can be a Vue 3 expert for Client A and a React/Tailwind expert for Client B in the same session, with zero bleed between them

**Post-task learning extraction:**
- [ ] After every task completes, the runner sends the activity log to a lightweight extraction pass
- [ ] Extractor distills: key patterns discovered, mistakes made, approaches that worked, tool/library specifics
- [ ] Each extracted memory is saved with the task's `client_id` and auto-tagged by domain (detected from task content)
- [ ] Agent's `MEMORY.md` file (in Agent Files tab) becomes a **human-readable summary** of the top global memories — the real source of truth is the DB

**Skill hardening — daily review job:**
- [ ] "Skill Building" scheduled task (runs daily or on demand) — consolidates fragmented memories into hardened skill entries
- [ ] Example: 10 separate Vue.js observations → synthesized into a single "Vue 3 Composition API expert profile" memory with high relevance score
- [ ] Skills are promoted from `client_id`-scoped to global when the same pattern appears across ≥3 different clients (universal best practices)
- [ ] Skill level indicators per domain: Novice → Practitioner → Expert → Master (based on memory count + task success rate)
- [ ] Agent experience tracking — task count per domain, clients served, active skill areas

**Cross-agent knowledge pool:**
- [ ] `knowledge_base` table — shared learnings readable by all agents (specialist agents write, all agents read)
- [ ] Scout's codebase analysis available to Forge/Pixel without re-analyzing — scoped to the repo/client it analyzed
- [ ] Sentinel's test failure patterns available to code-writing agents for that client's repo
- [ ] Knowledge entries have `source_agent_id`, `client_id`, and `domain_tags` — same scoping model as memories

**Memory UI:**
- [ ] Memory viewer in Agent detail page — see what an agent has learned, filterable by client and domain
- [ ] Skill map visualization — bubble chart of agent expertise by domain and depth
- [ ] Delete individual memories or bulk-clear by client, by domain, or all
- [ ] Memory timeline — visual history of learning events with task linkback
- [ ] "Inject preview" — before running a task, show exactly which memories will be injected and why

**Prompt intelligence:**
- [ ] Post-prompt analysis — after each user prompt, rate quality and identify improvement opportunities
- [ ] Prompt improvement suggestions — "Your prompt was vague about scope. Next time try: ..."
- [ ] Prompt templates library — save and reuse effective prompts (per domain/agent/client)
- [ ] Prompt history with outcome tracking — which prompts led to successful tasks vs failed ones
- [ ] Auto-rewrite suggestions — before sending, offer a polished version of the user's prompt
- [ ] Prompt scoring dashboard — track prompt quality improvement over time

**Token efficiency (built into every layer):**
- [ ] **Anthropic Prompt Caching** — apply `cache_control: ephemeral` to static system context (SOUL.md, IDENTITY.md, TOOLS.md, global memories) — these rarely change and cost ~90% less to re-read on cached hits
- [ ] **Adaptive context budget** — configurable max tokens for injected memories per task (default 2,000); prevent runaway context bloat
- [ ] **Relevance-filtered injection** — never dump all memories; score and rank, inject only what's relevant to the current task
- [ ] **Cross-agent result caching** — if Scout already analyzed this repo this session, Forge reads the cached result instead of re-running
- [ ] **Per-agent model routing** (Phase 15 prerequisite) — use Haiku for memory extraction passes (cheap, fast), Sonnet/Opus for actual task execution
- [ ] **Skill consolidation reduces future cost** — the daily Skill Building job merges 10 memory entries into 1 dense entry → less context used per task over time
- [ ] **Pre-task token estimation** — before queuing, estimate memory + system + task tokens so user can approve before spending

---

## Phase 10 — Developer Tools (Repo + Terminal)
> Real code execution — agents that actually read, write, and ship code. Matches Claude Code and Codex capabilities.

**Repo connection:**
- [ ] Local repo browser — connect Conductr to one or more local repos (folder picker in Settings)
- [ ] File tree viewer — expandable directory tree in Workshop task detail
- [ ] Read file contents into agent context (Scout can see your actual codebase)

**Code writing:**
- [ ] File write-back — Forge/Pixel write code changes directly to disk after user approval
- [ ] Diff viewer — side-by-side + inline diff with per-hunk accept/reject controls
- [ ] Multi-file change sets — review all proposed changes before committing any

**Terminal/shell execution:**
- [ ] Embedded terminal panel (Workshop + Chat) — agents can run npm, jest, eslint, build commands
- [ ] Output streamed to activity log in real time
- [ ] Hard limits: configurable max execution time, allowed command list
- [ ] Iterative error fixing — agent sees test failure, proposes fix, runs again (like Claude Code)

**Git operations (via `simple-git`):**
- [ ] Branch creation: `conductr/task-{id}-{slug}`
- [ ] Auto-commit with generated message from task context
- [ ] Status, diff, push, log — all exposed via IPC
- [ ] Branch cleanup after merge

**GitHub/GitLab integration:**
- [ ] OAuth token in Settings (encrypted storage)
- [ ] Read issues → import as Workshop tasks (one click)
- [ ] Create PRs with title, body (activity log summary), linked issue
- [ ] Fetch PR status, review comments
- [ ] Auto-respond to PR review comments via agent

**Jira integration:**
- [ ] OAuth connection in Settings with project/board selector
- [ ] Webhook for auto-ingestion of new tickets as tasks
- [ ] Jira ticket metadata (ID, title, acceptance criteria) stored in task
- [ ] `[JIRA-42]` prefix on PR titles and commit messages

**Live preview (like Claude Code's Chrome integration + Cursor's Visual Editor):**
- [ ] Embedded webview (Electron BrowserView) showing localhost dev server
- [ ] Auto-refresh on file changes (file watcher integration)
- [ ] Screenshot capture from preview → feed back to agent for visual feedback loop
- [ ] Point-and-click: click an element in preview → describe what to change in Chat

**Codebase intelligence:**
- [ ] Repo indexing — Scout auto-builds architecture wiki from codebase (like Devin)
- [ ] Stored as agent memory + document (searchable from Chat)
- [ ] Auto-refreshes on significant file changes
- [ ] Codebase-aware Chat — agents reference actual files when answering

---

## Phase 11 — MCP Tool Integration
> Give agents superpowers via the Model Context Protocol

MCP (Model Context Protocol) lets agents call external tools — browser control, web search, database access, custom APIs, and anything else wrapped in a server.

- [ ] MCP server connection manager — connect/disconnect named MCP servers from Settings
- [ ] Built-in MCP servers: `filesystem`, `git`, `fetch` (web browsing), `sqlite`
- [ ] Agent tool assignment — configure which agents get access to which tools (least-privilege)
- [ ] Tool call results streamed to activity log in real time
- [ ] Tool approval flow — optional confirmation before agents execute destructive tools
- [ ] Tool usage tracking in `api_usage` table (tool calls count toward spend tracking)
- [ ] Custom MCP server scaffolding — in-app guide for wrapping internal APIs as MCP servers
- [ ] Community MCP server registry — browse and install third-party servers (Slack, Notion, Linear, Figma, etc.)
- [ ] MCP Apps — render interactive tool results inline in Chat (like Cursor's MCP Apps)
- [ ] **Nexus agent activation** — connect Nexus to the MCP filesystem + fetch servers; give Nexus access to external service MCP servers (Slack, Gmail, Calendar, Jira) as they're configured
- [ ] **Helm agent activation** — give Helm terminal access (Phase 10 infrastructure) and repo write-back; Helm should be able to write CI/CD configs and Dockerfiles directly to disk

---

## Phase 12 — Multi-Agent Pipelines & Swarms
> Lyra as true orchestrator — parallel and sequential agent swarms. Matches Codex and Devin multi-agent capabilities.

**Subtask system:**
- [ ] Parent task can spawn and track child tasks with dependencies
- [ ] Lyra auto-decomposes a high-level objective into subtasks with specialist agents
- [ ] Sequential + parallel execution modes (configure per-subtask)
- [ ] Cross-agent handoff — output of one agent's subtask becomes input context for the next

**Pipeline UI:**
- [ ] Pipeline builder UI — visual step editor with drag-and-drop agent assignment
- [ ] Pipeline templates — save and reuse common multi-step workflows
- [ ] Pipeline status visualization — DAG/step timeline with live status per agent
- [ ] Pipeline cost tracking — aggregate token/cost across all subtasks

**Agent-to-agent communication:**
- [ ] Agent-to-agent messaging — Scout can message Forge mid-pipeline without going through the user
- [ ] Lyra as router — determines which agents need to coordinate based on task overlap
- [ ] Agent handoff context includes not just output text but memories relevant to the receiving agent

**Swarm mode:**
- [ ] All agents reason on same problem simultaneously (fan-out, not pipeline)
- [ ] Lyra synthesizes all responses into a unified answer
- [ ] Compare individual agent perspectives side by side
- [ ] Useful for brainstorming, architecture decisions, security review

**Pipeline triggers:**
- [ ] Manual start from Workshop
- [ ] Webhook trigger (GitHub push, Jira update, Slack message)
- [ ] Scheduled trigger (cron)
- [ ] Chained: pipeline completion triggers another pipeline

**Built-in pipeline templates:**
- [ ] **Jira → PR**: Nexus ingest → Scout analyze → Lyra plan → Forge/Pixel implement → Sentinel test → Courier PR
- [ ] **Daily Briefing**: Nexus pull external data → Nova summarize → Scout check repos → Lyra synthesize briefing
- [ ] **Code Review**: Scout analyze diff → Sentinel security scan → Nova write review summary → Courier structure PR
- [ ] **Bug Fix**: Scout locate bug → Forge fix → Sentinel test → Courier PR
- [ ] **Deployment**: Forge builds → Sentinel validates → Helm deploys → Courier writes release notes
- [ ] **Sprint Planning**: Atlas decomposes objective → Lyra approves plan → Atlas assigns agents → Ledger estimates cost

- [ ] **Atlas agent activation** — wire Atlas to read task/subtask state from `tasks` table; Atlas can write new tasks and update existing ones via IPC; useful as PM voice in multi-agent pipelines

---

## Phase 13 — Settings & Integrations Hub
> One place to connect everything

**API key management:**
- [ ] UI for all provider keys (Anthropic, OpenAI, Google, GitHub, GitLab, Jira, Slack)
- [ ] Currently requires .env edits — Settings page replaces that entirely
- [ ] Encrypted storage (Electron `safeStorage` API) — no plaintext keys on disk
- [ ] API key rotation — multiple keys per provider for rate limit distribution
- [ ] Key health check — test connection on save

**Model configuration:**
- [ ] Global default model selection (currently hardcoded)
- [ ] Per-agent model + provider override (e.g. Forge uses claude-opus, Scout uses gpt-4o)
- [ ] Max tokens per task override
- [ ] Pre-task cost estimation — before queuing, estimate token cost based on similar past tasks

**Budget controls:**
- [ ] Daily/monthly spend thresholds with alerts
- [ ] Cost pacing — distribute work evenly across time period to stay under limits
- [ ] Hard stop at 100% of budget (queue pauses, agents stop)
- [ ] Alert channel: in-app toast, macOS native notification, Slack webhook

**Rate limit management:**
- [ ] Auto-detect rate limit errors (429) and exponential backoff
- [ ] Key rotation on rate limit hit (cycle to next key for same provider)
- [ ] Queue management — throttle task starts when approaching limits
- [ ] Rate limit dashboard — see current usage vs limits per provider

**Integrations:**
- [ ] GitHub/GitLab token config + repo authorization list
- [ ] Jira workspace connection (OAuth) with project/board selector
- [ ] Slack webhook for task completion notifications
- [ ] Notification preferences — per-event control

**Data management:**
- [ ] Export all data as JSON (tasks, agents, memories, documents)
- [ ] Export tasks as CSV
- [ ] Database browser (read-only) — inspect SQLite tables from within the app
- [ ] Clear agent memories (with confirmation)
- [ ] Backup/restore database

---

## Phase 14 — Intelligence, Documents & Journal
> The knowledge layer — where Conductr learns about your world

**Documents:**
- [ ] Documents screen — save agent outputs as searchable, tagged, linkable documents
- [ ] Auto-document: agents auto-create a summary document on task completion
- [ ] Artifact rendering — documents with HTML/JS render as live previews (like Claude Desktop artifacts)
- [ ] Version history — see how a document evolved across tasks

**Intelligence:**
- [ ] Intelligence feed — cross-task pattern detection and AI-synthesized insights
- [ ] Weekly Recaps — auto-generated report (tasks completed, agents used, costs, key learnings) — dedicated sidebar page
- [ ] Agent performance dashboard — which agents are fastest/cheapest per task type, success rate over time
- [ ] Anomaly detection — flag unusual spend, failed tasks, agent errors
- [ ] Recommendations — "Based on recent tasks, you should create a pipeline for X"

**Journal:**
- [ ] Session log with decisions, rationale, and timestamps per day
- [ ] Auto-populated from task completions, chat summaries, pipeline runs
- [ ] Manual entries supported

**Search:**
- [ ] Full-text search across documents, memories, activity logs, and chat history
- [ ] Filters: by agent, by date range, by tag, by task
- [ ] Search results with context snippets and source links

**Files:**
- [ ] File attachments — attach local files to tasks and documents
- [ ] Client intelligence panel — per-client knowledge hub (docs, tasks, patterns, contacts)

---

## Phase 14B — App Self-Evolution & Ideas Page
> Conductr as a living document of itself — the app studies its own codebase, roadmap, and usage patterns, then proposes its own improvements.

This is what separates Conductr from every other AI tool: it doesn't just help you build things — it helps build *itself*. Lyra (as Plan Mode Orchestrator) reads the app's own context and drafts structured enhancement proposals. You approve or deny. Approved ideas become Workshop tasks automatically.

**App self-knowledge (what agents can read about themselves):**
- [ ] Feed Lyra the app's `docs/roadmap.md`, `ARCHITECTURE.md`, and `MEMORY.md` as indexed context (stored in `knowledge_base` with `source: 'app-self'` tag)
- [ ] Scout indexes the Conductr codebase itself (once Phase 10 is live) — Lyra can see actual implementation gaps, not just roadmap gaps
- [ ] Usage telemetry context: most-visited pages, most-used agents, task completion rate, common failure points — all summarized and fed to Lyra as "usage intelligence"
- [ ] Cost pattern context: which agents/task types are expensive — informs suggestions like "Scout should cache this analysis"
- [ ] Re-index triggered on: roadmap change, code change (Phase 10 file watcher), or manual "re-scan" button

**Ideas page — `src/renderer/src/pages/Ideas.tsx` (new nav item):**
- [ ] New sidebar nav item: **Ideas** (lightbulb icon) — where all AI-generated proposals live
- [ ] Each idea card displays:
  - **Title** — short, actionable proposal name
  - **What** — what the change or feature does
  - **Why** — the benefit or problem it solves
  - **Risks / Gotchas** — what to watch out for, known tradeoffs, implementation complexity
  - **Effort estimate** — S / M / L / XL, estimated token cost if relevant
  - **Phase** — which roadmap phase it belongs to (or "New Phase" if net-new)
  - **Source** — which agent proposed it, timestamp
  - **Status** — Pending / Approved / Denied / Pinned
- [ ] **Approve** → auto-creates a Workshop task with the idea's title + description pre-filled, links back to the idea
- [ ] **Deny** → archives with optional reason (dropdown: "Not now", "Not aligned", "Already planned", "Too risky"); remains searchable
- [ ] **Pin** → idea stays at top of the list regardless of age; pinned ideas appear in Lyra's context when generating new proposals (so she doesn't re-propose what you've already pinned)
- [ ] **Refine** → open a Chat thread with Lyra to drill into the idea before approving; conversation linked to the idea card
- [ ] Filter/sort: by status, by phase, by effort, by agent source, by date

**Proposal generation — how Lyra decides what to propose:**
- [ ] Manual trigger: "Analyze Conductr and suggest improvements" chat command to Lyra → runs analysis → batch of proposals deposited to Ideas page
- [ ] Automated: after every 10 completed tasks, Lyra runs a lightweight background analysis using usage patterns + roadmap gaps → surfaces top 3 suggestions
- [ ] Lyra cross-references pending Ideas before proposing — avoids duplicate suggestions
- [ ] Proposal quality improves over time as Lyra learns which types of ideas get approved vs denied (stored in her `agent_memories` with `domain: 'self-evolution'`)
- [ ] Scout contributes code-level suggestions (e.g. "This IPC handler is called 40× per session; it should be cached") — different lens than Lyra's strategic proposals

**Roadmap sync:**
- [ ] Approved + completed ideas can be written back to `roadmap.md` as checked items — Conductr literally documents its own evolution
- [ ] Denied ideas are never re-proposed unless the user manually un-archives them
- [ ] Pinned ideas are reflected in the Pinned Ideas section at the top of `roadmap.md` automatically

**`ideas` DB table:**
```sql
CREATE TABLE ideas (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  what        TEXT,
  why         TEXT,
  risks       TEXT,
  effort      TEXT,  -- 'S' | 'M' | 'L' | 'XL'
  phase       TEXT,
  source_agent TEXT,
  status      TEXT DEFAULT 'pending',  -- pending | approved | denied | pinned
  deny_reason TEXT,
  task_id     TEXT,  -- linked Workshop task if approved
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
)
```

---

## Phase 15 — Multi-Provider LLM Engine
> Use the best model for every task — Claude, GPT, Gemini, local/free models. No reason to ever leave Conductr.

This is the key unlock for never switching to another AI app. Different models excel at different things and have different cost profiles. Conductr should let you route any agent to any model — paid, free, or local — and switch without rewriting anything.

**Important: API access ≠ subscription.** ChatGPT Plus and Claude Pro are web-app subscriptions and do NOT grant API access. API access is billed separately per token. However, several providers have genuine free tiers (Gemini Flash, Groq, OpenRouter free models, Ollama local) that cost nothing at all. Conductr will clearly distinguish free-tier vs paid providers in Settings.

**Provider abstraction layer — `src/api/providers/`:**
- [ ] `LLMProvider` interface — all providers implement `stream(messages, options): AsyncGenerator<chunk>` and `listModels(): Model[]`
- [ ] `src/api/providers/anthropic.ts` — current implementation, refactored to interface
- [ ] `src/api/providers/openai.ts` — OpenAI + any OpenAI-compatible endpoint (GPT-4o, o3, o4-mini, etc.)
- [ ] `src/api/providers/gemini.ts` — Google Gemini via `@google/genai` SDK
- [ ] `src/api/providers/groq.ts` — Groq Cloud (OpenAI-compatible, uses `openai` SDK pointed at `api.groq.com`)
- [ ] `src/api/providers/mistral.ts` — Mistral AI API (European, GDPR-friendly, OpenAI-compatible)
- [ ] `src/api/providers/xai.ts` — xAI Grok (OpenAI-compatible endpoint)
- [ ] `src/api/providers/ollama.ts` — local Ollama / LM Studio / Jan (any OpenAI-compatible local server)
- [ ] `src/api/providers/openrouter.ts` — OpenRouter gateway (100+ models, single API key, unified billing)
- [ ] `src/api/router.ts` — selects provider + model based on agent config, falls back to global default

**Paid providers:**
- [ ] **Anthropic** — Claude Opus 4, Sonnet 4, Haiku 3.5 · Best for: reasoning, code, long context · Requires: `ANTHROPIC_API_KEY`
- [ ] **OpenAI** — GPT-4o, o3, o4-mini, GPT-4.1 · Best for: tool use, broad capability, vision · Requires: `OPENAI_API_KEY`
- [ ] **Google Gemini** — Gemini 2.5 Pro, 2.0 Flash · Best for: long context (1M tokens), multimodal · Requires: `GOOGLE_API_KEY`
- [ ] **Mistral AI** — Mistral Large, Codestral, Mixtral · Best for: European data residency, coding · Requires: `MISTRAL_API_KEY`
- [ ] **xAI Grok** — Grok-2, Grok-2-mini · Best for: real-time web knowledge, competitor to GPT-4o · Requires: `XAI_API_KEY`

**Free / free-tier providers:**
- [ ] **Google Gemini Flash** — free tier via API (rate-limited: 15 RPM / 1M tokens/day) · Genuinely free, no credit card · Great for: memory extraction passes, summarization, draft generation
- [ ] **Groq Cloud** — free tier (rate-limited: 14,400 req/day) · Runs Llama 3.3 70B, Gemma 2 9B, Mistral 8×7B at 500+ tokens/sec · Fastest inference available, free · Great for: time-sensitive tasks, streaming chat
- [ ] **OpenRouter free models** — subset of OpenRouter's catalog offered at $0/token (Meta Llama 3.1 8B, Gemma 2 9B, Mistral 7B, etc.) · Requires free OpenRouter account · Model list fetched live from API
- [ ] **Ollama (local)** — fully free, runs on your machine · Llama 3.3, DeepSeek-R1, Mistral, Gemma, Phi-4, Qwen, etc. · No data leaves your machine · Settings: `ollama_endpoint` (default `http://localhost:11434`) · Compatible apps: LM Studio, Jan, Msty — any OpenAI-compatible local server
  - **Tailscale users**: set `ollama_endpoint` to Tailscale IP of remote GPU machine — zero additional code, Tailscale handles routing at OS level

**OpenRouter — the universal gateway:**
- [ ] Single `OPENROUTER_API_KEY` unlocks 100+ models from 20+ providers through one interface
- [ ] Model discovery: live catalog fetch on settings open, cached for 24h — always shows current available models
- [ ] Includes free models (labeled `$0.00/M tokens`), budget models, and flagship models — all through one key
- [ ] Unified billing: one invoice covers all providers accessed via OpenRouter
- [ ] Useful for: experimenting with new models without getting 10 API keys, fallback routing, cost arbitrage

**Per-agent model selection:**
- [ ] Each agent has: default provider (global), override provider + model (per-agent), and a fallback chain
- [ ] Example routing strategy: Lyra → Claude Opus 4 (orchestration) · Scout → Gemini Flash free (codebase analysis, cheap) · Forge → Claude Sonnet 4 (code writing) · memory extraction → Groq Llama 3 (fast + free)
- [ ] Model picker in Agent detail page — dropdown grouped by provider, shows pricing and context window
- [ ] Per-task override — force a specific model for a single run without changing agent defaults

**Unified cost tracking:**
- [ ] All providers normalized to USD/token in `api_usage` table — free-tier usage logged at $0
- [ ] Metrics page: cost breakdown by provider, model, agent, client
- [ ] Budget controls apply across all providers — free tier usage still counts toward rate-limit tracking
- [ ] Free tier usage monitoring — alert when approaching daily rate limits on free providers so tasks don't silently fail

**Provider health & failover:**
- [ ] Health check on startup — ping each configured provider, cache latency + status
- [ ] Provider status indicator in sidebar popover (green/yellow/red per provider)
- [ ] Automatic failover chain — if Anthropic returns 529/overloaded, route to configured backup (e.g. OpenAI)
- [ ] Rate limit detection — on 429, rotate to next key or next provider in chain; exponential backoff

**Model comparison:**
- [ ] Compare mode — send same prompt to 2-3 models simultaneously (reuses Broadcast architecture from Chat)
- [ ] Results shown side-by-side with latency, token count, and cost annotated
- [ ] Save comparison as Document — track which model won for given task type over time
- [ ] Useful for: evaluating if Groq free can replace Sonnet for a given agent's work

**Multimodal:**
- [ ] Vision routing — automatically route vision tasks to capable models (Claude, GPT-4o, Gemini)
- [ ] Image paste in Chat → detect vision-capable agent → route to vision model if current agent's model lacks it
- [ ] Audio: Gemini and GPT-4o voice modes (future)

---

## Phase 16 — Scheduled Tasks & Automation
> Agents that work while you sleep. Set it and forget it — like Codex automations and Devin's recurring sessions.

**Cron scheduling:**
- [ ] Schedule any task to run at specific times/intervals (cron expression builder UI)
- [ ] "Skill Building" daily job (Phase 9) runs on scheduler infrastructure
- [ ] "Weekly Recap" generation (Phase 14) runs on scheduler
- [ ] Dashboard shows upcoming scheduled tasks + last run status

**Watch mode:**
- [ ] Monitor a file/directory for changes → trigger a task on change
- [ ] Use case: re-run Sentinel's tests when Forge writes new code
- [ ] Use case: re-index repo when files change

**Webhook receiver:**
- [ ] Local HTTP server (configurable port) that receives webhooks
- [ ] GitHub webhook → new issue/PR/push triggers a task or pipeline
- [ ] Jira webhook → new ticket auto-ingested as task
- [ ] Slack webhook → message triggers agent response
- [ ] Custom webhook payloads mapped to task templates

**Background agents:**
- [ ] "Always-on" agent mode — long-running background process that monitors and acts
- [ ] Use case: Sentinel monitors connected repos for security vulnerabilities
- [ ] Use case: Nova monitors RSS feeds and creates intelligence briefings
- [ ] Resource controls: max tokens/hour, max cost/day for background agents

**Queue management:**
- [ ] Priority levels on tasks: urgent / high / normal / low
- [ ] Auto-scheduling — tasks start based on priority + agent availability + rate limits
- [ ] Rate pacing — distribute work evenly across time to stay under budget
- [ ] Concurrency limit — max simultaneous active tasks (prevent runaway spend)

