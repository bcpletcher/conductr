# 🗺️ Conductr — Roadmap

---

## 📌 Pinned Ideas
> High-priority concepts worth fast-tracking regardless of phase order. These are approved directions, not speculation.

**OpenRouter as the default gateway** *(pulled into Phase 11)*
- Make OpenRouter the recommended first-setup path in onboarding: one key, 100+ models, includes free options, no commitment
- Default global model: `meta-llama/llama-3.3-70b-instruct:free` via OpenRouter (free, capable, zero cost on day one)
- Users upgrade to paid models per-agent as needed — reduces barrier to first meaningful use to zero
- Surface OpenRouter's live model catalog in Settings so users can browse and assign models without leaving the app

**App Self-Evolution / Blueprint page** *(pinned by user — Phase 9)*
- Conductr should study itself — read its own roadmap, architecture docs, and usage patterns, then propose enhancements
- Every suggestion surfaced with: benefits, risks, gotchas, effort estimate, and which phase it belongs to
- User approves → task created in Workshop automatically; user denies → archived with reason; user pins → stays visible
- Lyra is the primary author of these proposals (as Plan Mode Orchestrator)

**Conductr Server Mode + Tailscale** *(Phase 15)*
- One Mac hosts the app and all repos; second PC (or any device) connects as a client over LAN or Tailscale
- All agents execute on the host machine — clients are pure UI, no local DB
- Tailscale handles remote access outside home network with zero app-level code changes
- In-app Tailscale detection, status display, and peer discovery; in-app pairing flow with 6-digit code

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

---

## Phase 2 — Workshop / Task Queue ✅
> Create tasks, assign agents, watch them run

- [x] Task list with status filters (All / Queued / Active / Completed / Failed)
- [x] Create task form (title, description, agent picker, tags)
- [x] Task detail drawer (activity log, progress bar, status history)
- [x] Start task → streaming task runner via IPC
- [x] Task runner uses agent system directive + Anthropic SDK
- [x] Activity log streamed to DB + task detail in real time
- [x] Auto-save task output as journal entry on completion
- [x] Task progress updates (0–100%) streamed from runner

---

## Phase 3 — Agents ✅
> The 7-agent roster — Lyra leads, each specialist has a role

- [x] Agents page — list view with avatar, name, role, status
- [x] Agent detail — profile, system directive, operational role
- [x] 7 default agents seeded: Lyra, Nova, Scout, Forge, Pixel, Sentinel, Courier
- [x] Edit agent system directive inline
- [x] Agent activity log — recent tasks, last active

---

## Phase 3B — SWARM OS: Agents Page Redesign ✅
> The full 11-agent roster with org chart, agent files, and SWARM OS framing

**Personnel Tab — agent roster + profiles:**
- [x] Personnel / Protocol / Comms tab layout
- [x] Roster list with avatar (rounded rect), role badge, status dot, accent color per agent
- [x] Agent profile panel: large avatar, name, role badge, tagline, Mission Directives, Operational Bio, Active Task sidebar
- [x] Profile / Files / Activity sub-tabs per agent
- [x] Agent Files: SOUL.md, TOOLS.md, MEMORY.md, IDENTITY.md, HEARTBEAT.md per agent
- [x] Inline file editor (textarea, save/discard, create/delete)
- [x] "Initialize All" button — scaffold all standard files for all agents

**Protocol Tab — org chart + rules:**
- [x] Org chart — Lyra at top + connecting line + Core agents (Forge, Nova, Scout, Pixel, Sentinel, Courier) in 3-col grid
- [x] Expansion Agents row (Nexus, Helm, Atlas, Ledger) — dimmed at 50% opacity, phase-lock badges
- [x] Budget framework section
- [x] Agent creation protocol scrollable document

**Comms Tab — agent messaging:**
- [x] Left panel: Group Hubs + Direct channels per agent
- [x] Right panel: "Direct — Secured Link" chat view (navigates to Chat page)

**11-agent roster (full):**

