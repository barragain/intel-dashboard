'use client'

import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import { AlertTriangle, RefreshCw, KeyRound } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import NextRefresh from '@/components/ui/NextRefresh'
import Tooltip from '@/components/ui/Tooltip'
import TrendArrow from '@/components/ui/TrendArrow'
import type { AISectorData, AIStock, AIETF, VCXGauge, YTDItem, AIMomentum } from '@/lib/types'

// ─── Style maps (identical to EconomyPulse) ───────────────────────────────────

const STATUS_COLORS = {
  improving:    'text-trend-up border-risk-stable',
  stable:       'text-intel-muted border-intel-border',
  deteriorating:'text-trend-down border-risk-worried',
}
const DIR_LABEL = { improving: 'RISING', stable: 'FLAT', deteriorating: 'FALLING' } as const

// ─── Tooltip text ─────────────────────────────────────────────────────────────

const COMPANY_TIPS: Record<string, string> = {
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

const ETF_TIPS: Record<string, string> = {
  BOTZ: 'Tracks companies in robotics and AI automation, including industrial robots, autonomous vehicles, and factory automation. More industrial, less software.',
  AIQ: 'Tracks companies developing and using AI — cloud providers, chip makers, software platforms. Broad AI exposure across the value chain.',
  ARKQ: 'Cathie Wood\'s ARK ETF focused on autonomous technology and robotics. Higher risk and reward — heavier in smaller, emerging companies than BOTZ or AIQ.',
}

const YTD_TIPS: Record<string, string> = {
  'AI Index (AIQ)': 'Year-to-date return for AIQ ETF — used as a proxy for the AI sector\'s performance since January 1st of this year.',
  'S&P 500': 'The S&P 500 tracks the 500 biggest US companies. It is the global benchmark for equity market health.',
  'Nasdaq': 'The Nasdaq is heavier in tech and growth stocks. More sensitive to interest rates and AI expectations than the broader S&P 500.',
  'MSCI World': 'MSCI World covers large and mid-cap stocks across 23 developed countries. A benchmark for global diversified equity performance.',
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  if (!n) return '—'
  return n >= 1000 ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '$' + n.toFixed(2)
}
function fmtPct(n: number): string { return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` }
function direction(c: number): 'improving' | 'stable' | 'deteriorating' {
  return c > 0.3 ? 'improving' : c < -0.3 ? 'deteriorating' : 'stable'
}

// ─── Sparkline (Recharts AreaChart — matches EconomyPulse style exactly) ──────

function StockSparkline({ data, color, id }: { data: number[]; color: string; id: string }) {
  if (data.length < 2) return null
  const pts = data.map((price) => ({ price }))
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={pts} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <RechartsTooltip
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null
            return (
              <div className="bg-intel-elevated border border-intel-border rounded px-2 py-1 text-[10px] font-mono">
                <div style={{ color }} className="font-bold">{fmtPrice(payload[0].value)}</div>
              </div>
            )
          }}
        />
        <Area type="monotone" dataKey="price" stroke={color} strokeWidth={1.5} fill={`url(#spark-${id})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Stock Card ───────────────────────────────────────────────────────────────

function StockCard({ stock }: { stock: AIStock }) {
  const dir = direction(stock.change30d)
  const sparkColor = stock.change30d >= 0 ? '#4ADE80' : '#F87171'
  const tip = COMPANY_TIPS[stock.ticker] ?? stock.name

  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border flex flex-col">
      <Tooltip text={tip} width="lg" position="bottom" align="left" display="block">
        <div className="w-full px-4 py-3 border-b border-intel-border flex items-center justify-between cursor-default hover:bg-intel-elevated/60 transition-colors rounded-t-lg">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-mono font-bold text-intel-gold tracking-wider flex-shrink-0">{stock.ticker}</span>
            <span className="text-[12px] font-sans text-intel-muted truncate">{stock.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className={`text-[12px] font-mono uppercase border rounded px-1.5 py-0.5 ${STATUS_COLORS[dir]}`}>{DIR_LABEL[dir]}</span>
            <TrendArrow direction={dir} size={13} />
          </div>
        </div>
      </Tooltip>

      <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 border-b border-intel-border">
        <div className="flex flex-col">
          <Tooltip text="Current market price at last trade." width="sm" position="top" align="left">
            <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wide underline decoration-dotted decoration-intel-dim underline-offset-2 cursor-help">Price</span>
          </Tooltip>
          <span className="text-sm font-mono font-semibold text-intel-text tabular-nums mt-0.5">{fmtPrice(stock.price)}</span>
        </div>
        <div className="flex flex-col">
          <Tooltip text="Price change over the past 30 trading days." width="md" position="top" align="left">
            <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wide underline decoration-dotted decoration-intel-dim underline-offset-2 cursor-help">30D Change</span>
          </Tooltip>
          <span className={`text-sm font-mono font-semibold tabular-nums mt-0.5 ${stock.change30d >= 0 ? 'text-trend-up' : 'text-trend-down'}`}>
            {fmtPct(stock.change30d)}
          </span>
        </div>
      </div>

      {stock.sparkline30d.length > 1 && (
        <div className="px-4 pt-3 pb-1 border-b border-intel-border">
          <span className="text-[11px] font-mono text-intel-muted uppercase tracking-wider block mb-1">30-day chart</span>
          <StockSparkline data={stock.sparkline30d} color={sparkColor} id={stock.ticker.toLowerCase()} />
        </div>
      )}

      <div className="px-4 py-3 flex-1">
        <p className="text-sm text-intel-secondary leading-relaxed">{tip}</p>
      </div>
    </div>
  )
}

// ─── ETF Card ─────────────────────────────────────────────────────────────────

function ETFCard({ etf }: { etf: AIETF }) {
  const dir = direction(etf.change30d)
  const sparkColor = etf.change30d >= 0 ? '#4ADE80' : '#F87171'
  const tip = ETF_TIPS[etf.ticker] ?? etf.name

  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border flex flex-col">
      <Tooltip text={tip} width="lg" position="bottom" align="left" display="block">
        <div className="w-full px-4 py-3 border-b border-intel-border flex items-center justify-between cursor-default hover:bg-intel-elevated/60 transition-colors rounded-t-lg">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-mono font-bold text-intel-gold tracking-wider">{etf.ticker}</span>
            <span className="text-[12px] font-sans text-intel-muted truncate hidden sm:block">{etf.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[12px] font-mono uppercase border rounded px-1.5 py-0.5 ${STATUS_COLORS[dir]}`}>{DIR_LABEL[dir]}</span>
            <TrendArrow direction={dir} size={13} />
          </div>
        </div>
      </Tooltip>

      <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 border-b border-intel-border">
        <div className="flex flex-col">
          <Tooltip text="Current ETF market price." width="sm" position="top" align="left">
            <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wide underline decoration-dotted decoration-intel-dim underline-offset-2 cursor-help">Price</span>
          </Tooltip>
          <span className="text-sm font-mono font-semibold text-intel-text tabular-nums mt-0.5">{fmtPrice(etf.price)}</span>
        </div>
        <div className="flex flex-col">
          <Tooltip text="Total ETF return over the past 30 trading days." width="md" position="top" align="left">
            <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wide underline decoration-dotted decoration-intel-dim underline-offset-2 cursor-help">30D Change</span>
          </Tooltip>
          <span className={`text-sm font-mono font-semibold tabular-nums mt-0.5 ${etf.change30d >= 0 ? 'text-trend-up' : 'text-trend-down'}`}>
            {fmtPct(etf.change30d)}
          </span>
        </div>
      </div>

      {etf.sparkline30d.length > 1 && (
        <div className="px-4 pt-3 pb-1 border-b border-intel-border">
          <span className="text-[11px] font-mono text-intel-muted uppercase tracking-wider block mb-1">30-day chart</span>
          <StockSparkline data={etf.sparkline30d} color={sparkColor} id={etf.ticker.toLowerCase()} />
        </div>
      )}

      <div className="px-4 py-3 flex-1">
        <p className="text-sm text-intel-secondary leading-relaxed">{tip}</p>
      </div>
    </div>
  )
}

// ─── VCX Hype Gauge ───────────────────────────────────────────────────────────

function VCXBlock({ gauge }: { gauge: VCXGauge }) {
  const fillPct = Math.min(Math.max(gauge.premium, 0) / 1500, 1) * 100
  const fillColor = gauge.premium < 200 ? '#22C55E' : gauge.premium < 500 ? '#F59E0B' : '#EF4444'

  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border flex flex-col">
      <div className="px-4 py-3 border-b border-intel-border flex items-center justify-between">
        <span className="text-sm font-display font-semibold text-intel-text">VCX — AI Hype Gauge</span>
        <span className="text-[13px] font-mono text-intel-muted">Fundrise Innovation Fund</span>
      </div>

      <div className="px-4 py-4 border-b border-intel-border">
        <div className="flex items-baseline gap-3 mb-3">
          <Tooltip text="Premium = how much more VCX trades above its stated NAV (net asset value). A very high premium means retail investors are paying far above what the fund's holdings are actually worth — a classic sign of speculative hype around AI." width="lg" position="top" align="left">
            <span className="text-3xl font-mono font-black tabular-nums leading-none cursor-help" style={{ color: fillColor }}>
              {gauge.premium > 0 ? gauge.premium.toFixed(0) : '—'}%
            </span>
          </Tooltip>
          <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wider">premium to NAV</span>
        </div>
        <div className="h-3 bg-intel-bg rounded-full border border-intel-border overflow-hidden mb-1.5">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${fillPct}%`, backgroundColor: fillColor }} />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-intel-dim">
          <span>0%</span><span>500%</span><span>1000%</span><span>1500%</span>
        </div>
      </div>

      <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 border-b border-intel-border">
        <div className="flex flex-col">
          <Tooltip text="Current market price of VCX shares on the NYSE." width="md" position="top" align="left">
            <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wide underline decoration-dotted decoration-intel-dim underline-offset-2 cursor-help">Market Price</span>
          </Tooltip>
          <span className="text-sm font-mono font-semibold text-intel-text tabular-nums mt-0.5">{fmtPrice(gauge.price)}</span>
        </div>
        <div className="flex flex-col">
          <Tooltip text="Most recently published NAV — the estimated value of the fund's actual holdings (OpenAI, Anthropic, SpaceX, Databricks) per share." width="lg" position="top" align="left">
            <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wide underline decoration-dotted decoration-intel-dim underline-offset-2 cursor-help">Last NAV</span>
          </Tooltip>
          <span className="text-sm font-mono font-semibold text-intel-text tabular-nums mt-0.5">{gauge.nav > 0 ? fmtPrice(gauge.nav) : '—'}</span>
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="text-sm text-intel-secondary leading-relaxed">
          {gauge.interpretation || 'VCX holds pre-IPO stakes in OpenAI, Anthropic, SpaceX, and Databricks. The gap between market price and NAV shows how much investors are willing to pay above the fund\'s stated value — a direct measure of AI market hype.'}
        </p>
        <p className="text-[11px] text-intel-dim mt-2 italic">Sentiment indicator only. Not investment advice.</p>
      </div>
    </div>
  )
}

// ─── YTD Chart ────────────────────────────────────────────────────────────────

function YTDChart({ items }: { items: YTDItem[] }) {
  const maxAbs = Math.max(...items.map((i) => Math.abs(i.value)), 0.1)
  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border flex flex-col">
      <div className="px-4 py-3 border-b border-intel-border">
        <span className="text-sm font-display font-semibold text-intel-text">AI Sector vs Market — YTD</span>
      </div>
      <div className="px-4 py-4 space-y-3 flex-1 border-b border-intel-border">
        {items.map((item) => {
          const pos = item.value >= 0
          return (
            <div key={item.label} className="flex items-center gap-3">
              <Tooltip text={YTD_TIPS[item.label] ?? item.label} width="md" position="top" align="left">
                <span className="text-[13px] font-mono text-intel-muted w-32 flex-shrink-0 truncate underline decoration-dotted decoration-intel-dim underline-offset-2 cursor-help">{item.label}</span>
              </Tooltip>
              <div className="flex-1 h-5 bg-intel-bg rounded overflow-hidden border border-intel-border/50">
                <div className="h-full rounded transition-all duration-700" style={{ width: `${(Math.abs(item.value) / maxAbs) * 100}%`, backgroundColor: pos ? '#4ADE80' : '#F87171', opacity: 0.8 }} />
              </div>
              <span className={`text-[13px] font-mono font-semibold tabular-nums w-14 text-right ${pos ? 'text-trend-up' : 'text-trend-down'}`}>{fmtPct(item.value)}</span>
            </div>
          )
        })}
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-intel-secondary leading-relaxed">
          When the AI index runs far ahead of the S&P 500 and MSCI World, it means investors are paying a premium for AI exposure. That gap can shrink fast if earnings disappoint.
        </p>
      </div>
    </div>
  )
}

