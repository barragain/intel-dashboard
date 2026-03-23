import { NextResponse } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import { searchAndAnalyze, parseJson } from '@/lib/gemini'
import type { SentimentData } from '@/lib/types'

const PROMPT = `You are a market sentiment analyst. Today: ${new Date().toDateString()}.

User: Taiwan-based, new investor, works in content production (ad-budget dependent), considering moving to France, interested in global equities/ETFs/crypto.

Do 1 web search: current investor sentiment, analyst forecasts, prediction market odds (recession, rate cuts), and investment opportunities relevant to Taiwan/Europe exposure.

Return ONLY this JSON:
{
  "overallMood": "bullish"|"neutral"|"bearish"|"fearful",
  "items": [
    {
      "source": "<name>",
      "sourceType": "community"|"institutional"|"prediction",
      "mood": "bullish"|"neutral"|"bearish"|"fearful",
      "summary": "<1-2 sentences of current view>"
    }
  ],
  "opportunities": [
    {
      "id": "<string>",
      "title": "<short title>",
      "thesis": "<2-3 sentences why this is an opportunity now>",
      "riskLevel": "low"|"medium"|"high",
      "timeHorizon": "short"|"medium"|"long",
      "assets": ["<ETF, stock, or sector, max 4>"],
      "expectedAnnualReturn": <decimal e.g. 0.10>,
      "volatility": <decimal e.g. 0.15>,
      "caveat": "<1 sentence risk caveat>"
    }
  ]
}

Include 5 sentiment items (mix of community, institutional, prediction market) and 3 investment opportunities. Use realistic historical return/volatility figures.`

export async function GET() {
  const cached = getCached('sentiment')
  if (cached) return NextResponse.json(cached)

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY_MISSING', needsApiKey: true },
      { status: 503 },
    )
  }

  try {
    const text = await searchAndAnalyze(PROMPT, 800)
    const parsed = parseJson<Omit<SentimentData, 'updatedAt'>>(text)

    const data: SentimentData = {
      ...parsed,
      updatedAt: new Date().toISOString(),
    }

    setCached('sentiment', data)
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
