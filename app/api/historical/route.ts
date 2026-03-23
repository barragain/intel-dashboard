import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import { searchAndAnalyze, parseJson } from '@/lib/gemini'
import { getLang } from '@/lib/lang'
import type { HistoricalData } from '@/lib/types'

const PROMPT = `You are a financial historian and analyst. Today: ${new Date().toDateString()}.

User: lives in Taiwan, works in content production (ad-budget revenue), girlfriend at ASUS Taiwan (tech exposure), wants to start investing, considering moving to France, concerned about Taiwan strait tensions.

Search the web for: current economic conditions and what historical events they resemble, plus recent analyst and institutional predictions.

Return ONLY this JSON:
{
  "parallels": [
    {
      "id": "<string>",
      "currentSituation": "<1 sentence: what is happening now>",
      "historicalEvent": "<event name>",
      "period": "<year or range>",
      "whatHappened": "<2 sentences on markets/jobs/economy>",
      "personalImplication": "<1-2 sentences on impact for this user's job, investments, Europe plans>"
    }
  ],
  "predictions": [
    {
      "source": "<institution or analyst>",
      "prediction": "<2 sentences>",
      "timeframe": "<e.g. Q3 2025>",
      "sentiment": "optimistic"|"pessimistic"|"neutral",
      "confidence": "high"|"medium"|"low"
    }
  ],
  "quotes": [
    { "text": "<exact quote>", "author": "<full name>", "institution": "<organization>", "date": "<date found via search>" }
  ],
  "sources": [
    { "title": "<article headline>", "source": "<publication name>", "date": "<publication date>" }
  ]
}

Include 3 historical parallels (consider: 2008 crisis, 2020 COVID, 1970s oil shock, 1997 Asia crisis, 1996 Taiwan strait). Include 4-5 expert predictions from IMF, Goldman Sachs, JP Morgan, World Bank.
Include 2–3 real expert quotes from economists or institutional analysts found via search — exact words, not paraphrased.
Include 2–3 real news article titles with their publication and date.`

export async function GET(request: NextRequest) {
  const lang = getLang(request)
  const cacheKey = `historical_${lang}`
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
    const parsed = parseJson<Omit<HistoricalData, 'updatedAt'>>(text)

    const data: HistoricalData = {
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
