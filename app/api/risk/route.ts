import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import { searchAndAnalyze, parseJson } from '@/lib/gemini'
import { getLang } from '@/lib/lang'
import type { RiskData } from '@/lib/types'

const PROMPT = `You are a financial intelligence analyst helping people understand whether global conditions warrant concern right now. Today: ${new Date().toDateString()}.

Focus areas: Taiwan Strait (military activity, political developments), global oil prices and what is driving them, the VIX fear index, US dollar strength (DXY), ad spending trends in Asia, semiconductor and tech sector health, France and EU economy.

Search the web for the latest developments on these topics.

WRITING RULES — follow these strictly:
- Plain English only. Anyone who never reads financial news should understand every word.
- Banned words and phrases: geopolitical headwinds, macroeconomic uncertainty, risk-off sentiment, yield curve dynamics, hawkish, dovish, liquidity concerns, market volatility regime, escalation dynamics, systemic risk, headwinds, tailwinds, normalize, inflection point, de-risking, elevated uncertainty, remain cautious.
- Be specific and direct. "Taiwan Strait tensions rose this week after China sent warships near the island" not "geopolitical risks in the region remain elevated."
- Say what actually happened. Name the thing. Give the number. Say the country.
- If something is bad news, say so. If it is fine, say so. Do not soften bad news or inflate good news.
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
Include 2–3 real expert quotes found via search — exact words only, not paraphrased.
Include 2–3 real news article headlines with publication and date.`

export async function GET(request: NextRequest) {
  const lang = getLang(request)
  const cacheKey = `risk_${lang}`
  const cached = getCached(cacheKey)
  if (cached) return NextResponse.json(cached)

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY_MISSING', needsApiKey: true },
      { status: 503 },
    )
  }

  try {
    const text = await searchAndAnalyze(PROMPT, lang)
    const parsed = parseJson<Omit<RiskData, 'updatedAt'>>(text)

    const data: RiskData = {
      ...parsed,
      updatedAt: new Date().toISOString(),
    }

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