| Agent | Role | Accent | Avatar | Status |
|---|---|---|---|---|
| Lyra | Lead Orchestrator | `#818cf8` indigo | lyra.webp | ✅ Active |
| Nova | Strategy & Communication | `#a78bfa` violet | nova.webp | ✅ Active |
| Scout | Research & Analysis | `#22d3ee` cyan | scout.webp | ✅ Active |
| Forge | Backend Engineering | `#f97316` orange | forge.webp | ✅ Active |
| Pixel | Frontend & Design | `#ec4899` pink | pixel.webp | ✅ Active |
| Sentinel | QA & Security | `#34d399` green | sentinel.webp | ✅ Active |
| Courier | Comms & Delivery | `#fbbf24` amber | courier.webp | ✅ Active |
| Nexus | Integration & Data Intelligence | `#0ea5e9` sky | nexus.webp | Phase 15 |
| Helm | DevOps & Infrastructure | `#f43f5e` rose | helm.webp | Phase 12 |
| Atlas | Project Management & Ops | `#9333ea` purple | atlas.webp | Phase 17 |
| Ledger | Financial Intelligence | `#eab308` gold | ledger.webp | Phase 11 |

---

## Phase 4 — API Metrics ✅
> Know exactly what you're spending and where

- [x] API usage table (`api_usage`) — model, tokens, cost, agent, task
- [x] Metrics page — today's spend, 7-day chart, monthly total, total tokens
- [x] Most active model indicator
- [x] Per-agent spend breakdown
- [x] Budget controls — daily/monthly limits stored in settings

---

## Phase 5 — Intelligence & Documents ✅
> Where agent output becomes lasting knowledge

- [x] Documents page — save, search, tag, and view agent outputs
- [x] Auto-document creation on task completion (doc_type: 'output')
- [x] Intelligence page — AI-generated insights and recaps from task history
- [x] Insight generation — streaming IPC to Anthropic, results stored in DB
- [x] Journal page — daily log with manual entries + task-linked auto-entries
- [x] Full-text search across documents and journal (LIKE-based SQLite queries)

---

## Phase 6 — Clients ✅
> Organize all work by client

- [x] Clients page — create, edit, delete clients
- [x] Link tasks and documents to clients
- [x] Client detail view — task list, document list, activity log
- [x] Client task counts and document counts

---

## Phase 7 — Polish, Power User & Distribution ✅
> Make it feel like a real Mac app that power users never want to leave

**Desktop polish:**
- [x] macOS menu bar integration (File/Edit/View/Window/Help + Keyboard Shortcuts item)
- [x] System tray / menu bar launcher — quick task status + navigation without opening full app
- [x] App icon + branding — conductor-wave logo, `.icns` (macOS) + `.ico` (Windows)
- [x] Onboarding wizard — first-run setup (API key, guided tour, agent roster)
- [x] Electron vibrancy — true OS-level blur for sidebar (`vibrancy: 'under-window'`)
- [x] Electron auto-updater — `electron-updater`, GitHub Releases publish config, background download + install-on-quit, "Check for Updates…" in menu + Settings

**Command palette (Cmd+K):**
- [x] Quick task creation, agent switch, navigation, search, quick actions

**Global search (Cmd+Shift+F):**
- [x] Unified search across tasks, agents, documents, journal entries, chat messages
- [x] Grouped results with keyboard nav (↑↓ Enter Esc)

**Keyboard shortcuts:**
- [x] Full keyboard navigation (Tab, ArrowUp/Down between nav items)
- [x] Per-page shortcuts (Workshop: N for new task)
- [x] Shortcut cheat sheet overlay (Cmd+/)
- [x] Customizable keybindings — edit via Settings page, stored in settings DB, live-reloaded

**Notification center:**
- [x] In-app toast notifications (glass, bottom-right, 3.5s)
- [x] Notification center panel (bell icon, slide-out)
- [x] macOS native notifications — OS-level on task complete/failed
- [x] Configurable per-event: task complete, task failed, budget alert
- [x] Notification modes: always / background only / never

**Appearance:**
- [x] Accent color picker (indigo default, selectable palette)
- [x] Compact vs comfortable density toggle
- [x] Wallpaper selector — built-in presets + custom image upload
- [x] Wallpaper brightness slider

**Distribution:**
- [x] Windows support — custom title-bar, NSIS builder, Mac-like glass via CSS backdrop-filter
- [x] App icon — `.icns` + `.ico` generated by `scripts/generate-icons.mjs`
- [x] macOS `.dmg` build — configured in `electron-builder.yml`, run `npm run build:mac`
- [x] Windows NSIS installer build — configured in `electron-builder.yml`, run `npm run build:win`

