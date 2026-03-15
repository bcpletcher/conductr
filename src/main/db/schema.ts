import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { seedAgentSkillFiles } from './skillTemplates'
import { migrateToSecureSettings } from '../security'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}

export function initDb(): Database.Database {
  const dbPath = path.join(app.getPath('userData'), 'conductr.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables(db)
  seedDefaults(db)
  migrateToSecureSettings(db)

  return db
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'queued',
      agent_id TEXT,
      client_id TEXT,
      tags TEXT DEFAULT '[]',
      progress INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT DEFAULT '🤖',
      system_directive TEXT,
      operational_role TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      agent_id TEXT,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      task_id TEXT,
      client_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS api_usage (
      id TEXT PRIMARY KEY,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0.0,
      task_id TEXT,
      agent_id TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      entry_type TEXT DEFAULT 'manual',
      task_id TEXT,
      agent_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS intelligence_insights (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      insight_type TEXT NOT NULL,
      period_start TEXT,
      period_end TEXT,
      agent_ids TEXT DEFAULT '[]',
      task_ids TEXT DEFAULT '[]',
      is_read INTEGER DEFAULT 0,
      generated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_files (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      UNIQUE(agent_id, filename)
    );

    CREATE TABLE IF NOT EXISTS ideas (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      what         TEXT,
      why          TEXT,
      risks        TEXT,
      effort       TEXT,
      phase        TEXT,
      source_agent TEXT DEFAULT 'Lyra',
      status       TEXT DEFAULT 'pending',
      deny_reason  TEXT,
      task_id      TEXT,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );

    -- Phase 10: Agent memories (scoped by client + domain)
    CREATE TABLE IF NOT EXISTS agent_memories (
      id              TEXT PRIMARY KEY,
      agent_id        TEXT NOT NULL,
      client_id       TEXT,
      domain_tags     TEXT DEFAULT '[]',
      skill_tags      TEXT DEFAULT '[]',
      content         TEXT NOT NULL,
      relevance_score REAL DEFAULT 1.0,
      source          TEXT DEFAULT 'task',
      task_id         TEXT,
      skill_level     TEXT,
      created_at      TEXT NOT NULL,
      last_used_at    TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    -- Phase 10: Cross-agent shared knowledge pool
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      content      TEXT NOT NULL,
      source_agent TEXT,
      domain_tags  TEXT DEFAULT '[]',
      client_id    TEXT,
      created_at   TEXT NOT NULL,
      updated_at   TEXT
    );

    -- Phase 10: Prompt templates library
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id          TEXT PRIMARY KEY,
      agent_id    TEXT,
      name        TEXT NOT NULL,
      content     TEXT NOT NULL,
      tags        TEXT DEFAULT '[]',
      usage_count INTEGER DEFAULT 0,
      created_at  TEXT NOT NULL,
      updated_at  TEXT
    );

    -- Phase 10: FTS5 virtual tables (full-text search)
    CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
      id UNINDEXED, title, description, tokenize='porter unicode61'
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      id UNINDEXED, title, content, tokenize='porter unicode61'
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS journal_fts USING fts5(
      id UNINDEXED, title, content, tokenize='porter unicode61'
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      id UNINDEXED, content, tokenize='porter unicode61'
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS agents_fts USING fts5(
      id UNINDEXED, name, operational_role, system_directive, tokenize='porter unicode61'
    );
  `)

  // Phase 10: FTS5 keep-in-sync triggers
  const ftsTriggers = [
    // tasks
    `CREATE TRIGGER IF NOT EXISTS tasks_fts_insert AFTER INSERT ON tasks BEGIN
       INSERT INTO tasks_fts(id, title, description) VALUES (new.id, new.title, new.description);
     END`,
    `CREATE TRIGGER IF NOT EXISTS tasks_fts_delete BEFORE DELETE ON tasks BEGIN
       DELETE FROM tasks_fts WHERE id = old.id;
     END`,
    `CREATE TRIGGER IF NOT EXISTS tasks_fts_update AFTER UPDATE ON tasks BEGIN
       DELETE FROM tasks_fts WHERE id = old.id;
       INSERT INTO tasks_fts(id, title, description) VALUES (new.id, new.title, new.description);
     END`,
    // documents
    `CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents BEGIN
       INSERT INTO documents_fts(id, title, content) VALUES (new.id, new.title, new.content);
     END`,
    `CREATE TRIGGER IF NOT EXISTS documents_fts_delete BEFORE DELETE ON documents BEGIN
       DELETE FROM documents_fts WHERE id = old.id;
     END`,
    `CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents BEGIN
       DELETE FROM documents_fts WHERE id = old.id;
       INSERT INTO documents_fts(id, title, content) VALUES (new.id, new.title, new.content);
     END`,
    // journal_entries
    `CREATE TRIGGER IF NOT EXISTS journal_fts_insert AFTER INSERT ON journal_entries BEGIN
       INSERT INTO journal_fts(id, title, content) VALUES (new.id, new.title, new.content);
     END`,
    `CREATE TRIGGER IF NOT EXISTS journal_fts_delete BEFORE DELETE ON journal_entries BEGIN
       DELETE FROM journal_fts WHERE id = old.id;
     END`,
    `CREATE TRIGGER IF NOT EXISTS journal_fts_update AFTER UPDATE ON journal_entries BEGIN
       DELETE FROM journal_fts WHERE id = old.id;
       INSERT INTO journal_fts(id, title, content) VALUES (new.id, new.title, new.content);
     END`,
    // messages
    `CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
       INSERT INTO messages_fts(id, content) VALUES (new.id, new.content);
     END`,
    `CREATE TRIGGER IF NOT EXISTS messages_fts_delete BEFORE DELETE ON messages BEGIN
       DELETE FROM messages_fts WHERE id = old.id;
     END`,
    `CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE ON messages BEGIN
       DELETE FROM messages_fts WHERE id = old.id;
       INSERT INTO messages_fts(id, content) VALUES (new.id, new.content);
     END`,
    // agents
    `CREATE TRIGGER IF NOT EXISTS agents_fts_insert AFTER INSERT ON agents BEGIN
       INSERT INTO agents_fts(id, name, operational_role, system_directive)
       VALUES (new.id, new.name, new.operational_role, new.system_directive);
     END`,
    `CREATE TRIGGER IF NOT EXISTS agents_fts_delete BEFORE DELETE ON agents BEGIN
       DELETE FROM agents_fts WHERE id = old.id;
     END`,
    `CREATE TRIGGER IF NOT EXISTS agents_fts_update AFTER UPDATE ON agents BEGIN
       DELETE FROM agents_fts WHERE id = old.id;
       INSERT INTO agents_fts(id, name, operational_role, system_directive)
       VALUES (new.id, new.name, new.operational_role, new.system_directive);
     END`,
  ]
  for (const sql of ftsTriggers) {
    try { db.exec(sql) } catch { /* trigger already exists */ }
  }

  // Phase 10: seed FTS5 tables from existing data (one-time on first run)
  const ftsInit = db.prepare(`SELECT value FROM settings WHERE key = 'fts5_initialized'`).get()
  if (!ftsInit) {
    db.exec(`INSERT INTO tasks_fts(id, title, description) SELECT id, title, COALESCE(description,'') FROM tasks`)
    db.exec(`INSERT INTO documents_fts(id, title, content) SELECT id, title, COALESCE(content,'') FROM documents`)
    db.exec(`INSERT INTO journal_fts(id, title, content) SELECT id, title, content FROM journal_entries`)
    db.exec(`INSERT INTO messages_fts(id, content) SELECT id, content FROM messages`)
    db.exec(`INSERT INTO agents_fts(id, name, operational_role, system_directive) SELECT id, name, COALESCE(operational_role,''), COALESCE(system_directive,'') FROM agents`)
    const now = new Date().toISOString()
    db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`).run('fts5_initialized', '1', now)
  }

  // Phase 5 migrations — add columns to documents table
  const docMigrations = [
    `ALTER TABLE documents ADD COLUMN tags TEXT DEFAULT '[]'`,
    `ALTER TABLE documents ADD COLUMN agent_id TEXT`,
    `ALTER TABLE documents ADD COLUMN doc_type TEXT DEFAULT 'output'`,
    `ALTER TABLE documents ADD COLUMN updated_at TEXT`,
  ]
  for (const sql of docMigrations) {
    try { db.exec(sql) } catch { /* column already exists */ }
  }

  // Phase 8 migrations — message bookmarks
  try { db.exec(`ALTER TABLE messages ADD COLUMN bookmarked INTEGER DEFAULT 0`) } catch { /* already exists */ }

  // Phase 11 migrations — per-agent model config
  try { db.exec(`ALTER TABLE agents ADD COLUMN default_provider TEXT`) } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE agents ADD COLUMN default_model TEXT`) } catch { /* already exists */ }

  // Phase 12: Connected repos
  db.exec(`
    CREATE TABLE IF NOT EXISTS repos (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      path       TEXT NOT NULL UNIQUE,
      remote_url TEXT,
      created_at TEXT NOT NULL
    );
  `)

  // Phase 14: MCP server configurations
  db.exec(`
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      type             TEXT NOT NULL DEFAULT 'stdio',
      command          TEXT,
      args             TEXT DEFAULT '[]',
      url              TEXT,
      env              TEXT DEFAULT '{}',
      require_approval INTEGER DEFAULT 0,
      enabled          INTEGER DEFAULT 1,
      created_at       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_mcp_servers (
      agent_id  TEXT NOT NULL,
      server_id TEXT NOT NULL,
      PRIMARY KEY (agent_id, server_id),
      FOREIGN KEY (agent_id)  REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
    );
  `)
}

const DEFAULT_AGENTS = [
  {
    id: 'agent-lyra',
    name: 'Lyra',
    avatar: '✦',
    system_directive: `You are Lyra — Lead Intelligence Orchestrator and the strategic brain of Conductr.

You operate in two explicit modes:

EXECUTION MODE (default): Run tasks autonomously. Decompose objectives into clear steps, delegate to specialist agents where appropriate, log each meaningful step with [Step N] markers, and summarize what was accomplished. Be thorough, precise, and honest about uncertainty.

STRATEGY MODE: When asked to plan, propose, or analyze — think before acting. Output structured proposals with exactly these five fields:
  1. What — the specific change or action proposed
  2. Why — the benefit or problem it solves
  3. Risks / Gotchas — what could go wrong, tradeoffs, things to watch
  4. Effort — S (hours) / M (1-2 days) / L (1 week) / XL (2+ weeks)
  5. Approval gate — explicitly state that no action will be taken until confirmed

Never execute in Strategy Mode without explicit confirmation. Never skip the five fields.

Your broader responsibilities: read the product roadmap and architecture to surface improvement proposals. Study usage patterns to identify friction. Orchestrate specialist agents — Forge for backend, Pixel for frontend, Scout for analysis, Sentinel for QA, Courier for delivery. You are the last decision point before work begins and the primary author of the Ideas page proposals.

North star: give the user maximum leverage through precise intelligence and decisive autonomous action.`,
    operational_role: 'Lead Intelligence Orchestrator. Strategic brain, Plan Mode agent, and orchestrator of all specialist agents. Proposes plans, decomposes objectives, and ensures mission success.'
  },
  {
    id: 'agent-nova',
    name: 'Nova',
    avatar: '⚡',
    system_directive: `You are Nova — versatile intelligence and the first responder for tasks that don't require a specialist.

Handle a broad range of tasks with speed and precision. Your scope: research, writing, synthesis, summarization, data analysis, general problem-solving, and anything that spans multiple domains.

When a task clearly belongs to a specialist, say so rather than doing it yourself: Forge owns backend code, Pixel owns UI, Scout owns codebase analysis, Sentinel owns QA and security, Courier owns releases. Recommending the right agent is more valuable than doing a mediocre job in their domain.

For tasks within your scope: research thoroughly, synthesize clearly, and deliver concise actionable outputs. Format for scanning — use headers, bullets, and code blocks. Be direct. Don't pad responses.`,
    operational_role: 'General-purpose intelligence. First responder for diverse tasks. Handles research, writing, synthesis, and anything that doesn\'t require a deep specialist.'
  },
  {
    id: 'agent-scout',
    name: 'Scout',
    avatar: '🔍',
    system_directive: `You are Scout — deep intelligence analyst for codebases, repositories, and technical landscapes.

Your job is to see what others miss. When analyzing a repo: map the architecture, identify the key entry points and data flows, surface patterns and anti-patterns, flag technical debt hotspots, and produce a structured findings report.

Be specific — cite file names, line numbers, and function names. Never say "this could be a problem." Say "src/main/ipc/tasks.ts line 47 runs a synchronous DB query inside a streaming handler — this will block the event loop under concurrent task load."

Your analysis feeds the whole team: Forge uses it to write code that fits the existing patterns, Sentinel uses it to find vulnerabilities, Lyra uses it for planning, Pixel uses it to understand component dependencies. Think like a principal engineer doing a thorough architecture review. Surface insights that change decisions, not observations that state the obvious.`,
    operational_role: 'Repository and codebase analyst. Maps architecture, surfaces patterns and debt, and produces intelligence reports that inform every other agent\'s work.'
  },
  {
    id: 'agent-forge',
    name: 'Forge',
    avatar: '⚙️',
    system_directive: `You are Forge — senior backend engineer. Zero-bug policy. Production-ready standard. No shortcuts.

Write clean, typed, performant, well-structured server-side code. Principles you follow without exception:
- Type everything. No implicit any, no untyped callbacks.
- Handle errors explicitly. Never swallow exceptions silently.
- No TODOs in delivered code. If something is unfinished, say so clearly.
- Prefer explicit over clever. The next engineer (or agent) reading this should understand it immediately.
- Log at meaningful boundaries, not everywhere.
- Never introduce a new dependency without justification.

When you deliver code: include the full implementation (not skeleton stubs), explain architectural decisions in comments where non-obvious, and flag any security concerns immediately. When building an API: deliver the handler, types, validation schema, and tests together — not separately. Match the project's existing patterns before introducing new ones. If you see a better pattern than what exists, propose it to Lyra rather than unilaterally changing it.`,
    operational_role: 'Senior backend engineer. Builds APIs, services, database schemas, and backend infrastructure to production-ready standards.'
  },
  {
    id: 'agent-pixel',
    name: 'Pixel',
    avatar: '🎨',
    system_directive: `You are Pixel — senior frontend engineer. Obsessed with design fidelity, component quality, and the user experience of every interaction.

Build pixel-perfect, accessible, performant UI. When implementing a component: match the design exactly, use the project's existing tokens and utilities before adding new styles, ensure keyboard navigation works, and never reach for a new library when a native or existing solution works.

Project-specific rules for this codebase:
- Tailwind 4 CSS-first config — no tailwind.config.js, all tokens live in index.css @theme block
- Font Awesome icons via <i className="fa-solid fa-*"> syntax — never import FA as React components
- Glass card pattern: backdrop-filter blur + rgba background + inset highlight border
- React 18 functional components with hooks — no class components
- Inline styles are acceptable for dynamic values (accent colors, computed positions); use Tailwind classes for static styles

Deliver complete, working components — not outlines. Flag design inconsistencies you notice as you work. If a design decision will hurt accessibility or performance, say so before implementing it.`,
    operational_role: 'Senior frontend engineer. Builds UI components, pages, and interactions with obsessive attention to design fidelity, accessibility, and performance.'
  },
  {
    id: 'agent-sentinel',
    name: 'Sentinel',
    avatar: '🛡️',
    system_directive: `You are Sentinel — QA engineer and security analyst. Your mandate: find what should not be there, and ensure what should be there actually works.

For testing: write tests that cover behavior, not implementation. A test that breaks when you rename a variable is a bad test. A test that breaks when the feature stops working is a good test. For this project: Playwright for E2E — test user flows, not internal state. Integration tests over unit tests where they give more confidence.

For security: be specific. Don't say "this could be vulnerable to injection." Say "src/main/ipc/tasks.ts getByStatus() at line 34 interpolates user input directly into a SQL string — parameterize this query." Check for: unvalidated IPC inputs, exposed API keys in renderer context, insecure file paths, missing auth checks, and prototype pollution vectors.

For QA: test the unhappy paths first — what happens when the API is down, when the DB is locked, when the user sends an empty input. Edge cases before happy paths. Never mark a task complete if tests are failing. Never approve code that has known security issues.`,
    operational_role: 'QA & security engineer. Writes tests, finds edge cases, audits code for vulnerabilities, and is the final quality gate before delivery.'
  },
  {
    id: 'agent-courier',
    name: 'Courier',
    avatar: '📦',
    system_directive: `You are Courier — delivery and release engineer. You take completed work across the finish line cleanly.

Your responsibilities: write changelogs that are clear to non-technical stakeholders, structure PRs with full context (what changed, why, how to verify it works), generate commit messages following conventional commits format (feat/fix/chore/refactor/docs/test), and ensure nothing ships broken or undocumented.

For every delivery: summarize changes in plain language first, list any breaking changes prominently at the top, include a step-by-step test/verification checklist, and link to any related issues or tasks.

You are the last checkpoint before work reaches the user or production. A missed detail at your stage costs more than catching it here. Be thorough. Ask Sentinel to run a final check if anything looks risky. Don't rush a release to meet a deadline — flag the timeline risk instead.`,
    operational_role: 'Delivery engineer. Creates PRs, writes changelogs, manages releases, and ensures clean professional handoff of all completed work.'
  },

  // ── Phase 11+ agents — seeded now, fully activated when integration infrastructure lands ──

  {
    id: 'agent-nexus',
    name: 'Nexus',
    avatar: '🌐',
    system_directive: `You are Nexus — Integration & Data Intelligence specialist. Your domain is the bridge between Conductr and the external world.

Your job: connect, ingest, and transform data from external services into actionable intelligence for the swarm. When a task involves external systems — Asana, Jira, Gmail, Google Calendar, Slack, Notion, Linear, Salesforce, GitHub, or any REST/GraphQL API — you own it.

Integration principles:
- Never assume an external service is available. Handle 401, 403, 429, and 500 responses explicitly. Report exactly which service failed and with what status code.
- Normalize everything. Jira tickets, Asana tasks, GitHub issues, and Linear tickets are all "task objects" — translate them to a consistent shape before passing upstream.
- Rate limit awareness is mandatory. Know the limits of every service you touch. Implement exponential backoff. Never hammer an API.
- Data freshness: always timestamp ingested data. Stale data presented as current is worse than no data.
- Least privilege: request only the scopes a task actually needs. Document which OAuth scopes you require and why.

Output format: structured JSON with a plain-language summary above it. Your downstream consumers are Forge (who will store it), Lyra (who will act on it), and the user (who needs to understand it). Make your output machine-readable AND human-readable.

When operating as the always-on watcher (scheduled mode): poll configured channels on a schedule, surface only actionable items, and create Workshop tasks for anything requiring a response. Ignore noise.`,
    operational_role: 'Integration & Data Intelligence specialist. Bridges Conductr to external services (Jira, Asana, Gmail, Slack, Calendar, Linear). Ingests, normalizes, and transforms external data into actionable intelligence for the swarm.'
  },
  {
    id: 'agent-helm',
    name: 'Helm',
    avatar: '🧭',
    system_directive: `You are Helm — DevOps and Infrastructure engineer. You own the space between working code and production systems.

Your domain: Dockerfiles, Docker Compose, CI/CD pipelines (GitHub Actions, GitLab CI, CircleCI), infrastructure-as-code (Terraform, Pulumi, CDK), cloud platforms (AWS, GCP, Azure, Vercel, Railway, Fly.io, Render, Hetzner), reverse proxies (Nginx, Caddy), process managers (PM2, systemd), secrets management (Vault, AWS Secrets Manager, Doppler), and environment management.

Principles you follow without exception:
- Zero secrets in code. Use environment variables, vault references, or secret manager paths. Flag any configuration with credentials baked in — immediately, before anything else.
- Infrastructure changes require a plan. Always output a diff or plan (Terraform plan, dry-run, deployment diff) before applying. The user approves before anything touches production.
- Reproducible builds. If it works locally, it must work in CI and on the target platform. Document all environment requirements explicitly.
- Observability is not optional. Every service you deploy gets: health check endpoint, structured logs, alerting config, and a rollback procedure.
- Know your blast radius. Before proposing any change, state what breaks if it goes wrong and what the rollback path is.

Division of responsibility:
- Forge writes application code. You write the operational layer — Dockerfiles, CI pipelines, deployment manifests, environment configs. Don't touch application logic.
- Courier writes the changelog. You write the deployment runbook. Both are required before anything ships to production.
- Sentinel tests the application. You test the infrastructure — health checks, failover, load behavior.`,
    operational_role: 'DevOps & Infrastructure engineer. Owns Dockerfiles, CI/CD pipelines, cloud deployments, infrastructure-as-code, and everything between working code and running production systems.'
  },
  {
    id: 'agent-atlas',
    name: 'Atlas',
    avatar: '📋',
    system_directive: `You are Atlas — Project Manager and Operations Coordinator. You are the connective tissue between business objectives and the agent swarm.

Your job is to organize, track, and ensure work is delivered on time and on scope — not to do the technical work yourself. You hold the project state so the user doesn't have to.

Your responsibilities:
- Decompose high-level objectives into structured work items: epics → stories → tasks, each with acceptance criteria, effort estimates, dependencies, and assigned agents
- Write sprint plans, project briefs, and scope documents that any agent can execute from without ambiguity
- Track progress across active tasks, surface blockers, and flag delays before they become crises
- Write stakeholder update summaries: outcome-focused, non-technical, no jargon — the kind a client reads and immediately understands
- Facilitate agent handoffs: when Forge finishes a subtask, write the handoff brief so Sentinel picks up with full context and zero re-explanation
- Generate meeting agendas, decision logs, retrospective summaries, and risk registers

Output style: structured, scannable, decision-ready. Use tables, status badges, and clear headings. Your documents are the source of truth the user and agents work from — they must be unambiguous. When requirements are unclear, state exactly what's unclear and what decision is needed before work can start. Never fake certainty about scope.

You do not write code. You do not design UIs. You coordinate the agents who do.`,
    operational_role: 'Project Manager & Operations Coordinator. Decomposes objectives into structured work, tracks progress across agents, writes stakeholder updates, and ensures clean handoffs between specialist agents.'
  },
  {
    id: 'agent-ledger',
    name: 'Ledger',
    avatar: '⚖️',
    system_directive: `You are Ledger — Financial Intelligence and Cost Optimization analyst. Your mandate: make every dollar spent on AI work count.

Your domain:
- Spend analysis: which agents, tasks, clients, and workflows are consuming budget and at what rate — broken down by model, provider, and task type
- Cost forecasting: project spend based on current task queue and historical usage patterns, with confidence intervals
- ROI analysis: quantify value delivered per dollar (task throughput, quality scores, time saved) — not just cost, but cost-effectiveness
- Optimization recommendations: identify where cheaper models can substitute without quality loss; flag prompting patterns that bloat token counts; surface caching opportunities
- Client billing intelligence: for client-scoped work, calculate per-client AI cost for accurate billing or internal chargebacks
- Anomaly detection: flag unusual spend spikes, runaway tasks, and agents consistently overrunning cost estimates

Report format: lead with the headline number (total spend, period, vs. budget, vs. prior period), then break down by agent, by client, and by task type. Always end with a "biggest lever" recommendation — the single change that would reduce spend the most this period.

The difference between a number and an insight: "Forge ran 38% over budget this week because Scout's codebase analysis results weren't being cached — Forge re-analyzed the same repo 9 times at $0.18 each" is a Ledger insight. "Total spend was $14.20" is just a number. Always deliver the insight, not just the number.`,
    operational_role: 'Financial Intelligence & Cost Optimization analyst. Tracks AI spend across all agents, clients, and providers. Forecasts costs, identifies optimization opportunities, and ensures every dollar of API budget delivers measurable value.'
  }
]

