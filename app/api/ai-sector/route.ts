import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { searchAndAnalyze, parseJson } from '@/lib/gemini'
import { getAISlot } from '@/lib/aiSlot'
import type { AISectorData, AIStock, AIETF } from '@/lib/types'

const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'
const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; INTEL-Dashboard/1.0)',
  Accept: 'application/json',
}

const STOCK_NAMES: Record<string, string> = {
  MSFT: 'Microsoft', GOOGL: 'Alphabet', META: 'Meta', ORCL: 'Oracle',
  NVDA: 'NVIDIA', AVGO: 'Broadcom', MU: 'Micron', TSM: 'TSMC', VRT: 'Vertiv',
}

const ETF_NAMES: Record<string, string> = {
  BOTZ: 'Global X Robotics & AI ETF',
  AIQ: 'Global X Artificial Intelligence ETF',
  ARKQ: 'ARK Autonomous Technology & Robotics ETF',
}

interface YFData {
  price: number
  change1d: number
  change7d: number
  sparkline: number[]
}

async function fetchYF(symbol: string): Promise<YFData | null> {
  try {
    const res = await fetch(
      `${YF_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=7d`,
      { headers: YF_HEADERS, next: { revalidate: 0 } },
    )
    if (!res.ok) return null
    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) return null
    const meta = result.meta
    const closes: number[] = (result?.indicators?.quote?.[0]?.close ?? []).filter(
      (c: number | null) => c !== null && isFinite(c),
    )
    const price: number = meta.regularMarketPrice ?? 0
    const prevClose: number = meta.previousClose ?? price
    const change1d = prevClose ? ((price - prevClose) / prevClose) * 100 : 0
    const firstClose = closes[0] ?? price
    const lastClose = closes[closes.length - 1] ?? price
    const change7d = firstClose ? ((lastClose - firstClose) / firstClose) * 100 : 0
    return { price, change1d, change7d, sparkline: closes }
  } catch {
    return null
  }
}

const PROMPT = `Today is {{DATE}}.

Search the web for:
1. The most recently published NAV (net asset value) per share for VCX (Fundrise Innovation Fund, NYSE: VCX). Exact dollar figure from official sources.
2. Year-to-date performance (%) as of today: AIQ ETF (AI sector proxy), S&P 500 index, Nasdaq Composite, MSCI World index.
3. Last 5 quarters of combined AI capex in $B from earnings reports: Group A = Microsoft + Alphabet, Group B = Meta + Amazon. Mark most recent as isEst:true if not fully reported.
4. Current AI sector momentum: score 0-100 (100=extreme bull), one short label phrase, 2-3 sentence market summary, 2-3 sentence personal angle for someone at a video/photo production agency in Taiwan whose partner works in PR for Asus across multiple Asian markets.
5. One blunt sentence about what VCX's current premium above NAV signals about AI market sentiment. If trading 1000%+ above NAV, say that plainly.

Return ONLY valid JSON — no prose, no markdown fences:
{
  "vcxNav": <number>,
  "vcxInterpretation": "<1 blunt sentence>",
  "ytd": {"AIQ": <pct>, "SP500": <pct>, "Nasdaq": <pct>, "MSCIWorld": <pct>},
  "capex": [{"quarter":"Q3 2024","groupA":<$B>,"groupB":<$B>,"isEst":false}, ...5 total],
  "momentum": {"score":<0-100>,"label":"<short phrase>","summary":"<2-3 sentences>","personal_angle":"<2-3 sentences>"}
}`

type GeminiResponse = {
  vcxNav?: number
  vcxInterpretation?: string
  ytd: { AIQ: number; SP500: number; Nasdaq: number; MSCIWorld: number }
  capex: Array<{ quarter: string; groupA: number; groupB: number; isEst?: boolean }>
  momentum: { score: number; label: string; summary: string; personal_angle: string }
}

async function generateAISectorData(): Promise<AISectorData> {
  const stockSymbols = ['MSFT', 'GOOGL', 'META', 'ORCL', 'NVDA', 'AVGO', 'MU', 'TSM', 'VRT']
  const etfSymbols = ['BOTZ', 'AIQ', 'ARKQ']

  const [stockResults, etfResults, vcxResult] = await Promise.all([
    Promise.all(stockSymbols.map(fetchYF)),
    Promise.all(etfSymbols.map(fetchYF)),
    fetchYF('VCX'),
  ])

  const hyperscalers: AIStock[] = ['MSFT', 'GOOGL', 'META', 'ORCL'].map((ticker, i) => {
    const d = stockResults[i]
    return { ticker, name: STOCK_NAMES[ticker], price: d?.price ?? 0, change1d: d?.change1d ?? 0, sparkline7d: d?.sparkline ?? [] }
  })

  const infrastructure: AIStock[] = ['NVDA', 'AVGO', 'MU', 'TSM', 'VRT'].map((ticker, i) => {
    const d = stockResults[i + 4]
    return { ticker, name: STOCK_NAMES[ticker], price: d?.price ?? 0, change1d: d?.change1d ?? 0, sparkline7d: d?.sparkline ?? [] }
  })

  const etfs: AIETF[] = etfSymbols.map((ticker, i) => {
    const d = etfResults[i]
    return { ticker, name: ETF_NAMES[ticker], price: d?.price ?? 0, change7d: d?.change7d ?? 0 }
  })

  const prompt = PROMPT.replace('{{DATE}}', new Date().toDateString())
  const geminiText = await searchAndAnalyze(prompt)
  const g = parseJson<GeminiResponse>(geminiText)

  const vcxNav = g.vcxNav ?? 0
  const vcxPrice = vcxResult?.price ?? 0
  const premium = vcxNav > 0 ? ((vcxPrice - vcxNav) / vcxNav) * 100 : 0

  return {
    stocks: { hyperscalers, infrastructure },
    etfs,
    vcxGauge: {
      price: vcxPrice,
      nav: vcxNav,
      premium,
      interpretation: g.vcxInterpretation ?? `VCX trades ${premium.toFixed(0)}% above its most recently published NAV.`,
    },
    ytdComparison: [
      { label: 'AI Index (AIQ)', value: g.ytd?.AIQ ?? 0 },
      { label: 'S&P 500', value: g.ytd?.SP500 ?? 0 },
      { label: 'Nasdaq', value: g.ytd?.Nasdaq ?? 0 },
      { label: 'MSCI World', value: g.ytd?.MSCIWorld ?? 0 },
    ],
    capexChart: g.capex ?? [],
    momentum: g.momentum ?? { score: 50, label: 'Neutral', summary: '', personal_angle: '' },
    updatedAt: new Date().toISOString(),
  }
}

// Slot-keyed cache: Gemini + YF data generated at most twice per day (9am/9pm Taiwan).
// Persists in Next.js data cache — survives Lambda cold starts on Vercel.
const fetchAISectorData = unstable_cache(
  (_slot: string) => generateAISectorData(),
  ['ai-sector-data'],
  { revalidate: false },
)

export async function GET() {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY_MISSING', needsApiKey: true }, { status: 503 })
  }

  try {
    return NextResponse.json(await fetchAISectorData(getAISlot()))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'GEMINI_API_KEY_MISSING') return NextResponse.json({ error: msg, needsApiKey: true }, { status: 503 })
    if (msg === 'RATE_LIMIT_EXCEEDED') return NextResponse.json({ error: msg, rateLimited: true }, { status: 429 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
