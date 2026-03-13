# 📋 Mission Control — V1 Feature Spec

## Goal
Ship a working local Mac app that replicates the core Mission Control UI seen in the video, with live Claude integration for task execution.

---

## V1 Scope

### ✅ In Scope
- Dashboard with live widgets
- Workshop task queue (create, start, monitor tasks)
- Agents screen (create/view agent personas)
- API Metrics screen (token + cost tracking)
- Claude API integration for task running
- Local SQLite persistence
- Mac .app build

### ❌ Out of Scope for V1
- OpenClaw MCP integration (Phase 2)
- Clients screen
- Journal screen
- Mobile companion
- Multi-device sync

---

## Screen Specs

---

### 1. Dashboard

**Layout**: Sidebar (left, 200px) + Top bar + Main content grid

**Sidebar Navigation**:
- Mission Control (logo/title)
- Dashboard ← active
- Journal
- Documents
- Agents
- Intelligence
- Weekly Recaps
- Clients
- Core Data

**Top Bar**:
- App title: "Mission Control"
- Subtitle: "Real-time overview of all systems"
- Status dot (green = connected)

**Widget Grid** (2-column):

| Widget | Content |
|---|---|
| Status Cards (top row, 4 cols) | Queued count, Active count, Completed today, Total agents |
| Live Activity | Scrollable list of in-progress tasks with agent, timestamp, status badge |
| Recent Documents | Last 5 docs with title, date, link |
| Quick Links | Configurable shortcut buttons (e.g. Workshop, Client Intelligence, DevOps) |

---

### 2. Workshop

**Header**: "Mission Control Workshop" + "Autonomous work queue & live progress"

**Tab Bar**: Queued (n) | Active (n) | Completed | [Live Feed button]

**Task Card**:
```
[Status badge]  Task Title                    [Active badge / Start →]
                Description text (2 lines max)
                [Tag pill] [Tag pill]          Progress: 65%  |  3h ago
```

**Task Detail Modal** (click a card):
- Title + status badge
- Full description
- Tags row
- Created / Started dates
- Progress bar
- Activity log (timestamped steps, scrollable)
- [Close] button

**New Task** button → opens create form:
- Title (required)
- Description
- Tags (multi-select)
- Assign Agent (dropdown)
- [Queue Task] button

---

### 3. Agents

**Agent List**:
- Agent card: avatar icon, name, role subtitle, task count badge
- [+ New Agent] button

**Agent Detail Page**:
- Large avatar + name
- System Directive (text block)
- Operational Role (text block)
- Assigned Tasks list
- Activity history

**Default Agent — Lyra** (Lead Orchestrator):
```
Name: Lyra
Avatar: ✦
System Directive: "To provide the user with ultimate leverage through autonomous intelligence swarms."
Role: Lead intelligence and commander of the centre. Responsible for delegating high-thrust objectives and ensuring mission success.
```

**Full Agent Roster** (7 default, unlimited custom via UI):

| Agent | Role | Specialization |
|---|---|---|
| Lyra | Lead Orchestrator | Delegates objectives, commands the centre |
| Nova | General Intelligence | Research, analysis, content generation |
| Scout | Repository Analyst | Codebase exploration, dependency auditing |
| Forge | Backend Engineer | API design, database, server-side |
| Pixel | Frontend Engineer | UI/UX, components, styling |
| Sentinel | QA & Security | Testing, vulnerability scanning, code review |
| Courier | Delivery & Ops | CI/CD, PRs, deployments, releases |

The agent dropdown in Workshop shows all available agents. Users create custom agents with their own directives and roles through the Agents screen.

---

### 4. API Metrics

**Header**: "API Usage & Metrics" + "Real-time financial and token intelligence"

**Cards Row**:
- Today's Spend: `$0.00`
- 7-Day Billing: `$0.08`
- Total Tokens (month)
- Most active model

**Chart**: 7-day spend bar chart (Recharts)

**Per-Task Breakdown Table**:
| Task | Model | Tokens | Cost | Date |
|---|---|---|---|---|

---

### 5. Chat

**Header**: Agent name + avatar | Agent switcher dropdown (right)

**Layout**: Full-height split — message thread (scrollable, top) + input bar (pinned bottom)

**Message Thread**:
- User messages: right-aligned, glass bubble, accent border
- Agent messages: left-aligned, glass card, agent avatar + name label
- Streaming response renders with typewriter effect (token-by-token via IPC)
- Timestamps on hover

**Agent Switcher**:
- Dropdown shows all 7 default agents + any custom agents
- Switching agent preserves the conversation history per agent (each agent has its own thread)
- Selected agent's system directive loads automatically — no manual prompt setup

