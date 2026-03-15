/// <reference types="vite/client" />

// Mission Control design token types
export type TaskStatus = 'queued' | 'active' | 'complete' | 'failed'

// Phase 18: Conductor Mode
export type ConductorMode = 'claude-code' | 'api-key'

export interface ClaudeCodeCliStatus {
  installed: boolean
  path: string | null
}

// Pipeline types (Phase 17)
export interface PipelineStepDef {
  id: string
  name: string
  agent_id: string
  description: string
  execution_mode: 'sequential' | 'parallel'
  depends_on: string[]
  inject_prior_outputs: boolean
}

export interface Pipeline {
  id: string
  name: string
  description: string | null
  steps: string           // JSON: PipelineStepDef[]
  is_template: number     // 0 | 1
  created_at: string
  updated_at: string
}

export interface PipelineRun {
  id: string
  pipeline_id: string
  status: 'pending' | 'running' | 'complete' | 'failed' | 'cancelled'
  started_at: string | null
  completed_at: string | null
  created_at: string
  pipeline_name?: string
}

export interface PipelineStepRun {
  id: string
  run_id: string
  step_id: string
  agent_id: string | null
  task_id: string | null
  status: 'pending' | 'running' | 'complete' | 'failed' | 'skipped'
  output: string | null
  started_at: string | null
  completed_at: string | null
}

// Network / Server Mode types (Phase 16)
export type NetworkMode = 'standalone' | 'host' | 'client'

export interface NetworkStatus {
  mode: NetworkMode
  lanIp: string | null
  tailscaleIp: string | null
  pairingCode: string | null
  connectedClients: number
  hostServerRunning: boolean
}

export interface PeerInfo {
  name: string
  ip: string
  isConductrHost: boolean
}

// OpenClaw types (Phase 15)
export interface OpenClawStatus {
  installed: boolean
  running: boolean
  version?: string
  pid?: number
  error?: string
}

export interface OpenClawChannel {
  id: string
  name: string
  type: string
  config: Record<string, string>
  routing_agent_id: string
  enabled: boolean
  created_at: string
}

// MCP types (Phase 14)
export type McpConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

export interface McpServerStatus {
  serverId: string
  status: McpConnectionStatus
  toolCount: number
  error?: string
}

export interface McpServer {
  id: string
  name: string
  type: 'stdio' | 'sse'
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  requireApproval: boolean
  enabled: boolean
  createdAt: string
  status: McpServerStatus
}

export interface McpTool {
  name: string
  description?: string
  inputSchema: Record<string, unknown>
  serverId: string
  serverName: string
}

