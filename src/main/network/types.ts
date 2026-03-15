/**
 * Phase 16 — Server Mode shared types.
 */

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

export interface ConnectResult {
  ok: boolean
  error?: string
}
