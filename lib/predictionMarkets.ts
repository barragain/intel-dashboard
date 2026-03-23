import type { PredictionMarket } from './types'

// Broad financial/economic keyword filter — keep markets relevant to this dashboard
const FINANCIAL_RE =
  /recession|federal reserve|fed\s?rate|interest rate|rate cut|rate hike|inflation|cpi|gdp|unemployment|jobs|s&p|nasdaq|dow|treasury|bitcoin|crypto|taiwan|china|ukraine|oil|gas|tariff|trade war|election|president|debt ceiling/i

async function fetchPolymarket(): Promise<PredictionMarket[]> {
  try {
    // User-specified CLOB endpoint; fetch a batch and sort locally by 24h volume
    const res = await fetch(
      'https://clob.polymarket.com/markets?active=true&closed=false&limit=100',
      { signal: AbortSignal.timeout(15_000) },
    )
    if (!res.ok) return []

    const json = await res.json()
    const raw: unknown[] = Array.isArray(json) ? json : (json.data ?? [])

    return (raw as any[])
      .filter((m) => m.question && FINANCIAL_RE.test(m.question))
      .sort(
        (a, b) =>
          parseFloat(b.volume_24hr ?? b.volume ?? '0') -
          parseFloat(a.volume_24hr ?? a.volume ?? '0'),
      )
      .slice(0, 6)
      .map((m): PredictionMarket => {
        const yesToken = Array.isArray(m.tokens)
          ? m.tokens.find((t: any) => t.outcome === 'Yes')
          : null
        const probability = yesToken ? Number(yesToken.price) : 0

        return {
          id: String(m.condition_id ?? m.question_id ?? Math.random()),
          question: String(m.question),
          probability,
          source: 'polymarket',
          volume: parseFloat(m.volume_24hr ?? m.volume ?? '0'),
          url: m.market_slug
            ? `https://polymarket.com/event/${m.market_slug}`
            : undefined,
        }
      })
      .filter((m) => m.probability > 0.01 && m.probability < 0.99)
  } catch {
    return []
  }
}

async function fetchKalshi(): Promise<PredictionMarket[]> {
  try {
    // Public endpoint — gracefully returns [] if auth is required (401/403)
    const res = await fetch(
      'https://trading-api.kalshi.com/trade-api/v2/markets?status=open&limit=20&sort=liquidity',
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!res.ok) return []

    const json = await res.json()
    const raw: any[] = json.markets ?? []

    return raw
      .filter((m) => {
        const q = String(m.title ?? m.question ?? '')
        return q.length > 0 && FINANCIAL_RE.test(q)
      })
      .slice(0, 6)
      .map((m): PredictionMarket => {
        // Kalshi prices can be in cents (0–99) or decimal (0.01–0.99) depending on version
        const raw = Number(m.yes_bid ?? m.last_price ?? m.yes_ask ?? 0)
        const probability = raw > 1 ? raw / 100 : raw

        return {
          id: String(m.ticker ?? m.id ?? Math.random()),
          question: String(m.title ?? m.question ?? ''),
          probability,
          source: 'kalshi',
          volume: Number(m.volume ?? m.open_interest ?? 0),
          url: m.ticker ? `https://kalshi.com/markets/${m.ticker}` : undefined,
        }
      })
      .filter((m) => m.question.length > 0 && m.probability > 0.01 && m.probability < 0.99)
  } catch {
    return []
  }
}

export async function fetchPredictionMarkets(): Promise<PredictionMarket[]> {
  const [poly, kalshi] = await Promise.all([fetchPolymarket(), fetchKalshi()])
  return [...poly, ...kalshi]
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, 5)
}

export function buildPredictionContext(markets: PredictionMarket[]): string {
  if (markets.length === 0) return ''

  const lines = [
    '\n\nCURRENT PREDICTION MARKET DATA — use these real probabilities for the prediction market sentiment item and reference them in your analysis:',
  ]
  for (const m of markets) {
    const pct = Math.round(m.probability * 100)
    lines.push(`  • [${m.source}] "${m.question}" — ${pct}% chance of YES`)
  }
  return lines.join('\n')
}
