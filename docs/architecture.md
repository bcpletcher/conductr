# 🏗️ Mission Control — Architecture

## Overview

Mission Control is a local-first Mac desktop application. All data is stored on-device in SQLite. The UI is built in React inside an Electron shell. Claude and OpenClaw are called via their APIs but all state and history lives locally.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Desktop shell | Electron | Mac app packaging, native APIs |
| UI framework | React 18 | Component model, fast iteration |
| Styling | Tailwind CSS | Dark theme, utility-first |
| Local DB | SQLite (better-sqlite3) | Fast, local, no setup |
| State | Zustand | Lightweight, no boilerplate |
| AI — Claude | Anthropic API | Task execution, intelligence |
| AI — Agents | OpenClaw MCP | Autonomous agent orchestration |
| Charts | Recharts | API metrics visualization |
| Packaging | electron-builder | .dmg / .app for macOS |

---

## Folder Structure

```
mission-control/
│
├── src/
│   ├── main/                    # Electron main process (Node.js)
│   │   ├── index.ts             # App entry, BrowserWindow setup
│   │   ├── ipc/                 # IPC handlers (bridge to renderer)
│   │   │   ├── tasks.ts
│   │   │   ├── agents.ts
│   │   │   └── metrics.ts
│   │   └── db/                  # SQLite setup & queries
│   │       ├── schema.ts
│   │       ├── tasks.ts
│   │       ├── agents.ts
│   │       └── documents.ts
│   │
│   ├── renderer/                # React app (UI)
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Workshop.tsx
│   │   │   ├── Agents.tsx
│   │   │   ├── Intelligence.tsx
│   │   │   ├── Documents.tsx
│   │   │   ├── Metrics.tsx
│   │   │   ├── Journal.tsx
│   │   │   └── Clients.tsx
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── AgentCard.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── MetricCard.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── Modal.tsx
│   │   └── store/
│   │       ├── tasks.ts         # Zustand task store
│   │       ├── agents.ts
│   │       └── ui.ts
│   │
│   ├── api/
│   │   ├── claude.ts            # Anthropic API client
│   │   └── openclaw.ts          # OpenClaw MCP client
│   │
│   └── agents/
│       ├── runner.ts            # Task execution engine
│       ├── personas/
│       │   └── nova.ts          # Default agent definition
│       └── skills/              # Reusable agent skills
│
├── public/
│   └── icon.icns
│
├── docs/
│   ├── README.md
│   ├── ROADMAP.md
│   └── ARCHITECTURE.md
│
├── .env.example
├── electron-builder.yml
├── tsconfig.json
├── tailwind.config.js
└── package.json
```

---

## Data Model (SQLite)

### tasks
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'queued',  -- queued | active | complete | failed
  agent_id TEXT,
  client_id TEXT,
  tags TEXT,                     -- JSON array
  progress INTEGER DEFAULT 0,
  created_at TEXT,
  started_at TEXT,
  completed_at TEXT
);
```

### agents
```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  system_directive TEXT,
  operational_role TEXT,
  created_at TEXT
);
```

### activity_log
```sql
CREATE TABLE activity_log (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  agent_id TEXT,
  message TEXT,
  timestamp TEXT
);
```

### documents
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

### api_usage
```sql
CREATE TABLE api_usage (
  id TEXT PRIMARY KEY,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd REAL,
  task_id TEXT,
  agent_id TEXT,
  timestamp TEXT
);
```

### messages
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  role TEXT,        -- 'user' | 'assistant'
  content TEXT,
  created_at TEXT
);
```

---

## IPC Architecture (Electron)

The renderer (React) communicates with the main process via Electron IPC:

```
Renderer (React)
    ↓ window.electronAPI.invoke('tasks:create', payload)
Main Process (Node)
    ↓ ipcMain.handle('tasks:create', handler)
SQLite DB / Claude API / OpenClaw
```

All API keys live in the main process only — never exposed to the renderer.

---

## Agent Architecture

