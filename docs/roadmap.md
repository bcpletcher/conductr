# 🗺️ Conductr — Roadmap

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
- [ ] Onboarding wizard — first-run setup (API key entry, guided tour, sample task)
- [ ] Electron vibrancy — true OS-level blur for sidebar (`vibrancy: 'under-window'`)

**Command palette (Cmd+K):**
- [x] Quick task creation ("create task: build auth module")
- [x] Quick agent switch ("talk to Forge")
- [x] Quick navigation (jump to any page)
- [x] Quick search (search tasks, agents, memories, documents, chat)
- [x] Quick actions — Open Settings, New Task, View Keyboard Shortcuts (action kind in palette with direct callbacks)

**Global search:**
- [ ] Unified search across tasks, agents, memories, documents, chat history, activity logs
- [ ] Fuzzy matching + relevance ranking
- [ ] Search results grouped by category with inline previews

**Keyboard shortcuts:**
- [ ] Full keyboard navigation (Tab through sidebar, Enter to select)
- [x] Per-page shortcuts (Workshop: N for new task)
- [ ] Customizable keybindings (stored in settings)
- [x] Shortcut cheat sheet overlay (Cmd+/)

**Notification center:**
- [x] In-app toast notifications (bottom-right glass toasts)
- [x] Notification center panel (bell icon in sidebar footer, slide-out panel)
- [x] macOS native notifications — OS-level toast on task complete (chime) and task failed (silent) via `Notification.isSupported()` guard in `tasks:start` handler
- [ ] Configurable per-event: task complete, agent error, budget alert, pipeline done, scheduled task ran
- [ ] Notification modes: always / only when app is in background / never

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
> Agents that get smarter with every task they complete

This is the core intelligence layer. Without persistent memory, agents start from scratch every task. With it, Conductr becomes a genuinely learning system — the longer you use it, the more capable it gets.

**Memory persistence:**
- [ ] `agent_memories` table — store extracted insights after each task completes
- [ ] Post-task learning extraction — runner automatically distills key patterns and facts from task activity logs
- [ ] Agents receive accumulated memories as context when starting new tasks (injected into system prompt)
- [ ] Memory summarization — rolling window compressor to prevent context bloat (keep memories dense and relevant)
- [ ] Memory decay/relevance scoring — older or less-used memories rank lower in context injection

**Cross-agent knowledge:**
- [ ] `knowledge_base` table — shared cross-agent learnings pool (all agents can read, specialist agents write)
- [ ] Scout's codebase analysis automatically available to Forge/Pixel without re-analyzing
- [ ] Sentinel's test failure patterns available to all code-writing agents

**Memory UI:**
- [ ] Memory viewer in Agent detail page — see exactly what an agent has learned over time
- [ ] Filter by tag/domain, search memories
- [ ] Delete individual memories or bulk clear
- [ ] Memory timeline — visual history of learning events

**Skill building:**
- [ ] "Skill Building" scheduled mode — daily review job that synthesizes new skills and strategies from accumulated memories
- [ ] Memory search — query the knowledge base from Chat ("what has Forge learned about our auth system?")
- [ ] Agent experience tracking — task count, domains worked, skill level indicators

**Prompt intelligence (from video — the app gets smarter about how you talk to it):**
- [ ] Post-prompt analysis — after each user prompt, rate quality and identify improvement opportunities
- [ ] Prompt improvement suggestions — "Your prompt was vague about scope. Next time try: ..."
- [ ] Prompt templates library — save and reuse effective prompts (per domain/agent)
- [ ] Prompt history with outcome tracking — which prompts led to successful tasks vs failed ones
- [ ] Auto-rewrite suggestions — before sending, offer a polished version of the user's prompt
- [ ] Prompt scoring dashboard — track prompt quality improvement over time

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
- [ ] **Jira → PR**: Scout analyze → Lyra plan → Forge/Pixel implement → Sentinel test → Courier PR
- [ ] **Daily Briefing**: Nova summarize + Scout check repos → Lyra synthesize briefing
- [ ] **Code Review**: Scout analyze diff → Sentinel security scan → Nova write review summary
- [ ] **Bug Fix**: Scout locate bug → Forge fix → Sentinel test → Courier PR

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

## Phase 15 — Multi-Provider LLM Engine
> Use the best model for every task — Claude, GPT, Gemini, local models. No reason to ever leave Conductr.

This is the key unlock for never switching to another AI app. Different models excel at different things. Conductr should let you use any model through any agent.

**Provider support:**
- [ ] Anthropic API — Claude Opus, Sonnet, Haiku (current, expand to model selector)
- [ ] OpenAI API — GPT-4o, o3, o4-mini (via `openai` SDK)
- [ ] Google Gemini API — Gemini 2.0 Pro/Flash (via `@google/genai` SDK)
- [ ] Local models — Ollama, LM Studio (local HTTP endpoint, user-configured)
- [ ] OpenRouter — access 100+ models through single API (optional)

**Per-agent model selection:**
- [ ] Each agent can be configured with a specific provider + model
- [ ] Default: global model. Override: per-agent in Agent detail page
- [ ] Example: Lyra uses claude-opus (best reasoning), Scout uses gpt-4o (fast + cheap), Forge uses claude-sonnet

**Unified cost tracking:**
- [ ] Different pricing per provider/model — all normalized to USD in api_usage table
- [ ] Metrics page shows cost breakdown by provider, by model, by agent
- [ ] Budget controls work across all providers

**Provider health:**
- [ ] Health monitoring — latency, error rate, uptime per provider
- [ ] Automatic failover — if Anthropic is down, route to OpenAI backup (configurable)
- [ ] Provider status indicator in sidebar (green/yellow/red dot)

**Model comparison:**
- [ ] Compare mode — send same prompt to 2-3 models, see responses side by side
- [ ] Useful for evaluating which model is best for a given task type
- [ ] Results saved to documents for reference

**Multimodal:**
- [ ] Vision support: Claude, GPT-4o, Gemini all support image input — route to capable model
- [ ] Audio input support (future: Gemini, GPT-4o voice modes)

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

