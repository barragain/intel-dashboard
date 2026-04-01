import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { unstable_cache } from 'next/cache'
import { analyzeWithContext, parseJson } from '@/lib/gemini'
import { fetchNews } from '@/lib/news'
import { getCached, setCached } from '@/lib/cache'
import { getLang } from '@/lib/lang'
import { getAISlot } from '@/lib/aiSlot'
import { translateRiskData } from '@/lib/translate'
import type { RiskData } from '@/lib/types'

// Search grounding DISABLED — context comes from pre-fetched news headlines.
// Topics covered: Tech Sector, EU/France, Market Fear, Taiwan Strait, Ad Spend.

const PROMPT_TEMPLATE = `You are a financial intelligence analyst helping people understand whether global conditions warrant concern right now. Today: {{DATE}}.

WHO THIS IS FOR: A Paraguayan man and his French partner Barbara who live in Taiwan. They plan to move to France in the next few years. Barbara's family lives in France. He runs a video/photo production agency in Taiwan (TTC) that makes content for brand clients. Barbara works in PR for Asus. Their relevant concerns are: (1) will brands cut ad budgets → fewer production jobs for TTC, (2) is France stable and affordable to move to, (3) is ASUS doing well, (4) is Taiwan safe.

Focus areas: Taiwan Strait (military activity, political developments), global oil prices and what is driving them, the VIX fear index, US dollar strength (DXY), ad spending trends in Asia and globally, semiconductor and tech sector health, France and EU economy (as a future home).

WRITING RULES — follow these strictly:
- Write for someone who does NOT read financial news — a smart adult but not a finance expert. Use simple everyday words.
- Banned words and phrases: geopolitical headwinds, macroeconomic uncertainty, risk-off sentiment, yield curve dynamics, hawkish, dovish, liquidity concerns, market volatility regime, escalation dynamics, systemic risk, headwinds, tailwinds, normalize, inflection point, de-risking, elevated uncertainty, remain cautious, sector rotation, price action.
- Be specific and use facts from the headlines provided. "China sent warships near Taiwan this week" not "geopolitical risks remain elevated."
- The whyItMatters field must be personal and specific — not generic. Use the persona above to explain what it means in real life.
- Never write something like "Rising X often leads to Y" — that is a generic textbook statement. Say what is actually happening right now based on the headlines.
- STRICT RELEVANCE RULE: Each driver must be about its assigned topic (stock/bond markets, oil, chips, ad spend, Taiwan security, French economy). Do NOT import celebrity lawsuits, political scandals, or general societal trends unless they have a direct, measurable, immediate effect on stock prices, ad budgets, or chip supply chains. If a headline is not directly market-relevant, ignore it.
- The "detail" field is shown as a standalone sentence next to the risk level. It must make sense on its own and tell the reader something specific and useful — not vague speculation.
- Short sentences. One idea per sentence.

HOW TO WRITE whyItMatters FOR EACH DRIVER:

For OIL / MARKET FEAR drivers:
- The connection to TTC is NOT that oil costs TTC money directly. The chain is: oil goes up → everything gets more expensive → inflation rises → people and companies spend less → brands earn less → marketing budgets get cut first → TTC gets fewer briefs. Explain this chain using what is actually happening right now.
- DO NOT say "oil directly affects your business costs." That is wrong. Say how inflation and brand budget cuts affect the production pipeline.

For FRANCE/EU driver:
- This matters for two reasons: (1) Barbara's family lives in France, so French instability, price increases, or political turmoil affects family directly. (2) They plan to move to France in a few years — so French inflation, housing costs, cost of living, and job market are real planning signals. Connect the specific news to these two concerns.

For TAIWAN STRAIT driver:
- If Taiwan is destabilized, they lose their current life: jobs, home, savings in Taiwan. Be concrete about what is happening.

For AD SPEND / TECH SECTOR drivers:
- Be specific: name actual numbers or companies. Use recent data from Meta/Google/WPP/Publicis quarterly results or forecasts if mentioned in the headlines.
- Say what is actually happening: "Meta's Q1 ad revenue grew X% but warned about tariff impact on small-business advertisers" not "ad spending might decrease."
- Explain what specific conditions — tariffs, recession fears, brand confidence, platform changes — are affecting marketing budgets right now in Asia-Pacific.

Return ONLY this JSON:
{
  "status": "STABLE" | "WATCH" | "WORRIED",
  "score": <0–100, where 0=everything is calm, 100=crisis mode>,
  "explanation": "<2–3 plain-English sentences about what is actually happening right now and the overall risk level>",
  "drivers": [
    {
      "name": "<max 20 chars>",
      "impact": "positive"|"negative"|"neutral",
      "detail": "<one plain-English sentence about what is happening with this specific driver today — MUST include a specific number, company name, index level, or concrete policy action. NEVER use celebrity news, lawsuits by public figures, or vague societal trends. BAD: 'Prince Harry supports lawsuits against big tech.' GOOD: 'Nvidia stock fell 4% as US-China chip export restrictions tightened.' BAD: 'This could create legal problems for companies.' GOOD: 'The VIX hit 22, signalling rising fear about Fed rate decisions next week.'>",
      "whyItMatters": "<2 plain-English sentences: specific personal impact using the persona above — how it affects the production pipeline, Barbara's family in France, the move to France, ASUS income, or Taiwan safety. No jargon. No generic statements.>"
    }
  ],
  "quotes": [
    { "text": "<exact quote>", "author": "<full name>", "institution": "<organization>", "date": "<date found via search>" }
  ],
  "sources": [
    { "title": "<article headline>", "source": "<publication name>", "date": "<publication date>" }
  ]
}

Score guide: 0–33 = STABLE (things are fine), 34–66 = WATCH (worth paying attention to), 67–100 = WORRIED (take action or be careful).
Include exactly 5 drivers: Taiwan Strait, Ad Spend, Tech Sector, France/EU, Market Fear.
Include 2–3 real expert quotes from the headlines provided — exact words only, not paraphrased.
Include 2–3 real news article headlines with publication and date from the context provided.`

