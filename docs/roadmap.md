# 🗺️ Mission Control — Roadmap

## Phase 0 — Project Setup (Week 1)
> Get the skeleton running locally as a Mac app

- [ ] Initialize Electron + React project
- [ ] Set up Tailwind CSS with dark theme tokens
- [ ] Configure electron-builder for macOS packaging
- [ ] Set up local SQLite database (better-sqlite3)
- [ ] Create `.env` config for API keys (Claude, OpenClaw)
- [ ] Establish folder structure per ARCHITECTURE.md
- [ ] Basic window chrome — sidebar nav, top bar, content area
- [ ] Hot reload dev environment working

---

## Phase 1 — Dashboard (Week 2)
> The home screen — bird's eye view of everything

- [ ] Left sidebar with navigation links
- [ ] Top header with app title + status indicator
- [ ] Status cards row (Queued count, Active count, etc.)
- [ ] Live Activity feed widget (polling local DB)
- [ ] Recent Documents widget
- [ ] Quick Links widget (configurable shortcuts)
- [ ] Responsive card grid layout
- [ ] Empty states for all widgets

---

## Phase 2 — Workshop / Task Queue (Week 3)
> The engine room — queue and run autonomous tasks

- [ ] Task list view with Queued / Active tabs
- [ ] Live Feed toggle (real-time activity stream)
- [ ] Task cards with: title, description, tags, progress %, Start button
- [ ] Task detail modal/panel (description, dates, activity log)
- [ ] Create new task form
- [ ] Task status management (queued → active → complete)
- [ ] Claude API integration for task execution
- [ ] Progress logging to SQLite

---

## Phase 3 — Agents (Week 4)
> Define and manage AI personas

- [ ] Agent list view with avatar, name, role
- [ ] Agent detail page (system directives, operational role)
- [ ] Create / edit agent form
- [ ] Assign agents to tasks in Workshop
- [ ] Agent activity history
- [ ] "Nova" default agent pre-configured

---

## Phase 4 — API Metrics (Week 5)
> Real-time financial and token intelligence

- [ ] Today's spend card
- [ ] 7-day billing trend chart
- [ ] Per-agent token usage breakdown
- [ ] Per-task cost tracking
- [ ] Budget alerts / thresholds
- [ ] Data pulled from Claude API usage endpoint

---

## Phase 5 — Intelligence & Documents (Week 6)
> Knowledge base and AI-generated insights

- [ ] Documents list with search
- [ ] Weekly Recaps — auto-generated summaries
- [ ] Intelligence feed — AI insights and analysis
- [ ] Journal — session log and decision history
- [ ] File linking to tasks and agents

---

## Phase 6 — Clients (Week 7)
> Client-specific project tracking

- [ ] Client list view
- [ ] Client detail page (projects, tasks, documents)
- [ ] Link tasks and agents to specific clients
- [ ] Client intelligence panel

---

## Phase 7 — Polish & Distribution (Week 8)
> Make it feel like a real Mac app

- [ ] macOS menu bar integration
- [ ] Native notifications
- [ ] Keyboard shortcuts
- [ ] App icon + branding
- [ ] Electron auto-updater
- [ ] `.dmg` build for distribution
- [ ] Onboarding flow for first-time setup

---

## Backlog / Future Ideas
- [ ] Mobile companion app (view-only dashboard)
- [ ] Multi-device sync via local network
- [ ] Slack/Discord notifications for task completion
- [ ] Voice commands via Whisper
- [ ] OpenClaw swarm orchestration UI
- [ ] Plugin system for custom widgets
- [ ] Jira → PR workflow (ticket ingestion → Scout analysis → Lyra planning → Forge/Pixel execution → Sentinel validation → Courier PR delivery)
- [ ] GitHub/GitLab integration for automated PR creation
- [ ] Jira OAuth webhook for auto-task ingestion
- [ ] Multi-agent pipeline orchestration (sequential + parallel subtask execution)
