import { NextResponse } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import type { EconomiesData, EconomyCard, EconomyIndicator } from '@/lib/types'

const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

async function fetchYF(symbol: string): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    const res = await fetch(
      `${YF_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; INTEL-Dashboard/1.0)',
          Accept: 'application/json',
        },
        next: { revalidate: 0 },
      },
    )
    if (!res.ok) return null
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta) return null
    return {
      price: meta.regularMarketPrice ?? 0,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
    }
  } catch {
    return null
  }
}

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return 'N/A'
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'N/A'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function changeType(n: number | undefined): 'positive' | 'negative' | 'neutral' {
  if (!n || Math.abs(n) < 0.05) return 'neutral'
  return n > 0 ? 'positive' : 'negative'
}

function directionFromPct(pct: number | undefined): EconomyCard['direction'] {
  if (!pct) return 'stable'
  if (pct > 0.3) return 'improving'
  if (pct < -0.3) return 'deteriorating'
  return 'stable'
}

function statusFromDirection(dir: EconomyCard['direction']): EconomyCard['status'] {
  if (dir === 'improving') return 'green'
  if (dir === 'deteriorating') return 'red'
  return 'yellow'
}

export async function GET() {
  const cached = getCached('economies')
  if (cached) return NextResponse.json(cached)

  // Fetch all symbols in parallel
  const [spx, vix, dxy, gold, oil, taiex, twd, cac, eur, pyg] = await Promise.all([
    fetchYF('^GSPC'),
    fetchYF('^VIX'),
    fetchYF('DX-Y.NYB'),
    fetchYF('GC=F'),
    fetchYF('CL=F'),
    fetchYF('^TWII'),
    fetchYF('TWD=X'),
    fetchYF('^FCHI'),
    fetchYF('EURUSD=X'),
    fetchYF('PYG=X'),
  ])

  const economies: EconomyCard[] = [
    // 1. Global
    (() => {
      const indicators: EconomyIndicator[] = [
        { label: 'S&P 500', value: spx ? fmt(spx.price, 0) : 'N/A', change: spx ? fmtPct(spx.changePercent) : undefined, changeType: changeType(spx?.changePercent) },
        { label: 'DXY', value: dxy ? fmt(dxy.price) : 'N/A', change: dxy ? fmtPct(dxy.changePercent) : undefined, changeType: changeType(dxy?.changePercent) },
        { label: 'VIX', value: vix ? fmt(vix.price) : 'N/A', change: vix ? fmtPct(vix.changePercent) : undefined, changeType: vix ? changeType(-vix.changePercent) : 'neutral' },
        { label: 'Gold (oz)', value: gold ? `$${fmt(gold.price, 0)}` : 'N/A', change: gold ? fmtPct(gold.changePercent) : undefined, changeType: changeType(gold?.changePercent) },
        { label: 'Oil WTI', value: oil ? `$${fmt(oil.price)}` : 'N/A', change: oil ? fmtPct(oil.changePercent) : undefined, changeType: changeType(oil?.changePercent) },
      ]
      const vixLevel = vix?.price ?? 20
      const spxDir = directionFromPct(spx?.changePercent)
      const vixHigh = vixLevel > 25
      const dir: EconomyCard['direction'] = vixHigh ? 'deteriorating' : spxDir
      const vixDesc = vixLevel > 30 ? 'elevated fear' : vixLevel > 20 ? 'moderate uncertainty' : 'calm markets'
      return {
        id: 'global',
        name: 'Global',
        emoji: '🌐',
        indicators,
        summary: `S&P 500 ${spx ? (spx.changePercent >= 0 ? 'rose' : 'fell') + ' ' + Math.abs(spx.changePercent).toFixed(1) + '%' : 'data unavailable'} today. VIX at ${vix ? fmt(vix.price) : 'N/A'} signals ${vixDesc}. DXY ${dxy ? (dxy.changePercent >= 0 ? 'strengthened' : 'weakened') : 'moved'}, reflecting ${(dxy?.changePercent ?? 0) > 0 ? 'dollar demand and risk-off flows' : 'dollar softening amid risk appetite'}.`,
        direction: dir,
        status: statusFromDirection(dir),
      }
    })(),

    // 2. United States
    (() => {
      const indicators: EconomyIndicator[] = [
        { label: 'S&P 500', value: spx ? fmt(spx.price, 0) : 'N/A', change: spx ? fmtPct(spx.changePercent) : undefined, changeType: changeType(spx?.changePercent) },
        { label: 'VIX', value: vix ? fmt(vix.price) : 'N/A', change: vix ? fmtPct(vix.changePercent) : undefined, changeType: 'neutral' },
        { label: 'Oil WTI', value: oil ? `$${fmt(oil.price)}` : 'N/A', change: oil ? fmtPct(oil.changePercent) : undefined, changeType: changeType(oil?.changePercent) },
      ]
      const dir = directionFromPct(spx?.changePercent)
      return {
        id: 'us',
        name: 'United States',
        emoji: '🇺🇸',
        indicators,
        summary: `US equities ${spx ? (spx.changePercent >= 0 ? 'advancing' : 'retreating') : 'mixed'} with S&P 500 at ${spx ? fmt(spx.price, 0) : 'N/A'}. VIX at ${vix ? fmt(vix.price) : 'N/A'} — ${(vix?.price ?? 20) > 25 ? 'elevated, suggesting investor anxiety about macro risks including Fed policy and trade tensions' : 'contained, suggesting relative confidence in near-term economic stability'}. Fed policy uncertainty continues to be the dominant driver of market direction.`,
        direction: dir,
        status: statusFromDirection(dir),
      }
    })(),

    // 3. Taiwan
    (() => {
      const indicators: EconomyIndicator[] = [
        { label: 'TAIEX', value: taiex ? fmt(taiex.price, 0) : 'N/A', change: taiex ? fmtPct(taiex.changePercent) : undefined, changeType: changeType(taiex?.changePercent) },
        { label: 'TWD/USD', value: twd ? fmt(twd.price) : 'N/A', change: twd ? fmtPct(twd.changePercent) : undefined, changeType: changeType(-(twd?.changePercent ?? 0)) },
      ]
      const dir = directionFromPct(taiex?.changePercent)
      return {
        id: 'taiwan',
        name: 'Taiwan',
        emoji: '🇹🇼',
        indicators,
        summary: `TAIEX ${taiex ? (taiex.changePercent >= 0 ? 'gaining' : 'losing') + ' ' + Math.abs(taiex.changePercent).toFixed(1) + '%' : 'data unavailable'}. TWD at ${twd ? fmt(twd.price) : 'N/A'} per USD — ${(twd?.changePercent ?? 0) > 0 ? 'currency weakening, potentially supporting exports but signaling capital outflows' : 'currency stable or strengthening, reflecting regional confidence'}. Taiwan semiconductor sector remains globally critical; TSMC's performance is a proxy for the tech supply chain's health.`,
        direction: dir,
        status: statusFromDirection(dir),
      }
    })(),

    // 4. France
    (() => {
      const indicators: EconomyIndicator[] = [
        { label: 'CAC 40', value: cac ? fmt(cac.price, 0) : 'N/A', change: cac ? fmtPct(cac.changePercent) : undefined, changeType: changeType(cac?.changePercent) },
        { label: 'EUR/USD', value: eur ? fmt(eur.price, 4) : 'N/A', change: eur ? fmtPct(eur.changePercent) : undefined, changeType: changeType(eur?.changePercent) },
      ]
      const dir = directionFromPct(cac?.changePercent)
      return {
        id: 'france',
        name: 'France',
        emoji: '🇫🇷',
        indicators,
        summary: `CAC 40 at ${cac ? fmt(cac.price, 0) : 'N/A'}, ${cac ? (cac.changePercent >= 0 ? 'up' : 'down') + ' ' + Math.abs(cac.changePercent).toFixed(1) + '% today' : 'data unavailable'}. EUR/USD at ${eur ? fmt(eur.price, 4) : 'N/A'}, ${(eur?.changePercent ?? 0) >= 0 ? 'euro holding ground as ECB signals cautious approach to rate cuts' : 'euro under pressure amid diverging EU economic outlooks'}. EU reconstruction and defense spending remain key themes for French industrials and infrastructure.`,
        direction: dir,
        status: statusFromDirection(dir),
      }
    })(),

    // 5. Paraguay
    (() => {
      const indicators: EconomyIndicator[] = [
        { label: 'PYG/USD', value: pyg ? fmt(pyg.price, 0) : 'N/A', change: pyg ? fmtPct(pyg.changePercent) : undefined, changeType: changeType(-(pyg?.changePercent ?? 0)) },
      ]
      return {
        id: 'paraguay',
        name: 'Paraguay',
        emoji: '🇵🇾',
        indicators,
        summary: `Paraguay's guaraní at ${pyg ? fmt(pyg.price, 0) : 'N/A'} per USD. Paraguay maintains a dollarized trade economy with relatively stable macro fundamentals. GDP growth typically tracks agricultural exports (soy, beef) and hydroelectric energy revenue. Inflation historically moderate. Limited real-time data available for this smaller emerging market.`,
        direction: 'stable',
        status: 'yellow',
      }
    })(),
  ]

  const data: EconomiesData = {
    economies,
    updatedAt: new Date().toISOString(),
  }

  setCached('economies', data)
  return NextResponse.json(data)
}