async function generateRiskData(): Promise<RiskData> {
  const [tech, eu, fear, tw, adspend] = await Promise.all([
    fetchNews('tech sector semiconductor earnings AI'),
    fetchNews('france eu economy market'),
    fetchNews('global market fear volatility VIX'),
    fetchNews('taiwan strait security'),
    fetchNews('digital advertising spending Meta Google WPP brands Asia budget'),
  ])
  const headlines = [
    ...tech.slice(0, 2),
    ...eu.slice(0, 2),
    ...fear.slice(0, 2),
    ...tw.slice(0, 2),
    ...adspend.slice(0, 1),
  ]
  const prompt = PROMPT_TEMPLATE.replace('{{DATE}}', new Date().toDateString())
  const text = await analyzeWithContext(headlines, prompt)
  const parsed = parseJson<Omit<RiskData, 'updatedAt'>>(text)
  return { ...parsed, updatedAt: new Date().toISOString() } as RiskData
}

// EN only: keyed by slot, warmed by the cron job at each slot rollover.
// FR/ES use the cached EN data translated via MyMemory (free, no Gemini cost).
const fetchRiskEN = unstable_cache(
  (_slot: string) => generateRiskData(),
  ['risk-data'],
  { revalidate: false },
)

export async function GET(request: NextRequest) {
  const lang = getLang(request)

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY_MISSING', needsApiKey: true }, { status: 503 })
  }

  try {
    if (lang === 'en') {
      return NextResponse.json(await fetchRiskEN(getAISlot()))
    }

    // FR/ES: translate the cached EN data using MyMemory (free, no Gemini cost).
    const cacheKey = `risk_${lang}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)

    const enData = await fetchRiskEN(getAISlot())
    const data = await translateRiskData(enData, lang)
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
