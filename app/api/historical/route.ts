import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { unstable_cache } from 'next/cache'
import { searchAndAnalyze, parseJson } from '@/lib/gemini'
import { USER_CONTEXT } from '@/lib/context'
import { getCached, setCached } from '@/lib/cache'
import { getLang } from '@/lib/lang'
import { getAISlot } from '@/lib/aiSlot'
import type { HistoricalData } from '@/lib/types'

// Search grounding ENABLED — Historical Context and Analyst/Expert Voices sections
// need live, authoritative data that requires Google Search to verify.

const PROMPT_TEMPLATE = `You are a financial historian. Today: {{DATE}}.

Search the web for: the single most relevant historical parallel to current global conditions, plus 2 real recent institutional predictions.

Given user context: ${USER_CONTEXT}

Return ONLY compact JSON. 1 short sentence per text field. Plain English.

{"parallels":[{"id":"1","currentSituation":"1 sentence about right now.","historicalEvent":"event name","period":"year or range","whatHappened":"1 sentence — real numbers, real impact.","personalImplication":"1 sentence — what this means for this user specifically."}],"predictions":[{"source":"institution name","prediction":"1 sentence — specific number or timeframe.","timeframe":"e.g. end of 2025","sentiment":"optimistic|pessimistic|neutral","confidence":"high|medium|low"},{"source":"institution name","prediction":"1 sentence — specific number or timeframe.","timeframe":"e.g. Q2 2026","sentiment":"optimistic|pessimistic|neutral","confidence":"high|medium|low"}],"quotes":[],"sources":[]}

1 parallel (most relevant to today). 2 predictions from real institutions (IMF, Goldman Sachs, JP Morgan, World Bank). Leave quotes and sources as empty arrays.`

async function generateHistoricalData(lang: string): Promise<HistoricalData> {
  const prompt = PROMPT_TEMPLATE.replace('{{DATE}}', new Date().toDateString())
  const text = await searchAndAnalyze(prompt, lang)
  const parsed = parseJson<Omit<HistoricalData, 'updatedAt'>>(text)
  return { ...parsed, updatedAt: new Date().toISOString() } as HistoricalData
}

// EN only: keyed by slot, warmed by the cron job at each slot rollover.
// FR/ES are never stored here — they use the in-memory cache below.
const fetchHistoricalEN = unstable_cache(
  (_slot: string) => generateHistoricalData('en'),
  ['historical-data'],
  { revalidate: false },
)

export async function GET(request: NextRequest) {
  const lang = getLang(request)

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY_MISSING', needsApiKey: true }, { status: 503 })
  }

  try {
    if (lang === 'en') {
      return NextResponse.json(await fetchHistoricalEN(getAISlot()))
    }

    // FR/ES: on-demand only — generated when a user requests that language,
    // cached in the in-memory store (24h TTL via the 'historical' key prefix).
    const cacheKey = `historical_${lang}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await generateHistoricalData(lang)
    setCached(cacheKey, data)
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'GEMINI_API_KEY_MISSING') {
      return NextResponse.json({ error: msg, needsApiKey: true }, { status: 503 })
    }
    if (msg === 'RATE_LIMIT_EXCEEDED') {
      return NextResponse.json({ error: msg, rateLimited: true }, { status: 429 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
