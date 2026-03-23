import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import { searchAndAnalyze, parseJson } from '@/lib/gemini'
import { getLang } from '@/lib/lang'
import type { HistoricalData } from '@/lib/types'

const PROMPT = `You are a financial historian and analyst helping a general audience understand how today's situation compares to historical events, and what experts think is coming next. Today: ${new Date().toDateString()}.

Search the web for: what is happening in the global economy right now, and what recent public predictions major institutions have made.

WRITING RULES — follow these strictly:
- Plain English only. Write for someone who knows nothing about financial history.
- When you describe a historical event, focus on what happened to regular people: did they lose jobs? Did prices double? Did savings get wiped out? How long did it last? Was it a rough year or a rough decade?
- Connect past to present clearly: say what is similar and what is different. Do not just list events — explain why the comparison is useful.
- For predictions: say what the institution thinks will happen, when, and why. Be specific. "Goldman Sachs thinks there is a 35% chance of a US recession by end of 2025 because consumer spending is slowing" not "Goldman maintains a cautious outlook given prevailing macroeconomic conditions."
- If experts disagree, say so. Do not smooth everything into consensus.
- Banned phrases: macroeconomic parallels, structural similarities, recessionary pressures, normalization, tightening cycle, soft landing, hard landing, elevated volatility, uncertainty environment. Say the actual thing.
- Short sentences.

Return ONLY this JSON:
{
  "parallels": [
    {
      "id": "<string>",
      "currentSituation": "<1 plain sentence: what is happening right now>",
      "historicalEvent": "<event name>",
      "period": "<year or range>",
      "whatHappened": "<2 sentences: what actually happened to markets, jobs, and prices back then — be specific with numbers and timeframes>",
      "personalImplication": "<1-2 sentences: what this history lesson means for investors in Asian markets and Europe, and for people in tech or media industries>"
    }
  ],
  "predictions": [
    {
      "source": "<institution or analyst name>",
      "prediction": "<2 plain sentences: what they actually think will happen and why — quote specific numbers or timeframes if they gave them>",
      "timeframe": "<specific timeframe, e.g. end of 2025 or Q2 2026>",
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

Include 3 historical parallels — choose whichever are most relevant to right now from: 2008 financial crisis, 2020 COVID crash, 1970s oil shocks, 1997 Asian financial crisis, 1996 Taiwan Strait crisis. Include 4-5 predictions from real institutions (IMF, Goldman Sachs, JP Morgan, World Bank, Morgan Stanley) — use their most recent public statements found via search.
Include 2–3 real expert quotes from economists or institutional analysts found via search — exact words only.
Include 2–3 real news article headlines with publication and date.`

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
