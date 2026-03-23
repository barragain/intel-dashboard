import { createSign } from 'crypto'
import type { PredictionMarket } from './types'

// Tightly scoped to global-impact markets
const PRIMARY_RE =
  /recession|inflation|\bfed\b|federal reserve|interest rate|rate cut|rate hike|\bchina\b|taiwan|war|conflict|\boil\b|\bgdp\b|\bs&p\b|bitcoin|\bdollar\b|\beuro\b|tariff|trade war|nuclear|invasion|ukraine|middle east|gaza|iran/i

// Expanded fallback — used if PRIMARY_RE yields fewer than 3 markets
const FALLBACK_RE =
  /stock market|economy|central bank|crypto|nasdaq|dow|treasury|sanctions|geopolit|\byen\b|crude|election.*global|g7|g20|imf|world bank|semiconductor|ai regulation|nato|energy|debt|default|supply chain/i

export interface PredictionMarketsResult {
  markets: PredictionMarket[]
  kalshiError?: string
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

async function fetchKalshi(): Promise<{ markets: PredictionMarket[]; error?: string }> {
  const keyId = process.env.KALSHI_API_KEY_ID
  const rawKey = process.env.KALSHI_PRIVATE_KEY

  if (!keyId && !rawKey) return { markets: [] } // silently skip if neither is configured
  if (!keyId) return { markets: [], error: 'KALSHI_API_KEY_ID not set' }
  if (!rawKey) return { markets: [], error: 'KALSHI_PRIVATE_KEY not set' }

  try {
    // Env vars store newlines as literal \n — normalize to real newlines
    const privateKey = rawKey.replace(/\\n/g, '\n')
    const timestamp = Date.now().toString()
    const method = 'GET'
    const path = '/trade-api/v2/markets'

    // Kalshi RS256 signature: timestamp + keyId + METHOD + /path (no query string)
    let signature: string
    try {
      const signer = createSign('SHA256')
      signer.update(timestamp + keyId + method + path)
      signer.end()
      signature = signer.sign(privateKey, 'base64')
    } catch (signErr) {
      const msg = `RSA signing failed — check KALSHI_PRIVATE_KEY format: ${signErr instanceof Error ? signErr.message : signErr}`
      console.warn('[Kalshi]', msg)
      return { markets: [], error: msg }
    }

    const url = `https://trading-api.kalshi.com${path}?status=open&limit=50&sort=liquidity`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'KALSHI-ACCESS-KEY': keyId,
        'KALSHI-ACCESS-TIMESTAMP': timestamp,
        'KALSHI-ACCESS-SIGNATURE': signature,
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const msg = `HTTP ${res.status} — ${body.slice(0, 300)}`
      console.warn('[Kalshi] API error:', msg)
      return { markets: [], error: msg }
    }

    const json = await res.json()
    const raw: any[] = json.markets ?? []

    const markets = raw
      .filter((m) => {
        const q = String(m.title ?? m.question ?? '')
        return q.length > 0 && (PRIMARY_RE.test(q) || FALLBACK_RE.test(q))
      })
      .slice(0, 6)
      .map((m): PredictionMarket => {
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

    return { markets }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[Kalshi] fetch failed:', msg)
    return { markets: [], error: msg }
  }
}

export async function fetchPredictionMarkets(): Promise<PredictionMarketsResult> {
  const [poly, kalshiResult] = await Promise.all([fetchPolymarket(), fetchKalshi()])
  const markets = [...poly, ...kalshiResult.markets]
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, 5)
  return { markets, kalshiError: kalshiResult.error }
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
