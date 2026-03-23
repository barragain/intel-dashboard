import Anthropic from '@anthropic-ai/sdk'

const MODEL = process.env.INTEL_MODEL ?? 'claude-sonnet-4-6'

type AnyMessage = {
  content: Anthropic.ContentBlock[]
  stop_reason: string | null
}

export async function searchAndAnalyze(
  prompt: string,
  maxTokens = 2500,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY_MISSING')
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: prompt },
  ]

  // Agentic loop to handle tool use (web search)
  // Using unknown + cast to avoid strict typing on experimental web_search tool
  const create = client.messages.create.bind(client.messages) as (
    params: unknown
  ) => Promise<AnyMessage>

  for (let turn = 0; turn < 8; turn++) {
    const response = await create({
      model: MODEL,
      max_tokens: maxTokens,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (response.stop_reason === 'end_turn') {
      return text
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content })

      const toolResults: Anthropic.ToolResultBlockParam[] = response.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
        .map((b) => ({
          type: 'tool_result' as const,
          tool_use_id: b.id,
          content: '',
        }))

      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults })
      }
    } else {
      return text
    }
  }

  throw new Error('Max turns exceeded')
}

/**
 * Parse JSON from Claude's response. Handles cases where Claude wraps JSON
 * in markdown code fences.
 */
export function parseJson<T>(text: string): T {
  // Try to extract JSON from markdown code block
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenceMatch ? fenceMatch[1] : text

  // Find the first { or [ to handle prose before/after JSON
  const startBrace = raw.indexOf('{')
  const startBracket = raw.indexOf('[')
  let start = -1
  if (startBrace === -1) start = startBracket
  else if (startBracket === -1) start = startBrace
  else start = Math.min(startBrace, startBracket)

  if (start === -1) throw new Error('No JSON found in response')

  const lastBrace = raw.lastIndexOf('}')
  const lastBracket = raw.lastIndexOf(']')
  const end = Math.max(lastBrace, lastBracket)

  return JSON.parse(raw.slice(start, end + 1)) as T
}
