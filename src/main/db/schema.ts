import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

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
  `)

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
}

const DEFAULT_AGENTS = [
  {
    id: 'agent-lyra',
    name: 'Lyra',
    avatar: '✦',
    system_directive: 'To provide the user with ultimate leverage through autonomous intelligence swarms.',
    operational_role: 'Lead intelligence and commander of the centre. Responsible for delegating high-thrust objectives and ensuring mission success for the channel.'
  },
  {
    id: 'agent-nova',
    name: 'Nova',
    avatar: '⚡',
    system_directive: 'You are a versatile general-purpose AI agent. Handle a broad range of tasks with speed and precision.',
    operational_role: 'General-purpose executor. Takes on diverse tasks that don\'t require a specialist agent.'
  },
  {
    id: 'agent-scout',
    name: 'Scout',
    avatar: '🔍',
    system_directive: 'You are a repository and codebase analyst. Deeply examine code, surface insights, and report findings clearly.',
    operational_role: 'Repository analyst. Scans codebases, identifies patterns, surfaces technical debt, and informs planning decisions.'
  },
  {
    id: 'agent-forge',
    name: 'Forge',
    avatar: '⚙️',
    system_directive: 'You are a senior backend engineer. Write clean, performant, production-ready server-side code and infrastructure.',
    operational_role: 'Backend engineer. Builds APIs, services, database schemas, and backend infrastructure.'
  },
  {
    id: 'agent-pixel',
    name: 'Pixel',
    avatar: '🎨',
    system_directive: 'You are a senior frontend engineer. Build pixel-perfect, accessible, and performant UI with clean component architecture.',
    operational_role: 'Frontend engineer. Builds UI components, pages, and interactions with attention to design fidelity.'
  },
  {
    id: 'agent-sentinel',
    name: 'Sentinel',
    avatar: '🛡️',
    system_directive: 'You are a QA and security engineer. Rigorously test code, find edge cases, and flag vulnerabilities.',
    operational_role: 'QA & security. Reviews code for bugs, writes tests, validates behaviour, and flags security issues.'
  },
  {
    id: 'agent-courier',
    name: 'Courier',
    avatar: '📦',
    system_directive: 'You are a delivery and release engineer. Package work for handoff, write changelogs, and manage PR submissions.',
    operational_role: 'Delivery engineer. Creates pull requests, writes changelogs, and ensures clean handoff of completed work.'
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
}
