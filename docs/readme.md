# Dispatchr

> Single AI operations layer — replacing Claude Desktop, ChatGPT, Codex, and Cursor. Manage, direct, and ship work through a team of specialized AI agents without switching apps.

## Status
**Phases 0–4 complete.** Phase 8 in progress. 20/20 tests passing.

---

## Running Locally

```bash
npm install
cp .env.example .env       # add ANTHROPIC_API_KEY
npm run dev                # hot-reload dev
npm test                   # build + playwright E2E
npm run build:mac          # .dmg packaging
```

---

## Tech Stack

Electron 29 · React 18 · TypeScript 5 · Tailwind CSS 4 · SQLite (better-sqlite3) · Anthropic SDK · Recharts · Font Awesome Free · Playwright

---

## Key Screens

| Screen | Status | Purpose |
|---|---|---|
| Dashboard | ✅ | Live task counts, spend, activity feed, quick links |
| Workshop | ✅ | Task queue, Claude streaming, live progress |
| Agents | ✅ | 7 default agents + custom, SVG avatars, CRUD |
| API Metrics | ✅ | Budget limits, spend charts, per-agent breakdown |
| Chat | 🔄 | Streaming per-agent chat (Phase 8: rich rendering) |
| Intelligence | Phase 5 | AI-generated insights, anomaly detection |
| Documents | Phase 5 | Auto-generated from task outputs |
| Journal | Phase 5 | Session log with decisions and timestamps |
| Clients | Phase 6 | Client-specific project tracking |
| Settings | Phase 13 | API keys, budget, repos, MCP, appearance |

---

## Default Agents

Lyra (orchestrator) · Nova (general) · Scout (repo analyst) · Forge (backend) · Pixel (frontend) · Sentinel (QA) · Courier (delivery)

---

## Docs

- `docs/roadmap.md` — phase-by-phase feature checklist
- `docs/architecture.md` — tech stack, data model, IPC, design system
- `docs/v1spec.md` — screen specs and acceptance criteria
- `docs/context.md` — original video reference