// ─── Momentum Gauge ───────────────────────────────────────────────────────────

function MomentumBlock({ momentum }: { momentum: AIMomentum }) {
  const cx = 80, cy = 76, r = 58, nl = 46
  const score = Math.max(0, Math.min(100, momentum.score))
  const rad = ((180 - score * 1.8) * Math.PI) / 180
  const nx = cx + nl * Math.cos(rad), ny = cy - nl * Math.sin(rad)
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const scoreColor = score >= 70 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444'

  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border flex flex-col">
      <div className="px-4 py-3 border-b border-intel-border flex items-center justify-between">
        <span className="text-sm font-display font-semibold text-intel-text">Sector Momentum</span>
        <span className="text-[13px] font-mono text-intel-gold">{momentum.label}</span>
      </div>

      <div className="px-4 py-4 flex flex-col lg:flex-row gap-6 border-b border-intel-border">
        <div className="flex-shrink-0 flex flex-col items-center">
          <Tooltip text="Momentum score 0–100. 0 = extreme pessimism, 100 = extreme bullishness. Based on AI sector earnings trends, analyst sentiment, and recent price action." width="lg" position="top" align="left">
            <svg width="160" height="100" viewBox="0 0 160 100" className="cursor-help">
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#22C55E" />
                </linearGradient>
              </defs>
              <path d={arc} stroke="#27272A" strokeWidth="10" fill="none" strokeLinecap="round" />
              <path d={arc} stroke="url(#gaugeGrad)" strokeWidth="8" fill="none" strokeLinecap="round" />
              <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#F4F4F5" strokeWidth="2" strokeLinecap="round" />
              <circle cx={cx} cy={cy} r="4" fill="#F4F4F5" />
              <text x={cx} y={cy + 16} textAnchor="middle" fill={scoreColor} fontSize="14" fontFamily="monospace" fontWeight="bold">{score}</text>
              <text x={cx - r + 2} y={cy + 14} fill="#EF4444" fontSize="8" fontFamily="monospace">0</text>
              <text x={cx + r - 10} y={cy + 14} fill="#22C55E" fontSize="8" fontFamily="monospace">100</text>
            </svg>
          </Tooltip>
        </div>
        <div className="flex-1">
          {momentum.summary && <p className="text-sm text-intel-secondary leading-relaxed">{momentum.summary}</p>}
        </div>
      </div>

      {momentum.personal_angle && (
        <div className="px-4 py-3">
          <div className="bg-intel-bg rounded-lg border border-intel-gold/20 px-4 py-3">
            <span className="text-[13px] font-mono text-intel-gold uppercase tracking-wider block mb-1.5">WHAT THIS MEANS FOR YOU</span>
            <p className="text-sm text-intel-secondary leading-relaxed">{momentum.personal_angle}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Loading Skeleton (matches EconomyPulse skeleton style) ───────────────────

function LoadSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-intel-elevated rounded-lg border border-intel-border h-52 shimmer" aria-hidden="true" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-intel-elevated rounded-lg border border-intel-border h-52 shimmer" aria-hidden="true" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-intel-elevated rounded-lg border border-intel-border h-44 shimmer" aria-hidden="true" />)}
      </div>
      <div className="bg-intel-elevated rounded-lg border border-intel-border h-40 shimmer" aria-hidden="true" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-intel-elevated rounded-lg border border-intel-border h-52 shimmer" aria-hidden="true" />
        <div className="bg-intel-elevated rounded-lg border border-intel-border h-52 shimmer" aria-hidden="true" />
      </div>
      <div className="bg-intel-elevated rounded-lg border border-intel-border h-52 shimmer" aria-hidden="true" />
    </div>
  )
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export default function AISector() {
  const { language } = useLanguage()
  const [data, setData] = useState<AISectorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsApiKey, setNeedsApiKey] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNeedsApiKey(false)
    try {
      const res = await fetch(`/api/ai-sector?lang=${language}`)
      const json = await res.json()
      if (!res.ok) {
        if (json.needsApiKey) { setNeedsApiKey(true); setError('Gemini API key required') }
        else if (json.rateLimited) { setError('Rate limited — try again later') }
        else setError(json.error ?? 'Failed to load')
        return
      }
      setData(json as AISectorData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section aria-labelledby="ai-sector-title">
      <div className="bg-intel-surface border border-intel-border rounded-xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-intel-border flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-intel-text" id="ai-sector-title">AI SECTOR</h2>
            <p className="text-sm text-intel-muted mt-0.5">AI stocks, ETFs, VCX hype gauge &amp; sector momentum</p>
          </div>
          <div className="flex items-center gap-3">
            <NextRefresh />
            {data && (
              <span className="text-[13px] font-mono text-intel-dim" title={new Date(data.updatedAt).toLocaleString()}>
                {new Date(data.updatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {loading && <LoadSkeleton />}

          {!loading && error && (
            <div className="flex flex-col items-center py-10 gap-3">
              {needsApiKey ? (
                <>
                  <KeyRound size={20} className="text-intel-gold" />
                  <p className="text-sm font-medium text-intel-text">Gemini API key required</p>
                  <p className="text-sm text-intel-muted max-w-sm">Set GEMINI_API_KEY in your environment variables.</p>
                </>
              ) : (
                <>
                  <AlertTriangle size={18} className="text-risk-worried" />
                  <p className="text-sm text-intel-muted">{error}</p>
                  <button onClick={load} className="flex items-center gap-2 text-sm font-mono text-intel-gold border border-intel-gold/30 px-3 py-1.5 rounded hover:bg-intel-gold/10 transition-colors">
                    <RefreshCw size={12} /> Retry
                  </button>
                </>
              )}
            </div>
          )}

          {!loading && data && (
            <div className="space-y-4 animate-in">
              <div className="space-y-4">
                <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em]">Hyperscalers</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {data.stocks.hyperscalers.map((s) => <StockCard key={s.ticker} stock={s} />)}
                </div>
                <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em] pt-1">Infrastructure</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {data.stocks.infrastructure.map((s) => <StockCard key={s.ticker} stock={s} />)}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em]">AI ETFs</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {data.etfs.map((e) => <ETFCard key={e.ticker} etf={e} />)}
                </div>
              </div>

              <VCXBlock gauge={data.vcxGauge} />

              <YTDChart items={data.ytdComparison} />

              <MomentumBlock momentum={data.momentum} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
