import type { PredictionMarket } from './types'

// Broad financial/economic/geopolitical keyword filter
const FINANCIAL_RE =
  /recession|federal reserve|fed\s?rate|interest rate|rate cut|rate hike|inflation|cpi|gdp|unemployment|jobs|s&p|nasdaq|dow|treasury|bitcoin|crypto|taiwan|china|ukraine|russia|oil|gas|tariff|trade|election|president|debt ceiling|stock market|dollar|euro|yen|war|conflict|regulation|tech|ai\b|semiconductor|earnings/i

async function fetchPolymarket(): Promise<PredictionMarket[]> {
  try {
    // Gamma API — returns clean human-readable market data sorted by volume
    const res = await fetch(
      'https://gamma-api.polymarket.com/markets?active=true&closed=false&archived=false&limit=100&order=volume&ascending=false',
      { signal: AbortSignal.timeout(15_000) },
    )
    if (!res.ok) {
      console.warn('[Polymarket] API error:', res.status)
      return []
    }

    const json = await res.json()
    const raw: any[] = Array.isArray(json) ? json : (json.data ?? json.markets ?? [])

    const now = new Date()

    return raw
      .filter((m) => {
        if (!m.question) return false
        if (m.active === false || m.closed === true || m.archived === true) return false
        // Skip markets with an end date already in the past
        if (m.endDate && new Date(m.endDate) < now) return false
        return FINANCIAL_RE.test(m.question)
      })
      .map((m): PredictionMarket => {
        // outcomePrices is a JSON string array e.g. "[\"0.65\",\"0.35\"]"
        let probability = 0
        try {
          const prices = typeof m.outcomePrices === 'string'
            ? JSON.parse(m.outcomePrices)
            : (m.outcomePrices ?? [])
          probability = Array.isArray(prices) ? Number(prices[0]) : 0
        } catch {
          probability = 0
        }

        return {
          id: String(m.id ?? m.conditionId ?? Math.random()),
          question: String(m.question),
          probability,
          source: 'polymarket',
          volume: parseFloat(m.volume ?? '0'),
          url: m.slug ? `https://polymarket.com/event/${m.slug}` : undefined,
        }
      })
      .filter((m) => m.probability > 0.01 && m.probability < 0.99)
      .slice(0, 6)
  } catch (err) {
    console.warn('[Polymarket] fetch failed:', err)
    return []
  }
}

async function fetchKalshi(): Promise<PredictionMarket[]> {
  const apiKey = process.env.KALSHI_API_KEY
  if (!apiKey) {
    console.warn('[Kalshi] KALSHI_API_KEY not set — skipping')
    return []
  }

  try {
    const res = await fetch(
      'https://trading-api.kalshi.com/trade-api/v2/markets?status=open&limit=20&sort=liquidity',
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!res.ok) {
      console.warn('[Kalshi] API error:', res.status)
      return []
    }

    const json = await res.json()
    const raw: any[] = json.markets ?? []

    return raw
      .filter((m) => {
        const q = String(m.title ?? m.question ?? '')
        return q.length > 0 && FINANCIAL_RE.test(q)
      })
      .slice(0, 6)
      .map((m): PredictionMarket => {
        // Kalshi prices can be in cents (0–99) or decimal (0.01–0.99)
        const rawPrice = Number(m.yes_bid ?? m.last_price ?? m.yes_ask ?? 0)
        const probability = rawPrice > 1 ? rawPrice / 100 : rawPrice

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
  } catch (err) {
    console.warn('[Kalshi] fetch failed:', err)
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
