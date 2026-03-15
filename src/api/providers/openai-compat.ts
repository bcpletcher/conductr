/**
 * Shared OpenAI-compatible streaming for OpenRouter, OpenAI, Groq, and Ollama.
 * All four providers expose the same `/chat/completions` SSE format.
 */

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | OpenAIContentPart[]
}

export interface OpenAIContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string; detail?: string }
}

export interface OpenAICompatStreamOptions {
  baseUrl: string
  apiKey: string
  model: string
  messages: OpenAIMessage[]
  maxTokens?: number
  onChunk: (text: string) => void
  extraHeaders?: Record<string, string>
}

export interface OpenAICompatResult {
  content: string
  inputTokens: number
  outputTokens: number
}

export async function streamOpenAICompat({
  baseUrl,
  apiKey,
  model,
  messages,
  maxTokens = 4096,
  onChunk,
  extraHeaders = {},
}: OpenAICompatStreamOptions): Promise<OpenAICompatResult> {
  const endpoint = `${baseUrl}/chat/completions`
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Connection failed to ${baseUrl}: ${msg}. Check your network and API key.`)
  }

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new Error(`${response.status}: ${text.slice(0, 300)}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''
  let inputTokens = 0
  let outputTokens = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[]
          usage?: { prompt_tokens?: number; completion_tokens?: number }
        }

        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) {
          fullContent += delta
          onChunk(delta)
        }

        // Some providers send usage in the final data chunk (stream_options trick)
        if (parsed.usage) {
          inputTokens = parsed.usage.prompt_tokens ?? inputTokens
          outputTokens = parsed.usage.completion_tokens ?? outputTokens
        }
      } catch {
        // Skip malformed SSE chunks
      }
    }
  }

  // If no usage came back from the stream, estimate from content length
  if (outputTokens === 0 && fullContent.length > 0) {
    outputTokens = Math.ceil(fullContent.length / 4)
  }

  return { content: fullContent, inputTokens, outputTokens }
}

export async function testOpenAICompatConnection(
  baseUrl: string,
  apiKey: string,
  extraHeaders: Record<string, string> = {}
): Promise<{ ok: boolean; error?: string; modelCount?: number }> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
    })

    if (response.ok) {
      const data = await response.json().catch(() => ({})) as { data?: unknown[] }
      return { ok: true, modelCount: data.data?.length }
    }

    const text = await response.text().catch(() => response.statusText)
    return { ok: false, error: `${response.status}: ${text.slice(0, 200)}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
