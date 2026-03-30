import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { unstable_cache } from 'next/cache'
import { searchAndAnalyze, parseJson } from '@/lib/gemini'
import { getCached, setCached } from '@/lib/cache'
import { getAISlot } from '@/lib/aiSlot'
import { getLang } from '@/lib/lang'
import { translateAISectorData } from '@/lib/translate'
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

const STOCK_DESCRIPTIONS: Record<string, string> = {
  MSFT: 'Microsoft is one of the largest AI investors. Azure cloud and Copilot AI products drive most of its growth. Spending $14B+ per quarter building AI data centers.',
  GOOGL: 'Alphabet runs Search, YouTube, and Google Cloud. Gemini AI is their main product. One of the biggest buyers of AI chips and data center capacity globally.',
  META: 'Meta owns Facebook, Instagram, and WhatsApp. Revenue is 97% advertising — AI improves ad targeting. Also spending heavily on open-source Llama models.',
  ORCL: 'Oracle runs enterprise databases and cloud infrastructure. Winning large AI training contracts, with hyperscalers and NVIDIA renting Oracle cloud capacity.',
  NVDA: 'NVIDIA makes the GPUs that power almost all AI training and inference. Every hyperscaler spends billions on NVIDIA chips per quarter. No close competitor yet.',
  AVGO: "Broadcom makes networking chips and custom AI accelerators (Google's TPUs). Second-biggest AI chip beneficiary after NVIDIA across data center infrastructure.",
  MU: 'Micron makes DRAM and flash memory. High-bandwidth memory (HBM) for AI chips is its fastest-growing segment — NVIDIA H100 and B200 both use Micron HBM.',
  TSM: "TSMC makes virtually all the world's most advanced chips — NVIDIA H100, Apple M-series, AMD GPUs. A direct proxy for global AI chip demand and tech health.",
  VRT: 'Vertiv makes power and cooling systems for data centers. AI chips run very hot and need enormous power — NVIDIA actively recommends Vertiv products.',
}

const ETF_NAMES: Record<string, string> = {
  BOTZ: 'Global X Robotics & AI ETF',
  AIQ: 'Global X Artificial Intelligence ETF',
  ARKQ: 'ARK Autonomous Technology & Robotics ETF',
}

const ETF_DESCRIPTIONS: Record<string, string> = {
  BOTZ: 'Tracks companies in robotics and AI automation, including industrial robots, autonomous vehicles, and factory automation. More industrial, less software.',
  AIQ: 'Tracks companies developing and using AI — cloud providers, chip makers, software platforms. Broad AI exposure across the value chain.',
  ARKQ: "Cathie Wood's ARK ETF focused on autonomous technology and robotics. Higher risk and reward — heavier in smaller, emerging companies than BOTZ or AIQ.",
}

interface YFData {
  price: number
  change30d: number
  sparkline: number[]
}

async function fetchYF(symbol: string): Promise<YFData | null> {
  try {
    const res = await fetch(
      `${YF_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=1mo`,
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
    const firstClose = closes[0] ?? price
    const lastClose = closes[closes.length - 1] ?? price
    const change30d = firstClose ? ((lastClose - firstClose) / firstClose) * 100 : 0
    return { price, change30d, sparkline: closes }
  } catch {
    return null
  }
}

const PROMPT = `Today is {{DATE}}.

Search the web for:
1. The most recently published NAV (net asset value) per share for VCX (Fundrise Innovation Fund, NYSE: VCX). Exact dollar figure from official sources.
2. Current AI sector momentum: score 0-100 (100=extreme bull), one short label phrase, 2-3 sentence market summary, 2-3 sentence personal angle (see rules below).
3. One blunt sentence about what VCX's current premium above NAV signals about AI market sentiment. If trading 1000%+ above NAV, say that plainly.

PERSONAL ANGLE RULES:
- The user works at TTC, a video/photo production agency in Taiwan that creates content for tech and consumer brands.
- His partner works in PR for Asus across multiple Asian markets — so Asus product launches, marketing campaigns, and stock performance are directly relevant.
- Be specific: if AI chip stocks are surging, say what that means for Asus's AI PC/laptop product line and whether PR/marketing budgets for those products are likely to grow or shrink.
- If AI companies are cutting costs, say whether that affects the kind of content briefs TTC might receive from tech clients.
- Use what you found in the search. Do not invent. If nothing specific is known, say what the current AI sentiment suggests about tech brand spending.
- Never use jargon. Short sentences.

Return ONLY valid JSON — no prose, no markdown fences:
{
  "vcxNav": <number>,
  "vcxInterpretation": "<1 blunt sentence>",
  "ytd": {"AIQ": <pct>, "SP500": <pct>, "Nasdaq": <pct>, "MSCIWorld": <pct>},
  "momentum": {"score":<0-100>,"label":"<short phrase>","summary":"<2-3 sentences>","personal_angle":"<2-3 sentences>"}
}`

type GeminiResponse = {
  vcxNav?: number
  vcxInterpretation?: string
  ytd: { AIQ: number; SP500: number; Nasdaq: number; MSCIWorld: number }
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
    return { ticker, name: STOCK_NAMES[ticker], description: STOCK_DESCRIPTIONS[ticker] ?? '', price: d?.price ?? 0, change30d: d?.change30d ?? 0, sparkline30d: d?.sparkline ?? [] }
  })

  const infrastructure: AIStock[] = ['NVDA', 'AVGO', 'MU', 'TSM', 'VRT'].map((ticker, i) => {
    const d = stockResults[i + 4]
    return { ticker, name: STOCK_NAMES[ticker], description: STOCK_DESCRIPTIONS[ticker] ?? '', price: d?.price ?? 0, change30d: d?.change30d ?? 0, sparkline30d: d?.sparkline ?? [] }
  })

  const etfs: AIETF[] = etfSymbols.map((ticker, i) => {
    const d = etfResults[i]
    return { ticker, name: ETF_NAMES[ticker], description: ETF_DESCRIPTIONS[ticker] ?? '', price: d?.price ?? 0, change30d: d?.change30d ?? 0, sparkline30d: d?.sparkline ?? [] }
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

export async function GET(request: NextRequest) {
  const lang = getLang(request)

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY_MISSING', needsApiKey: true }, { status: 503 })
  }

  try {
    const enData = await fetchAISectorData(getAISlot())

    if (lang === 'en') return NextResponse.json(enData)

    const cacheKey = `ai-sector_${lang}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)

    const translated = await translateAISectorData(enData, lang)
    setCached(cacheKey, translated)
    return NextResponse.json(translated)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg === 'GEMINI_API_KEY_MISSING') return NextResponse.json({ error: msg, needsApiKey: true }, { status: 503 })
    if (msg === 'RATE_LIMIT_EXCEEDED') return NextResponse.json({ error: msg, rateLimited: true }, { status: 429 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
