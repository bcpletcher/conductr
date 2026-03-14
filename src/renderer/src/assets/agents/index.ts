/**
 * Agent avatar URLs — points to the webp files in src/renderer/public/.
 * Vite serves public/ at the renderer root, so `./agent-lyra.webp` resolves
 * correctly both in dev (localhost) and production (file://).
 *
 * All 11 agents have webp portraits. Active agents: Lyra, Nova, Scout, Forge,
 * Pixel, Sentinel, Courier. Phase-locked: Nexus (Ph11), Helm (Ph10/11),
 * Atlas (Ph12), Ledger (Ph4 ext.).
 */
export const AGENT_AVATARS: Record<string, string> = {
  // Core 7 — active now
  'agent-lyra':     './agent-lyra.webp',
  'agent-nova':     './agent-nova.webp',
  'agent-scout':    './agent-scout.webp',
  'agent-forge':    './agent-forge.webp',
  'agent-pixel':    './agent-pixel.webp',
  'agent-sentinel': './agent-sentinel.webp',
  'agent-courier':  './agent-courier.webp',
  // Expansion 4 — phase-locked, visible in app, fully activated per phase
  'agent-nexus':    './agent-nexus.webp',
  'agent-helm':     './agent-helm.webp',
  'agent-atlas':    './agent-atlas.webp',
  'agent-ledger':   './agent-ledger.webp',
}

/**
 * Primary accent color per agent ID — canonical design system values.
 *  Lyra → indigo  · Nova → violet  · Scout → cyan   · Forge → orange
 *  Pixel → pink   · Sentinel → green · Courier → amber
 *  Nexus → sky    · Helm → rose    · Atlas → purple  · Ledger → gold
 */
export const AGENT_COLORS: Record<string, string> = {
  // Core 7
  'agent-lyra':     '#818cf8',  // indigo
  'agent-nova':     '#a78bfa',  // violet
  'agent-scout':    '#22d3ee',  // cyan
  'agent-forge':    '#f97316',  // orange
  'agent-pixel':    '#ec4899',  // pink
  'agent-sentinel': '#34d399',  // green
  'agent-courier':  '#fbbf24',  // amber
  // Expansion 4
  'agent-nexus':    '#0ea5e9',  // sky
  'agent-helm':     '#f43f5e',  // rose
  'agent-atlas':    '#9333ea',  // purple
  'agent-ledger':   '#eab308',  // gold
}

/** Returns the agent's canonical accent color, or indigo as fallback. */
export function getAgentColor(agentId: string | null | undefined): string {
  return AGENT_COLORS[agentId ?? ''] ?? '#818cf8'
}
