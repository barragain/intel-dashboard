import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { unstable_cache } from 'next/cache'
import { analyzeWithContext, parseJson } from '@/lib/gemini'
import { fetchNews } from '@/lib/news'
import type { NewsHeadline } from '@/lib/news'
import { getCached, setCached } from '@/lib/cache'
import { getLang } from '@/lib/lang'
import { getAISlot } from '@/lib/aiSlot'
import { translateConflictsData } from '@/lib/translate'
import type { ConflictsData } from '@/lib/types'

// Search grounding DISABLED — context comes from pre-fetched news headlines.
// Topics covered: Taiwan Strait, US-China trade, Middle East, Russia-Ukraine.

const PROMPT_TEMPLATE = `You are a geopolitical and financial analyst explaining active conflicts and tensions to a general audience. Today: {{DATE}}.

WHO THIS IS FOR: A Paraguayan man and his French partner Barbara who live in Taiwan. They plan to move to France in the next few years — Barbara's family lives there. He runs a video/photo production agency in Taiwan (TTC) that makes content for brands. Barbara works in PR for Asus. What matters to them: Taiwan's safety, brand ad budgets (their income), France's stability as a future home, and Barbara's family in France.

WRITING RULES — follow these strictly:
- Write for a smart adult who does not read geopolitics or finance news regularly. Simple words only.
- Banned phrases: geopolitical tensions, escalation dynamics, flashpoint, strategic competition, destabilizing factors, risk factors, macro environment, heightened uncertainty. Say what is actually happening in plain words.
- Be specific and use the headlines provided. "China sent 36 warplanes near Taiwan on Monday" not "increased military activity near Taiwan."
- If something is getting worse, say so clearly.
- Short sentences. Maximum 2 sentences per field.

HOW TO WRITE THE RELEVANCE FIELD — be specific and personal:
- For MIDDLE EAST / OIL conflicts: The oil price chain goes like this: oil disruption → prices spike → everything gets more expensive → inflation → people and companies spend less → brands cut their marketing and advertising budgets first → production agencies like TTC get fewer briefs. Do NOT say oil "directly" raises business costs — that is wrong. Explain the chain.
- For RUSSIA-UKRAINE / EUROPE conflicts: This matters because Barbara's family lives in France. European instability, higher energy prices, or a wave of refugees can raise the cost of living in France, affect housing prices, and change what it feels like to live there. They plan to move to France, so European stability is a real personal concern.
- For TAIWAN STRAIT: If Taiwan is destabilized, they lose their current home and jobs. Say exactly what is happening.
- For US-CHINA TRADE: US tariffs on Chinese goods ripple through Asian supply chains, including Taiwan. Brands in China or selling to China may cut production orders.
- For any conflict: connect the dots to real life — job pipeline, cost of moving to France, Barbara's family safety, household income.

Return ONLY this JSON:
{
  "conflicts": [
    {
      "id": "string",
      "name": "<conflict name>",
      "location": "<region or country>",
      "relevance": "<1–2 plain-English sentences: specific personal impact — reference the production agency pipeline, Barbara's family in France, the move to France, or Taiwan safety directly. Use the chain reaction reasoning above for oil.>",
      "status": "escalating"|"stable"|"de-escalating",
      "keyImpact": "<what it actually affects in plain terms: oil prices, tech supply chains, job markets, cost of living in France, brand ad budgets>",
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

async function generateConflictsData(): Promise<ConflictsData> {
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
  const text = await analyzeWithContext(headlines, prompt)
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
// FR/ES use the cached EN data translated via MyMemory (free, no Gemini cost).
const fetchConflictsEN = unstable_cache(
  (_slot: string) => generateConflictsData(),
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

    // FR/ES: translate the cached EN data using MyMemory (free, no Gemini cost).
    const cacheKey = `conflicts_${lang}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)

    const enData = await fetchConflictsEN(getAISlot())
    const data = await translateConflictsData(enData, lang)
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
