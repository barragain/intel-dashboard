import { NextResponse } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import { searchAndAnalyze, parseJson } from '@/lib/claude'
import type { HistoricalData } from '@/lib/types'

const PROMPT = `
You are a financial historian and analyst. Today's date: ${new Date().toDateString()}.

Context: You're advising someone living in Taiwan who:
- Works at a creative content production company (revenue tied to ad budgets)
- Has a girlfriend at ASUS Taiwan (tech sector exposure)
- Wants to start investing this year
- Considering moving to France/Europe in the future
- Worried about Taiwan strait tensions and global macro risks

Search the web for what analysts are saying about CURRENT economic conditions and what they resemble historically.

Return ONLY a JSON object:
{
  "parallels": [
    {
      "id": "<string>",
      "currentSituation": "<what is happening right now in 1 sentence>",
      "historicalEvent": "<name of historical event this resembles>",
      "period": "<year or date range, e.g. '2008-2009'>",
      "whatHappened": "<2 sentences: what happened to markets, jobs, economies during that historical event>",
      "personalImplication": "<1-2 sentences: what this parallel means specifically for this person's job, investments, or Europe plans>"
    }
  ],
  "predictions": [
    {
      "source": "<institution or analyst name>",
      "prediction": "<what they're predicting in 2 sentences>",
      "timeframe": "<e.g. 'Q3 2025', 'by end of 2025', '12 months'>",
      "sentiment": "optimistic" | "pessimistic" | "neutral",
      "confidence": "high" | "medium" | "low"
    }
  ]
}

Include 3-4 historical parallels. Use reference points like: 2008 financial crisis, 2020 COVID crash, 1970s oil crisis, 1997 Asian financial crisis, 2000 dot-com bubble, 2022 inflation surge, Taiwan strait 1996 crisis.
Include 5-6 expert predictions — mix of optimistic and pessimistic, from IMF, World Bank, Goldman Sachs, JP Morgan, and independent economists.
Always connect historical parallels back to personal implications.
`

export async function GET() {
  const cached = getCached('historical')
  if (cached) return NextResponse.json(cached)

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY_MISSING', needsApiKey: true },
      { status: 503 },
    )
  }

  try {
    const text = await searchAndAnalyze(PROMPT, 800)
    const parsed = parseJson<Omit<HistoricalData, 'updatedAt'>>(text)

    const data: HistoricalData = {
      ...parsed,
      updatedAt: new Date().toISOString(),
    }

    setCached('historical', data)
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'ANTHROPIC_API_KEY_MISSING') {
      return NextResponse.json({ error: msg, needsApiKey: true }, { status: 503 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
