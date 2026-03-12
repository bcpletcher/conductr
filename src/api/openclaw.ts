// OpenClaw MCP client — Phase 2 placeholder
// Will be wired in Phase 2 after core app is running

export interface OpenClawConfig {
  apiKey: string
  baseUrl: string
}

export class OpenClawClient {
  private config: OpenClawConfig

  constructor(config: OpenClawConfig) {
    this.config = config
  }

  // Placeholder — real implementation in Phase 2
  async ping(): Promise<boolean> {
    return false
  }
}

let clawClient: OpenClawClient | null = null

export function getOpenClawClient(): OpenClawClient | null {
  const apiKey = process.env.OPENCLAW_API_KEY
  const baseUrl = process.env.OPENCLAW_BASE_URL

  if (!apiKey || !baseUrl) return null

  if (!clawClient) {
    clawClient = new OpenClawClient({ apiKey, baseUrl })
  }

  return clawClient
}
