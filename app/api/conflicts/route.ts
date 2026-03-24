import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { unstable_cache } from 'next/cache'
import { analyzeWithContext, parseJson } from '@/lib/gemini'
import { fetchNews } from '@/lib/news'
import { USER_CONTEXT } from '@/lib/context'
import { getCached, setCached } from '@/lib/cache'
import { getLang } from '@/lib/lang'
import { getAISlot } from '@/lib/aiSlot'
import type { ConflictsData } from '@/lib/types'

// Search grounding DISABLED — context comes from pre-fetched news headlines.
// Topics covered: Taiwan Strait, US-China trade, Middle East, Russia-Ukraine.

const PROMPT = `Given this user context: ${USER_CONTEXT}

Return ONLY compact JSON. Max 10 words per text field. Plain English, no jargon.

{"conflicts":[{"id":"1","name":"...","location":"...","relevance":"...","status":"escalating|stable|de-escalating","keyImpact":"...","details":"...","headlines":["..."]},{"id":"2","name":"...","location":"...","relevance":"...","status":"escalating|stable|de-escalating","keyImpact":"...","details":"...","headlines":["..."]}],"overallAssessment":"2 sentences — what matters most to this user right now.","quotes":[],"sources":[]}

2 conflicts only. Leave quotes and sources as empty arrays.`

async function generateConflictsData(lang: string): Promise<ConflictsData> {
  const [tw, trade, mideast, ru] = await Promise.all([
    fetchNews('taiwan strait china military'),
    fetchNews('us china trade tariffs technology'),
    fetchNews('middle east oil conflict'),
    fetchNews('russia ukraine war energy'),
  ])
  const headlines = [
    ...tw.slice(0, 2),
    ...trade.slice(0, 2),
    ...mideast.slice(0, 2),
    ...ru.slice(0, 2),
  ]
  const text = await analyzeWithContext(headlines, PROMPT, lang)
  const parsed = parseJson<Omit<ConflictsData, 'updatedAt'>>(text)
  return { ...parsed, updatedAt: new Date().toISOString() } as ConflictsData
}

// EN only: keyed by slot, warmed by the cron job at each slot rollover.
// FR/ES are never stored here — they use the in-memory cache below.
const fetchConflictsEN = unstable_cache(
  (_slot: string) => generateConflictsData('en'),
  ['conflicts-data'],
  { revalidate: false },
)

export async function GET(request: NextRequest) {
  const lang = getLang(request)

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY_MISSING', needsApiKey: true }, { status: 503 })
  }

  try {
    if (lang === 'en') {
      return NextResponse.json(await fetchConflictsEN(getAISlot()))
    }

    // FR/ES: on-demand only — generated when a user requests that language,
    // cached in the in-memory store (24h TTL via the 'conflicts' key prefix).
    const cacheKey = `conflicts_${lang}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await generateConflictsData(lang)
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
