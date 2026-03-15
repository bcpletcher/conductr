export type McpServerType = 'stdio' | 'sse'

export interface McpServerConfig {
  id: string
  name: string
  type: McpServerType
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  requireApproval: boolean
  enabled: boolean
  createdAt: string
}

export interface McpTool {
  name: string
  description?: string
  inputSchema: Record<string, unknown>
  serverId: string
  serverName: string
}

export type McpConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

export interface McpServerStatus {
  serverId: string
  status: McpConnectionStatus
  toolCount: number
  error?: string
}

/** Anthropic-format tool definition */
export interface AnthropicToolDef {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties?: Record<string, unknown>
    required?: string[]
    [key: string]: unknown
  }
}

/** Community registry entry — popular MCP servers users can install with one click */
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

export const MCP_COMMUNITY_REGISTRY: McpRegistryEntry[] = [
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Read and write local files — give agents access to any directory on your machine.',
    category: 'Storage',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '<path>'],
    installCmd: 'npm install -g @modelcontextprotocol/server-filesystem',
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
  },
  {
    id: 'fetch',
    name: 'Fetch',
    description: 'Fetch any URL and get back clean text — agents can browse the web.',
    category: 'Web',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    description: 'Query and inspect SQLite databases — perfect for Ledger reading conductr.db.',
    category: 'Storage',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite', '<db-path>'],
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Real-time web and news search via the Brave Search API.',
    category: 'Web',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    requiresKey: 'BRAVE_API_KEY',
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Search repos, read files, manage issues and PRs via the GitHub API.',
    category: 'Dev',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    requiresKey: 'GITHUB_PERSONAL_ACCESS_TOKEN',
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    description: 'Browser automation — navigate pages, click, fill forms, take screenshots.',
    category: 'Web',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer',
  },
  {
    id: 'memory',
    name: 'Memory',
    description: 'Persistent knowledge graph — agents remember facts across conversations.',
    category: 'Intelligence',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages and read channels — connect agents to your Slack workspace.',
    category: 'Comms',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    requiresKey: 'SLACK_BOT_TOKEN',
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
  },
  {
    id: 'everything',
    name: 'Everything (Demo)',
    description: 'Demo server with echo, memory, time, and file tools — great for testing MCP.',
    category: 'Dev',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-everything'],
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/everything',
  },
]
