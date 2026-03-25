import { GoogleGenerativeAI } from '@google/generative-ai'
import { SYSTEM_CONTEXT } from '@/lib/context'

// Cast to bypass strict typing on the googleSearch grounding tool,
// which is not yet reflected in the SDK's Tool type definitions.
type AnyModelParams = {
  model: string
}
type AnyGenerateParams = {
  contents: { role: string; parts: { text: string }[] }[]
  tools?: unknown[]
  generationConfig?: { maxOutputTokens?: number }
}

const LANG_SUFFIX: Record<string, string> = {
  fr: '\n\nYou must respond entirely in French. Every single word of your response must be in French — all summaries, quotes, labels, explanations, field values, and descriptions. Do not use any English words anywhere in the JSON output.',
  es: '\n\nYou must respond entirely in Spanish. Every single word of your response must be in Spanish — all summaries, quotes, labels, explanations, field values, and descriptions. Do not use any English words anywhere in the JSON output.',
}

function makeModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey)
  const getModel = genAI.getGenerativeModel.bind(genAI) as (params: AnyModelParams) => {
    generateContent: (params: AnyGenerateParams) => Promise<{ response: { text: () => string } }>
  }
  return getModel({ model: 'gemini-2.5-flash' })
}

// Injected before every prompt to prevent Gemini from writing prose
// before the JSON when search grounding is active.
const JSON_ENFORCEMENT =
  'IMPORTANT: Your entire response must be valid JSON starting with { — no preamble, no explanation, no markdown fences, no text before or after the JSON object.'

/**
 * Call Gemini WITH Google Search grounding enabled.
 * Use for sections that need live, authoritative data: Historical Context,
 * Analyst/Expert Voices, Taiwan, Paraguay.
 */
export async function searchAndAnalyze(prompt: string, lang = 'en'): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY_MISSING')
  }

  const model = makeModel(process.env.GEMINI_API_KEY)

  try {
    const fullPrompt = [SYSTEM_CONTEXT, JSON_ENFORCEMENT, prompt, LANG_SUFFIX[lang] ?? ''].filter(Boolean).join('\n\n')

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: { maxOutputTokens: 8192 },
    })
    const text = result.response.text()
    if (!text || text.trim() === '') throw new Error('EMPTY_RESPONSE')
    return text
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status === 429) throw new Error('RATE_LIMIT_EXCEEDED')
    throw err
  }
}

/**
 * Call Gemini WITHOUT search grounding, using pre-fetched news headlines as context.
 * Use for: Market Sentiment, Crypto Signal, Conflict Tracker, EU/France,
 * Tech Sector, Community Sentiment.
 *
 * @param headlines  Recent headlines fetched from lib/news.ts
 * @param prompt     The analysis prompt (should request compact JSON or 2-3 sentence summary)
 * @param lang       Response language (en/fr/es)
 */
export async function analyzeWithContext(
  headlines: Array<{ title: string; source: string; date: string }>,
  prompt: string,
  lang = 'en',
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY_MISSING')
  }

  const model = makeModel(process.env.GEMINI_API_KEY)

  const headlineList = headlines
    .slice(0, 8)
    .map(
      (h) =>
        `- ${h.title} (${h.source}, ${new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`,
    )
    .join('\n')

  const newsBlock = `Based on these recent headlines:\n${headlineList}`
  const fullPrompt = [SYSTEM_CONTEXT, JSON_ENFORCEMENT, newsBlock, prompt, LANG_SUFFIX[lang] ?? ''].filter(Boolean).join('\n\n')

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      // No tools — search grounding intentionally disabled
      generationConfig: { maxOutputTokens: 8192 },
    })
    const text = result.response.text()
    if (!text || text.trim() === '') throw new Error('EMPTY_RESPONSE')
    return text
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status === 429) throw new Error('RATE_LIMIT_EXCEEDED')
    throw err
  }
}

/**
 * Parse JSON from Gemini's response. Handles cases where the model wraps JSON
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

  if (start === -1) throw new Error(`No JSON found in response: ${raw.slice(0, 200)}`)

  const lastBrace = raw.lastIndexOf('}')
  const lastBracket = raw.lastIndexOf(']')
  const end = Math.max(lastBrace, lastBracket)

  // Guard: if no closing delimiter found after the opening brace, JSON is truncated
  if (end < start) {
    throw new Error(`JSON truncated — no closing delimiter. Response preview: ${raw.slice(start, start + 300)}`)
  }

  try {
    return JSON.parse(raw.slice(start, end + 1)) as T
  } catch {
    throw new Error(`JSON parse failed. Response preview: ${raw.slice(start, start + 300)}`)
  }
}