export interface McpRegistryEntry {
  id: string
  name: string
  description: string
  category: string
  command: string
  args?: string[]
  installCmd?: string
  requiresKey?: string
  homepageUrl?: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  agent_id: string | null
  client_id: string | null
  tags: string // JSON array string
  progress: number
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface Agent {
  id: string
  name: string
  avatar: string
  system_directive: string | null
  operational_role: string | null
  created_at: string
}

export interface ActivityLogEntry {
  id: string
  task_id: string | null
  agent_id: string | null
  message: string
  timestamp: string
  agent_name?: string
  task_title?: string
}

export interface ApiUsageEntry {
  id: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  task_id: string | null
  agent_id: string | null
  timestamp: string
  task_title?: string
  agent_name?: string
}

export interface AgentSpendEntry {
  agent_id: string | null
  agent_name: string | null
  agent_avatar: string | null
  total_tokens: number
  total_cost: number
}

export interface Budget {
  daily: number | null
  monthly: number | null
}

export interface Document {
  id: string
  title: string
  content: string | null
  task_id: string | null
  agent_id: string | null
  client_id: string | null
  tags: string        // JSON array string
  doc_type: string    // 'output' | 'recap' | 'manual'
  created_at: string
  updated_at: string | null
}

export interface JournalEntry {
  id: string
  date: string
  title: string
  content: string
  entry_type: 'manual' | 'task_complete' | 'recap' | 'system'
  task_id: string | null
  agent_id: string | null
  created_at: string
  updated_at: string | null
  task_title?: string
  agent_name?: string
}

export interface IntelligenceInsight {
  id: string
  content: string
  insight_type: 'pattern' | 'anomaly' | 'recommendation' | 'recap'
  period_start: string | null
  period_end: string | null
  agent_ids: string   // JSON array string
  task_ids: string    // JSON array string
  is_read: number     // 0 | 1
  generated_at: string
}

export interface AgentFile {
  id: string
  agent_id: string
  filename: string
  content: string
  created_at: string
  updated_at: string | null
}

export interface SearchResult {
  type: 'task' | 'agent' | 'document' | 'journal' | 'message'
  id: string
  title: string
  subtitle: string
  snippet: string
}

export interface ApiKeyStatus {
  configured: boolean
  source: 'env' | 'settings' | null
}

export interface Idea {
  id: string
  title: string
  what: string | null
  why: string | null
  risks: string | null
  effort: string | null    // 'S' | 'M' | 'L' | 'XL'
  phase: string | null
  source_agent: string
  status: 'pending' | 'approved' | 'denied' | 'pinned'
  deny_reason: string | null
  task_id: string | null
  created_at: string
  updated_at: string
}

export interface AgentMemory {
  id: string
  agent_id: string
  client_id: string | null
  domain_tags: string   // JSON array
  skill_tags: string    // JSON array
  content: string
  relevance_score: number
  source: string        // 'task' | 'skill_build' | 'manual'
  task_id: string | null
  skill_level: string | null  // 'novice' | 'practitioner' | 'expert' | 'master'
  created_at: string
  last_used_at: string | null
}

export interface SkillSummary {
  domain: string
  memory_count: number
  skill_level: string
  agent_id: string
}

export interface KnowledgeEntry {
  id: string
  title: string
  content: string
  source_agent: string | null
  domain_tags: string   // JSON array
  client_id: string | null
  created_at: string
  updated_at: string | null
}

export interface PromptTemplate {
  id: string
  agent_id: string | null
  name: string
  content: string
  tags: string          // JSON array
  usage_count: number
  created_at: string
  updated_at: string | null
}

export interface ProviderStatus {
  name: string
  label: string
  configured: boolean
  maskedKey: string | null
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  contextWindow: number
  inputCostPer1k: number
  outputCostPer1k: number
  supportsTools: boolean
  supportsVision: boolean
  isFree: boolean
  description?: string
  recommended?: boolean
}

export interface ProviderMeta {
  label: string
  icon: string
  color: string
  description: string
  keyHint: string
  docsNote: string
}

export interface OllamaModel {
  name: string
  size: number
  modified_at: string
}

export interface Repo {
  id: string
  name: string
  path: string
  remote_url: string | null
  created_at: string
}

export interface FileEntry {
  name: string
  path: string
  isDir: boolean
}

export interface GitStatus {
  branch: string | null
  tracking: string | null
  ahead: number
  behind: number
  staged: string[]
  modified: string[]
  not_added: string[]
  deleted: string[]
  conflicted: string[]
  isClean: boolean
  error?: string
}

export interface GitCommit {
  hash: string
  message: string
  author: string
  date: string
}

export interface GithubIssue {
  number: number
  title: string
  body: string
  state: string
  labels: string[]
  url: string
  created_at: string
}

export interface GithubPR {
  number: number
  title: string
  state: string
  head: string
  base: string
  url: string
  created_at: string
}

export interface TokenEstimate {
  systemTokens: number
  memoryTokens: number
  taskTokens: number
  outputBudget: number
  total: number
}

export interface Client {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface TaskCounts {
  queued: number
  active: number
  complete: number
  failed: number
}

export interface Message {
  id: string
  agent_id: string
  role: 'user' | 'assistant'
  content: string
  bookmarked: number  // 0 | 1
  created_at: string
  // Client-side only — not persisted
  images?: ChatImage[]
}

export interface ChatImage {
  data: string      // base64 string (no prefix)
  mediaType: string // 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
  preview: string   // data URL for display
}

// Window electronAPI type
declare global {
  interface Window {
    electronAPI: {
      tasks: {
        getAll: () => Promise<Task[]>
        getByStatus: (status: string) => Promise<Task[]>
        getById: (id: string) => Promise<Task | null>
        create: (input: Partial<Task>) => Promise<Task>
        updateStatus: (id: string, status: string, progress?: number) => Promise<void>
        updateProgress: (id: string, progress: number) => Promise<void>
        delete: (id: string) => Promise<void>
        getCounts: () => Promise<TaskCounts>
        getActivityLog: (taskId?: string) => Promise<ActivityLogEntry[]>
        start: (taskId: string) => Promise<Task>
        estimateTokens: (agentId: string | null, taskTitle: string, taskDescription: string | null) => Promise<TokenEstimate>
        onLogUpdate: (cb: (data: { taskId: string; message: string }) => void) => void
        onProgressUpdate: (cb: (data: { taskId: string; progress: number }) => void) => void
        onStatusUpdate: (cb: (data: { taskId: string; status: string }) => void) => void
        removeAllListeners: () => void
      }
      agents: {
        getAll: () => Promise<Agent[]>
        getById: (id: string) => Promise<Agent | null>
        create: (input: Partial<Agent>) => Promise<Agent>
        update: (id: string, input: Partial<Agent>) => Promise<Agent>
        delete: (id: string) => Promise<void>
        getActivityLog: (agentId: string, limit?: number) => Promise<ActivityLogEntry[]>
      }
      agentFiles: {
        getAll: (agentId: string) => Promise<AgentFile[]>
        get: (agentId: string, filename: string) => Promise<AgentFile | null>
        save: (agentId: string, filename: string, content: string) => Promise<AgentFile>
        delete: (agentId: string, filename: string) => Promise<void>
        clearClientIdentity: (clientId: string) => Promise<boolean>
      }
      metrics: {
        getTodaySpend: () => Promise<number>
        get7DaySpend: () => Promise<{ date: string; total: number }[]>
        getMonthlySpend: () => Promise<number>
        getTotalTokens: () => Promise<{
          input_tokens: number
          output_tokens: number
          total_tokens: number
        }>
        getUsageByTask: (limit?: number) => Promise<ApiUsageEntry[]>
        getMostActiveModel: () => Promise<string>
        getBudget: () => Promise<Budget>
        setBudget: (data: { daily: number | null; monthly: number | null }) => Promise<boolean>
        getAgentSpend: () => Promise<AgentSpendEntry[]>
      }
      chat: {
        getMessages: (agentId: string) => Promise<Message[]>
        clearMessages: (agentId: string) => Promise<boolean>
        send: (
          agentId: string,
          content: string,
          images?: ChatImage[],
          mentionContexts?: { agentName: string; messages: { role: string; content: string }[] }[]
        ) => void
        toggleBookmark: (messageId: string) => Promise<boolean>
        onChunk: (cb: (data: { agentId: string; chunk: string }) => void) => void
        onDone: (cb: (data: { agentId: string; message: Message }) => void) => void
        onError: (cb: (data: { agentId: string; error: string }) => void) => void
        removeAllListeners: () => void
      }
      documents: {
        getAll: (limit?: number) => Promise<Document[]>
        getById: (id: string) => Promise<Document | null>
        create: (input: Partial<Document>) => Promise<Document>
        delete: (id: string) => Promise<void>
        search: (query: string) => Promise<Document[]>
        getByTag: (tag: string) => Promise<Document[]>
        getByTask: (taskId: string) => Promise<Document[]>
        getByAgent: (agentId: string) => Promise<Document[]>
        onCreated: (cb: (data: { document: Document }) => void) => void
        removeCreatedListener: () => void
      }
      journal: {
        getAll: (limit?: number) => Promise<JournalEntry[]>
        getByDate: (date: string) => Promise<JournalEntry[]>
        create: (input: Partial<JournalEntry>) => Promise<JournalEntry>
        update: (id: string, content: string) => Promise<JournalEntry>
        delete: (id: string) => Promise<void>
        search: (query: string) => Promise<JournalEntry[]>
      }
      intelligence: {
        getAll: (limit?: number) => Promise<IntelligenceInsight[]>
        getUnread: () => Promise<IntelligenceInsight[]>
        markRead: (id: string) => Promise<void>
        markAllRead: () => Promise<void>
        delete: (id: string) => Promise<void>
        generate: (type: 'insight' | 'recap') => void
        onChunk: (cb: (data: { chunk: string }) => void) => void
        onDone: (cb: (data: { insight: IntelligenceInsight }) => void) => void
        onError: (cb: (data: { error: string }) => void) => void
        removeAllListeners: () => void
      }
      clients: {
        getAll: () => Promise<Client[]>
        getById: (id: string) => Promise<Client | null>
        create: (input: { name: string; description?: string }) => Promise<Client>
        update: (id: string, input: { name?: string; description?: string }) => Promise<Client>
        delete: (id: string) => Promise<void>
        getTaskCount: (clientId: string) => Promise<number>
        getDocCount: (clientId: string) => Promise<number>
        getTasks: (clientId: string) => Promise<Task[]>
        getDocuments: (clientId: string) => Promise<Document[]>
        getActivityLog: (clientId: string, limit?: number) => Promise<ActivityLogEntry[]>
      }
      settings: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: string) => Promise<boolean>
        pickWallpaper: () => Promise<string | null>
        checkApiKey: () => Promise<ApiKeyStatus>
        setApiKey: (key: string) => Promise<boolean>
      }
      search: {
        global: (query: string) => Promise<SearchResult[]>
      }
      ideas: {
        getAll: (status?: string) => Promise<Idea[]>
        getPendingCount: () => Promise<number>
        approve: (id: string, taskId?: string) => Promise<Idea>
        deny: (id: string, reason: string) => Promise<Idea>
        pin: (id: string) => Promise<Idea>
        delete: (id: string) => Promise<boolean>
        generate: () => void
        onGenerating: (cb: (data: { status: string }) => void) => void
        onChunk: (cb: (data: { chunk: string }) => void) => void
        onDone: (cb: (data: { count: number; ideas: Idea[] }) => void) => void
        onError: (cb: (data: { error: string }) => void) => void
        removeAllListeners: () => void
      }
      memories: {
        getAll: (agentId: string, filters?: { clientId?: string | null; domain?: string; limit?: number }) => Promise<AgentMemory[]>
        delete: (id: string) => Promise<void>
        clearAgent: (agentId: string, clientId?: string) => Promise<void>
        getCount: (agentId: string) => Promise<number>
        getSkillSummaries: (agentId: string) => Promise<SkillSummary[]>
        runSkillHardening: (agentId?: string) => Promise<{ created: number; promoted: number }>
        create: (input: { agent_id: string; content: string; domain_tags?: string; skill_tags?: string; client_id?: string }) => Promise<AgentMemory>
      }
      knowledge: {
        getAll: (options?: { domain?: string; clientId?: string; limit?: number }) => Promise<KnowledgeEntry[]>
        create: (input: { title: string; content: string; source_agent?: string; domain_tags?: string; client_id?: string }) => Promise<KnowledgeEntry>
        delete: (id: string) => Promise<void>
      }
      prompts: {
        getAll: (agentId?: string) => Promise<PromptTemplate[]>
        create: (input: { name: string; content: string; agent_id?: string; tags?: string }) => Promise<PromptTemplate>
        delete: (id: string) => Promise<void>
        incrementUsage: (id: string) => Promise<void>
        autoRewrite: (content: string) => Promise<string>
      }
      repos: {
        getAll: () => Promise<Repo[]>
        add: () => Promise<Repo | null>
        remove: (id: string) => Promise<boolean>
        getTree: (repoPath: string, subPath?: string) => Promise<FileEntry[]>
        readFile: (repoPath: string, filePath: string) => Promise<{ content: string; path: string } | { error: string } | null>
        writeFile: (repoPath: string, filePath: string, content: string) => Promise<{ ok: boolean; error?: string }>
        findFile: (repoPath: string, query: string) => Promise<{ path: string; name: string }[]>
      }
      terminal: {
        run: (opts: { cwd: string; command: string; sessionId: string; timeoutMs?: number }) => Promise<{ exitCode: number | null; error?: string }>
        kill: (sessionId: string) => Promise<boolean>
        stdin: (opts: { sessionId: string; data: string }) => void
        getSuggestions: (repoPath: string) => Promise<string[]>
        onOutput: (cb: (data: { sessionId: string; data: string; type: 'stdout' | 'stderr' }) => void) => void
        onDone: (cb: (data: { sessionId: string; exitCode: number | null }) => void) => void
        removeAllListeners: () => void
      }
      git: {
        status: (repoPath: string) => Promise<GitStatus | { error: string }>
        log: (repoPath: string, limit?: number) => Promise<GitCommit[] | { error: string }>
        branches: (repoPath: string) => Promise<{ current: string; all: string[] } | { error: string }>
        createBranch: (repoPath: string, name: string) => Promise<{ ok: boolean; branch?: string; error?: string }>
        checkout: (repoPath: string, branch: string) => Promise<{ ok: boolean; error?: string }>
        diff: (repoPath: string, staged?: boolean, filePath?: string) => Promise<{ diff: string } | { error: string }>
        add: (repoPath: string, files: string[]) => Promise<{ ok: boolean; error?: string }>
        commit: (repoPath: string, message: string) => Promise<{ ok: boolean; hash?: string; error?: string }>
        push: (repoPath: string, remote?: string, branch?: string) => Promise<{ ok: boolean; error?: string }>
        createTaskBranch: (repoPath: string, taskId: string, taskTitle: string) => Promise<{ ok: boolean; branch?: string; error?: string }>
        isRepo: (repoPath: string) => Promise<boolean>
      }
      github: {
        getToken: () => Promise<{ configured: boolean; masked: string | null }>
        setToken: (token: string) => Promise<boolean>
        removeToken: () => Promise<boolean>
        testToken: (token?: string) => Promise<{ ok: boolean; login?: string; name?: string; error?: string }>
        openTokenPage: () => Promise<void>
        getIssues: (remoteUrl: string, state?: 'open' | 'closed' | 'all') => Promise<GithubIssue[] | { error: string }>
        createPR: (opts: { remoteUrl: string; head: string; base: string; title: string; body: string; issueNumber?: number }) => Promise<{ ok: boolean; url?: string; number?: number; error?: string }>
        getPRs: (remoteUrl: string) => Promise<GithubPR[] | { error: string }>
        getRepoInfo: (remoteUrl: string) => Promise<{ name: string; fullName: string; description: string | null; defaultBranch: string; isPrivate: boolean; stars: number; url: string } | null>
      }
      pipelines: {
        getAll: (templatesOnly?: boolean) => Promise<Pipeline[]>
        getById: (id: string) => Promise<Pipeline | null>
        create: (input: { name: string; description?: string; steps?: PipelineStepDef[]; is_template?: boolean }) => Promise<Pipeline>
        update: (id: string, updates: { name?: string; description?: string; steps?: PipelineStepDef[] }) => Promise<Pipeline>
        delete: (id: string) => Promise<{ ok: boolean }>
        start: (pipelineId: string) => Promise<{ ok: boolean; runId?: string; error?: string }>
        getRecentRuns: (limit?: number) => Promise<PipelineRun[]>
        getRuns: (pipelineId: string, limit?: number) => Promise<PipelineRun[]>
        getRunDetail: (runId: string) => Promise<{ run: PipelineRun; stepRuns: PipelineStepRun[] } | null>
        decompose: (goal: string) => Promise<{ ok: boolean; steps?: PipelineStepDef[]; error?: string }>
        startSwarm: (goal: string) => Promise<{ ok: boolean; runId?: string; pipelineId?: string; error?: string }>
        onRunUpdate: (cb: (data: { runId: string; pipelineId: string; status: PipelineRun['status']; stepRuns: PipelineStepRun[] }) => void) => void
        removeAllListeners: () => void
      }
      network: {
        getStatus: () => Promise<NetworkStatus>
        enableHostMode: () => Promise<{ ok: boolean; pairingCode: string }>
        disableHostMode: () => Promise<{ ok: boolean }>
        regeneratePairingCode: () => Promise<{ pairingCode: string }>
        connectToHost: (ip: string, code: string) => Promise<{ ok: boolean; error?: string }>
        disconnectFromHost: () => Promise<{ ok: boolean }>
        getTailscalePeers: () => Promise<PeerInfo[]>
        installTailscale: () => Promise<{ ok: boolean }>
        isClientActive: () => Promise<boolean>
        onStatusChange: (cb: (s: NetworkStatus) => void) => void
        onConnected: (cb: (data: { hostIp: string }) => void) => void
        onConnectionStatus: (cb: (data: { connected: boolean }) => void) => void
        removeAllListeners: () => void
      }
      openclaw: {
        getStatus: () => Promise<OpenClawStatus>
        install: () => Promise<{ ok: boolean }>
        restart: () => Promise<OpenClawStatus>
        start: () => Promise<OpenClawStatus>
        stop: () => Promise<OpenClawStatus>
        listChannels: () => Promise<OpenClawChannel[]>
        addChannel: (input: { name: string; type: string; config?: Record<string, string>; routing_agent_id?: string }) => Promise<OpenClawChannel>
        updateChannel: (id: string, updates: Record<string, unknown>) => Promise<OpenClawChannel>
        removeChannel: (id: string) => Promise<{ ok: boolean }>
        testChannel: (id: string) => Promise<{ ok: boolean; error?: string }>
        onStatusChange: (cb: (status: OpenClawStatus) => void) => void
        removeStatusListener: () => void
      }
      mcp: {
        listServers: () => Promise<McpServer[]>
        addServer: (input: {
          name: string
          type: 'stdio' | 'sse'
          command?: string
          args?: string[]
          url?: string
          env?: Record<string, string>
          requireApproval?: boolean
        }) => Promise<McpServer>
        removeServer: (id: string) => Promise<{ ok: boolean }>
        updateServer: (id: string, updates: Record<string, unknown>) => Promise<McpServer>
        testConnection: (config: Record<string, unknown>) => Promise<McpServerStatus>
        reconnect: (id: string) => Promise<McpServerStatus>
        listTools: (serverId: string) => Promise<McpTool[]>
        getAgentTools: (serverIds: string[]) => Promise<McpTool[]>
        getAgentServers: (agentId: string) => Promise<string[]>
        setAgentServers: (agentId: string, serverIds: string[]) => Promise<{ ok: boolean }>
        getRegistry: () => Promise<McpRegistryEntry[]>
        getStatuses: () => Promise<McpServerStatus[]>
      }
      providers: {
        getStatus: () => Promise<ProviderStatus[]>
        setKey: (provider: string, key: string) => Promise<boolean>
        removeKey: (provider: string) => Promise<boolean>
        testConnection: (provider: string, apiKey?: string) => Promise<{ ok: boolean; error?: string; modelCount?: number }>
        getModels: (provider?: string) => Promise<ModelInfo[]>
        getGlobalDefault: () => Promise<{ provider: string; model: string } | null>
        setGlobalDefault: (provider: string, model: string) => Promise<boolean>
        getAgentModel: (agentId: string) => Promise<{ provider: string | null; model: string | null }>
        setAgentModel: (agentId: string, provider: string | null, model: string | null) => Promise<boolean>
        detectOllama: () => Promise<{ running: boolean; version?: string }>
        getOllamaModels: () => Promise<OllamaModel[]>
        deleteOllamaModel: (modelName: string) => Promise<boolean>
        pullOllamaModel: (modelName: string) => void
        installOllama: () => Promise<void>
        getMeta: () => Promise<Record<string, ProviderMeta>>
        onPullProgress: (cb: (data: { model: string; status: string; completed?: number; total?: number; error?: string }) => void) => void
        removePullProgressListener: () => void
      }
      claudeCode: {
        checkCli:      () => Promise<ClaudeCodeCliStatus>
        getAgentDir:   (agentId: string) => Promise<{ path: string }>
        syncAgent:     (agentId: string) => Promise<{ ok: boolean; path?: string; error?: string }>
        syncAllAgents: () => Promise<{ ok: boolean; count?: number; error?: string }>
      }
      app: {
        /** Current OS platform string, e.g. 'darwin' | 'win32' | 'linux' */
        platform: string
        /** True when running under Playwright (NODE_ENV=test) — skips onboarding */
        isTest: boolean
        onOpenShortcutSheet: (cb: () => void) => void
        removeShortcutSheetListener: () => void
        /** Fired when the user picks a page from the system tray / menu-bar menu */
        onTrayNavigate: (cb: (page: string) => void) => void
        removeTrayNavigateListener: () => void
        /** Relaunch the app — called after conductor mode change */
        relaunch: () => Promise<void>
      }
      /** Custom window controls — used by renderer on Windows (frame is hidden) */
      window: {
        minimize: () => void
        maximize: () => void
        close: () => void
      }
      update: {
        check: () => Promise<{ status: string; version?: string | null }>
        install: () => void
        onStatus: (cb: (data: { type: 'available' | 'downloaded' | 'error'; version?: string }) => void) => void
        removeStatusListener: () => void
      }
    }
  }
}
