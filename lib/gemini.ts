import { GoogleGenerativeAI } from '@google/generative-ai'

// Cast to bypass strict typing on the googleSearch grounding tool,
// which is not yet reflected in the SDK's Tool type definitions.
type AnyModelParams = {
  model: string
}
type AnyGenerateParams = {
  contents: { role: string; parts: { text: string }[] }[]
  tools?: unknown[]
}

const LANG_SUFFIX: Record<string, string> = {
  fr: '\n\nYou must respond entirely in French. Every single word of your response must be in French — all summaries, quotes, labels, explanations, field values, and descriptions. Do not use any English words anywhere in the JSON output.',
  es: '\n\nYou must respond entirely in Spanish. Every single word of your response must be in Spanish — all summaries, quotes, labels, explanations, field values, and descriptions. Do not use any English words anywhere in the JSON output.',
}

export async function searchAndAnalyze(prompt: string, lang = 'en'): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY_MISSING')
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const getModel = genAI.getGenerativeModel.bind(genAI) as (params: AnyModelParams) => {
    generateContent: (params: AnyGenerateParams) => Promise<{ response: { text: () => string } }>
  }

  const model = getModel({ model: 'gemini-2.5-flash' })

  try {
    const fullPrompt = LANG_SUFFIX[lang] ? `${prompt}${LANG_SUFFIX[lang]}` : prompt

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      tools: [{ googleSearch: {} }],
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

  try {
    return JSON.parse(raw.slice(start, end + 1)) as T
  } catch {
    throw new Error(`JSON parse failed. Response preview: ${raw.slice(start, start + 300)}`)
  }
}
