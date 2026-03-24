import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { unstable_cache } from 'next/cache'
import { searchAndAnalyze, parseJson } from '@/lib/gemini'
import { getLang } from '@/lib/lang'
import { buildSubredditPromptSection } from '@/lib/reddit'
import { fetchPredictionMarkets, buildPredictionContext } from '@/lib/predictionMarkets'
import type { SentimentData } from '@/lib/types'

const PROMPT_TEMPLATE = `You are a financial analyst helping a general audience understand the current market mood and whether it is a good time to invest. Today: {{DATE}}.

Focus on investors interested in global markets with exposure to Asia and Europe — particularly those new to investing who hold or are considering global stocks, ETFs, and crypto.

Search the web for: how investors are feeling right now (scared or confident?), what major banks and analysts are actually saying about the next 6-12 months, prediction market odds on recession or interest rate changes, and investment options relevant to global, Asian, and European markets.

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
  "subredditSentiment": [
    {
      "subreddit": "<subreddit name without r/ prefix>",
      "summary": "<1-2 plain sentences: what people are actually posting and feeling today>",
      "mood": "bullish"|"neutral"|"bearish"|"fearful"
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
  "predictionMarketsAnalysis": "<ONLY include this field if prediction market data was provided above. Write 2-3 plain English sentences explaining what these specific market probabilities mean collectively for the current global situation. Be concrete: name the percentages and say what they imply. Example format: 'Markets are pricing in a 67% chance of X. Combined with Y odds of Z, investors are clearly expecting...' Omit this field entirely if no prediction market data was provided.>",
  "quotes": [
    { "text": "<exact quote>", "author": "<full name>", "institution": "<organization>", "date": "<date found via search>" }
  ],
  "sources": [
    { "title": "<article headline>", "source": "<publication name>", "date": "<publication date>" }
  ]
}

Include 5 sentiment items: 2 community items (cite subreddits found via search, use source = subreddit name like "r/investing"), 2 from major banks or institutional analysts found via search, 1 from a prediction market — use the real prediction market probabilities provided above, cite the specific market and its percentage. Include 3 investment ideas with realistic return and volatility numbers based on actual historical asset class performance.
Include 2–3 real expert quotes from analysts, fund managers, or economists found via search — exact words only.
Include 2–3 real news article headlines with publication and date.`

const fetchSentimentData = unstable_cache(
  async (lang: string) => {
    const { markets: predictionMarkets } = await fetchPredictionMarkets()
    const prompt =
      PROMPT_TEMPLATE.replace('{{DATE}}', new Date().toDateString()) +
      buildSubredditPromptSection() +
      buildPredictionContext(predictionMarkets)
    const text = await searchAndAnalyze(prompt, lang)
    const parsed = parseJson<Omit<SentimentData, 'updatedAt' | 'predictionMarkets'>>(text)
    return { ...parsed, predictionMarkets, updatedAt: new Date().toISOString() } as SentimentData
  },
  ['sentiment-data'],
  { tags: ['ai-data', 'ai-sentiment'], revalidate: false },
)

export async function GET(request: NextRequest) {
  const lang = getLang(request)

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY_MISSING', needsApiKey: true }, { status: 503 })
  }

  try {
    const data = await fetchSentimentData(lang)
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
