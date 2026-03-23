import type { PredictionMarket } from './types'

// Tightly scoped to global-impact markets
const PRIMARY_RE =
  /recession|inflation|\bfed\b|federal reserve|interest rate|rate cut|rate hike|\bchina\b|taiwan|war|conflict|\boil\b|\bgdp\b|\bs&p\b|bitcoin|\bdollar\b|\beuro\b|tariff|trade war|nuclear|invasion|ukraine|middle east|gaza|iran/i

// Expanded fallback — used if PRIMARY_RE yields fewer than 3 markets
const FALLBACK_RE =
  /stock market|economy|central bank|crypto|nasdaq|dow|treasury|sanctions|geopolit|\byen\b|crude|election.*global|g7|g20|imf|world bank|semiconductor|ai regulation|nato|energy|debt|default|supply chain/i

export interface PredictionMarketsResult {
  markets: PredictionMarket[]
}

async function fetchPolymarket(): Promise<PredictionMarket[]> {
  try {
    // Use limit=200 so the two-pass filter has enough candidates after cutting irrelevant markets
    const res = await fetch(
      'https://gamma-api.polymarket.com/markets?active=true&closed=false&archived=false&limit=200&order=volume&ascending=false',
      { signal: AbortSignal.timeout(15_000) },
    )
    if (!res.ok) {
      console.warn('[Polymarket] API error:', res.status)
      return []
    }

    const json = await res.json()
    const raw: any[] = Array.isArray(json) ? json : (json.data ?? json.markets ?? [])
    const now = new Date()

    function getProb(m: any): number {
      try {
        const prices = typeof m.outcomePrices === 'string'
          ? JSON.parse(m.outcomePrices)
          : (m.outcomePrices ?? [])
        return Array.isArray(prices) ? Number(prices[0]) : 0
      } catch { return 0 }
    }

    // All active, non-expired markets with a valid probability
    const candidates: PredictionMarket[] = raw
      .filter((m) => {
        if (!m.question) return false
        if (m.active === false || m.closed === true || m.archived === true) return false
        if (m.endDate && new Date(m.endDate) < now) return false
        return true
      })
      .map((m): PredictionMarket => ({
        id: String(m.id ?? m.conditionId ?? Math.random()),
        question: String(m.question),
        probability: getProb(m),
        source: 'polymarket',
        volume: parseFloat(m.volume ?? '0'),
        url: m.slug ? `https://polymarket.com/event/${m.slug}` : undefined,
      }))
      .filter((m) => m.probability > 0.01 && m.probability < 0.99)
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))

    // Two-pass: try primary keywords first; expand to fallback if < 3 found
    const primary = candidates.filter((m) => PRIMARY_RE.test(m.question))
    if (primary.length >= 3) return primary.slice(0, 6)

    const extra = candidates.filter(
      (m) => !PRIMARY_RE.test(m.question) && FALLBACK_RE.test(m.question),
    )
    return [...primary, ...extra].slice(0, 6)
  } catch (err) {
    console.warn('[Polymarket] fetch failed:', err)
    return []
  }
}

export async function fetchPredictionMarkets(): Promise<PredictionMarketsResult> {
  const markets = await fetchPolymarket()
  return { markets: markets.slice(0, 5) }
}

export function buildPredictionContext(markets: PredictionMarket[]): string {
  if (markets.length === 0) return ''
  const lines = [
    '\n\nCURRENT PREDICTION MARKET DATA — use these real probabilities in your analysis:',
  ]
  for (const m of markets) {
    const pct = Math.round(m.probability * 100)
    lines.push(`  • [${m.source}] "${m.question}" — ${pct}% chance of YES`)
  }
  return lines.join('\n')
}
