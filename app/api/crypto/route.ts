import { NextResponse } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import type { CryptoData } from '@/lib/types'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
const FEAR_GREED_URL = 'https://api.alternative.me/fng/?limit=1'

function fearGreedLabel(score: number): string {
  if (score <= 24) return 'Extreme Fear'
  if (score <= 44) return 'Fear'
  if (score <= 55) return 'Neutral'
  if (score <= 74) return 'Greed'
  return 'Extreme Greed'
}

function buildInterpretation(score: number, btcChange7d: number, totalCapChange24h: number): string {
  const label = fearGreedLabel(score)
  const capDir = totalCapChange24h >= 0 ? 'up' : 'down'

  if (score <= 24) {
    return `Crypto markets are in ${label} territory (${score}/100). Total market cap moved ${capDir} ${Math.abs(totalCapChange24h).toFixed(1)}% in 24h. Extreme fear historically precedes recoveries but signals broad risk-off sentiment — investors are fleeing volatile assets across all classes.`
  }
  if (score <= 44) {
    return `Crypto sentiment is cautious at ${score}/100 (${label}). Bitcoin ${btcChange7d >= 0 ? 'gained' : 'lost'} ${Math.abs(btcChange7d).toFixed(1)}% over 7 days. Fear-driven markets suggest investors remain wary of macro risks — this typically correlates with defensive positioning in equities and FX as well.`
  }
  if (score <= 55) {
    return `Crypto sentiment is balanced at ${score}/100 (${label}). Markets are in a holding pattern, with neither strong conviction nor panic. This neutral positioning usually reflects broader macro uncertainty — markets are waiting for clearer signals from central banks or geopolitical developments.`
  }
  if (score <= 74) {
    return `Crypto sentiment is ${label} at ${score}/100. Bitcoin ${btcChange7d >= 0 ? 'gained' : 'lost'} ${Math.abs(btcChange7d).toFixed(1)}% this week. Greed signals risk-on behavior — typically correlated with equity strength, tighter credit spreads, and reduced safe-haven demand. Positive for growth assets overall.`
  }
  return `Crypto sentiment is in ${label} territory at ${score}/100. This level of exuberance has historically preceded corrections. While positive in the short term, extreme greed can signal overextension — worth being cautious about entering new positions at elevated levels.`
}

function macroSignal(score: number): string {
  if (score <= 24) return 'RISK-OFF — broad market fear, defensive positioning'
  if (score <= 44) return 'CAUTIOUS — moderate risk aversion, selective exposure'
  if (score <= 55) return 'NEUTRAL — wait-and-see, macro uncertainty'
  if (score <= 74) return 'RISK-ON — appetite for growth assets, positive macro signal'
  return 'EXUBERANT — caution warranted, potential overextension'
}

export async function GET() {
  const cached = getCached('crypto')
  if (cached) return NextResponse.json(cached)

  try {
    const [coinsRes, globalRes, fngRes] = await Promise.allSettled([
      fetch(
        `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&sparkline=false&price_change_percentage=7d`,
        { headers: { Accept: 'application/json' }, next: { revalidate: 0 } },
      ),
      fetch(`${COINGECKO_BASE}/global`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 0 },
      }),
      fetch(FEAR_GREED_URL, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 0 },
      }),
    ])

    // Parse coins
    let assets: CryptoData['assets'] = []
    if (coinsRes.status === 'fulfilled' && coinsRes.value.ok) {
      const coins = await coinsRes.value.json()
      assets = coins.map((c: Record<string, unknown>) => ({
        id: c.id,
        symbol: (c.symbol as string).toUpperCase(),
        name: c.name,
        price: c.current_price,
        priceChange24h: c.price_change_percentage_24h ?? 0,
        priceChange7d: c.price_change_percentage_7d_in_currency ?? 0,
        marketCap: c.market_cap,
      }))
    }

    // Parse global
    let totalMarketCap = 0
    let totalMarketCapChange24h = 0
    if (globalRes.status === 'fulfilled' && globalRes.value.ok) {
      const g = await globalRes.value.json()
      totalMarketCap = g?.data?.total_market_cap?.usd ?? 0
      totalMarketCapChange24h = g?.data?.market_cap_change_percentage_24h_usd ?? 0
    }

    // Parse fear & greed
    let fearGreedIndex = 50
    if (fngRes.status === 'fulfilled' && fngRes.value.ok) {
      const fng = await fngRes.value.json()
      fearGreedIndex = parseInt(fng?.data?.[0]?.value ?? '50', 10)
    }

    const btcChange7d = assets.find((a) => a.id === 'bitcoin')?.priceChange7d ?? 0

    const data: CryptoData = {
      assets,
      totalMarketCap,
      totalMarketCapChange24h,
      fearGreedIndex,
      fearGreedLabel: fearGreedLabel(fearGreedIndex),
      interpretation: buildInterpretation(fearGreedIndex, btcChange7d, totalMarketCapChange24h),
      macroSignal: macroSignal(fearGreedIndex),
      updatedAt: new Date().toISOString(),
    }

    setCached('crypto', data)
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
