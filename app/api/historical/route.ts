import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { unstable_cache } from 'next/cache'
import { searchAndAnalyze, parseJson } from '@/lib/gemini'
import { getCached, setCached } from '@/lib/cache'
import { getLang } from '@/lib/lang'
import { getAISlot } from '@/lib/aiSlot'
import { translateHistoricalData } from '@/lib/translate'
import type { HistoricalData } from '@/lib/types'

// Search grounding ENABLED — Historical Context and Analyst/Expert Voices sections
// need live, authoritative data that requires Google Search to verify.

const PROMPT_TEMPLATE = `You are a financial historian and analyst helping a general audience understand how today's situation compares to historical events, and what experts think is coming next. Today: {{DATE}}.

Search the web for: what is happening in the global economy right now, and what recent public predictions major institutions have made.

WRITING RULES — follow these strictly:
- Write for a smart adult who knows nothing about financial history. Use simple everyday words.
- When you describe a historical event, focus on what happened to normal people: did they lose their jobs? Did prices double at the supermarket? Did people lose their savings? How long did it last?
- Connect past to present in a clear and useful way. Say what is similar and what is different. Do not just mention events — explain why the comparison helps understand today.
- For predictions: be very specific. "Goldman Sachs thinks there is a 35% chance of a US recession by end of 2025 because people are spending less" not "Goldman maintains a cautious outlook given prevailing conditions."
- If experts disagree with each other, say so clearly.
- Banned phrases: macroeconomic parallels, structural similarities, recessionary pressures, normalization, tightening cycle, soft landing, hard landing, elevated volatility, uncertainty environment, price action. Say the actual thing.
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
      "timeframe": "<specific horizon of the prediction, e.g. end of 2026 or Q3 2026>",
      "dateStated": "<exact date this statement was made, e.g. March 15, 2026 — use the actual date found in the search result>",
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

Include 3 historical parallels — choose whichever are most relevant to right now from: 2008 financial crisis, 2020 COVID crash, 1970s oil shocks, 1997 Asian financial crisis, 1996 Taiwan Strait crisis. Include 5-6 predictions from real institutions (IMF, Goldman Sachs, JP Morgan, World Bank, Morgan Stanley, Banco Central del Paraguay) — use ONLY their most recent public statements from 2026 found via search. Reject any statement from 2025 or earlier if a more recent one exists. Always include the exact date the statement was made. For the Banco Central del Paraguay entry, include their current monetary policy stance, recent interest rate decisions, and their outlook on inflation or the Paraguayan guaraní.
Include 2–3 real expert quotes from economists or institutional analysts found via search — exact words only.
Include 2–3 real news article headlines with publication and date.`

async function generateHistoricalData(): Promise<HistoricalData> {
  const prompt = PROMPT_TEMPLATE.replace('{{DATE}}', new Date().toDateString())
  const text = await searchAndAnalyze(prompt)
  const parsed = parseJson<Omit<HistoricalData, 'updatedAt'>>(text)
  return { ...parsed, updatedAt: new Date().toISOString() } as HistoricalData
}

// EN only: keyed by slot, warmed by the cron job at each slot rollover.
// FR/ES use the cached EN data translated via MyMemory (free, no Gemini cost).
const fetchHistoricalEN = unstable_cache(
  (_slot: string) => generateHistoricalData(),
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

    // FR/ES: translate the cached EN data using MyMemory (free, no Gemini cost).
    const cacheKey = `historical_${lang}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)

    const enData = await fetchHistoricalEN(getAISlot())
    const data = await translateHistoricalData(enData, lang)
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
