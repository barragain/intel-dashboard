import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import { searchAndAnalyze, parseJson } from '@/lib/gemini'
import { getLang } from '@/lib/lang'
import type { SentimentData } from '@/lib/types'

const PROMPT = `You are a market sentiment analyst. Today: ${new Date().toDateString()}.

User: Taiwan-based, new investor, works in content production (ad-budget dependent), considering moving to France, interested in global equities/ETFs/crypto.

Search the web for: current investor sentiment, analyst forecasts from major banks, prediction market odds (recession, rate cuts), and investment opportunities relevant to Taiwan/Europe exposure.

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
  ],
  "quotes": [
    { "text": "<exact quote>", "author": "<full name>", "institution": "<organization>", "date": "<date found via search>" }
  ],
  "sources": [
    { "title": "<article headline>", "source": "<publication name>", "date": "<publication date>" }
  ]
}

Include 5 sentiment items (mix of community, institutional, prediction market) and 3 investment opportunities. Use realistic historical return/volatility figures.
Include 2–3 real expert quotes from analysts, fund managers, or economists found via search — exact words, not paraphrased.
Include 2–3 real news article titles with their publication and date.`

export async function GET(request: NextRequest) {
  const lang = getLang(request)
  const cacheKey = `sentiment_${lang}`
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
    const parsed = parseJson<Omit<SentimentData, 'updatedAt'>>(text)

    const data: SentimentData = {
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
