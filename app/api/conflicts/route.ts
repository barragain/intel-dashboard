import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import { searchAndAnalyze, parseJson } from '@/lib/gemini'
import { getLang } from '@/lib/lang'
import type { ConflictsData } from '@/lib/types'

const PROMPT = `You are helping someone understand what's happening in the world right now and how it could affect their life. Today: ${new Date().toDateString()}.

About this person: lives in Taiwan, income depends on ad budgets at a content production company (if companies cut ad spending, this person's job is at risk), girlfriend works at ASUS Taiwan, planning to move to France.

Search the web for what's happening right now with: Taiwan Strait (Chinese military activity, US-China political moves), US trade and tariff policy (especially anything hitting Taiwan or tech companies), Middle East (oil supply, Iran, shipping), Russia-Ukraine (energy prices, how it affects Europe and France).

WRITING RULES — follow these strictly:
- Plain English only. No jargon.
- Banned phrases: geopolitical tensions, escalation dynamics, flashpoint, strategic competition, destabilizing factors, risk factors, macro environment, heightened uncertainty. Just say what's actually happening.
- Be specific. "China sent 36 warplanes near Taiwan on Monday" not "increased military activity near Taiwan." Use real events, real numbers, real dates.
- Connect to this person's actual life. "This matters to you because oil going up means your clients have less money for ads" not "energy price increases may impact consumer discretionary spending."
- If something is getting worse, say so and say what it could lead to in simple terms.
- Short sentences.

Return ONLY this JSON:
{
  "conflicts": [
    {
      "id": "string",
      "name": "<conflict name>",
      "location": "<region or country>",
      "relevance": "<1 plain-English sentence: why this specifically affects this person — their job, their savings, their move to France, their safety>",
      "status": "escalating"|"stable"|"de-escalating",
      "keyImpact": "<what it actually affects in plain terms: oil prices, tech supply chains, job security, cost of living>",
      "details": "<2 sentences of specific current facts — real events, real numbers where available>"
    }
  ],
  "overallAssessment": "<2 plain-English sentences: what the overall picture looks like right now and what this person should be paying attention to>",
  "quotes": [
    { "text": "<exact quote>", "author": "<full name>", "institution": "<organization>", "date": "<date found via search>" }
  ],
  "sources": [
    { "title": "<article headline>", "source": "<publication name>", "date": "<publication date>" }
  ]
}

Include 4 conflicts. Use real recent events with specific details.
Include 2–3 real expert quotes from officials, analysts, or military/government sources found via search — exact words only.
Include 2–3 real news article headlines with publication and date.`

export async function GET(request: NextRequest) {
  const lang = getLang(request)
  const cacheKey = `conflicts_${lang}`
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
    const parsed = parseJson<Omit<ConflictsData, 'updatedAt'>>(text)

    const data: ConflictsData = {
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
