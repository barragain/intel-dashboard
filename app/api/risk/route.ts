import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { unstable_cache } from 'next/cache'
import { analyzeWithContext, parseJson } from '@/lib/gemini'
import { fetchNews } from '@/lib/news'
import { USER_CONTEXT } from '@/lib/context'
import { getCached, setCached } from '@/lib/cache'
import { getLang } from '@/lib/lang'
import { getAISlot } from '@/lib/aiSlot'
import type { RiskData } from '@/lib/types'

// Search grounding DISABLED — context comes from pre-fetched news headlines.
// Topics covered: Tech Sector, EU/France, Market Fear, Taiwan Strait, Ad Spend.

const PROMPT = `Given this user context: ${USER_CONTEXT}

Return ONLY compact JSON. Max 10 words per text field. Plain English, no jargon. Score guide: 0-33=STABLE, 34-66=WATCH, 67-100=WORRIED.

{"status":"STABLE|WATCH|WORRIED","score":0-100,"explanation":"2 short sentences about what is actually happening right now.","drivers":[{"name":"Taiwan Strait","impact":"positive|negative|neutral","detail":"1 short sentence."},{"name":"Ad Spend","impact":"positive|negative|neutral","detail":"1 short sentence."},{"name":"Tech Sector","impact":"positive|negative|neutral","detail":"1 short sentence."},{"name":"France/EU","impact":"positive|negative|neutral","detail":"1 short sentence."},{"name":"Market Fear","impact":"positive|negative|neutral","detail":"1 short sentence."}],"quotes":[],"sources":[]}

All 5 drivers required. Leave quotes and sources as empty arrays.`

async function generateRiskData(lang: string): Promise<RiskData> {
  const [tech, eu, fear, tw, adspend] = await Promise.all([
    fetchNews('tech sector semiconductor earnings AI'),
    fetchNews('france eu economy market'),
    fetchNews('global market fear volatility VIX'),
    fetchNews('taiwan strait security'),
    fetchNews('global advertising spending digital'),
  ])
  const headlines = [
    ...tech.slice(0, 2),
    ...eu.slice(0, 2),
    ...fear.slice(0, 2),
    ...tw.slice(0, 2),
    ...adspend.slice(0, 1),
  ]
  const text = await analyzeWithContext(headlines, PROMPT, lang)
  const parsed = parseJson<Omit<RiskData, 'updatedAt'>>(text)
  return { ...parsed, updatedAt: new Date().toISOString() } as RiskData
}

// EN only: keyed by slot, warmed by the cron job at each slot rollover.
// FR/ES are never stored here — they use the in-memory cache below.
const fetchRiskEN = unstable_cache(
  (_slot: string) => generateRiskData('en'),
  ['risk-data'],
  { revalidate: false },
)

export async function GET(request: NextRequest) {
  const lang = getLang(request)

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY_MISSING', needsApiKey: true }, { status: 503 })
  }

  try {
    if (lang === 'en') {
      return NextResponse.json(await fetchRiskEN(getAISlot()))
    }

    // FR/ES: on-demand only — generated when a user requests that language,
    // cached in the in-memory store (24h TTL via the 'risk' key prefix).
    const cacheKey = `risk_${lang}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await generateRiskData(lang)
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
