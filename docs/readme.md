# 🧠 Mission Control

> Your personal AI command center — built locally on Mac, powered by Claude + OpenClaw.

## What is Mission Control?

Mission Control is a local Mac application that serves as a unified dashboard for managing, monitoring, and directing AI agents. It gives you full visibility into every autonomous task your AI bots are running, your API spend, your documents, and your agent personas — all from one dark-themed, native-feeling interface.

Built as the **first thing you should build with OpenClaw**, it becomes smarter and more useful the more you use it.

---

## Core Philosophy

- **Local first** — runs entirely on your Mac, no cloud dependency
- **AI-native** — Claude and OpenClaw are first-class citizens, not integrations
- **Extensible** — built to grow; every session reveals new features to add
- **Operator-grade** — mission-critical visibility into everything your AI is doing

---

## Key Screens

| Screen | Purpose |
|---|---|
| Dashboard | Bird's-eye view of all active projects, tasks, and agents |
| Workshop | Autonomous work queue — queue, start, and monitor tasks |
| Agents | Manage AI personas (Lyra, Nova, Scout, Forge, Pixel, Sentinel, Courier) with directives and roles |
| Chat | Talk to any agent with full system context — memory, tasks, and history included |
| Intelligence | AI-generated insights, recaps, and analysis |
| Documents | Recent files, briefs, and resources |
| API Metrics | Real-time token usage and cost tracking |
| Journal | Log of decisions, sessions, and outputs |
| Clients | Client-specific project tracking |

---

## Tech Stack

- **Runtime**: Electron + React (cross-window, local-first)
- **AI**: Claude API (claude-sonnet-4-20250514) + OpenClaw MCP
- **Storage**: Local SQLite via better-sqlite3
- **Styling**: Tailwind CSS — dark theme
- **Platform**: macOS (packaged with electron-builder)

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/you/mission-control.git
cd mission-control

# Install dependencies
npm install

# Add your API keys
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY and OPENCLAW keys

# Run in dev mode
npm run dev

# Build Mac app
npm run build:mac
```

---

## Project Structure

```
mission-control/
├── src/
│   ├── main/          # Electron main process
│   ├── renderer/      # React UI
│   │   ├── pages/     # Dashboard, Workshop, Agents, etc.
│   │   ├── components/# Reusable UI components
│   │   └── store/     # State management
│   ├── agents/        # Agent definitions & task runners
│   └── api/           # Claude + OpenClaw API clients
├── public/
├── docs/
├── .env.example
├── ROADMAP.md
├── ARCHITECTURE.md
└── package.json
```

---

## Design Principle — Open-Ended by Design

Orqis is intentionally open-ended. It is an **AI operations layer**, not a point solution.

The Jira → PR workflow is one use case among many. The same agent infrastructure supports content generation, research automation, monitoring, client intelligence, and workflows that haven't been imagined yet. Every session reveals new capabilities worth adding — the system is designed to grow with you.

- **Not a ticket processor** — it's a general-purpose AI command center
- **Not a chatbot wrapper** — agents have persistent personas, memory, and specializations
- **Not a one-trick tool** — composable building blocks for any autonomous workflow

---

## Status

🚧 **In active development** — v0.1 planning phase
