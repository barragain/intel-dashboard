import { NextResponse } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import { searchAndAnalyze, parseJson } from '@/lib/claude'
import type { RiskData } from '@/lib/types'

const CONTEXT = `
You are an intelligent financial risk analyst providing a personal risk assessment for:
- Person living in Taiwan, working at a creative content production company called "Temporary Truth Creative"
- Girlfriend works as PR specialist at ASUS Taiwan
- Both considering moving to France/Europe long-term (not imminent)
- Wants to start investing this year but hasn't yet
- Anxious about global tensions and needs structured risk information

Today's date: ${new Date().toDateString()}

Your task: Search the web for CURRENT information on each of these factors and assess the personal risk level.
`

const PROMPT = `${CONTEXT}

Search for current news and data on ALL of the following:
1. Taiwan strait tensions - recent military activity, political statements, PLA exercises
2. Global advertising and content production spending - brand budget trends, APAC ad spend
3. ASUS Taiwan performance and Taiwan tech/semiconductor sector health
4. EU and French economic outlook - ECB policy, French economic data, EU stability
5. Key global risk indicators - current VIX level, oil price trend, DXY movement

After searching, return a JSON object (and ONLY a JSON object, no prose before or after) with this exact structure:
{
  "status": "STABLE" | "WATCH" | "WORRIED",
  "score": <number 0-100 where 0=perfectly stable, 100=maximum crisis>,
  "explanation": "<2-3 sentence explanation of WHY it's at this level, with specific current facts>",
  "drivers": [
    {
      "name": "<short driver name, max 20 chars>",
      "impact": "positive" | "negative" | "neutral",
      "detail": "<one specific current fact or data point>"
    }
  ]
}

Scoring guide:
- 0-33: STABLE (no major threats, normal conditions)
- 34-66: WATCH (elevated concern, some negative signals, caution warranted)
- 67-100: WORRIED (serious threats, multiple negative signals, action may be needed)

Include exactly 5 drivers: Taiwan Strait, Ad Spend, ASUS/Tech, France/EU, Market Volatility.
`

export async function GET() {
  const cached = getCached('risk')
  if (cached) return NextResponse.json(cached)

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY_MISSING', needsApiKey: true },
      { status: 503 },
    )
  }

  try {
    const text = await searchAndAnalyze(PROMPT, 1000)
    const parsed = parseJson<Omit<RiskData, 'updatedAt'>>(text)

    const data: RiskData = {
      ...parsed,
      updatedAt: new Date().toISOString(),
    }

    setCached('risk', data)
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'ANTHROPIC_API_KEY_MISSING') {
      return NextResponse.json({ error: msg, needsApiKey: true }, { status: 503 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
