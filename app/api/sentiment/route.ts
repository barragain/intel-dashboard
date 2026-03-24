import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { unstable_cache } from 'next/cache'
import { analyzeWithContext, parseJson } from '@/lib/gemini'
import { fetchNews } from '@/lib/news'
import { USER_CONTEXT } from '@/lib/context'
import { getCached, setCached } from '@/lib/cache'
import { getLang } from '@/lib/lang'
import { getAISlot } from '@/lib/aiSlot'
import { fetchPredictionMarkets, buildPredictionContext } from '@/lib/predictionMarkets'
import type { SentimentData } from '@/lib/types'

// Search grounding DISABLED — context comes from pre-fetched news headlines.
// Topics covered: Market Sentiment, Crypto Signal, Community Sentiment.

const PROMPT = (predictionContext: string) =>
  `Given this user context: ${USER_CONTEXT}
${predictionContext ? `\nPrediction market data:\n${predictionContext}` : ''}

Return ONLY compact JSON. Max 10 words per summary field. Plain English.

{"overallMood":"bullish|neutral|bearish|fearful","items":[{"source":"...","sourceType":"community|institutional|prediction","mood":"bullish|neutral|bearish|fearful","summary":"1 short sentence."},{"source":"...","sourceType":"community|institutional|prediction","mood":"bullish|neutral|bearish|fearful","summary":"1 short sentence."},{"source":"...","sourceType":"community|institutional|prediction","mood":"bullish|neutral|bearish|fearful","summary":"1 short sentence."}],"opportunities":[],"subredditSentiment":[],"quotes":[],"sources":[]}

3 items: 1 community (cite subreddit), 1 institutional analyst, 1 prediction market. Leave all other arrays empty.`

async function generateSentimentData(lang: string): Promise<SentimentData> {
  const [sentimentNews, cryptoNews, outlookNews, { markets: predictionMarkets }] =
    await Promise.all([
      fetchNews('market investor sentiment stocks'),
      fetchNews('bitcoin cryptocurrency market'),
      fetchNews('global economy recession outlook analysts'),
      fetchPredictionMarkets(),
    ])
  const headlines = [
    ...sentimentNews.slice(0, 3),
    ...cryptoNews.slice(0, 2),
    ...outlookNews.slice(0, 2),
  ]
  const predictionContext = buildPredictionContext(predictionMarkets)
  const text = await analyzeWithContext(headlines, PROMPT(predictionContext), lang)
  const parsed = parseJson<Omit<SentimentData, 'updatedAt' | 'predictionMarkets'>>(text)
  return { ...parsed, predictionMarkets, updatedAt: new Date().toISOString() } as SentimentData
}

// EN only: keyed by slot, warmed by the cron job at each slot rollover.
// FR/ES are never stored here — they use the in-memory cache below.
const fetchSentimentEN = unstable_cache(
  (_slot: string) => generateSentimentData('en'),
  ['sentiment-data'],
  { revalidate: false },
)

export async function GET(request: NextRequest) {
  const lang = getLang(request)

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY_MISSING', needsApiKey: true }, { status: 503 })
  }

  try {
    if (lang === 'en') {
      return NextResponse.json(await fetchSentimentEN(getAISlot()))
    }

    // FR/ES: on-demand only — generated when a user requests that language,
    // cached in the in-memory store (24h TTL via the 'sentiment' key prefix).
    const cacheKey = `sentiment_${lang}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)

    const data = await generateSentimentData(lang)
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
