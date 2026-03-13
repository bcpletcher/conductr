# 📋 Dispatchr — Feature Spec

## Goal
Ship a local Mac app that serves as the **single AI operations layer** — replacing Claude Desktop, ChatGPT, Codex, and every other AI tool with one unified command centre for building, managing, and shipping work through a team of specialized AI agents. Users should never need to switch to another app.

---

## Completed (V1 Shipped)

### ✅ Done
- Dashboard with live widgets (task counts, spend, activity feed, documents, quick links)
- Workshop task queue (create, start, monitor tasks with streaming progress)
- Agents screen (7 default agents seeded with SVG avatars, create/edit custom agents)
- API Metrics screen (token + cost tracking, 7-day bar chart)
- Chat interface (per-agent conversation history, streaming, typewriter effect)
- Claude API integration for task running and chat
- Local SQLite persistence (`dispatchr.db`)
- Apple Liquid Glass UI (backdrop-blur, rgba panels, inset highlights)
- Font Awesome icons (self-hosted)
- Inter Variable font (self-hosted, cross-platform)
- Playwright E2E test harness

### ❌ Out of Scope for V1 (moved to later phases)
- Rich markdown/code rendering in chat (Phase 8)
- Multi-provider LLM engine (Phase 15)
- Agent memory & learning system (Phase 9)
- Real repo/file access and git operations (Phase 10)
- MCP tool integration (Phase 11)
- Multi-agent pipelines (Phase 12)
- Settings & Integrations Hub (Phase 13)
- Intelligence/Documents/Journal (Phase 14)
- Scheduled tasks & automation (Phase 16)
- Clients screen (Phase 6)

---

## Screen Specs

---

### 1. Dashboard

**Layout**: Sidebar (240px fixed) + content grid

**Sidebar Navigation**:
- Dispatchr (logo + title)
- Dashboard ← default page
- Workshop
- Chat
- Agents
- Intelligence
- Documents
- Clients
- API Manager
- Settings

**Top Bar**:
- App title: "Dispatchr"
- Subtitle: "Real-time overview of all systems"
- Status pill (green = connected, animating)
- *(Phase 7)* Command palette trigger (Cmd+K) + notification bell

**Widget Grid**:

| Widget | Content |
|---|---|
| Metric Cards (top row, 6 cols) | Queued count, Active count, Completed, Today's Spend, 7-Day Spend, Total Tokens |
| Live Activity (left) | Scrollable activity log feed (agent, timestamp, status badge) |
| Recent Documents (right) | Last 5 docs with title, date |
| Quick Links (right) | Configurable shortcut buttons to pages |
| *(Phase 16)* Scheduled Tasks (bottom) | Next scheduled run, last run status, upcoming jobs |
| *(Phase 15)* Provider Status (sidebar) | Health indicators per LLM provider (green/yellow/red) |

---

### 2. Workshop

**Header**: "Workshop" + "Autonomous work queue & live progress"

**Tab Bar**: Queued (n) | Active (n) | Complete (n) | *(Phase 12)* Pipelines (n)

**Task Card**:
```
[Status badge]  Task Title                    [Priority badge] [Start → button (hover)]
                Description text (2 lines max)
                [Tag pill] [Tag pill]  65% complete  |  3h ago
                ████████░░░░░░░░░░░░  (progress bar — active only)
```

**Task Detail Modal** (click a card):
- Title + status badge + Start button (if queued)
- *(Phase 16)* Priority selector (urgent / high / normal / low)
- Full description
- Tags row
- Created / Started / Agent row
- Progress bar (if active)
- Activity Log — live-streaming during execution, loaded from DB if complete
- *(Phase 10)* File tree panel (when task has linked repo)
- *(Phase 10)* Diff viewer (when agent proposes code changes)
- *(Phase 10)* Terminal output panel (when agent runs commands)
- Glass modal (`max-w-2xl`)

**New Task Form Modal**:
- Title (required)
- Description (textarea)
- Tags (comma-separated input)
- *(Phase 16)* Priority selector
- Assign Agent (dropdown — all agents)
- *(Phase 10)* Link Repo (dropdown — connected repos)
- *(Phase 16)* Schedule (optional cron, e.g. "daily at 9am")
- [Queue Task] button

---

### 3. Agents

**Layout**: Left panel (agent list, scrollable) + Right panel (agent detail, flex-1)

**Agent Card**: SVG avatar (rounded rectangle) + name + operational_role subtitle

