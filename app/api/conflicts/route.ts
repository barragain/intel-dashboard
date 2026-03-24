import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { unstable_cache } from 'next/cache'
import { searchAndAnalyze, parseJson } from '@/lib/gemini'
import { getLang } from '@/lib/lang'
import type { ConflictsData } from '@/lib/types'

const PROMPT_TEMPLATE = `You are a geopolitical and financial analyst explaining active conflicts and tensions to a general audience. Today: {{DATE}}.

Search the web for what is happening right now with: Taiwan Strait (Chinese military activity, US-China political moves), US trade and tariff policy (especially anything affecting Taiwan or tech companies), Middle East (oil supply, Iran, shipping), Russia-Ukraine (energy prices, how it affects Europe).

WRITING RULES — follow these strictly:
- Plain English only. No jargon.
- Banned phrases: geopolitical tensions, escalation dynamics, flashpoint, strategic competition, destabilizing factors, risk factors, macro environment, heightened uncertainty. Say what is actually happening.
- Be specific. "China sent 36 warplanes near Taiwan on Monday" not "increased military activity near Taiwan." Use real events, real numbers, real dates.
- Connect to real-world impact. "Oil rising means higher fuel and shipping costs globally" not "energy price increases may impact consumer discretionary spending."
- If something is getting worse, say so and explain what it could lead to in simple terms.
- Short sentences.

Return ONLY this JSON:
{
  "conflicts": [
    {
      "id": "string",
      "name": "<conflict name>",
      "location": "<region or country>",
      "relevance": "<1 plain-English sentence: why this matters to investors, workers in the tech or media industries, and people in Taiwan or Europe>",
      "status": "escalating"|"stable"|"de-escalating",
      "keyImpact": "<what it actually affects in plain terms: oil prices, tech supply chains, job markets, cost of living>",
      "details": "<2 sentences of specific current facts — real events, real numbers where available>",
      "headlines": ["<exact headline of a real article you found via search about this conflict, with publication name and date>", "<second headline if available>"]
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

const fetchConflictsData = unstable_cache(
  async (lang: string) => {
    const prompt = PROMPT_TEMPLATE.replace('{{DATE}}', new Date().toDateString())
    const text = await searchAndAnalyze(prompt, lang)
    const parsed = parseJson<Omit<ConflictsData, 'updatedAt'>>(text)
    return { ...parsed, updatedAt: new Date().toISOString() } as ConflictsData
  },
  ['conflicts-data'],
  { tags: ['ai-data', 'ai-conflicts'], revalidate: false },
)

export async function GET(request: NextRequest) {
  const lang = getLang(request)

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY_MISSING', needsApiKey: true }, { status: 503 })
  }

  try {
    const data = await fetchConflictsData(lang)
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
