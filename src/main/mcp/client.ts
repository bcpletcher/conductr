/**
 * McpServerClient — wraps a single MCP server connection.
 * Handles connect/disconnect, tool listing, and tool execution.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { McpServerConfig, McpTool } from './types'

export class McpServerClient {
  private client: Client | null = null
  private readonly config: McpServerConfig

  constructor(config: McpServerConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    this.client = new Client(
      { name: 'conductr', version: '1.0.0' },
      { capabilities: { tools: {} } }
    )

    let transport
    if (this.config.type === 'stdio') {
      if (!this.config.command) throw new Error(`Server "${this.config.name}": command is required for stdio type`)
      transport = new StdioClientTransport({
        command: this.config.command,
        args: this.config.args ?? [],
        env: this.config.env,
        stderr: 'pipe',
      })
    } else {
      if (!this.config.url) throw new Error(`Server "${this.config.name}": url is required for sse type`)
      transport = new SSEClientTransport(new URL(this.config.url))
    }

    await this.client.connect(transport)
  }

  async listTools(): Promise<McpTool[]> {
    if (!this.client) throw new Error(`Server "${this.config.name}": not connected`)
    const result = await this.client.listTools()
    return result.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: (t.inputSchema ?? {}) as Record<string, unknown>,
      serverId: this.config.id,
      serverName: this.config.name,
    }))
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    if (!this.client) throw new Error(`Server "${this.config.name}": not connected`)
    const result = await this.client.callTool({ name, arguments: args })
    const content = result.content as { type: string; text?: string }[]
    return content
      .map((c) => (c.type === 'text' ? (c.text ?? '') : JSON.stringify(c)))
      .join('\n')
  }

  async disconnect(): Promise<void> {
    try {
      await this.client?.close()
    } catch {
      // ignore errors during shutdown
    }
    this.client = null
  }

  isConnected(): boolean {
    return this.client !== null
  }

  getId(): string {
    return this.config.id
  }

  getName(): string {
    return this.config.name
  }
}