---

## Phase 8 — Chat Interface ✅
> Talk to any agent with full system context — feature parity with Claude Desktop so users never switch away

**Core:**
- [x] Persistent chat panel — agent switcher, full history in SQLite
- [x] Streaming responses with typewriter effect
- [x] Markdown rendering (headers, bold, italic, lists, tables, blockquotes)
- [x] Syntax-highlighted code blocks with language label + copy button
- [x] Inline code spans (violet tint, glass background)
- [x] Context window indicator — token count + capacity bar
- [x] Links open in external browser
- [x] Mermaid diagram rendering
- [x] Per-message copy button (hover-reveal, green check feedback)
- [x] Export conversation as markdown
- [x] Save conversation as Document (doc_type: 'recap')
- [x] Auto-enriched system prompt: active task count, recent activity, agent status
- [x] LaTeX math rendering (remark-math + rehype-katex)
- [x] Image/screenshot paste (Cmd+V) → Claude vision API
- [x] Drag-and-drop images into chat
- [x] @-mention syntax: `@AgentName` injects that agent's recent conversation as context, autocomplete dropdown
- [x] Action awareness — "Queue as Task" button on assistant messages → Workshop task creation modal
- [x] Conversation search — in-thread search bar with match highlight and result count
- [x] Message bookmarks — star/unstar any message, bookmark filter toggle, persisted in DB

**Broadcast mode:**
- [x] Fan a single message to all agents simultaneously (parallel IPC, concurrent streams)
- [x] Multi-column response view (one column per agent, 280px glass cards)
- [x] Agent chip selector — toggle agents in/out before sending
- [x] "Continue with {Agent}" button per column

---

## Phase 9 — Blueprint: App Self-Evolution & Ideas ✅
> Conductr as a living document of itself — the app studies its own roadmap, usage patterns, and architecture, then proposes its own improvements.

**In-app Blueprint page:**
- [x] Blueprint sidebar nav item — combined Roadmap + Ideas view
- [x] Phases tab — glass card grid of all roadmap phases with progress bars, expand-to-items, filter by status
- [x] Ideas tab — proposals inbox: pinned ideas at top, AI-generated proposals from Lyra
- [x] Ideas tab filter by status: Pending / Approved / Denied / Pinned (filter chips, count-gated)

**App self-knowledge:**
- [x] Lyra reads `docs/roadmap.md` + `docs/architecture.md` at generation time for self-awareness context

**Proposal cards — each idea displays:**
- [x] **Title** — short, actionable proposal name
- [x] **What / Why / Risks** — what it does, the benefit, known tradeoffs
- [x] **Effort estimate** — S / M / L / XL badge
- [x] **Phase** — which roadmap phase it belongs to
- [x] **Source** — which agent proposed it (Lyra), timestamp
- [x] **Status** — Pending / Approved / Denied / Pinned (color-coded)

**Proposal actions:**
- [x] **Approve** → auto-creates a Workshop task pre-filled with idea's title + description, links back to idea card
- [x] **Deny** → archives with reason (Not now / Not aligned / Already planned / Too risky); visible in Denied filter
- [x] **Pin** → stays at top; Lyra skips pinned titles on next generation (dedup by title)
- [x] **Refine** → opens Chat page with Lyra selected (toast confirms handoff)
- [x] **Delete** → removes idea permanently

**Proposal generation:**
- [x] Manual: "Analyze Conductr and suggest improvements" button → Lyra streams analysis → batch deposited to Ideas tab
- [x] Automated: after every 10 completed tasks, Lyra auto-generates proposals in background
- [x] Lyra cross-references existing idea titles before proposing — avoids duplicates

**`ideas` DB table:**
- [x] `id`, `title`, `what`, `why`, `risks`, `effort`, `phase`, `source_agent`, `status`, `deny_reason`, `task_id`, `created_at`, `updated_at`
- [x] Sorted: pinned → pending → approved → denied

---

## Phase 10 — Agent Memory & Learning System ✅
> Agents that get smarter with every task — isolated skill scopes per client and domain