**Input Bar**:
- Text input with `Shift+Enter` for newlines, `Enter` to send
- Attach file button — paste code snippets or reference documents inline
- Broadcast button — sends the message to all agents and opens a multi-column response view

**Action Awareness** (chat → system):
- Phrases like "queue that as a task" or "start the Jira workflow for MC-42" trigger in-chat confirmation chips
- User confirms → system action executes in background (task created, workflow started, etc.)
- Result is echoed back in the chat thread as a system message

**Context Injection** (automatic):
- Current active tasks count, recent activity log entries, and agent status are automatically included in the system prompt for each message — no user action required

**Persistence**:
- All messages stored in SQLite `messages` table with `agent_id`, `role`, `content`, `created_at`
- Thread is restored exactly on next app launch per agent

**Broadcast Mode**:
- Toggle activates multi-column view — one column per agent
- Single message fans out to all agents simultaneously
- Each agent streams its response in its own column

---

> **Design Principle — Chat is the Primary Interface**
>
> The chat interface is not a support tool — it is the primary way users interact with agents. Every agent in the system is conversational by default. The goal is to eventually replace the need for external AI chat tools entirely by making Dispatchr the single place where you think, plan, build, and ship — all in one window. Unlike Claude.ai or ChatGPT, this chat already knows your agents, tasks, projects, and history. There is no re-explaining context every session.

---

## UI Design Spec

### Colors
```css
--bg-base: #0a0a0f;
--bg-surface: #12121a;
--bg-card: #16161f;
--border: #1e1e2e;
--accent-primary: #6366f1;
--accent-green: #22c55e;
--accent-orange: #f97316;
--text-primary: #e2e8f0;
--text-muted: #64748b;
```

### Status Badge Colors
- `queued` → gray
- `active` → indigo/blue pulse
- `in-progress` → orange
- `complete` → green
- `failed` → red

### Typography
- Headings: 600 weight, SF Pro / system font
- Body: 400 weight
- Mono: for logs, code, timestamps

---

## Claude Integration (V1)

When a task is started from Workshop:

1. Fetch task details from SQLite
2. Fetch assigned agent's system directive
3. Build prompt:
```
System: [agent.system_directive]

Task: [task.title]
Description: [task.description]

Execute this task step by step. Log each step clearly.
```
4. Stream response → append to activity_log in real time
5. Update task status → `active` then `complete`
6. Track token usage → insert to api_usage table

---

## Jira → PR Workflow

Orqis supports an end-to-end automation pipeline from ticket ingestion to pull request creation. This is one example workflow — the system is general-purpose, not a ticket processor.

### Pipeline Steps

```
Step 1 — Ingest
  Source: Jira API webhook or manual task creation in Workshop
  Output: Task queued with ticket metadata (ID, title, description, acceptance criteria)

Step 2 — Analyze
  Agent: Scout
  Action: Examine target repository — map architecture, identify relevant files,
          check dependencies, review recent changes
  Output: Context report attached to task activity log

Step 3 — Plan
  Agent: Lyra
  Action: Decompose ticket into subtasks, assign specialist agents,
          define execution order and dependencies
  Output: Subtask list with agent assignments

Step 4 — Execute
  Agents: Forge (backend) / Pixel (frontend) / as assigned
  Action: Implement changes with streaming activity log,
          commit progress to activity_log table
  Output: Code changes + detailed step-by-step log

Step 5 — Validate
  Agent: Sentinel
  Action: Run test suite, lint, security scan, code review
  Output: Validation report — pass/fail with details

Step 6 — Deliver
  Agent: Courier
  Action: Create branch, commit, push, open PR with:
          - Linked Jira ticket reference
          - Summary of changes from activity log
          - Test results from validation step
  Output: PR URL logged to task, status → complete
```

### Integration Points

- **Jira**: OAuth connection configured in Settings, webhook for auto-ingestion
- **GitHub/GitLab**: Token-based auth for PR creation
- **Claude API**: Powers each agent's reasoning and code generation
- **SQLite**: All progress, tokens, and costs tracked locally

---

## Acceptance Criteria

- [ ] App launches as a macOS .app
- [ ] Dashboard loads with all 4 widget areas
- [ ] Can create a task in Workshop
- [ ] Can start a task and see Claude's response stream in activity log
- [ ] Agent list shows at least Lyra by default
- [ ] API Metrics shows real cost data after running a task
- [ ] All data persists across app restarts (SQLite)
- [ ] Dark theme with Apple Liquid Glass aesthetic
