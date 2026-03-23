import { NextResponse } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import { searchAndAnalyze, parseJson } from '@/lib/claude'
import type { RiskData } from '@/lib/types'

const PROMPT = `You are a financial risk analyst. Today: ${new Date().toDateString()}.

User profile: lives in Taiwan, works at a content production company (revenue tied to ad budgets), girlfriend is PR at ASUS Taiwan, considering moving to France long-term, wants to start investing.

Run 1 web search covering: Taiwan strait tensions, VIX/oil/DXY, APAC ad spend, ASUS/semiconductor health, EU/France economic outlook.

Return ONLY this JSON:
{
  "status": "STABLE" | "WATCH" | "WORRIED",
  "score": <0–100, where 0=stable, 100=crisis>,
  "explanation": "<2–3 sentences citing specific current facts>",
  "drivers": [
    { "name": "<max 20 chars>", "impact": "positive"|"negative"|"neutral", "detail": "<one current fact>" }
  ]
}

Score guide: 0–33 = STABLE, 34–66 = WATCH, 67–100 = WORRIED.
Include exactly 5 drivers: Taiwan Strait, Ad Spend, ASUS/Tech, France/EU, Market Volatility.`

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
    const text = await searchAndAnalyze(PROMPT, 800, 1)
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