**Search upgrade:**
- [x] FTS5 full-text search — replace LIKE-based global search with SQLite FTS5 for fuzzy matching + relevance ranking

**Memory schema — scoped from the start:**
- [x] `agent_memories` table: `id`, `agent_id`, `client_id` (nullable), `domain_tags` (JSON array), `skill_tags` (JSON array), `content`, `relevance_score`, `created_at`, `last_used_at`
- [x] Memories scoped at write time — every extracted insight tagged with active `client_id` and domain
- [x] Skill isolation: Vue.js patterns for Client A never injected into a Client B task
- [x] Global memories (no `client_id`) — agent-wide expertise that applies across all clients

**Adaptive context injection (RAG-based):**
- [x] On task start: query `agent_memories` filtered by `agent_id` + `client_id`, ranked by tag overlap with task
- [x] Only inject top-N highest-scoring memories — configurable memory budget (2,000 tokens max)
- [x] Memory score = `relevance_to_task × recency_weight × usage_frequency`
- [x] Anthropic Prompt Caching — `cache_control: ephemeral` on static context (SOUL.md, IDENTITY.md, global memories)

**Post-task learning extraction:**
- [x] After task completes, runner sends activity log to lightweight extraction pass
- [x] Extractor distills: key patterns, mistakes, approaches that worked, tool/library specifics
- [x] Each extracted memory saved with task's `client_id` and auto-tagged by domain
- [x] Agent's `MEMORY.md` file becomes a human-readable summary of top global memories

**Skill hardening — daily review job:**
- [x] "Skill Building" job — consolidates fragmented memories into hardened skill entries (runs manually; scheduled in Phase 18)
- [x] 10 separate Vue.js observations → synthesized into single "Vue 3 Composition API expert profile"
- [x] Skills promoted from client-scoped to global when same pattern appears across ≥3 clients
- [x] Skill level indicators per domain: Novice → Practitioner → Expert → Master

**Cross-agent knowledge pool:**
- [x] `knowledge_base` table — shared learnings readable by all agents (specialists write, all read)
- [x] Sentinel's test failure patterns available to code-writing agents for that client's repo

**Memory UI:**
- [x] Memory viewer in Agent detail page — filterable by client and domain
- [x] Skill map visualization — bubble chart of agent expertise by domain
- [x] Delete individual memories or bulk-clear by client, domain, or all
- [x] "Inject preview" — before running a task, show which memories will be injected and why

**Prompt intelligence:**
- [x] Prompt templates library — save and reuse effective prompts per domain/agent/client
- [x] Auto-rewrite suggestions — before sending, offer a polished version of the user's prompt

**Token efficiency:**
- [x] Pre-task token estimation — estimate memory + system + task tokens before queuing

**Blueprint enhancements:**
- [x] Ideas tab sort/filter by phase, effort, source agent, and date
- [x] Feed Lyra `MEMORY.md` + `knowledge_base` as indexed self-awareness context at generation time

---

## Phase 11 — Multi-Provider LLM Engine & Setup Wizard ✅
> Use the best AI for every job. Zero-friction first run — go from install to running agents in under 60 seconds.

**Provider abstraction layer — `src/api/providers/`:**
- [x] `LLMProvider` interface — `RouteOptions` / `RouteResult` / `ProviderStatus` types in `providers/types.ts`
- [x] `providers/openai-compat.ts` — OpenAI-compatible SSE streaming for OpenRouter / OpenAI / Groq / Ollama
- [x] `providers/registry.ts` — static `MODEL_REGISTRY` with pricing + capability flags; `PROVIDER_META`
- [x] `api/router.ts` — `routeRequest()` + `runWithRouter()` wrapper; 4-level priority chain (override → agent → global → factory)

**Provider key management:**
- [x] `providers:setKey` / `providers:getStatus` / `providers:testConnection` / `providers:removeKey` IPC handlers
- [x] Keys stored in SQLite settings table (plain text; Phase 13 upgrades to `safeStorage`)
- [x] Key validation on save — test connection, show ✅ / ❌ with error detail
- [x] `default_provider` + `default_model` columns added to `agents` table via migration

**Per-agent model selection:**
- [x] Model picker in Agent Profile tab — grouped by provider, shows pricing and context window
- [x] `providers:getAgentModel` / `providers:setAgentModel` IPC handlers
- [x] `providers:getGlobalDefault` / `providers:setGlobalDefault` — global fallback model config

