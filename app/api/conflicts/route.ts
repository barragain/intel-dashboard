import { NextResponse } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import { searchAndAnalyze, parseJson } from '@/lib/claude'
import type { ConflictsData } from '@/lib/types'

const PROMPT = `
You are a geopolitical risk analyst. Today's date: ${new Date().toDateString()}.

The person you're reporting for:
- Lives in Taiwan, works at a content/video production company
- Girlfriend works at ASUS Taiwan
- Planning to move to France/Europe eventually
- Concerned about impacts on: job security, investment timing, future relocation

Search the web for CURRENT status (today/this week) of these specific conflicts and tensions:
1. Taiwan Strait (China-Taiwan tensions, PLA military activity)
2. US foreign policy and trade wars (tariffs, semiconductor restrictions, TSMC/Taiwan policy)
3. Middle East (oil supply disruptions, US-Iran, Red Sea shipping)
4. Russia-Ukraine (EU energy, European security, NATO)
5. Any NEW significant conflicts or tensions markets are currently pricing in

Return ONLY a JSON object with this exact structure:
{
  "conflicts": [
    {
      "id": "<string id>",
      "name": "<conflict name>",
      "location": "<region>",
      "relevance": "<1 sentence: exactly why this matters to this specific person>",
      "status": "escalating" | "stable" | "de-escalating",
      "keyImpact": "<primary market/personal impact: e.g. oil prices, supply chains, job security>",
      "details": "<2 sentences of current specific facts from this week>"
    }
  ],
  "overallAssessment": "<2 sentence overall assessment of combined geopolitical risk and its personal implications>"
}

Include 4-5 conflicts. Be specific with current facts — mention actual recent events, statements, or data points.
`

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
    const text = await searchAndAnalyze(PROMPT, 1000)
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
