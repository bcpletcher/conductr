export type ProviderName = 'anthropic' | 'openrouter' | 'openai' | 'groq' | 'ollama'

export interface ContentPart {
  type: 'text' | 'image'
  text?: string
  imageData?: { base64: string; mediaType: string }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
}

export interface RouteOptions {
  systemPrompt: string
  messages: ChatMessage[]
  agentId?: string
  /** Force a specific model (single-run override) */
  model?: string
  /** Force a specific provider (single-run override) */
  provider?: string
  maxTokens?: number
  onChunk?: (text: string) => void
  /** Wrap system prompt in cache_control for repeated calls (Anthropic only) */
  cacheSystem?: boolean
  /** MCP tools to make available (Anthropic-format definitions + call dispatcher) */
  tools?: import('../../main/mcp/types').AnthropicToolDef[]
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void
  onToolResult?: (toolName: string, result: string, isError: boolean) => void
}

export interface RouteResult {
  content: string
  model: string
  provider: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export interface ModelInfo {
  id: string
  name: string
  provider: ProviderName
  contextWindow: number
  /** USD per 1k input tokens — 0 means free */
  inputCostPer1k: number
  /** USD per 1k output tokens — 0 means free */
  outputCostPer1k: number
  supportsTools: boolean
  supportsVision: boolean
  isFree: boolean
  description?: string
  recommended?: boolean
}

export interface ProviderStatus {
  name: ProviderName
  label: string
  configured: boolean
  running?: boolean   // Ollama only
  error?: string
}
