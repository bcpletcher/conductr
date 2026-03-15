/**
 * MCP Manager — global registry of active server connections.
 * Persists connections across requests; lazily connects on first use.
 */

import { McpServerClient } from './client'
import type { McpServerConfig, McpTool, McpServerStatus, AnthropicToolDef } from './types'

const connections = new Map<string, { client: McpServerClient; status: McpServerStatus }>()

export async function connectServer(config: McpServerConfig): Promise<McpServerStatus> {
  // Disconnect existing connection for this server if present
  await disconnectServer(config.id)

  const client = new McpServerClient(config)
  const entry = {
    client,
    status: {
      serverId: config.id,
      status: 'connecting' as const,
      toolCount: 0,
    },
  }
  connections.set(config.id, entry)

  try {
    await client.connect()
    const tools = await client.listTools()
    entry.status = { serverId: config.id, status: 'connected', toolCount: tools.length }
    return entry.status
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    entry.status = { serverId: config.id, status: 'error', toolCount: 0, error }
    return entry.status
  }
}

export async function disconnectServer(id: string): Promise<void> {
  const entry = connections.get(id)
  if (entry) {
    await entry.client.disconnect()
    connections.delete(id)
  }
}

export async function disconnectAll(): Promise<void> {
  for (const id of connections.keys()) {
    await disconnectServer(id)
  }
}

export function getStatus(id: string): McpServerStatus {
  const entry = connections.get(id)
  return entry?.status ?? { serverId: id, status: 'disconnected', toolCount: 0 }
}

export function getAllStatuses(): McpServerStatus[] {
  return Array.from(connections.values()).map((e) => e.status)
}

/** List tools from a single connected server */
export async function listToolsForServer(serverId: string): Promise<McpTool[]> {
  const entry = connections.get(serverId)
  if (!entry || entry.status.status !== 'connected') return []
  try {
    return await entry.client.listTools()
  } catch {
    return []
  }
}

/** Aggregate tools from multiple servers (for agent tool injection) */
export async function getToolsForServers(serverIds: string[]): Promise<McpTool[]> {
  const all: McpTool[] = []
  for (const id of serverIds) {
    const tools = await listToolsForServer(id)
    all.push(...tools)
  }
  return all
}

/** Format MCP tools as Anthropic tool definitions */
export function toAnthropicTools(tools: McpTool[]): AnthropicToolDef[] {
  return tools.map((t) => ({
    name: `${t.serverId}__${t.name}`,  // namespace: prevent collisions across servers
    description: `[${t.serverName}] ${t.description ?? t.name}`,
    input_schema: {
      type: 'object' as const,
      ...(t.inputSchema as Record<string, unknown>),
    },
  }))
}

/** Call a tool, routing to the correct server by namespaced tool name */
export async function callTool(
  namespacedName: string,
  args: Record<string, unknown>
): Promise<string> {
  // namespacedName format: "<serverId>__<toolName>"
  const separatorIdx = namespacedName.indexOf('__')
  if (separatorIdx === -1) throw new Error(`Invalid tool name format: ${namespacedName}`)
  const serverId = namespacedName.slice(0, separatorIdx)
  const toolName = namespacedName.slice(separatorIdx + 2)

  const entry = connections.get(serverId)
  if (!entry || entry.status.status !== 'connected') {
    throw new Error(`MCP server "${serverId}" is not connected`)
  }

  return entry.client.callTool(toolName, args)
}

/** Test a server connection — connect, list tools, disconnect. Returns status. */
export async function testServer(config: McpServerConfig): Promise<McpServerStatus> {
  const tempClient = new McpServerClient(config)
  try {
    await tempClient.connect()
    const tools = await tempClient.listTools()
    await tempClient.disconnect()
    return { serverId: config.id, status: 'connected', toolCount: tools.length }
  } catch (err) {
    await tempClient.disconnect().catch(() => {})
    const error = err instanceof Error ? err.message : String(err)
    return { serverId: config.id, status: 'error', toolCount: 0, error }
  }
}
