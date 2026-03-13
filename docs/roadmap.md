# 🗺️ Dispatchr — Roadmap

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
- [x] Rename app to **Dispatchr**, lead agent to **Lyra**

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

---

## Phase 3 — Agents 🔄
> Define and manage AI personas

- [x] Agent list view with avatar, name, role
- [x] Agent detail panel (system directives, operational role, activity history)
- [x] Create / edit agent form
- [x] Assign agents to tasks in Workshop
- [x] Agent activity history
- [x] **Lyra** default agent pre-configured (orchestrator)
- [ ] All 7 default agents seeded (Nova, Scout, Forge, Pixel, Sentinel, Courier)
- [ ] Glass design system applied to Agents page

---

## Phase 4 — API Metrics 🔄
> Real-time financial and token intelligence

- [x] Today's spend card
- [x] 7-day billing trend chart (Recharts BarChart)
- [x] Per-agent token usage breakdown
- [x] Per-task cost tracking (SQLite api_usage table)
- [ ] Budget alerts / thresholds
- [ ] Data pulled from Claude API usage endpoint (currently local DB only)
- [ ] Glass design system applied to Metrics page

---

## Phase 5 — Intelligence & Documents
> Knowledge base and AI-generated insights

- [ ] Documents list with search
- [ ] Weekly Recaps — auto-generated summaries
- [ ] Intelligence feed — AI insights and analysis
- [ ] Journal — session log and decision history
- [ ] File linking to tasks and agents

---

## Phase 6 — Clients
> Client-specific project tracking

- [ ] Client list view
- [ ] Client detail page (projects, tasks, documents)
- [ ] Link tasks and agents to specific clients
- [ ] Client intelligence panel

---

## Phase 7 — Polish & Distribution
> Make it feel like a real Mac app

- [ ] macOS menu bar integration
- [ ] Native notifications
- [ ] Keyboard shortcuts
- [ ] App icon + branding
- [ ] Electron auto-updater
- [ ] `.dmg` build for distribution
- [ ] Onboarding flow for first-time setup

---

## Phase 8 — Chat Interface 🔄
> Talk to any agent with full system context — the primary way to interact with the system

- [x] Persistent chat panel accessible from sidebar nav
- [x] Agent switcher — select which agent you're talking to (any of the 7 defaults or custom)
- [x] Each agent responds with its own system directive loaded automatically
- [x] Full conversation history stored in SQLite (`messages` table), restored across sessions
- [x] Streaming responses with typewriter effect (IPC streaming, same pattern as Workshop)
- [ ] Chat is action-aware — natural language can trigger system actions mid-conversation (e.g. "queue that as a task", "start the Jira workflow for MC-42")
- [ ] Attach files and paste code snippets inline
- [ ] Broadcast mode — send a message to all agents and see each response side by side
- [ ] Chat context auto-enriched with live system state (current tasks, agent status, recent activity)

---

## Backlog / Future Ideas
- [ ] Mobile companion app (view-only dashboard)
- [ ] Multi-device sync via local network
- [ ] Slack/Discord notifications for task completion
- [ ] Voice commands via Whisper
- [ ] Plugin system for custom widgets
- [ ] Jira → PR workflow (ticket ingestion → Scout analysis → Lyra planning → Forge/Pixel execution → Sentinel validation → Courier PR delivery)
- [ ] GitHub/GitLab integration for automated PR creation
- [ ] Jira OAuth webhook for auto-task ingestion
- [ ] Multi-agent pipeline orchestration (sequential + parallel subtask execution)
