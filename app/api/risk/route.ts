import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { unstable_cache } from 'next/cache'
import { analyzeWithContext, parseJson } from '@/lib/gemini'
import { fetchNews } from '@/lib/news'
import { getCached, setCached } from '@/lib/cache'
import { getLang } from '@/lib/lang'
import { getAISlot } from '@/lib/aiSlot'
import { translateRiskData } from '@/lib/translate'
import type { RiskData } from '@/lib/types'

// Search grounding DISABLED — context comes from pre-fetched news headlines.
// Topics covered: Tech Sector, EU/France, Market Fear, Taiwan Strait, Ad Spend.

const PROMPT_TEMPLATE = `You are a financial intelligence analyst helping people understand whether global conditions warrant concern right now. Today: {{DATE}}.

Focus areas: Taiwan Strait (military activity, political developments), global oil prices and what is driving them, the VIX fear index, US dollar strength (DXY), ad spending trends in Asia, semiconductor and tech sector health, France and EU economy.

WRITING RULES — follow these strictly:
- Write for someone who does NOT read financial news — a smart adult but not a finance expert. Use simple everyday words.
- Banned words and phrases: geopolitical headwinds, macroeconomic uncertainty, risk-off sentiment, yield curve dynamics, hawkish, dovish, liquidity concerns, market volatility regime, escalation dynamics, systemic risk, headwinds, tailwinds, normalize, inflection point, de-risking, elevated uncertainty, remain cautious, sector rotation, price action.
- Be specific and use facts from the headlines provided. "China sent warships near Taiwan this week" not "geopolitical risks remain elevated."
- The whyItMatters field must explain WHY this specific thing matters to someone in Taiwan working in tech/media — how it could affect their job, salary, savings, or cost of living. Use facts from the news, NOT generic statements.
- Never write something like "Rising X often leads to Y" — that is a generic textbook statement. Say what is actually happening right now based on the headlines.
- Short sentences. One idea per sentence.

Return ONLY this JSON:
{
  "status": "STABLE" | "WATCH" | "WORRIED",
  "score": <0–100, where 0=everything is calm, 100=crisis mode>,
  "explanation": "<2–3 plain-English sentences about what is actually happening right now and the overall risk level>",
  "drivers": [
    {
      "name": "<max 20 chars>",
      "impact": "positive"|"negative"|"neutral",
      "detail": "<one plain-English sentence about what is happening with this specific thing today — be specific, name the actual event or number>",
      "whyItMatters": "<2 plain-English sentences: why this driver matters to investors and workers in Taiwan and Europe right now, with specific reference to job markets, savings, or cost of living. No jargon.>"
    }
  ],
  "quotes": [
    { "text": "<exact quote>", "author": "<full name>", "institution": "<organization>", "date": "<date found via search>" }
  ],
  "sources": [
    { "title": "<article headline>", "source": "<publication name>", "date": "<publication date>" }
  ]
}

Score guide: 0–33 = STABLE (things are fine), 34–66 = WATCH (worth paying attention to), 67–100 = WORRIED (take action or be careful).
Include exactly 5 drivers: Taiwan Strait, Ad Spend, Tech Sector, France/EU, Market Fear.
Include 2–3 real expert quotes from the headlines provided — exact words only, not paraphrased.
Include 2–3 real news article headlines with publication and date from the context provided.`

async function generateRiskData(): Promise<RiskData> {
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
  const prompt = PROMPT_TEMPLATE.replace('{{DATE}}', new Date().toDateString())
  const text = await analyzeWithContext(headlines, prompt)
  const parsed = parseJson<Omit<RiskData, 'updatedAt'>>(text)
  return { ...parsed, updatedAt: new Date().toISOString() } as RiskData
}

// EN only: keyed by slot, warmed by the cron job at each slot rollover.
// FR/ES use the cached EN data translated via MyMemory (free, no Gemini cost).
const fetchRiskEN = unstable_cache(
  (_slot: string) => generateRiskData(),
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

    // FR/ES: translate the cached EN data using MyMemory (free, no Gemini cost).
    const cacheKey = `risk_${lang}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)

    const enData = await fetchRiskEN(getAISlot())
    const data = await translateRiskData(enData, lang)
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