**Free / free-tier providers (zero cost on day one):**
- [x] **OpenRouter free models** — `meta-llama/llama-3.3-70b-instruct:free` as factory default
- [x] **Groq Cloud** — free tier (14,400 req/day), Llama 3.3 70B at 500+ tok/sec
- [x] **Ollama (local)** — Llama 3.3, DeepSeek-R1, Mistral — no data leaves machine

**Ollama in-app management:**
- [x] Auto-detect Ollama on app launch (`providers:detectOllama` — ping localhost:11434)
- [x] In-app installer — `providers:installOllama` opens platform installer (no terminal required)
- [x] In-app model manager — `providers:getOllamaModels`, `providers:pullOllamaModel` (streaming progress), `providers:deleteOllamaModel`
- [x] Pull progress streamed via `providers:pullProgress` IPC event

**Model discovery:**
- [x] Static model registry — curated list with pricing, context window, capability flags (`registry.ts`)
- [x] `providers:getModels` IPC — returns registry models for provider, including live Ollama models
- [x] `providers:getMeta` — returns `PROVIDER_META` (labels, icons, docs notes) for all providers

**Onboarding wizard redesign:**
- [x] Multi-step wizard with Choose Your AI → API Key Setup → Agent Roster → Done flow
- [x] Provider path detection — conditional steps based on selected provider
- [x] Live test-connection feedback during onboarding key entry

**Providers page (`src/renderer/src/pages/Providers.tsx`):**
- [x] Provider cards: OpenRouter / Anthropic / OpenAI / Groq / Ollama — each with status, key field, test button
- [x] Inline documentation: what each provider unlocks, pricing summary, how to get a key
- [x] Ollama section: install status, running status, installed models, pull UI with progress bar
- [x] Global default model picker — shown when no per-agent model is set
- [x] **Ledger agent activation** — fully seeded and active with multi-provider cost tracking

---

## Phase 12 — Developer Tools (Repo + Terminal) ✅
> Real code execution — agents that actually read, write, and ship code.
> Designed server-aware from day one: all execution runs on the host machine; Phase 15 makes it remotely accessible.

**Repo connection:**
- [x] Local repo browser — connect Conductr to one or more local repos (folder picker in Settings)
- [x] File tree viewer — expandable directory tree in Dev Tools page
- [x] Read file contents into agent context (Scout sees your actual codebase)

**Code writing:**
- [x] File write-back — write files directly to disk via repos:writeFile IPC
- [x] Diff viewer — syntax-colored diff in Git tab (green adds / red removes)
- [ ] Per-hunk accept/reject controls (Phase 13 polish)

**Terminal/shell execution:**
- [x] Embedded terminal panel — run any command in repo context, streamed output
- [x] Output streamed to session log in real time (stdout/stderr color-coded)
- [x] Hard limits: configurable max execution time (default 120s), blocked dangerous commands
- [x] Auto-suggest common commands based on repo type (package.json, Cargo.toml, etc.)
- [x] **Helm agent activation** — terminal access + file write-back enabled

**Git operations (via `simple-git`):**
- [x] Branch creation: `conductr/task-{id}-{slug}`
- [x] Status, diff (staged/unstaged), log — all exposed via IPC and surfaced in Git tab
- [x] Stage all, commit with message, push to remote
- [x] Checkout + create branches from Git tab UI

**GitHub integration:**
- [x] PAT token in Dev Tools (stored in settings table; Phase 13 upgrades to safeStorage)
- [x] Read issues → import as Workshop tasks (one click)
- [x] Create PRs with title, body, base/head branch
- [x] Fetch open PR list per repo

**Codebase intelligence:**
- [x] `@file:auth.ts` syntax in Chat → searches connected repos, injects file contents into context (up to 8 KB)
- [ ] Repo indexing — Scout auto-builds architecture wiki (Phase 14 with MCP filesystem tool)

**Dev Tools page (4 tabs):**
- [x] Repos tab — connect/disconnect repos, expandable file tree, file viewer
- [x] Terminal tab — command runner with session history, repo context selector
- [x] Git tab — branch info, staged/modified files, commit + push, diff viewer, commit log
- [x] GitHub tab — token management, issue list, import-as-task button

