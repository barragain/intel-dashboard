import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import { searchAndAnalyze, parseJson } from '@/lib/gemini'
import { getLang } from '@/lib/lang'
import { fetchRedditPosts, buildRedditContext } from '@/lib/reddit'
import { fetchPredictionMarkets, buildPredictionContext } from '@/lib/predictionMarkets'
import type { SentimentData } from '@/lib/types'

const PROMPT = `You are helping someone new to investing understand what the market mood is right now and whether it's a good time to put money to work. Today: ${new Date().toDateString()}.

About this person: lives in Taiwan, completely new to investing (no experience), income depends on ad budgets at a content production company, planning to move to France, interested in global stocks, ETFs, and crypto.

Search the web for: how investors are feeling right now (scared or confident?), what major banks and analysts are actually saying about the next 6-12 months, prediction market odds on recession or interest rate changes, and investment options that make sense for someone with Taiwan and Europe exposure.

WRITING RULES — follow these strictly:
- Plain English only. Write like you're explaining to a smart friend who just asked "so, should I put money in the market right now?"
- Banned phrases: risk-off, risk-on, hawkish, dovish, yield curve, price-to-earnings multiples, macro headwinds, liquidity, alpha, beta, portfolio rebalancing, de-risking, sector rotation. Say what you mean in plain words.
- Be direct. "Most investors are nervous right now because the US economy might slow down" not "sentiment indicators reflect elevated uncertainty amid recessionary concerns."
- For investment ideas: say clearly what it is and why you'd consider buying it now. What are you betting on? What actually goes wrong if it doesn't work?
- Don't make anything sound safer or riskier than it actually is. If returns are uncertain, say so.
- Short sentences.

Return ONLY this JSON:
{
  "overallMood": "bullish"|"neutral"|"bearish"|"fearful",
  "items": [
    {
      "source": "<name of source, analyst, or community>",
      "sourceType": "community"|"institutional"|"prediction",
      "mood": "bullish"|"neutral"|"bearish"|"fearful",
      "summary": "<1-2 plain sentences: what does this source actually think will happen and why — be specific about what they expect>"
    }
  ],
  "opportunities": [
    {
      "id": "<string>",
      "title": "<plain title describing what this is — not financial code>",
      "thesis": "<2-3 plain sentences: why this is worth considering right now, what you're betting on, what could go wrong>",
      "riskLevel": "low"|"medium"|"high",
      "timeHorizon": "short"|"medium"|"long",
      "assets": ["<actual ETF ticker or company name, max 4>"],
      "expectedAnnualReturn": <decimal e.g. 0.10 for 10% per year>,
      "volatility": <decimal e.g. 0.15>,
      "caveat": "<1 sentence: the main thing that could make this go badly>"
    }
  ],
  "quotes": [
    { "text": "<exact quote>", "author": "<full name>", "institution": "<organization>", "date": "<date found via search>" }
  ],
  "sources": [
    { "title": "<article headline>", "source": "<publication name>", "date": "<publication date>" }
  ]
}

Include 5 sentiment items: 2 community items drawn from the real Reddit posts above (cite actual post titles or comments, use source = subreddit name like "r/investing"), 2 from major banks or institutional analysts found via search, 1 from a prediction market — use the real prediction market probabilities provided above, cite the specific market and its percentage. Include 3 investment ideas with realistic return and volatility numbers based on actual historical asset class performance.
Include 2–3 real expert quotes from analysts, fund managers, or economists found via search — exact words only.
Include 2–3 real news article headlines with publication and date.`

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
    // Fetch Reddit + prediction markets in parallel — both gracefully return [] on failure
    const [redditPosts, predictionMarkets] = await Promise.all([
      fetchRedditPosts(),
      fetchPredictionMarkets(),
    ])
    const fullPrompt =
      PROMPT +
      buildRedditContext(redditPosts) +
      buildPredictionContext(predictionMarkets)

    const text = await searchAndAnalyze(fullPrompt, lang)
    const parsed = parseJson<Omit<SentimentData, 'updatedAt' | 'redditPosts' | 'predictionMarkets'>>(text)

    const data: SentimentData = {
      ...parsed,
      redditPosts,
      predictionMarkets,
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