**Agent Detail Tabs**:
- **Profile** — name, avatar, system directive, operational role, [Save/Delete]
- *(Phase 9)* **Memories** — list of all memories with tags, filter, delete
- *(Phase 9)* **Experience** — task count, domains mastered, skill level indicators
- *(Phase 11)* **Tools** — checklist of assigned MCP servers
- *(Phase 15)* **Model** — provider + model override selector

**Default Agent — Lyra** (Lead Orchestrator):
```
Name: Lyra
Avatar: agent-lyra.svg (SVG)
System Directive: "To provide the user with ultimate leverage through autonomous intelligence swarms."
Role: Lead intelligence and commander of the centre. Responsible for delegating high-thrust
      objectives and ensuring mission success.
```

**Full Agent Roster** (7 default, unlimited custom via UI):

| Agent | SVG | Role | Specialization |
|---|---|---|---|
| Lyra | `agent-lyra.svg` | Lead Orchestrator | Delegates objectives, commands the centre |
| Nova | `agent-nova.svg` | General Intelligence | Research, analysis, content generation |
| Scout | `agent-scout.svg` | Repository Analyst | Codebase exploration, dependency auditing |
| Forge | `agent-forge.svg` | Backend Engineer | API design, database, server-side |
| Pixel | `agent-pixel.svg` | Frontend Engineer | UI/UX, components, styling |
| Sentinel | `agent-sentinel.svg` | QA & Security | Testing, vulnerability scanning, code review |
| Courier | `agent-courier.svg` | Delivery & Ops | CI/CD, PRs, deployments, releases |

---

### 4. API Metrics

**Header**: "API Usage & Metrics" + "Real-time financial and token intelligence"

**Metric Cards Row**: Today's Spend | 7-Day Billing | Total Tokens | Most Active Model
*(Phase 15)* Provider breakdown row: Anthropic spend | OpenAI spend | Google spend | Local (free)

**Chart**: 7-day spend bar chart (Recharts BarChart, accent-indigo fill)
*(Phase 15)* Stacked bars: one color per provider

**Per-Task Breakdown Table**:
| Task | Agent | Provider | Model | In | Out | Cost | Date |
|---|---|---|---|---|---|---|---|

*(Phase 13)* **Budget Panel**: Daily progress bar (spent / limit), monthly progress bar, alert thresholds

---

### 5. Chat

> **Design Principle — Chat is the Primary Interface.**
> This is the main reason users might open Claude Desktop or ChatGPT instead. Every rendering, interaction, and intelligence feature must match or exceed those tools.

**Header**: Agent avatar + name | Agent switcher dropdown | *(Phase 8)* Context meter (tokens remaining)

**Layout**: `flex flex-col h-full` — message thread (flex-1, scrollable) + input bar (pinned bottom)

**Message Thread (current)**:
- User: right-aligned, indigo-tinted glass bubble
- Agent: left-aligned, glass card with agent avatar (sm size) + name label
- Streaming: typewriter cursor during generation, typing dots before first token
- Empty thread: large agent avatar + directive text + "Send a message" prompt

**Rich Rendering (Phase 8 — critical for feature parity)**:
- Markdown: headers, bold, italic, lists, blockquotes, tables
- Code blocks: syntax-highlighted (Shiki), language label, copy button, *(Phase 10)* "Run" button
- Inline code: monospace with subtle background
- Diffs: inline + side-by-side for code changes
- Mermaid diagrams: rendered inline from agent output
- Links: clickable with URL preview on hover
- Images: thumbnail previews for pasted/attached images

**Multimodal Input (Phase 8)**:
- Image paste (Cmd+V) → sent to vision-capable model for analysis
- Drag-and-drop images and files into chat
- Screenshot capture button (Electron `desktopCapturer`)
- @-mention syntax: `@Scout` to pull in agent knowledge, `@file:auth.ts` to inject file

**Action Awareness (Phase 8)**:
- "Queue that as a task" → confirmation chip → task created
- "Start the Jira workflow for MC-42" → confirmation → pipeline triggered
- "Run this" on code blocks → execute in terminal
- "Save this as a document" → create document from message

**Context Intelligence (Phase 8)**:
- Context window indicator: token count per message, remaining capacity bar
- Auto-enriched system prompt: active tasks, recent activity, agent status
- Context budget visualization: see exactly what fills the window

**Conversation Management (Phase 8)**:
- Search across all threads (per-agent + global)
- Export as markdown (full thread or selection)
- Conversation branching: fork at any message
- Message bookmarks / pinning
- Message annotations (add notes)

