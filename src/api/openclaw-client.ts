/**
 * OpenClaw Gateway WebSocket client.
 * Connects to ws://127.0.0.1:18789 and provides session management,
 * tool invocation, and message routing.
 * Gracefully no-ops when Gateway is not running.
 */

const GATEWAY_WS_URL = 'ws://127.0.0.1:18789'
const MAX_RECONNECT_DELAY_MS = 30_000

export type GatewayConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface GatewayEvent {
  type: string
  sessionId?: string
  channel?: string
  agentId?: string
  message?: string
  data?: unknown
}

export interface GatewayMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export class OpenClawClient {
  private ws: WebSocket | null = null
  private status: GatewayConnectionStatus = 'disconnected'
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private listeners: Array<(event: GatewayEvent) => void> = []
  private pendingRequests = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

  // ── Connection ────────────────────────────────────────────────────────────

  connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') return Promise.resolve()

    return new Promise((resolve) => {
      this.status = 'connecting'
      try {
        this.ws = new WebSocket(GATEWAY_WS_URL)

        this.ws.onopen = () => {
          this.status = 'connected'
          this.reconnectDelay = 1000
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string) as GatewayEvent & { id?: string; result?: unknown; error?: string }
            // Resolve pending request if it has an id
            if (data.id && this.pendingRequests.has(data.id)) {
              const { resolve: res, reject: rej } = this.pendingRequests.get(data.id)!
              this.pendingRequests.delete(data.id)
              if (data.error) rej(new Error(data.error))
              else res(data.result ?? data)
            } else {
              // Broadcast to event listeners
              this.listeners.forEach((cb) => cb(data))
            }
          } catch {
            // ignore malformed frames
          }
        }

        this.ws.onerror = () => {
          this.status = 'error'
          resolve() // don't reject — offline is normal
        }

        this.ws.onclose = () => {
          this.status = 'disconnected'
          this.ws = null
          this.scheduleReconnect()
          resolve()
        }
      } catch {
        this.status = 'error'
        resolve()
      }
    })
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this.status = 'disconnected'
  }

  getStatus(): GatewayConnectionStatus {
    return this.status
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect().catch(console.error)
    }, this.reconnectDelay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS)
  }

  // ── Internal RPC ──────────────────────────────────────────────────────────

  private sendRpc(method: string, params: unknown = {}): Promise<unknown> {
    if (this.status !== 'connected' || !this.ws) {
      return Promise.reject(new Error('OpenClaw Gateway not connected'))
    }
    const id = `rpc-${Date.now()}-${Math.random().toString(36).slice(2)}`
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })
      this.ws!.send(JSON.stringify({ id, method, params }))
      // Timeout after 10s
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`RPC timeout: ${method}`))
        }
      }, 10_000)
    })
  }

  // ── Session API ───────────────────────────────────────────────────────────

  async createSession(agentId: string, channelType: string): Promise<string> {
    try {
      const result = await this.sendRpc('sessions_create', { agent_id: agentId, channel_type: channelType }) as { session_id: string }
      return result.session_id ?? ''
    } catch {
      return ''
    }
  }

  async sendMessage(sessionId: string, message: string): Promise<void> {
    try {
      await this.sendRpc('sessions_send', { session_id: sessionId, message })
    } catch (err) {
      console.error('[OpenClaw] sendMessage error:', err)
    }
  }

  async getHistory(sessionId: string): Promise<GatewayMessage[]> {
    try {
      const result = await this.sendRpc('sessions_history', { session_id: sessionId }) as { messages: GatewayMessage[] }
      return result.messages ?? []
    } catch {
      return []
    }
  }

  // ── Tool invocation ───────────────────────────────────────────────────────

  async callTool(tool: string, args: Record<string, unknown>): Promise<string> {
    try {
      const result = await this.sendRpc('tool_call', { tool, args }) as { output?: string }
      return result.output ?? ''
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`OpenClaw tool '${tool}' failed: ${msg}`)
    }
  }

  // ── Event listener ────────────────────────────────────────────────────────

  onMessage(cb: (event: GatewayEvent) => void): () => void {
    this.listeners.push(cb)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb)
    }
  }
}

export const openClawClient = new OpenClawClient()
