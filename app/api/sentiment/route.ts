import { NextResponse } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import { searchAndAnalyze, parseJson } from '@/lib/claude'
import type { SentimentData } from '@/lib/types'

const PROMPT = `
You are a market sentiment analyst. Today's date: ${new Date().toDateString()}.

Context for the investor you're advising:
- Based in Taiwan, considering moving to France/Europe eventually
- Has not yet invested but wants to start this year
- Works in content/video production (affected by ad spend cycles)
- Interested in: global equities, ETFs, possibly crypto as secondary
- Anxious about geopolitical risk, prefers clear reasoning over hot tips

Search the web for CURRENT sentiment and analysis from:
1. Reddit communities (WallStreetBets, r/investing, r/economics) — what are retail investors focused on RIGHT NOW?
2. Polymarket and Kalshi — current prediction market probabilities for recession, rate cuts, escalation
3. Bloomberg, Reuters, Financial Times — what are major analysts saying this week?
4. IMF, World Bank, Goldman Sachs, JP Morgan — any recent forecasts or warnings?

Also identify 3-5 SPECIFIC investment opportunities that analysts and markets are currently discussing, that would make sense for someone starting to invest from Taiwan with a long-term Europe outlook.

Return ONLY a JSON object:
{
  "overallMood": "bullish" | "neutral" | "bearish" | "fearful",
  "items": [
    {
      "source": "<source name>",
      "sourceType": "community" | "institutional" | "prediction",
      "mood": "bullish" | "neutral" | "bearish" | "fearful",
      "summary": "<1-2 sentences of what this source/community is saying RIGHT NOW>"
    }
  ],
  "opportunities": [
    {
      "id": "<string>",
      "title": "<short opportunity title>",
      "thesis": "<2-3 sentence plain-language thesis: WHY this is an opportunity now>",
      "riskLevel": "low" | "medium" | "high",
      "timeHorizon": "short" | "medium" | "long",
      "assets": ["<specific ETF, stock, or sector, max 4 items>"],
      "expectedAnnualReturn": <decimal, e.g. 0.10 for 10%>,
      "volatility": <standard deviation as decimal, e.g. 0.15 for 15%>,
      "caveat": "<1 sentence honest risk caveat>"
    }
  ]
}

Include 5-6 sentiment items (mix of community, institutional, prediction market).
Include 3-4 investment opportunities. Be specific about actual current analyst recommendations.
For expectedAnnualReturn and volatility, use historical data for the asset class — be realistic and honest.
`

export async function GET() {
  const cached = getCached('sentiment')
  if (cached) return NextResponse.json(cached)

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY_MISSING', needsApiKey: true },
      { status: 503 },
    )
  }

  try {
    const text = await searchAndAnalyze(PROMPT, 1000)
    const parsed = parseJson<Omit<SentimentData, 'updatedAt'>>(text)

    const data: SentimentData = {
      ...parsed,
      updatedAt: new Date().toISOString(),
    }

    setCached('sentiment', data)
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'ANTHROPIC_API_KEY_MISSING') {
      return NextResponse.json({ error: msg, needsApiKey: true }, { status: 503 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