**Broadcast Mode (Phase 8)**:
- Fan single message to all agents simultaneously
- Multi-column response view (one per agent)
- Compare side-by-side, select best, continue that thread

**Code Execution (Phase 10 integration)**:
- "Run" button on code blocks → execute in connected repo terminal
- Output inline below code block
- Iterative loop: agent sees error → proposes fix → user approves → re-runs

**Agent Switcher**:
- Dropdown shows all agents (defaults + custom)
- Switching agent: clears current stream, loads that agent's history
- Each agent has isolated thread in `messages` table
- *(Phase 15)* Shows provider/model indicator per agent

**Input Bar**:
- Auto-resize textarea (1 row → max 160px), `Enter` to send, `Shift+Enter` for newline
- Send button (spinner during streaming)
- *(Phase 8)* Attach file button (images, code files, PDFs)
- *(Phase 8)* Broadcast toggle button
- *(Phase 9)* Prompt quality indicator (after typing, before send — subtle score + suggestion)
- Disabled state when no agent selected

---

### 6. Settings (Phase 13)

**Layout**: Left sidebar (section list) + Right panel (section content)

**Sections**:

| Section | Content |
|---|---|
| **API Keys** | Anthropic, OpenAI, Google, GitHub, GitLab, Jira, Slack — encrypted storage |
| **Models** | Global default model, max tokens, *(Phase 15)* per-provider model preferences |
| **Budget** | Daily/monthly limits, alert thresholds, hard stop toggle, cost pacing |
| **Repos** | Connected repos (path, name, branch), add/remove |
| **MCP Servers** | Server list with enable/disable, add custom, test connection |
| **Notifications** | Per-event toggles, notification mode (always / background / never) |
| **Appearance** | Accent color, density (compact/comfortable), sidebar position |
| **Shortcuts** | Keybinding customization, cheat sheet |
| **Data** | Export (JSON/CSV), backup/restore, clear memories, DB location |
| **About** | Version, update check, links |

---

## Prompt Intelligence Spec (Phase 9)

### The Problem (from original video)
The original video concept shows the app analyzing user prompts and suggesting improvements. Currently Dispatchr passes prompts through without any analysis — users don't know if their prompts are clear, specific, or likely to succeed.

### How It Works

**Pre-send analysis** (optional, toggle in Settings):
```
User types prompt in Chat or Task description
    ↓
Lightweight classifier (local heuristics + optional mini LLM call)
    Checks: specificity, scope clarity, success criteria, appropriate agent assignment
    ↓
Inline suggestion appears below input (subtle, non-blocking):
    "💡 This prompt is vague about scope. Try specifying which files or modules to focus on."
    ↓
User can: ignore, apply suggestion, or dismiss permanently for this prompt style
```

**Post-task analysis**:
```
Task completes (success or failure)
    ↓
Score original prompt quality (0.0–1.0) based on:
    - Did the task succeed?
    - How many iterations/retries were needed?
    - Did the agent ask for clarification?
    - How long did execution take vs expected?
    ↓
prompt_analysis row stored with original_prompt, score, suggestions, outcome
```

**Prompt Dashboard** (Intelligence page):
- Average prompt quality score over time (line chart)
- Most common improvement suggestions
- Best-performing prompt patterns (templates)
- Failed prompts with "what went wrong" analysis

**Prompt Templates**:
- Save effective prompts as reusable templates
- Template library searchable by tag/domain
- Auto-suggest template when typing similar prompt

---

## Multi-Provider LLM Spec (Phase 15)

### The Problem
Dispatchr currently only supports Anthropic/Claude. Users who also use GPT-4o, Gemini, or local models (Ollama) must switch to other apps for those models. This is the biggest reason to leave Dispatchr.

### Provider Configuration (Settings page)

| Provider | SDK | Auth | Models |
|---|---|---|---|
| Anthropic | `@anthropic-ai/sdk` | API key | claude-opus, claude-sonnet, claude-haiku |
| OpenAI | `openai` | API key | gpt-4o, o3, o4-mini |
| Google | `@google/genai` | API key | gemini-2.0-pro, gemini-2.0-flash |
| Ollama | HTTP API | None (local) | llama3, codellama, mistral, etc. |
| OpenRouter | HTTP API | API key | 100+ models via single endpoint |

### Per-Agent Model Assignment
In Agent detail → Model tab:
- Provider dropdown (Anthropic / OpenAI / Google / Ollama / OpenRouter)
- Model dropdown (filtered by selected provider)
- "Use global default" checkbox (checked by default)