---

## Phase 13 — Security Hardening ✅
> Protect keys, encrypt data, and lock down the attack surface before network features land.

**API key encryption:**
- [x] Migrate all provider keys from plain SQLite to `electron.safeStorage` (OS keychain: macOS Keychain / Windows DPAPI / Linux libsecret)
- [x] Migration script: read existing `provider_key_*` settings, re-encrypt, delete plaintext versions — `migrateToSecureSettings(db)` called in `initDb()`
- [x] `safeStorage.isEncryptionAvailable()` check — graceful fallback (returns plaintext; user must re-enter if moving machines)
- [x] Key display: always masked in UI — `providers:getStatus` returns masked key only; `settings:get` blocks all `SENSITIVE_KEYS`

**Database encryption:**
- [ ] SQLite-at-rest encryption (SQLCipher / `better-sqlite3-multiple-ciphers`) — deferred to Phase 14; non-sensitive content remains after API keys moved to safeStorage

**CSP audit:**
- [x] Tightened CSP: added `connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none';` + `blob:` to `img-src`
- [x] `style-src 'unsafe-inline'` retained — required by React inline `style={{}}` props (wallpaper, accent, gradients); documented for Phase 17 cleanup
- [x] IPC input validation — `assertValidFilename()` guard on all agentFiles IPC handlers; wallpaper upload validates extension + 20 MB size cap

**Renderer isolation:**
- [x] `settings:get` blocks all keys in `SENSITIVE_KEYS` set (returns `null`)
- [x] `settings:set` blocks writes to `SENSITIVE_KEYS` (throws)
- [x] All provider key reads use `getSecureSetting` (decrypt on main process only — never sent to renderer)
- [x] `contextBridge` surface audited — no secrets exposed

---

## Phase 14 — MCP Tool Integration ✅
> Give agents superpowers via the Model Context Protocol

MCP (Model Context Protocol) lets agents call external tools — browser control, web search, database access, custom APIs, and anything else wrapped in a server. OpenClaw (Phase 15) provides a browser tool complement while the MCP browser server is pending.

- [x] MCP server connection manager — connect/disconnect named MCP servers from Settings
- [x] Built-in MCP servers: `filesystem`, `fetch` (web browsing), `sqlite` — plus 9-server community registry
- [x] Agent tool assignment — Tools tab in agent profile (least-privilege per-agent toggle)
- [x] Tool call results streamed to chat in real time (formatted markdown blocks)
- [x] Tool approval flow — `require_approval` flag per server (stored in `mcp_servers` table)
- [x] Anthropic tool loop — up to 10 turns; `tool_use` → `callTool` → `tool_result` → continue
- [x] Community MCP server registry — Browse Registry modal: 9 servers (Filesystem, Fetch, SQLite, Brave Search, GitHub, Puppeteer, Memory, Slack, Everything)
- [x] Settings → MCP Tool Servers section — add/test/remove servers with live status indicator
- [x] `mcp_servers` + `agent_mcp_servers` DB tables; auto-connect on launch; disconnect on quit
- [ ] MCP Apps — render interactive tool results inline in Chat (Phase 15+)

---

## Phase 15 — OpenClaw Gateway Integration ✅
> Conductr's comms and tool execution layer. OpenClaw = gateway, channels, browser, voice. Conductr = mission control UI + orchestration. No reinventing the wheel.

OpenClaw runs as a **sidecar daemon** managed by Conductr (same pattern as Ollama: detect → install → spawn → monitor).

**Sidecar management:**
- [x] Detect OpenClaw install (`npm list -g openclaw`)
- [x] In-app install button — `npm install -g openclaw` + `openclaw onboard` via managed terminal
- [x] Conductr spawns Gateway on launch (port 18789), monitors health heartbeat, shuts down on quit
- [x] `openclaw:getStatus`, `openclaw:install`, `openclaw:restart`, `openclaw:start`, `openclaw:stop` IPC handlers
- [x] Gateway status indicator in Channels page

**`src/api/openclaw-client.ts` — real Gateway WS client:**
- [x] WebSocket connection to `ws://127.0.0.1:18789`
- [x] Session management: `createSession`, `sendMessage`, `getHistory`
- [x] Tool invocation: `callTool(name, args)` with JSON-RPC over WS
- [x] Reconnect logic with exponential backoff

