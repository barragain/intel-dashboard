import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { unstable_cache } from 'next/cache'
import { analyzeWithContext, parseJson } from '@/lib/gemini'
import { fetchNews } from '@/lib/news'
import type { NewsHeadline } from '@/lib/news'
import { getCached, setCached } from '@/lib/cache'
import { getLang } from '@/lib/lang'
import { getAISlot } from '@/lib/aiSlot'
import type { ConflictsData } from '@/lib/types'

// Search grounding DISABLED — context comes from pre-fetched news headlines.
// Topics covered: Taiwan Strait, US-China trade, Middle East, Russia-Ukraine.

const PROMPT_TEMPLATE = `You are a geopolitical and financial analyst explaining active conflicts and tensions to a general audience. Today: {{DATE}}.

WRITING RULES — follow these strictly:
- Write for a smart adult who does not read geopolitics or finance news regularly. Simple words only.
- Banned phrases: geopolitical tensions, escalation dynamics, flashpoint, strategic competition, destabilizing factors, risk factors, macro environment, heightened uncertainty. Say what is actually happening in plain words.
- Be specific and use the headlines provided. "China sent 36 warplanes near Taiwan on Monday" not "increased military activity near Taiwan."
- Connect to real everyday life. "Oil going up means you pay more for fuel and shipping costs go up for everything you buy" not "energy price increases may impact consumer discretionary spending."
- If something is getting worse, say so clearly and explain what it could mean for regular people.
- Short sentences. Maximum 2 sentences per field.

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
      "details": "<2 sentences of specific current facts — real events, real numbers where available from the headlines>",
      "headlines": ["<exact headline from the news context about this conflict, with source name>", "<second headline if available>"]
    }
  ],
  "overallAssessment": "<2 plain-English sentences: what the overall picture looks like right now and what this person should be paying attention to>",
  "quotes": [
    { "text": "<exact quote>", "author": "<full name>", "institution": "<organization>", "date": "<date>" }
  ],
  "sources": [
    { "title": "<article headline>", "source": "<publication name>", "date": "<publication date>" }
  ]
}

Include 5 conflicts: Taiwan Strait, US-China trade/tariffs, Middle East, Russia-Ukraine, and one more active conflict or tension from the headlines (pick whichever is most relevant to investors in Taiwan and Europe). Use specific details from the headlines provided.
Include 2–3 real expert quotes from the news context — exact words only, not paraphrased.
Include 2–3 real news article headlines with publication and date from the context provided.`

/** Match Gemini-generated headline strings back to original NewsHeadline objects for URL/date enrichment. */
function enrichHeadlines(
  strs: string[],
  pool: NewsHeadline[],
): { text: string; url?: string; date?: string }[] {
  return strs.map((text) => {
    const lower = text.toLowerCase()
    const match = pool.find((h) => {
      const ht = h.title.toLowerCase()
      // Check if either string starts with the same 35 characters
      return lower.includes(ht.substring(0, 35)) || ht.includes(lower.substring(0, 35))
    })
    return { text, url: match?.url || undefined, date: match?.date || undefined }
  })
}

async function generateConflictsData(lang: string): Promise<ConflictsData> {
  const [tw, trade, mideast, ru] = await Promise.all([
    fetchNews('taiwan strait china military'),
    fetchNews('us china trade tariffs technology'),
    fetchNews('middle east oil conflict'),
    fetchNews('russia ukraine war energy'),
  ])
  const allHeadlines = [...tw, ...trade, ...mideast, ...ru]
  const headlines = [
    ...tw.slice(0, 2),
    ...trade.slice(0, 2),
    ...mideast.slice(0, 2),
    ...ru.slice(0, 2),
  ]
  const prompt = PROMPT_TEMPLATE.replace('{{DATE}}', new Date().toDateString())
  const text = await analyzeWithContext(headlines, prompt, lang)
  const parsed = parseJson<Omit<ConflictsData, 'updatedAt'>>(text)
  // Enrich conflict headlines with real URLs from fetchNews results
  const enriched = {
    ...parsed,
    conflicts: (parsed.conflicts ?? []).map((c) => ({
      ...c,
      headlines: enrichHeadlines((c.headlines as unknown as string[]) ?? [], allHeadlines),
    })),
  }
  return { ...enriched, updatedAt: new Date().toISOString() } as ConflictsData
}

// EN only: keyed by slot, warmed by the cron job at each slot rollover.
// FR/ES are never stored here — they use the in-memory cache below.
const fetchConflictsEN = unstable_cache(
  (_slot: string) => generateConflictsData('en'),
  ['conflicts-data'],
  { revalidate: false },
)

export async function GET(request: NextRequest) {
  const lang = getLang(request)

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY_MISSING', needsApiKey: true }, { status: 503 })
  }

  try {
    if (lang === 'en') {
      return NextResponse.json(await fetchConflictsEN(getAISlot()))
    }

    // FR/ES: on-demand only — generated when a user requests that language,
    // cached in the in-memory store (24h TTL via the 'conflicts' key prefix).
    const cacheKey = `conflicts_${lang}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await generateConflictsData(lang)
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