### Unified Streaming Interface
All providers normalize to the same stream event shape:
```typescript
type StreamEvent =
  | { type: 'chunk'; text: string }
  | { type: 'done'; usage: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; message: string }
```

Chat and task runner don't care which provider is streaming — they all look the same.

### Model Comparison Mode (Chat)
- Toggle in Chat: "Compare"
- Send prompt to 2-3 models simultaneously
- Responses appear in side-by-side columns (like Broadcast but across models, not agents)
- Select best response and continue

---

## Scheduled Tasks & Automation Spec (Phase 16)

### The Problem
Currently every task must be manually created and started. Users can't set up recurring work, background monitoring, or event-triggered automation. Codex and Devin both support this — Dispatchr must too.

### Cron Scheduling (Workshop → New Task)
- Optional "Schedule" field: dropdown with presets (hourly, daily at 9am, weekly Monday, custom cron)
- Scheduled tasks appear in Dashboard "Upcoming" widget
- Run history visible in task detail (list of past executions with status)

### Background Agents
- "Always-on" toggle in Agent detail — agent runs as persistent background process
- Use cases: security monitoring, repo watching, RSS analysis
- Resource controls: max tokens/hour, max cost/day (pause on exceed)
- Background agent logs stream to dedicated "Background" tab in Workshop

### Webhook Receiver
- Local HTTP server (off by default, configurable port in Settings)
- Webhook URL format: `http://localhost:{port}/webhook/{hookId}`
- Map webhook → task template + agent + auto-start toggle
- Supported triggers: GitHub push/PR/issue, Jira ticket create, Slack message, custom POST

### Queue Priority
- Tasks have priority: urgent (red) / high (orange) / normal (default) / low (gray)
- Auto-scheduler: higher priority tasks start before lower
- Urgent tasks interrupt normal queue (preempt idle agents)

---

## Acceptance Criteria

### V1 — All Met ✅
- [x] App launches as a macOS .app
- [x] Dashboard loads with all widget areas
- [x] Can create a task in Workshop and assign to an agent
- [x] Can start a task and see Claude's response stream in real time
- [x] Task status transitions correctly (queued → active → complete/failed)
- [x] Live progress updates on task cards during execution
- [x] All 7 default agents visible with SVG avatars
- [x] Chat works with all 7 agents, history persists across restarts
- [x] API Metrics shows real cost data after running a task
- [x] All data persists across app restarts (SQLite)
- [x] Apple Liquid Glass aesthetic
- [x] Font Awesome icons render as webfonts

### Phase 8 — Rich Chat
- [ ] Markdown renders correctly (headers, bold, lists, code blocks)
- [ ] Code blocks have syntax highlighting, language label, and copy button
- [ ] Images can be pasted into chat and analyzed by agent
- [ ] Conversation search finds messages across all threads
- [ ] Context meter shows token usage and remaining capacity

### Phase 9 — Agent Memory
- [ ] Completing a task automatically produces ≥1 memory entry
- [ ] Starting a new task includes prior memories in system prompt
- [ ] Memory viewer in Agent detail shows all memories
- [ ] Cross-agent knowledge_base entries appear in other agents' context
- [ ] Prompt quality analysis shows suggestion before send
- [ ] Prompt scores tracked over time

### Phase 10 — Dev Tools
- [ ] Can connect a local Git repo from Settings
- [ ] Scout reads actual file contents from connected repo
- [ ] Forge/Pixel write proposed changes (after diff approval)
- [ ] `git commit` executes successfully
- [ ] GitHub PR created via API with correct title and body
- [ ] Live preview shows running web app with auto-refresh

### Phase 12 — Pipelines
- [ ] Can create a multi-step pipeline in Workshop
- [ ] Steps execute in correct dependency order
- [ ] Output of Step N available as context in Step N+1
- [ ] Pipeline status shows per-step live status
- [ ] Agents can communicate mid-pipeline without user intermediation

### Phase 15 — Multi-Provider
- [ ] Can configure OpenAI, Google, and Ollama API keys in Settings
- [ ] Different agents can use different providers/models
- [ ] Cost tracking works across all providers
- [ ] Chat streaming works identically regardless of provider
- [ ] Failover routes to backup provider when primary is down

### Phase 16 — Automation
- [ ] Can schedule a task to run daily at a specific time
- [ ] Scheduled task executes on time and logs results
- [ ] Webhook endpoint receives POST and creates a task
- [ ] Priority ordering respected in task queue
