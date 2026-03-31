import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCached, setCached } from '@/lib/cache'
import { getLang } from '@/lib/lang'
import { translateEconomiesData } from '@/lib/translate'
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
    const price = meta.regularMarketPrice ?? 0
    const prevClose = meta.previousClose ?? 0
    const change = prevClose ? price - prevClose : 0
    const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0
    return { price, change, changePercent }
  } catch {
    return null
  }
}

async function fetchYFSparkline(symbol: string): Promise<{ price: number; date: string }[] | null> {
  try {
    const res = await fetch(
      `${YF_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=1mo`,
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
    const result = json?.chart?.result?.[0]
    const timestamps: number[] = result?.timestamp ?? []
    const closes: number[] = result?.indicators?.quote?.[0]?.close ?? []
    if (timestamps.length === 0) return null
    return timestamps
      .map((ts, i) => ({
        price: closes[i] ?? null,
        date: new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }))
      .filter((d) => d.price !== null) as { price: number; date: string }[]
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

export async function GET(request: NextRequest) {
  const lang = getLang(request)

  // Check language-specific cache first (FR/ES)
  if (lang !== 'en') {
    const cached = getCached(`economies_${lang}`)
    if (cached) return NextResponse.json(cached)
  }

  const cached = getCached('economies')
  if (cached) {
    if (lang === 'en') return NextResponse.json(cached)
    // Translate the cached EN data
    const translated = await translateEconomiesData(cached as EconomiesData, lang)
    setCached(`economies_${lang}`, translated)
    return NextResponse.json(translated)
  }

  // Fetch all prices and sparklines in parallel
  const [
    spx, vix, dxy, gold, oil, brent, silver,
    taiex, twd, cac, eur, pyg, ndx, sox, asus,
    spxSpark, vixSpark, dxySpark, goldSpark, oilSpark, brentSpark, silverSpark,
    taiexSpark, twdSpark, cacSpark, eurSpark, pygSpark, ndxSpark, soxSpark, asusSpark,
  ] = await Promise.all([
    // Prices
    fetchYF('^GSPC'),
    fetchYF('^VIX'),
    fetchYF('DX-Y.NYB'),
    fetchYF('GC=F'),
    fetchYF('CL=F'),
    fetchYF('BZ=F'),
    fetchYF('SI=F'),
    fetchYF('^TWII'),
    fetchYF('TWD=X'),
    fetchYF('^FCHI'),
    fetchYF('EURUSD=X'),
    fetchYF('PYG=X'),
    fetchYF('^NDX'),
    fetchYF('^SOX'),
    fetchYF('2357.TW'),
    // Sparklines
    fetchYFSparkline('^GSPC'),
    fetchYFSparkline('^VIX'),
    fetchYFSparkline('DX-Y.NYB'),
    fetchYFSparkline('GC=F'),
    fetchYFSparkline('CL=F'),
    fetchYFSparkline('BZ=F'),
    fetchYFSparkline('SI=F'),
    fetchYFSparkline('^TWII'),
    fetchYFSparkline('TWD=X'),
    fetchYFSparkline('^FCHI'),
    fetchYFSparkline('EURUSD=X'),
    fetchYFSparkline('PYG=X'),
    fetchYFSparkline('^NDX'),
    fetchYFSparkline('^SOX'),
    fetchYFSparkline('2357.TW'),
  ])

  /** Compute % change over the sparkline window (first close → last close). */
  function pctChange30d(spark: { price: number; date: string }[] | null | undefined): number | null {
    if (!spark || spark.length < 2) return null
    const first = spark[0].price
    const last = spark[spark.length - 1].price
    if (!first) return null
    return ((last - first) / first) * 100
  }

  const economies: EconomyCard[] = [
    // 1. Global — macro indicators with per-indicator sparklines
    (() => {
      const ind = (
        label: string,
        data: typeof vix,
        priceFmt: (p: number) => string,
        spark: typeof vixSpark,
        invertChange = false,
      ): EconomyIndicator => {
        const chg = pctChange30d(spark)
        return {
          label,
          value: data ? priceFmt(data.price) : 'N/A',
          change: chg !== null ? fmtPct(chg) : undefined,
          changeType: chg !== null ? changeType(invertChange ? -chg : chg) : 'neutral',
          sparkline: spark ?? undefined,
        }
      }

      const indicators: EconomyIndicator[] = [
        ind('VIX', vix, (p) => fmt(p), vixSpark, true),
        ind('DXY', dxy, (p) => fmt(p), dxySpark),
        ind('Gold (oz)', gold, (p) => `$${fmt(p, 0)}`, goldSpark),
        ind('Silver (oz)', silver, (p) => `$${fmt(p, 2)}`, silverSpark),
        ind('Oil WTI', oil, (p) => `$${fmt(p)}`, oilSpark),
        ind('Brent Crude', brent, (p) => `$${fmt(p)}`, brentSpark),
      ]

      const vixLevel = vix?.price ?? 20
      const vixHigh = vixLevel > 25
      const dir: EconomyCard['direction'] = vixHigh ? 'deteriorating' : 'stable'
      const vixDesc = vixLevel > 30 ? 'a lot of fear in markets' : vixLevel > 20 ? 'some uncertainty' : 'calm markets'

      return {
        id: 'global',
        name: 'Global',
        emoji: '🌐',
        indicators,
        summary: `The VIX fear index is at ${vix ? fmt(vix.price) : 'N/A'} — signalling ${vixDesc}. Gold is at $${gold ? fmt(gold.price, 0) : 'N/A'} and ${gold ? (gold.changePercent >= 0 ? 'rising' : 'falling') : 'moving'} — gold usually goes up when people are nervous about the economy. Oil (WTI $${oil ? fmt(oil.price) : 'N/A'}, Brent $${brent ? fmt(brent.price) : 'N/A'}) affects the cost of everything from fuel to shipping. The US dollar (DXY ${dxy ? fmt(dxy.price) : 'N/A'}) ${dxy ? (dxy.changePercent >= 0 ? 'got stronger' : 'got weaker') : 'moved'} — a stronger dollar usually puts pressure on other currencies and emerging markets.`,
        direction: dir,
        status: statusFromDirection(dir),
      }
    })(),

    // 2. United States
    (() => {
      const spx30d = pctChange30d(spxSpark)
      const vix30d = pctChange30d(vixSpark)
      const oil30d = pctChange30d(oilSpark)
      const indicators: EconomyIndicator[] = [
        { label: 'S&P 500', value: spx ? fmt(spx.price, 0) : 'N/A', change: spx30d !== null ? fmtPct(spx30d) : undefined, changeType: changeType(spx30d ?? undefined) },
        { label: 'VIX', value: vix ? fmt(vix.price) : 'N/A', change: vix30d !== null ? fmtPct(vix30d) : undefined, changeType: 'neutral' },
        { label: 'Oil WTI', value: oil ? `$${fmt(oil.price)}` : 'N/A', change: oil30d !== null ? fmtPct(oil30d) : undefined, changeType: changeType(oil30d ?? undefined) },
      ]
      const dir = directionFromPct(spx30d ?? undefined)
      return {
        id: 'us',
        name: 'United States',
        emoji: '🇺🇸',
        indicators,
        summary: `US stocks are ${spx ? (spx.changePercent >= 0 ? 'up' : 'down') + ' today, with the S&P 500 at ' + fmt(spx.price, 0) : 'mixed today'}. The fear index (VIX) is at ${vix ? fmt(vix.price) : 'N/A'} — ${(vix?.price ?? 20) > 25 ? 'high, meaning many investors are worried' : 'low, meaning investors feel fairly calm'}. The US central bank (the Fed) and its interest rate decisions are still the biggest thing moving markets.`,
        direction: dir,
        status: statusFromDirection(dir),
        sparkline: spxSpark ?? undefined,
        sparklineGreen: (spx30d ?? 0) >= 0,
      }
    })(),

    // 3. Taiwan
    (() => {
      const taiex30d = pctChange30d(taiexSpark)
      const twd30d = pctChange30d(twdSpark)
      const indicators: EconomyIndicator[] = [
        { label: 'TAIEX', value: taiex ? fmt(taiex.price, 0) : 'N/A', change: taiex30d !== null ? fmtPct(taiex30d) : undefined, changeType: changeType(taiex30d ?? undefined) },
        { label: 'TWD/USD', value: twd ? fmt(twd.price) : 'N/A', change: twd30d !== null ? fmtPct(-(twd30d)) : undefined, changeType: changeType(twd30d !== null ? -(twd30d) : undefined) },
      ]
      const dir = directionFromPct(taiex30d ?? undefined)
      return {
        id: 'taiwan',
        name: 'Taiwan',
        emoji: '🇹🇼',
        indicators,
        summary: `Taiwan's stock market (TAIEX) is ${taiex ? (taiex.changePercent >= 0 ? 'up' : 'down') + ' ' + Math.abs(taiex.changePercent).toFixed(1) + '%' : 'data unavailable'} today. The Taiwan dollar is at ${twd ? fmt(twd.price) : 'N/A'} per US dollar — ${(twd?.changePercent ?? 0) > 0 ? 'it got weaker, which can help companies that export goods but also shows money leaving the country' : 'it held steady or got stronger, a sign of confidence in the region'}. Taiwan makes a huge share of the world's computer chips, so its market often moves with global tech demand.`,
        direction: dir,
        status: statusFromDirection(dir),
        sparkline: taiexSpark ?? undefined,
        sparklineGreen: (taiex30d ?? 0) >= 0,
      }
    })(),

    // 4. France
    (() => {
      const cac30d = pctChange30d(cacSpark)
      const eur30d = pctChange30d(eurSpark)
      const indicators: EconomyIndicator[] = [
        { label: 'CAC 40', value: cac ? fmt(cac.price, 0) : 'N/A', change: cac30d !== null ? fmtPct(cac30d) : undefined, changeType: changeType(cac30d ?? undefined) },
        { label: 'EUR/USD', value: eur ? fmt(eur.price, 4) : 'N/A', change: eur30d !== null ? fmtPct(eur30d) : undefined, changeType: changeType(eur30d ?? undefined) },
      ]
      const dir = directionFromPct(cac30d ?? undefined)
      return {
        id: 'france',
        name: 'France',
        emoji: '🇫🇷',
        indicators,
        summary: `France's main stock index (CAC 40) is at ${cac ? fmt(cac.price, 0) : 'N/A'}, ${cac ? (cac.changePercent >= 0 ? 'up' : 'down') + ' ' + Math.abs(cac.changePercent).toFixed(1) + '% today' : 'data unavailable'}. The euro is at ${eur ? fmt(eur.price, 4) : 'N/A'} per US dollar — ${(eur?.changePercent ?? 0) >= 0 ? 'holding steady as the European Central Bank takes a careful approach to cutting interest rates' : 'under some pressure as different EU countries have different economic situations'}. Defense and infrastructure spending across Europe is growing and supporting some French companies.`,
        direction: dir,
        status: statusFromDirection(dir),
        sparkline: cacSpark ?? undefined,
        sparklineGreen: (cac30d ?? 0) >= 0,
      }
    })(),

    // 5. Paraguay
    (() => {
      const pyg30d = pctChange30d(pygSpark)
      const indicators: EconomyIndicator[] = [
        { label: 'PYG/USD', value: pyg ? fmt(pyg.price, 0) : 'N/A', change: pyg30d !== null ? fmtPct(-(pyg30d)) : undefined, changeType: changeType(pyg30d !== null ? -(pyg30d) : undefined) },
      ]
      return {
        id: 'paraguay',
        name: 'Paraguay',
        emoji: '🇵🇾',
        indicators,
        summary: `Paraguay's guaraní is at ${pyg ? fmt(pyg.price, 0) : 'N/A'} per US dollar. Paraguay's economy is mostly based on farming exports like soy and beef, plus electricity from its giant Itaipú dam. Inflation is usually manageable. It is a smaller economy with limited live market data, but it is generally stable.`,
        direction: directionFromPct(pyg30d !== null ? -(pyg30d) : undefined),
        status: statusFromDirection(directionFromPct(pyg30d !== null ? -(pyg30d) : undefined)),
        sparkline: pygSpark ?? undefined,
        sparklineGreen: (pyg30d ?? 0) <= 0, // inverted: dollar down = green for Paraguay
      }
    })(),

    // 6. Tech Sector
    (() => {
      const ndx30d = pctChange30d(ndxSpark)
      const sox30d = pctChange30d(soxSpark)
      const vix30d = pctChange30d(vixSpark)
      const indicators: EconomyIndicator[] = [
        { label: 'Nasdaq 100', value: ndx ? fmt(ndx.price, 0) : 'N/A', change: ndx30d !== null ? fmtPct(ndx30d) : undefined, changeType: changeType(ndx30d ?? undefined) },
        { label: 'SOX (Semis)', value: sox ? fmt(sox.price, 0) : 'N/A', change: sox30d !== null ? fmtPct(sox30d) : undefined, changeType: changeType(sox30d ?? undefined) },
        { label: 'VIX', value: vix ? fmt(vix.price) : 'N/A', change: vix30d !== null ? fmtPct(vix30d) : undefined, changeType: vix30d !== null ? changeType(-vix30d) : 'neutral' },
      ]
      const dir = directionFromPct(ndx30d ?? sox30d ?? undefined)
      return {
        id: 'tech',
        name: 'Tech Sector',
        emoji: '💻',
        indicators,
        summary: `The Nasdaq 100 (big US tech stocks) is ${ndx ? (ndx.changePercent >= 0 ? 'up' : 'down') + ' ' + Math.abs(ndx.changePercent).toFixed(1) + '%' : 'data unavailable'} today. ${(sox?.changePercent ?? 0) >= 0 ? 'Chip companies are doing well' : 'Chip companies are under pressure'} — the semiconductor index (SOX) is at ${sox ? fmt(sox.price, 0) : 'N/A'}, which shows demand for chips from AI and cloud services. Tech stocks tend to fall when interest rates go up, so the US central bank's decisions matter a lot here.`,
        direction: dir,
        status: statusFromDirection(dir),
        sparkline: ndxSpark ?? undefined,
        sparklineGreen: (ndx30d ?? sox30d ?? 0) >= 0,
      }
    })(),

    // 7. ASUS
    (() => {
      const twdRate = twd?.price ?? null
      const asusUsd = asus && twdRate ? { price: asus.price / twdRate, changePercent: asus.changePercent } : null
      const asusSparkUsd = asusSpark && twdRate
        ? asusSpark.map((d) => ({ ...d, price: d.price / twdRate }))
        : asusSpark ?? null
      const asus30d = pctChange30d(asusSpark)
      const twd30d = pctChange30d(twdSpark)
      const indicators: EconomyIndicator[] = [
        { label: 'ASUS (2357.TW)', value: asusUsd ? `$${fmt(asusUsd.price, 2)}` : 'N/A', change: asus30d !== null ? fmtPct(asus30d) : undefined, changeType: changeType(asus30d ?? undefined) },
        { label: 'TWD/USD', value: twd ? fmt(twd.price) : 'N/A', change: twd30d !== null ? fmtPct(-(twd30d)) : undefined, changeType: changeType(twd30d !== null ? -(twd30d) : undefined) },
      ]
      const dir = directionFromPct(asus30d ?? undefined)
      return {
        id: 'asus',
        name: 'ASUS',
        emoji: '🖥️',
        indicators,
        summary: `ASUS (2357.TW) is at $${asusUsd ? fmt(asusUsd.price, 2) : 'N/A'} USD, ${asus ? (asus.changePercent >= 0 ? 'up' : 'down') + ' ' + Math.abs(asus.changePercent).toFixed(1) + '% today' : 'data unavailable'}. ASUS makes laptops, gaming gear, PC parts, and servers. The server and AI hardware part of the business is growing the fastest right now. The Taiwan dollar is at ${twd ? fmt(twd.price) : 'N/A'} per USD — when the TWD weakens, ASUS earns more in local currency on its US-dollar sales, which is good for profit margins.`,
        direction: dir,
        status: statusFromDirection(dir),
        sparkline: asusSparkUsd ?? undefined,
        sparklineGreen: (asus30d ?? 0) >= 0,
      }
    })(),
  ]

  const data: EconomiesData = {
    economies,
    updatedAt: new Date().toISOString(),
  }

  setCached('economies', data)

  if (lang !== 'en') {
    const translated = await translateEconomiesData(data, lang)
    setCached(`economies_${lang}`, translated)
    return NextResponse.json(translated)
  }
  return NextResponse.json(data)
}