**Channels page (sidebar):**
- [x] Gateway tab — status card, version/PID, start/restart/stop buttons, install guide
- [x] Channels tab — add/remove channels (Telegram/Slack/Discord/WhatsApp/iMessage/Email), per-channel routing agent, enable toggle, test button
- [x] Skills tab — ClawHub stub (live browsing unlocked when Gateway running)

**Multi-channel agent routing:**
- [x] Per-channel routing agent picker (defaults to Courier)
- [x] `openclaw_channels` DB table with `routing_agent_id`

**ClawHub skills:**
- [x] Skills tab stub — shows installed skills when Gateway running; browse button

- [x] **Nexus agent activation** — phase-locked badge removed; Nexus shown as active agent (OpenClaw channels complete)

---

## Phase 16 — Server Mode ✅
> Run on two machines. Access your Mac's repos from your Windows PC. Work from anywhere.
> Built on a lightweight HTTP RPC server (Node.js built-in) — no extra dependencies.

**Host setup:**
- [x] Expose Conductr DB handlers as HTTP RPC methods on the host (`src/main/network/host.ts`)
- [x] Host HTTP server on port 9876 — `/health`, `/pair`, `/rpc` endpoints (Node.js `http` module)
- [x] Handler registry: tasks, agents, documents, search — maps channel names to DB functions directly
- [x] Host shows both LAN IP and Tailscale IP in Settings → Network

**Pairing & auth (`src/main/network/pairing.ts`):**
- [x] 6-digit numeric pairing code — shown to host user, shared with client
- [x] Derived auth token (`SHA-256(salt:code)`) — stored in `network_config` DB table, used for all RPC calls
- [x] Regenerate code button (creates new code + token, restarts HTTP server)
- [x] `network_config` SQLite table for mode/IPs/pairing state

**Client Mode (second machine — PC or any device):**
- [x] "Connect to Host" flow in Settings → Network
- [x] Enter host IP (LAN or Tailscale IP) + 6-digit pairing code
- [x] After handshake: auth token stored, `activateClientMode()` bridges RPC calls to host (`src/main/network/client.ts`)
- [x] Offline fallback: 5-second health poll → `network:connectionStatus` push → toast warning in renderer
- [x] Client executes zero AI calls locally — all execution proxied to host via HTTP RPC

**Tailscale:**
- [x] Show Tailscale peers from `tailscale status --json` CLI — one-click connect to Conductr hosts
- [x] "Install Tailscale" button → opens tailscale.com/download
- [x] LAN IP via `os.networkInterfaces()`, Tailscale IP via `tailscale ip --4` CLI

**UI — Settings → Network tab:**
- [x] Status card with mode badge (Standalone / Host / Client), LAN IP, Tailscale IP
- [x] Host mode: pairing code display, regenerate, connected clients count, disable button
- [x] Client mode: connected host info, live connection status dot, offline warning banner, disconnect button
- [x] Tailscale section: peer list with one-click connect, Install Tailscale button

---

## Phase 17 — Multi-Agent Pipelines & Swarms ✅
> Lyra as true orchestrator — parallel and sequential agent swarms

**Subtask system:**
- [x] Parent task spawns and tracks child tasks — `parent_task_id` + `pipeline_run_id` columns on tasks
- [x] Lyra auto-decomposes a high-level objective into subtasks with specialist agents via `pipelines:decompose`
- [x] Sequential + parallel execution modes — topological sort into waves, `Promise.all()` for parallel
- [x] Cross-agent handoff — `inject_prior_outputs` injects upstream step output as context

**Pipeline UI (`src/renderer/src/pages/Pipelines.tsx`):**
- [x] Pipeline Builder tab — list templates + custom pipelines; create/delete; run with live toast
- [x] Pipeline templates — 5 built-in templates seeded on startup (INSERT OR IGNORE)
- [x] Pipeline status visualization — step cards with status badges, duration, output preview
- [x] Swarm Mode tab — NL goal → Lyra decomposes → preview steps → launch swarm; real-time step progress

