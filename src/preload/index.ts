import { contextBridge, ipcRenderer } from 'electron'

// Expose typed API to renderer via window.electronAPI
const api = {
  // Tasks
  tasks: {
    getAll: () => ipcRenderer.invoke('tasks:getAll'),
    getByStatus: (status: string) => ipcRenderer.invoke('tasks:getByStatus', status),
    getById: (id: string) => ipcRenderer.invoke('tasks:getById', id),
    create: (input: unknown) => ipcRenderer.invoke('tasks:create', input),
    updateStatus: (id: string, status: string, progress?: number) =>
      ipcRenderer.invoke('tasks:updateStatus', id, status, progress),
    updateProgress: (id: string, progress: number) =>
      ipcRenderer.invoke('tasks:updateProgress', id, progress),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
    getCounts: () => ipcRenderer.invoke('tasks:getCounts'),
    getActivityLog: (taskId?: string) => ipcRenderer.invoke('tasks:getActivityLog', taskId),
    start: (taskId: string) => ipcRenderer.invoke('tasks:start', taskId),
    estimateTokens: (agentId: string | null, taskTitle: string, taskDescription: string | null) =>
      ipcRenderer.invoke('tasks:estimateTokens', agentId, taskTitle, taskDescription),

    // IPC event listeners
    onLogUpdate: (callback: (data: { taskId: string; message: string }) => void) => {
      ipcRenderer.on('tasks:logUpdate', (_e, data) => callback(data))
    },
    onProgressUpdate: (callback: (data: { taskId: string; progress: number }) => void) => {
      ipcRenderer.on('tasks:progressUpdate', (_e, data) => callback(data))
    },
    onStatusUpdate: (callback: (data: { taskId: string; status: string }) => void) => {
      ipcRenderer.on('tasks:statusUpdate', (_e, data) => callback(data))
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('tasks:logUpdate')
      ipcRenderer.removeAllListeners('tasks:progressUpdate')
      ipcRenderer.removeAllListeners('tasks:statusUpdate')
    }
  },

  // Agents
  agents: {
    getAll: () => ipcRenderer.invoke('agents:getAll'),
    getById: (id: string) => ipcRenderer.invoke('agents:getById', id),
    create: (input: unknown) => ipcRenderer.invoke('agents:create', input),
    update: (id: string, input: unknown) => ipcRenderer.invoke('agents:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('agents:delete', id),
    getActivityLog: (agentId: string, limit?: number) =>
      ipcRenderer.invoke('agents:getActivityLog', agentId, limit)
  },

  // Metrics
  metrics: {
    getTodaySpend: () => ipcRenderer.invoke('metrics:getTodaySpend'),
    get7DaySpend: () => ipcRenderer.invoke('metrics:get7DaySpend'),
    getMonthlySpend: () => ipcRenderer.invoke('metrics:getMonthlySpend'),
    getTotalTokens: () => ipcRenderer.invoke('metrics:getTotalTokens'),
    getUsageByTask: (limit?: number) => ipcRenderer.invoke('metrics:getUsageByTask', limit),
    getMostActiveModel: () => ipcRenderer.invoke('metrics:getMostActiveModel'),
    getBudget: () => ipcRenderer.invoke('metrics:getBudget'),
    setBudget: (data: { daily: number | null; monthly: number | null }) =>
      ipcRenderer.invoke('metrics:setBudget', data),
    getAgentSpend: () => ipcRenderer.invoke('metrics:getAgentSpend')
  },

  // Chat
  chat: {
    getMessages: (agentId: string) => ipcRenderer.invoke('chat:getMessages', agentId),
    clearMessages: (agentId: string) => ipcRenderer.invoke('chat:clearMessages', agentId),
    send: (
      agentId: string,
      content: string,
      images?: { data: string; mediaType: string; preview: string }[],
      mentionContexts?: { agentName: string; messages: { role: string; content: string }[] }[]
    ) => ipcRenderer.send('chat:send', { agentId, content, images, mentionContexts }),
    toggleBookmark: (messageId: string) => ipcRenderer.invoke('chat:toggleBookmark', messageId),
    onChunk: (cb: (data: { agentId: string; chunk: string }) => void) =>
      ipcRenderer.on('chat:chunk', (_e, data) => cb(data)),
    onDone: (cb: (data: { agentId: string; message: unknown }) => void) =>
      ipcRenderer.on('chat:done', (_e, data) => cb(data)),
    onError: (cb: (data: { agentId: string; error: string }) => void) =>
      ipcRenderer.on('chat:error', (_e, data) => cb(data)),
    onToolCall: (cb: (data: { agentId: string; toolName: string; args: unknown }) => void) =>
      ipcRenderer.on('chat:tool-call', (_e, data) => cb(data)),
    onToolResult: (cb: (data: { agentId: string; toolName: string; result: string; isError: boolean }) => void) =>
      ipcRenderer.on('chat:tool-result', (_e, data) => cb(data)),
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('chat:chunk')
      ipcRenderer.removeAllListeners('chat:done')
      ipcRenderer.removeAllListeners('chat:error')
      ipcRenderer.removeAllListeners('chat:tool-call')
      ipcRenderer.removeAllListeners('chat:tool-result')
    }
  },

  // Documents
  documents: {
    getAll: (limit?: number) => ipcRenderer.invoke('documents:getAll', limit),
    getById: (id: string) => ipcRenderer.invoke('documents:getById', id),
    create: (input: unknown) => ipcRenderer.invoke('documents:create', input),
    delete: (id: string) => ipcRenderer.invoke('documents:delete', id),
    search: (query: string) => ipcRenderer.invoke('documents:search', query),
    getByTag: (tag: string) => ipcRenderer.invoke('documents:getByTag', tag),
    getByTask: (taskId: string) => ipcRenderer.invoke('documents:getByTask', taskId),
    getByAgent: (agentId: string) => ipcRenderer.invoke('documents:getByAgent', agentId),
    onCreated: (cb: (data: { document: unknown }) => void) =>
      ipcRenderer.on('documents:created', (_e, data) => cb(data)),
    removeCreatedListener: () => ipcRenderer.removeAllListeners('documents:created'),
  },

  // Journal
  journal: {
    getAll: (limit?: number) => ipcRenderer.invoke('journal:getAll', limit),
    getByDate: (date: string) => ipcRenderer.invoke('journal:getByDate', date),
    create: (input: unknown) => ipcRenderer.invoke('journal:create', input),
    update: (id: string, content: string) => ipcRenderer.invoke('journal:update', id, content),
    delete: (id: string) => ipcRenderer.invoke('journal:delete', id),
    search: (query: string) => ipcRenderer.invoke('journal:search', query),
  },

  // Clients
  clients: {
    getAll: () => ipcRenderer.invoke('clients:getAll'),
    getById: (id: string) => ipcRenderer.invoke('clients:getById', id),
    create: (input: unknown) => ipcRenderer.invoke('clients:create', input),
    update: (id: string, input: unknown) => ipcRenderer.invoke('clients:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('clients:delete', id),
    getTaskCount: (clientId: string) => ipcRenderer.invoke('clients:getTaskCount', clientId),
    getDocCount: (clientId: string) => ipcRenderer.invoke('clients:getDocCount', clientId),
    getTasks: (clientId: string) => ipcRenderer.invoke('clients:getTasks', clientId),
    getDocuments: (clientId: string) => ipcRenderer.invoke('clients:getDocuments', clientId),
    getActivityLog: (clientId: string, limit?: number) =>
      ipcRenderer.invoke('clients:getActivityLog', clientId, limit),
  },

  // Agent Files
  agentFiles: {
    getAll: (agentId: string) =>
      ipcRenderer.invoke('agentFiles:getAll', agentId),
    get: (agentId: string, filename: string) =>
      ipcRenderer.invoke('agentFiles:get', agentId, filename),
    save: (agentId: string, filename: string, content: string) =>
      ipcRenderer.invoke('agentFiles:save', agentId, filename, content),
    delete: (agentId: string, filename: string) =>
      ipcRenderer.invoke('agentFiles:delete', agentId, filename),
    // Removes IDENTITY-{clientId}.md from all agents — use when client removed or repo path changes
    clearClientIdentity: (clientId: string) =>
      ipcRenderer.invoke('agentFiles:clearClientIdentity', clientId),
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    pickWallpaper: () => ipcRenderer.invoke('settings:pick-wallpaper'),
    checkApiKey: () => ipcRenderer.invoke('settings:check-api-key'),
    setApiKey: (key: string) => ipcRenderer.invoke('settings:set-api-key', key),
  },

  // Global search
  search: {
    global: (query: string) => ipcRenderer.invoke('search:global', query),
  },

  // Ideas (Blueprint Phase 9)
  ideas: {
    getAll: (status?: string) => ipcRenderer.invoke('ideas:getAll', status),
    getPendingCount: () => ipcRenderer.invoke('ideas:getPendingCount'),
    approve: (id: string, taskId?: string) => ipcRenderer.invoke('ideas:approve', id, taskId),
    deny: (id: string, reason: string) => ipcRenderer.invoke('ideas:deny', id, reason),
    pin: (id: string) => ipcRenderer.invoke('ideas:pin', id),
    delete: (id: string) => ipcRenderer.invoke('ideas:delete', id),
    generate: () => ipcRenderer.send('ideas:generate'),
    onGenerating: (cb: (data: { status: string }) => void) =>
      ipcRenderer.on('ideas:generating', (_e, data) => cb(data)),
    onChunk: (cb: (data: { chunk: string }) => void) =>
      ipcRenderer.on('ideas:chunk', (_e, data) => cb(data)),
    onDone: (cb: (data: { count: number; ideas: unknown[] }) => void) =>
      ipcRenderer.on('ideas:done', (_e, data) => cb(data)),
    onError: (cb: (data: { error: string }) => void) =>
      ipcRenderer.on('ideas:error', (_e, data) => cb(data)),
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('ideas:generating')
      ipcRenderer.removeAllListeners('ideas:chunk')
      ipcRenderer.removeAllListeners('ideas:done')
      ipcRenderer.removeAllListeners('ideas:error')
    },
  },

  // Memories (Phase 10)
  memories: {
    getAll: (agentId: string, filters?: { clientId?: string | null; domain?: string; limit?: number }) =>
      ipcRenderer.invoke('memories:getAll', agentId, filters),
    delete: (id: string) => ipcRenderer.invoke('memories:delete', id),
    clearAgent: (agentId: string, clientId?: string) =>
      ipcRenderer.invoke('memories:clearAgent', agentId, clientId),
    getCount: (agentId: string) => ipcRenderer.invoke('memories:getCount', agentId),
    getSkillSummaries: (agentId: string) => ipcRenderer.invoke('memories:getSkillSummaries', agentId),
    runSkillHardening: (agentId?: string) => ipcRenderer.invoke('memories:runSkillHardening', agentId),
    create: (input: { agent_id: string; content: string; domain_tags?: string; skill_tags?: string; client_id?: string }) =>
      ipcRenderer.invoke('memories:create', input),
  },

  // Knowledge base (Phase 10)
  knowledge: {
    getAll: (options?: { domain?: string; clientId?: string; limit?: number }) =>
      ipcRenderer.invoke('knowledge:getAll', options),
    create: (input: { title: string; content: string; source_agent?: string; domain_tags?: string; client_id?: string }) =>
      ipcRenderer.invoke('knowledge:create', input),
    delete: (id: string) => ipcRenderer.invoke('knowledge:delete', id),
  },

  // Prompt templates (Phase 10)
  prompts: {
    getAll: (agentId?: string) => ipcRenderer.invoke('prompts:getAll', agentId),
    create: (input: { name: string; content: string; agent_id?: string; tags?: string }) =>
      ipcRenderer.invoke('prompts:create', input),
    delete: (id: string) => ipcRenderer.invoke('prompts:delete', id),
    incrementUsage: (id: string) => ipcRenderer.invoke('prompts:incrementUsage', id),
    autoRewrite: (content: string) => ipcRenderer.invoke('prompts:autoRewrite', content),
  },

  // Providers (Phase 11)
  providers: {
    getStatus: () => ipcRenderer.invoke('providers:getStatus'),
    setKey: (provider: string, key: string) =>
      ipcRenderer.invoke('providers:setKey', provider, key),
    removeKey: (provider: string) => ipcRenderer.invoke('providers:removeKey', provider),
    testConnection: (provider: string, apiKey?: string) =>
      ipcRenderer.invoke('providers:testConnection', provider, apiKey),
    getModels: (provider?: string) => ipcRenderer.invoke('providers:getModels', provider),
    getGlobalDefault: () => ipcRenderer.invoke('providers:getGlobalDefault'),
    setGlobalDefault: (provider: string, model: string) =>
      ipcRenderer.invoke('providers:setGlobalDefault', provider, model),
    getAgentModel: (agentId: string) => ipcRenderer.invoke('providers:getAgentModel', agentId),
    setAgentModel: (agentId: string, provider: string | null, model: string | null) =>
      ipcRenderer.invoke('providers:setAgentModel', agentId, provider, model),
    detectOllama: () => ipcRenderer.invoke('providers:detectOllama'),
    getOllamaModels: () => ipcRenderer.invoke('providers:getOllamaModels'),
    deleteOllamaModel: (modelName: string) =>
      ipcRenderer.invoke('providers:deleteOllamaModel', modelName),
    pullOllamaModel: (modelName: string) =>
      ipcRenderer.send('providers:pullOllamaModel', modelName),
    installOllama: () => ipcRenderer.invoke('providers:installOllama'),
    getMeta: () => ipcRenderer.invoke('providers:getMeta'),
    onPullProgress: (cb: (data: {
      model: string; status: string; completed?: number; total?: number; error?: string
    }) => void) => ipcRenderer.on('providers:pullProgress', (_e, data) => cb(data)),
    removePullProgressListener: () =>
      ipcRenderer.removeAllListeners('providers:pullProgress'),
  },

  // App-level push events from main process
  app: {
    /** Current OS platform — used by renderer to show/hide Windows title bar controls */
    platform: process.platform,
    /** True when running under Playwright (NODE_ENV=test) — skips first-run onboarding */
    isTest: process.env.NODE_ENV === 'test',
    onOpenShortcutSheet: (cb: () => void) =>
      ipcRenderer.on('open-shortcut-sheet', () => cb()),
    removeShortcutSheetListener: () =>
      ipcRenderer.removeAllListeners('open-shortcut-sheet'),
    /** Fired by the system tray / menu-bar when the user picks a navigation item */
    onTrayNavigate: (cb: (page: string) => void) =>
      ipcRenderer.on('tray:navigate', (_e, page: string) => cb(page)),
    removeTrayNavigateListener: () =>
      ipcRenderer.removeAllListeners('tray:navigate'),
    /** Relaunch the app — used after conductor mode change */
    relaunch: () => ipcRenderer.invoke('app:relaunch'),
  },

  // Window controls — used by custom title bar on Windows
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close:    () => ipcRenderer.send('window:close'),
  },

  // Auto-updater
  update: {
    check:   () => ipcRenderer.invoke('update:check'),
    install: () => ipcRenderer.send('update:install'),
    onStatus: (cb: (data: { type: 'available' | 'downloaded' | 'error'; version?: string }) => void) =>
      ipcRenderer.on('update:status', (_e, data) => cb(data)),
    removeStatusListener: () => ipcRenderer.removeAllListeners('update:status'),
  },

  // Repos (Phase 12)
  repos: {
    getAll: () => ipcRenderer.invoke('repos:getAll'),
    add: () => ipcRenderer.invoke('repos:add'),
    remove: (id: string) => ipcRenderer.invoke('repos:remove', id),
    getTree: (repoPath: string, subPath?: string) => ipcRenderer.invoke('repos:getTree', repoPath, subPath),
    readFile: (repoPath: string, filePath: string) => ipcRenderer.invoke('repos:readFile', repoPath, filePath),
    writeFile: (repoPath: string, filePath: string, content: string) => ipcRenderer.invoke('repos:writeFile', repoPath, filePath, content),
    findFile: (repoPath: string, query: string) => ipcRenderer.invoke('repos:findFile', repoPath, query),
  },

  // Terminal (Phase 12)
  terminal: {
    run: (opts: { cwd: string; command: string; sessionId: string; timeoutMs?: number }) =>
      ipcRenderer.invoke('terminal:run', opts),
    kill: (sessionId: string) => ipcRenderer.invoke('terminal:kill', sessionId),
    stdin: (opts: { sessionId: string; data: string }) => ipcRenderer.send('terminal:stdin', opts),
    getSuggestions: (repoPath: string) => ipcRenderer.invoke('terminal:getSuggestions', repoPath),
    onOutput: (cb: (data: { sessionId: string; data: string; type: 'stdout' | 'stderr' }) => void) =>
      ipcRenderer.on('terminal:output', (_e, data) => cb(data)),
    onDone: (cb: (data: { sessionId: string; exitCode: number | null }) => void) =>
      ipcRenderer.on('terminal:done', (_e, data) => cb(data)),
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('terminal:output')
      ipcRenderer.removeAllListeners('terminal:done')
    },
  },

  // Git (Phase 12)
  git: {
    status: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
    log: (repoPath: string, limit?: number) => ipcRenderer.invoke('git:log', repoPath, limit),
    branches: (repoPath: string) => ipcRenderer.invoke('git:branches', repoPath),
    createBranch: (repoPath: string, name: string) => ipcRenderer.invoke('git:createBranch', repoPath, name),
    checkout: (repoPath: string, branch: string) => ipcRenderer.invoke('git:checkout', repoPath, branch),
    diff: (repoPath: string, staged?: boolean, filePath?: string) => ipcRenderer.invoke('git:diff', repoPath, staged, filePath),
    add: (repoPath: string, files: string[]) => ipcRenderer.invoke('git:add', repoPath, files),
    commit: (repoPath: string, message: string) => ipcRenderer.invoke('git:commit', repoPath, message),
    push: (repoPath: string, remote?: string, branch?: string) => ipcRenderer.invoke('git:push', repoPath, remote, branch),
    createTaskBranch: (repoPath: string, taskId: string, taskTitle: string) =>
      ipcRenderer.invoke('git:createTaskBranch', repoPath, taskId, taskTitle),
    isRepo: (repoPath: string) => ipcRenderer.invoke('git:isRepo', repoPath),
  },

  // GitHub (Phase 12)
  github: {
    getToken: () => ipcRenderer.invoke('github:getToken'),
    setToken: (token: string) => ipcRenderer.invoke('github:setToken', token),
    removeToken: () => ipcRenderer.invoke('github:removeToken'),
    testToken: (token?: string) => ipcRenderer.invoke('github:testToken', token),
    openTokenPage: () => ipcRenderer.invoke('github:openTokenPage'),
    getIssues: (remoteUrl: string, state?: 'open' | 'closed' | 'all') =>
      ipcRenderer.invoke('github:getIssues', remoteUrl, state),
    createPR: (opts: { remoteUrl: string; head: string; base: string; title: string; body: string; issueNumber?: number }) =>
      ipcRenderer.invoke('github:createPR', opts),
    getPRs: (remoteUrl: string) => ipcRenderer.invoke('github:getPRs', remoteUrl),
    getRepoInfo: (remoteUrl: string) => ipcRenderer.invoke('github:getRepoInfo', remoteUrl),
  },

  // MCP Tool Integration (Phase 14)
  mcp: {
    listServers: () => ipcRenderer.invoke('mcp:listServers'),
    addServer: (input: {
      name: string
      type: 'stdio' | 'sse'
      command?: string
      args?: string[]
      url?: string
      env?: Record<string, string>
      requireApproval?: boolean
    }) => ipcRenderer.invoke('mcp:addServer', input),
    removeServer: (id: string) => ipcRenderer.invoke('mcp:removeServer', id),
    updateServer: (id: string, updates: Record<string, unknown>) =>
      ipcRenderer.invoke('mcp:updateServer', id, updates),
    testConnection: (config: Record<string, unknown>) =>
      ipcRenderer.invoke('mcp:testConnection', config),
    reconnect: (id: string) => ipcRenderer.invoke('mcp:reconnect', id),
    listTools: (serverId: string) => ipcRenderer.invoke('mcp:listTools', serverId),
    getAgentTools: (serverIds: string[]) => ipcRenderer.invoke('mcp:getAgentTools', serverIds),
    getAgentServers: (agentId: string) => ipcRenderer.invoke('mcp:getAgentServers', agentId),
    setAgentServers: (agentId: string, serverIds: string[]) =>
      ipcRenderer.invoke('mcp:setAgentServers', agentId, serverIds),
    getRegistry: () => ipcRenderer.invoke('mcp:getRegistry'),
    getStatuses: () => ipcRenderer.invoke('mcp:getStatuses'),
  },

  // Network / Server Mode (Phase 16)
  network: {
    getStatus:              () => ipcRenderer.invoke('network:getStatus'),
    enableHostMode:         () => ipcRenderer.invoke('network:enableHostMode'),
    disableHostMode:        () => ipcRenderer.invoke('network:disableHostMode'),
    regeneratePairingCode:  () => ipcRenderer.invoke('network:regeneratePairingCode'),
    connectToHost:          (ip: string, code: string) =>
      ipcRenderer.invoke('network:connectToHost', ip, code),
    disconnectFromHost:     () => ipcRenderer.invoke('network:disconnectFromHost'),
    getTailscalePeers:      () => ipcRenderer.invoke('network:getTailscalePeers'),
    installTailscale:       () => ipcRenderer.invoke('network:installTailscale'),
    isClientActive:         () => ipcRenderer.invoke('network:isClientActive'),
    onStatusChange: (cb: (s: unknown) => void) =>
      ipcRenderer.on('network:statusChange', (_e, data) => cb(data)),
    onConnected: (cb: (data: { hostIp: string }) => void) =>
      ipcRenderer.on('network:connected', (_e, data) => cb(data as { hostIp: string })),
    onConnectionStatus: (cb: (data: { connected: boolean }) => void) =>
      ipcRenderer.on('network:connectionStatus', (_e, data) => cb(data as { connected: boolean })),
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('network:statusChange')
      ipcRenderer.removeAllListeners('network:connected')
      ipcRenderer.removeAllListeners('network:connectionStatus')
    },
  },

  // Pipelines & Swarms (Phase 17)
  pipelines: {
    getAll:          (templatesOnly?: boolean) => ipcRenderer.invoke('pipelines:getAll', templatesOnly),
    getById:         (id: string)              => ipcRenderer.invoke('pipelines:getById', id),
    create:          (input: unknown)          => ipcRenderer.invoke('pipelines:create', input),
    update:          (id: string, updates: unknown) => ipcRenderer.invoke('pipelines:update', id, updates),
    delete:          (id: string)              => ipcRenderer.invoke('pipelines:delete', id),
    start:           (pipelineId: string)      => ipcRenderer.invoke('pipelines:start', pipelineId),
    getRecentRuns:   (limit?: number)          => ipcRenderer.invoke('pipelines:getRecentRuns', limit),
    getRuns:         (pipelineId: string, limit?: number) => ipcRenderer.invoke('pipelines:getRuns', pipelineId, limit),
    getRunDetail:    (runId: string)           => ipcRenderer.invoke('pipelines:getRunDetail', runId),
    decompose:       (goal: string)            => ipcRenderer.invoke('pipelines:decompose', goal),
    startSwarm:      (goal: string)            => ipcRenderer.invoke('pipelines:startSwarm', goal),
    onRunUpdate: (cb: (data: unknown) => void) =>
      ipcRenderer.on('pipelines:runUpdate', (_e, data) => cb(data)),
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('pipelines:runUpdate')
    },
  },

  // OpenClaw Gateway (Phase 15)
  openclaw: {
    getStatus: () => ipcRenderer.invoke('openclaw:getStatus'),
    install:   () => ipcRenderer.invoke('openclaw:install'),
    restart:   () => ipcRenderer.invoke('openclaw:restart'),
    start:     () => ipcRenderer.invoke('openclaw:start'),
    stop:      () => ipcRenderer.invoke('openclaw:stop'),
    listChannels: () => ipcRenderer.invoke('openclaw:listChannels'),
    addChannel: (input: { name: string; type: string; config?: Record<string, string>; routing_agent_id?: string }) =>
      ipcRenderer.invoke('openclaw:addChannel', input),
    updateChannel: (id: string, updates: Record<string, unknown>) =>
      ipcRenderer.invoke('openclaw:updateChannel', id, updates),
    removeChannel: (id: string) => ipcRenderer.invoke('openclaw:removeChannel', id),
    testChannel:   (id: string) => ipcRenderer.invoke('openclaw:testChannel', id),
    onStatusChange: (cb: (status: unknown) => void) =>
      ipcRenderer.on('openclaw:statusChange', (_e, data) => cb(data)),
    removeStatusListener: () => ipcRenderer.removeAllListeners('openclaw:statusChange'),
  },

  // Claude Code Mode (Phase 18)
  claudeCode: {
    checkCli:      () => ipcRenderer.invoke('claudecode:checkCli'),
    getAgentDir:   (agentId: string) => ipcRenderer.invoke('claudecode:getAgentDir', agentId),
    syncAgent:     (agentId: string) => ipcRenderer.invoke('claudecode:syncAgent', agentId),
    syncAllAgents: () => ipcRenderer.invoke('claudecode:syncAllAgents'),
  },

  // Intelligence
  intelligence: {
    getAll: (limit?: number) => ipcRenderer.invoke('intelligence:getAll', limit),
    getUnread: () => ipcRenderer.invoke('intelligence:getUnread'),
    markRead: (id: string) => ipcRenderer.invoke('intelligence:markRead', id),
    markAllRead: () => ipcRenderer.invoke('intelligence:markAllRead'),
    delete: (id: string) => ipcRenderer.invoke('intelligence:delete', id),
    generate: (type: 'insight' | 'recap') =>
      ipcRenderer.send('intelligence:generate', { type }),
    onChunk: (cb: (data: { chunk: string }) => void) =>
      ipcRenderer.on('intelligence:chunk', (_e, data) => cb(data)),
    onDone: (cb: (data: { insight: unknown }) => void) =>
      ipcRenderer.on('intelligence:done', (_e, data) => cb(data)),
    onError: (cb: (data: { error: string }) => void) =>
      ipcRenderer.on('intelligence:error', (_e, data) => cb(data)),
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('intelligence:chunk')
      ipcRenderer.removeAllListeners('intelligence:done')
      ipcRenderer.removeAllListeners('intelligence:error')
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)

// Test-only API — only available when NODE_ENV=test (Playwright integration tests)
if (process.env.NODE_ENV === 'test') {
  contextBridge.exposeInMainWorld('electronTestAPI', {
    runPrompt: (system: string, user: string, opts?: Record<string, unknown>) =>
      ipcRenderer.invoke('test:runPrompt', system, user, opts ?? {}),
  })
}

// TypeScript type declaration for renderer
export type ElectronAPI = typeof api
