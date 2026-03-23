import { NextResponse } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import { searchAndAnalyze, parseJson } from '@/lib/claude'
import type { ConflictsData } from '@/lib/types'

const PROMPT = `You are a geopolitical analyst. Today: ${new Date().toDateString()}.

User: lives in Taiwan, works at content production company (job tied to ad budgets), girlfriend at ASUS Taiwan, planning to move to France.

Do 1 web search on current status of: Taiwan Strait tensions, US trade/tariff policy affecting Taiwan, Middle East oil supply, Russia-Ukraine and EU energy.

Return ONLY this JSON:
{
  "conflicts": [
    {
      "id": "string",
      "name": "conflict name",
      "location": "region",
      "relevance": "1 sentence: why this matters to this specific user",
      "status": "escalating"|"stable"|"de-escalating",
      "keyImpact": "primary impact: e.g. oil prices, job security, supply chains",
      "details": "2 sentences of current specific facts"
    }
  ],
  "overallAssessment": "2-sentence combined risk summary and personal implication"
}

Include 4 conflicts. Cite specific recent events or data points.`

export async function GET() {
  const cached = getCached('conflicts')
  if (cached) return NextResponse.json(cached)

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY_MISSING', needsApiKey: true },
      { status: 503 },
    )
  }

  try {
    const text = await searchAndAnalyze(PROMPT, 800)
    const parsed = parseJson<Omit<ConflictsData, 'updatedAt'>>(text)

    const data: ConflictsData = {
      ...parsed,
      updatedAt: new Date().toISOString(),
    }

    setCached('conflicts', data)
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'ANTHROPIC_API_KEY_MISSING') {
      return NextResponse.json({ error: msg, needsApiKey: true }, { status: 503 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