Orqis uses a **named agent model**. Each agent has a persona, system directive, operational role, and specialization. The system ships with 7 default agents but supports **unlimited custom agents** created through the UI.

### Default Agents

| Agent | Role | Specialization |
|---|---|---|
| **Lyra** | Lead Orchestrator | Delegates objectives, ensures mission success, commands the centre |
| **Nova** | General Intelligence | Broad-purpose research, analysis, and content generation |
| **Scout** | Repository Analyst | Codebase exploration, dependency auditing, architecture mapping |
| **Forge** | Backend Engineer | API design, database work, server-side implementation |
| **Pixel** | Frontend Engineer | UI/UX implementation, component design, styling |
| **Sentinel** | QA & Security | Testing, vulnerability scanning, code review |
| **Courier** | Delivery & Ops | CI/CD, deployments, PR creation, release management |

### Agent Schema

Each agent is defined by:
- **id** — unique identifier (e.g. `agent-lyra`)
- **name** — display name
- **avatar** — emoji or icon identifier
- **system_directive** — the core instruction that shapes the agent's personality and goals
- **operational_role** — detailed description of responsibilities
- **specialization** — domain of expertise (used for auto-assignment)

### Custom Agents

Users can create unlimited additional agents through the Agents screen. Custom agents follow the same schema and can be assigned to any task. The system is designed to grow — every workflow reveals new agent specializations worth adding.

---

## Jira → PR Workflow

Orqis supports an end-to-end workflow from ticket ingestion to pull request creation. This is one example of the platform's general-purpose automation — Orqis is not a ticket processor, but a flexible AI operations layer.

### 6-Step Pipeline

```
1. Ingest    → Pull ticket from Jira (or manual task creation)
2. Analyze   → Scout agent examines codebase context
3. Plan      → Lyra decomposes into subtasks, assigns agents
4. Execute   → Forge/Pixel implement changes with activity logging
5. Validate  → Sentinel runs tests, reviews code quality
6. Deliver   → Courier creates PR with linked ticket reference
```

### Data Flow

```
Jira API / Manual Input
    ↓
Task Queue (Workshop)
    ↓ agent assignment
Agent Runner (Claude API)
    ↓ streaming activity log
SQLite (progress, tokens, cost)
    ↓ on completion
Git Operations → PR Creation
```

---

## Design Principle — Open-Ended by Design

Orqis is intentionally open-ended. It is an **AI operations layer**, not a point solution. The Jira → PR workflow is one use case among many — the same agent infrastructure supports content generation, research automation, monitoring, client intelligence, and workflows that haven't been imagined yet.

The architecture prioritizes:
- **Composability** — agents, tasks, and workflows are building blocks, not rigid pipelines
- **Discoverability** — every session reveals new capabilities worth adding
- **Local sovereignty** — all data and decision-making stays on your machine
- **Progressive complexity** — start simple, grow the system as needs evolve

---

## Design System

- **Background**: `#08080d` (deep space)
- **Surface**: `rgba(255,255,255,0.03)` (frosted glass)
- **Card**: `rgba(255,255,255,0.04)` with `backdrop-filter: blur(24px) saturate(1.2)`
- **Border**: `rgba(255,255,255,0.06)` (white-alpha)
- **Accent primary**: `#818cf8` (indigo)
- **Accent secondary**: `#a78bfa` (violet)
- **Accent green**: `#34d399` (active states)
- **Accent cyan**: `#22d3ee`
- **Text primary**: `#f1f5f9`
- **Text secondary**: `#cbd5e1`
- **Text muted**: `#64748b`
- **Font**: System font stack (SF Pro on Mac)
- **Sidebar width**: 240px fixed
- **Card radius**: 14px
- **Glass effect**: Apple Liquid Glass — semi-transparent backgrounds + backdrop-blur + white-alpha inset highlights
- **Status badges**: color-coded pill components with glow variants
- **Icons**: Font Awesome (self-hosted webfonts)