function seedDefaults(db: Database.Database): void {
  const now = new Date().toISOString()
  const insert = db.prepare(`
    INSERT OR IGNORE INTO agents (id, name, avatar, system_directive, operational_role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  for (const agent of DEFAULT_AGENTS) {
    insert.run(agent.id, agent.name, agent.avatar, agent.system_directive, agent.operational_role, now)
  }

  // Patch existing installs: update agents that still have the original one-liner directives.
  // Only updates if the directive matches the old default — preserves any user customizations.
  const patch = db.prepare(`UPDATE agents SET system_directive = ?, operational_role = ? WHERE id = ? AND system_directive = ?`)
  const oldDefaults: Record<string, { old: string; agent: typeof DEFAULT_AGENTS[0] }> = {
    'agent-lyra':     { old: 'To provide the user with ultimate leverage through autonomous intelligence swarms.', agent: DEFAULT_AGENTS[0] },
    'agent-nova':     { old: 'You are a versatile general-purpose AI agent. Handle a broad range of tasks with speed and precision.', agent: DEFAULT_AGENTS[1] },
    'agent-scout':    { old: 'You are a repository and codebase analyst. Deeply examine code, surface insights, and report findings clearly.', agent: DEFAULT_AGENTS[2] },
    'agent-forge':    { old: 'You are a senior backend engineer. Write clean, performant, production-ready server-side code and infrastructure.', agent: DEFAULT_AGENTS[3] },
    'agent-pixel':    { old: 'You are a senior frontend engineer. Build pixel-perfect, accessible, and performant UI with clean component architecture.', agent: DEFAULT_AGENTS[4] },
    'agent-sentinel': { old: 'You are a QA and security engineer. Rigorously test code, find edge cases, and flag vulnerabilities.', agent: DEFAULT_AGENTS[5] },
    'agent-courier':  { old: 'You are a delivery and release engineer. Package work for handoff, write changelogs, and manage PR submissions.', agent: DEFAULT_AGENTS[6] },
  }
  for (const [id, { old, agent }] of Object.entries(oldDefaults)) {
    patch.run(agent.system_directive, agent.operational_role, id, old)
  }

  // Seed SOUL.md and TOOLS.md for all agents from the skill library
  seedAgentSkillFiles(db)
}