**Swarm mode:**
- [x] NL goal → `pipelines:decompose` (Lyra LLM) → `PipelineStepDef[]` preview → `pipelines:startSwarm` executes
- [x] Live `pipelines:runUpdate` push events stream step-level status to renderer

**Built-in pipeline templates (seeded in DB):**
- [x] **Jira → PR**: Scout analyze → Nova implement → Sentinel tests → Helm PR
- [x] **Daily Briefing**: Ledger metrics + Atlas tasks + Scout scan (parallel) → Lyra synthesize
- [x] **Bug Fix**: Scout reproduce → Nova fix → Sentinel tests → Helm deploy
- [x] **Deployment**: Sentinel audit + Forge check (parallel) → Helm deploy → Sentinel monitor
- [x] **Sprint Planning**: Ledger budget + Scout backlog (parallel) → Atlas plan

- [x] **Atlas agent activation** — `PHASE_LOCKED` cleared; Atlas fully active in org chart + all UI

---

## Phase 18 — Intelligence, Documents & Journal Expansions
> The knowledge layer — advanced features on top of the Phase 5 foundation

**Documents:**
- [ ] Artifact rendering — documents with HTML/JS render as live previews (like Claude Desktop artifacts)
- [ ] Version history — see how a document evolved across tasks
- [ ] File attachments — attach local files to tasks and documents

**Intelligence:**
- [ ] Weekly Recaps — auto-generated report (tasks completed, agents used, costs, key learnings) — runs on demand; scheduled in Phase 19
- [ ] Agent performance dashboard — fastest/cheapest per task type, success rate over time
- [ ] Anomaly detection — flag unusual spend, failed tasks, agent errors
- [ ] Recommendations — "Based on recent tasks, you should create a pipeline for X"
- [ ] Client intelligence panel — per-client knowledge hub (docs, tasks, patterns, contacts)

**Journal:**
- [ ] Auto-populate from pipeline runs and chat summaries
- [ ] Per-session decision log with timestamps and rationale

**Chat enhancements:**
- [ ] Conversation branching — fork at any message → parallel exploration threads

---

## Phase 19 — Scheduled Tasks & Automation
> Agents that work while you sleep — set it and forget it

**Cron scheduling:**
- [ ] Schedule any task to run at specific times/intervals (cron expression builder UI)
- [ ] "Skill Building" daily job (Phase 10) now runs on cron schedule
- [ ] "Weekly Recap" generation (Phase 18) now runs on cron schedule
- [ ] Dashboard shows upcoming scheduled tasks + last run status

**Pipeline triggers (extends Phase 17):**
- [ ] Scheduled trigger for pipelines — cron expression per pipeline
- [ ] Webhook trigger for pipelines — GitHub push, Jira update (OpenClaw channels handle Slack/Discord triggers)

**Watch mode:**
- [ ] Monitor a file/directory for changes → trigger a task on change
- [ ] Use case: re-run Sentinel's tests when Forge writes new code

**Background agents:**
- [ ] "Always-on" agent mode — long-running background process that monitors and acts
- [ ] Use case: Sentinel monitors connected repos for security vulnerabilities
- [ ] Use case: Nova monitors RSS feeds and creates intelligence briefings
- [ ] Resource controls: max tokens/hour, max cost/day for background agents

**Queue management:**
- [ ] Priority levels on tasks: urgent / high / normal / low
- [ ] Auto-scheduling — tasks start based on priority + agent availability + rate limits
- [ ] Concurrency limit — max simultaneous active tasks (prevent runaway spend)

---

## Phase 20 — Advanced Integrations Hub
> Connect what remains — Jira, data sources, and operational tooling
> Note: Slack, Discord, WhatsApp, Telegram, iMessage, and webhook channels are handled by OpenClaw in Phase 15

- [ ] Jira integration — OAuth connection, webhook for auto-ingestion, `[JIRA-42]` prefix on PRs
- [ ] API key rotation — multiple keys per provider for rate limit distribution
- [ ] Rate limit dashboard — current usage vs limits per provider
- [ ] Database browser (read-only) — inspect SQLite tables from within the app
- [ ] Export all data as JSON (tasks, agents, memories, documents)
- [ ] Backup/restore database
- [ ] Reset all settings — wipe preferences (accent, wallpaper, density, notifications, API keys) back to defaults with confirmation dialog
