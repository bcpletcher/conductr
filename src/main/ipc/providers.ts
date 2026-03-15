import { ipcMain, shell } from 'electron'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import https from 'https'
import { app } from 'electron'
import { getSetting, setSetting, getSecureSetting, setSecureSetting } from '../db/settings'
import { getDb } from '../db/schema'
import { testProviderConnection, getProviderKey } from '../../api/router'
import { MODEL_REGISTRY, getModelsForProvider, PROVIDER_META } from '../../api/providers/registry'
import type { ProviderName } from '../../api/providers/types'

const execAsync = promisify(exec)

// Settings key mapping for provider API keys
const PROVIDER_KEY_SETTINGS: Record<string, string> = {
  anthropic: 'anthropic_api_key',
  openrouter: 'provider_key_openrouter',
  openai: 'provider_key_openai',
  groq: 'provider_key_groq',
}

export function registerProviderHandlers(): void {
  // ── Get provider status for all providers ──────────────────────────────────
  ipcMain.handle('providers:getStatus', () => {
    const providers: Record<string, { configured: boolean; maskedKey?: string }> = {}

    for (const [name, settingKey] of Object.entries(PROVIDER_KEY_SETTINGS)) {
      const key = name === 'anthropic'
        ? (process.env.ANTHROPIC_API_KEY || getSecureSetting(settingKey))
        : name === 'openrouter'
          ? (process.env.OPENROUTER_API_KEY || getSecureSetting(settingKey))
          : getSecureSetting(settingKey)
      providers[name] = {
        configured: Boolean(key),
        maskedKey: key ? maskKey(key) : undefined,
      }
    }

    // Ollama: check running status
    providers.ollama = { configured: true }  // no key needed

    return providers
  })

  // ── Save a provider's API key ──────────────────────────────────────────────
  ipcMain.handle('providers:setKey', (_e, provider: string, key: string) => {
    const settingKey = PROVIDER_KEY_SETTINGS[provider]
    if (!settingKey) throw new Error(`Unknown provider: ${provider}`)
    setSecureSetting(settingKey, key.trim())

    // If setting Anthropic key, also reset the cached client
    if (provider === 'anthropic') {
      import('../../api/claude').then(({ resetAnthropicClient }) => resetAnthropicClient()).catch(() => {})
    }
    return { ok: true }
  })

  // ── Remove a provider's API key ────────────────────────────────────────────
  ipcMain.handle('providers:removeKey', (_e, provider: string) => {
    const settingKey = PROVIDER_KEY_SETTINGS[provider]
    if (!settingKey) throw new Error(`Unknown provider: ${provider}`)
    const db = getDb()
    db.prepare('DELETE FROM settings WHERE key = ?').run(settingKey)
    if (provider === 'anthropic') {
      import('../../api/claude').then(({ resetAnthropicClient }) => resetAnthropicClient()).catch(() => {})
    }
    return { ok: true }
  })

  // ── Test a provider connection ─────────────────────────────────────────────
  ipcMain.handle('providers:testConnection', async (_e, provider: string, apiKey?: string) => {
    const key = apiKey ?? getProviderKey(provider) ?? ''
    if (!key && provider !== 'ollama') {
      return { ok: false, error: 'No API key configured' }
    }
    return testProviderConnection(provider as ProviderName, key)
  })

  // ── Get model list for a provider (static registry + live Ollama) ─────────
  ipcMain.handle('providers:getModels', async (_e, provider?: string) => {
    if (provider === 'ollama') {
      return getOllamaModels()
    }
    if (provider) {
      return getModelsForProvider(provider as ProviderName)
    }
    return MODEL_REGISTRY
  })

  // ── Get / set global default provider + model ──────────────────────────────
  ipcMain.handle('providers:getGlobalDefault', () => ({
    provider: getSetting('default_provider') ?? null,
    model: getSetting('default_model') ?? null,
  }))

  ipcMain.handle('providers:setGlobalDefault', (_e, provider: string, model: string) => {
    setSetting('default_provider', provider)
    setSetting('default_model', model)
    return { ok: true }
  })

  // ── Get / set per-agent model ──────────────────────────────────────────────
  ipcMain.handle('providers:getAgentModel', (_e, agentId: string) => {
    const db = getDb()
    const agent = db
      .prepare('SELECT default_provider, default_model FROM agents WHERE id = ?')
      .get(agentId) as { default_provider: string | null; default_model: string | null } | undefined
    return agent?.default_provider
      ? { provider: agent.default_provider, model: agent.default_model }
      : null
  })

  ipcMain.handle('providers:setAgentModel', (_e, agentId: string, provider: string | null, model: string | null) => {
    const db = getDb()
    db.prepare('UPDATE agents SET default_provider = ?, default_model = ? WHERE id = ?')
      .run(provider, model, agentId)
    return { ok: true }
  })

  // ── Ollama: detect running status ──────────────────────────────────────────
  ipcMain.handle('providers:detectOllama', async () => {
    try {
      const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data = await res.json().catch(() => ({})) as { models?: { name: string }[] }
        return { running: true, modelCount: data.models?.length ?? 0 }
      }
      return { running: false }
    } catch {
      return { running: false }
    }
  })

  // ── Ollama: list installed models ──────────────────────────────────────────
  ipcMain.handle('providers:getOllamaModels', async () => {
    return getOllamaModels()
  })

  // ── Ollama: delete a model ─────────────────────────────────────────────────
  ipcMain.handle('providers:deleteOllamaModel', async (_e, modelName: string) => {
    try {
      const res = await fetch('http://localhost:11434/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      })
      return { ok: res.ok }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // ── Ollama: pull a model with streaming progress ───────────────────────────
  ipcMain.on('providers:pullOllamaModel', async (event, modelName: string) => {
    const win = event.sender
    try {
      const res = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: true }),
      })

      if (!res.ok) {
        win.send('providers:pullProgress', { model: modelName, status: 'error', error: `HTTP ${res.status}` })
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        win.send('providers:pullProgress', { model: modelName, status: 'error', error: 'No response body' })
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line) as {
              status?: string
              completed?: number
              total?: number
              error?: string
            }
            win.send('providers:pullProgress', {
              model: modelName,
              status: data.status ?? 'pulling',
              completed: data.completed,
              total: data.total,
              error: data.error,
            })
          } catch { /* skip */ }
        }
      }

      win.send('providers:pullProgress', { model: modelName, status: 'done' })
    } catch (err) {
      win.send('providers:pullProgress', {
        model: modelName,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })

  // ── Ollama: open installer download page ──────────────────────────────────
  ipcMain.handle('providers:installOllama', () => {
    // Open the platform-specific download page in the default browser
    const platform = process.platform
    const url = platform === 'win32'
      ? 'https://ollama.com/download/windows'
      : 'https://ollama.com/download/mac'
    shell.openExternal(url)
    return { ok: true }
  })

  // ── Get provider metadata (labels, descriptions, key hints) ───────────────
  ipcMain.handle('providers:getMeta', () => PROVIDER_META)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return key.slice(0, 8) + '••••' + key.slice(-4)
}

async function getOllamaModels(): Promise<{ id: string; name: string; size?: number }[]> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return []
    const data = await res.json().catch(() => ({})) as {
      models?: { name: string; size?: number }[]
    }
    return (data.models ?? []).map((m) => ({
      id: m.name,
      name: m.name,
      size: m.size,
    }))
  } catch {
    return []
  }
}
