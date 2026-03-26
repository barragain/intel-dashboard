'use client'

import { useState, useCallback, useEffect } from 'react'
import { AlertTriangle, RefreshCw, KeyRound } from 'lucide-react'
import NextRefresh from '@/components/ui/NextRefresh'
import type { AISectorData, AIStock, AIETF, VCXGauge, YTDItem, CapexQuarter, AIMomentum } from '@/lib/types'

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  if (!n) return '—'
  return n >= 1000
    ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : '$' + n.toFixed(2)
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function changeColor(n: number): string {
  return n >= 0 ? 'text-trend-up' : 'text-trend-down'
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return <span className="text-intel-dim text-xs font-mono">—</span>
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const W = 60, H = 22
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * W).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`)
    .join(' ')
  // Use trend.up / trend.down to match the design system
  const stroke = positive ? '#4ADE80' : '#F87171'
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ─── Stock Card ───────────────────────────────────────────────────────────────

function StockCard({ stock }: { stock: AIStock }) {
  const pos = stock.change1d >= 0
  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border p-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-intel-gold tracking-wider">{stock.ticker}</span>
        <span className={`text-xs font-mono font-bold tabular-nums ${changeColor(stock.change1d)}`}>
          {fmtPct(stock.change1d)}
        </span>
      </div>
      <div className="text-[11px] text-intel-muted leading-tight truncate">{stock.name}</div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-sm font-mono font-bold tabular-nums text-intel-text">{fmtPrice(stock.price)}</span>
        <Sparkline data={stock.sparkline7d} positive={pos} />
      </div>
    </div>
  )
}

// ─── ETF Card ─────────────────────────────────────────────────────────────────

function ETFCard({ etf }: { etf: AIETF }) {
  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono font-bold text-intel-gold tracking-wider">{etf.ticker}</span>
        <span className={`text-xs font-mono font-bold tabular-nums ${changeColor(etf.change7d)}`}>
          {fmtPct(etf.change7d)} 7d
        </span>
      </div>
      <div className="text-[11px] text-intel-muted mb-2 leading-tight">{etf.name}</div>
      <span className="text-sm font-mono font-bold tabular-nums text-intel-text">{fmtPrice(etf.price)}</span>
    </div>
  )
}

// ─── VCX Hype Gauge ───────────────────────────────────────────────────────────

function VCXBlock({ gauge }: { gauge: VCXGauge }) {
  const fillPct = Math.min(Math.max(gauge.premium, 0) / 1500, 1) * 100
  // risk.stable / risk.watch / risk.worried to match design system
  const fillColor = gauge.premium < 200 ? '#22C55E' : gauge.premium < 500 ? '#F59E0B' : '#EF4444'
  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border p-4">
      <div className="flex flex-col lg:flex-row lg:items-start gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-4xl font-mono font-black tabular-nums leading-none" style={{ color: fillColor }}>
              {gauge.premium > 0 ? gauge.premium.toFixed(0) : '—'}%
            </span>
            <span className="text-[11px] font-mono text-intel-muted uppercase tracking-wider">premium to NAV</span>
          </div>
          <div className="h-3 bg-intel-bg rounded-full border border-intel-border overflow-hidden mb-1.5">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${fillPct}%`, backgroundColor: fillColor }} />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-intel-dim mb-3">
            <span>0%</span><span>500%</span><span>1000%</span><span>1500%</span>
          </div>
          {gauge.interpretation && (
            <p className="text-xs text-intel-secondary italic leading-relaxed">{gauge.interpretation}</p>
          )}
        </div>
        <div className="lg:w-60 flex-shrink-0">
          <div className="text-sm font-mono font-bold text-intel-text mb-1.5">VCX — AI Hype Gauge</div>
          <p className="text-xs text-intel-muted leading-relaxed">
            Fundrise Innovation Fund trades {gauge.premium > 0 ? gauge.premium.toFixed(0) : '—'}% above NAV.
            Holds OpenAI, Anthropic, SpaceX, Databricks.
          </p>
          {gauge.nav > 0 && (
            <p className="text-[11px] text-intel-dim mt-2 font-mono">
              NAV {fmtPrice(gauge.nav)} · Price {fmtPrice(gauge.price)}
            </p>
          )}
          <p className="text-[10px] text-intel-dim mt-2 italic">Sentiment indicator only. Not investment advice.</p>
        </div>
      </div>
    </div>
  )
}

// ─── YTD Chart ────────────────────────────────────────────────────────────────

function YTDChart({ items }: { items: YTDItem[] }) {
  const maxAbs = Math.max(...items.map((i) => Math.abs(i.value)), 0.1)
  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const pos = item.value >= 0
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-xs font-mono text-intel-muted w-32 flex-shrink-0 truncate">{item.label}</span>
            <div className="flex-1 h-5 bg-intel-bg rounded overflow-hidden border border-intel-border/50">
              <div
                className="h-full rounded transition-all duration-700"
                style={{
                  width: `${(Math.abs(item.value) / maxAbs) * 100}%`,
                  backgroundColor: pos ? '#4ADE80' : '#F87171',
                  opacity: 0.8,
                }}
              />
            </div>
            <span className={`text-xs font-mono font-bold tabular-nums w-14 text-right ${changeColor(item.value)}`}>
              {fmtPct(item.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Capex Chart ──────────────────────────────────────────────────────────────

function CapexChart({ quarters }: { quarters: CapexQuarter[] }) {
  if (!quarters.length) return null
  const maxVal = Math.max(...quarters.flatMap((q) => [q.groupA, q.groupB]), 1)
  const chartH = 100, barW = 18, barGap = 4, groupPad = 16
  const groupW = barW * 2 + barGap + groupPad
  const svgW = quarters.length * groupW + 24
  const svgH = chartH + 36

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: svgW * 1.5, maxWidth: '100%' }}>
        {quarters.map((q, i) => {
          const x = 12 + i * groupW
          const aH = Math.max((q.groupA / maxVal) * chartH, 2)
          const bH = Math.max((q.groupB / maxVal) * chartH, 2)
          return (
            <g key={q.quarter}>
              {/* Group A — intel-gold tint for Microsoft+Alphabet */}
              <rect x={x} y={chartH - aH} width={barW} height={aH} fill="#C8A96E" rx="2" opacity="0.75" />
              <text x={x + barW / 2} y={chartH - aH - 4} textAnchor="middle" fill="#C8A96E" fontSize="7.5">{q.groupA.toFixed(0)}</text>
              {/* Group B — trend-up tint for Meta+Amazon */}
              <rect x={x + barW + barGap} y={chartH - bH} width={barW} height={bH} fill="#4ADE80" rx="2" opacity="0.6" />
              <text x={x + barW + barGap + barW / 2} y={chartH - bH - 4} textAnchor="middle" fill="#4ADE80" fontSize="7.5">{q.groupB.toFixed(0)}</text>
              <text x={x + barW + barGap / 2} y={chartH + 12} textAnchor="middle" fill="#71717A" fontSize="8">
                {q.quarter}{q.isEst ? '*' : ''}
              </text>
            </g>
          )
        })}
        <rect x={12} y={chartH + 22} width={8} height={6} fill="#C8A96E" rx="1" opacity="0.75" />
        <text x={24} y={chartH + 28} fill="#C8A96E" fontSize="8">MSFT+GOOGL ($B)</text>
        <rect x={104} y={chartH + 22} width={8} height={6} fill="#4ADE80" rx="1" opacity="0.6" />
        <text x={116} y={chartH + 28} fill="#4ADE80" fontSize="8">META+AMZN ($B)</text>
        {quarters.some((q) => q.isEst) && (
          <text x={svgW - 4} y={chartH + 28} textAnchor="end" fill="#71717A" fontSize="8">* est.</text>
        )}
      </svg>
    </div>
  )
}

// ─── Momentum Gauge ───────────────────────────────────────────────────────────

function MomentumBlock({ momentum }: { momentum: AIMomentum }) {
  const cx = 80, cy = 76, r = 58, needleLen = 46
  const score = Math.max(0, Math.min(100, momentum.score))
  const angleRad = ((180 - score * 1.8) * Math.PI) / 180
  const nx = cx + needleLen * Math.cos(angleRad)
  const ny = cy - needleLen * Math.sin(angleRad)
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`
  const scoreColor = score >= 70 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444'

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Gauge */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <svg width="160" height="90" viewBox="0 0 160 90">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
          </defs>
          <path d={arcPath} stroke="#27272A" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d={arcPath} stroke="url(#gaugeGrad)" strokeWidth="8" fill="none" strokeLinecap="round" />
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#F4F4F5" strokeWidth="2" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="4" fill="#F4F4F5" />
          <text x={cx} y={cy + 16} textAnchor="middle" fill={scoreColor} fontSize="14" fontFamily="monospace" fontWeight="bold">{score}</text>
          <text x={cx - r + 2} y={cy + 14} fill="#EF4444" fontSize="8" fontFamily="monospace">0</text>
          <text x={cx + r - 10} y={cy + 14} fill="#22C55E" fontSize="8" fontFamily="monospace">100</text>
        </svg>
        <div className="text-xs font-mono text-intel-gold text-center mt-1">{momentum.label}</div>
      </div>

      {/* Summary + Personal angle */}
      <div className="flex-1 space-y-3">
        {momentum.summary && (
          <p className="text-sm text-intel-secondary leading-relaxed">{momentum.summary}</p>
        )}
        {momentum.personal_angle && (
          <div className="bg-intel-elevated rounded-lg border border-intel-gold/20 px-4 py-3">
            <span className="text-[13px] font-mono text-intel-gold uppercase tracking-wider block mb-1.5">
              WHAT THIS MEANS FOR YOU
            </span>
            <p className="text-sm text-intel-secondary leading-relaxed">{momentum.personal_angle}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-lg shimmer" aria-hidden="true" />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-lg shimmer" aria-hidden="true" />)}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-lg shimmer" aria-hidden="true" />)}
      </div>
      <div className="h-24 rounded-lg shimmer" aria-hidden="true" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-32 rounded-lg shimmer" aria-hidden="true" />
        <div className="h-32 rounded-lg shimmer" aria-hidden="true" />
      </div>
      <div className="h-36 rounded-lg shimmer" aria-hidden="true" />
    </div>
  )
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export default function AISector() {
  const [data, setData] = useState<AISectorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsApiKey, setNeedsApiKey] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNeedsApiKey(false)
    try {
      const res = await fetch('/api/ai-sector')
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

  useEffect(() => {
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section aria-labelledby="ai-sector-title">
      <div className="bg-intel-surface border border-intel-border rounded-xl overflow-hidden">
        {/* Header — matches the same pattern as all other sections */}
        <div className="px-6 pt-6 pb-4 border-b border-intel-border flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-intel-text" id="ai-sector-title">
              AI SECTOR
            </h2>
            <p className="text-sm text-intel-muted mt-0.5">AI stocks, ETFs, capex trends &amp; sector momentum</p>
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

        <div className="p-6">
          {/* Loading */}
          {loading && <LoadSkeleton />}

          {/* Error */}
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

          {/* Loaded */}
          {!loading && data && (
            <div className="space-y-8 animate-in">

              {/* Block 1 — AI Stocks */}
              <div className="space-y-3">
                <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em]">Hyperscalers</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {data.stocks.hyperscalers.map((s) => <StockCard key={s.ticker} stock={s} />)}
                </div>
                <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em] mt-4">Infrastructure</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {data.stocks.infrastructure.map((s) => <StockCard key={s.ticker} stock={s} />)}
                </div>
              </div>

              {/* Block 2 — AI ETFs */}
              <div>
                <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em] mb-3">AI ETFs</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {data.etfs.map((e) => <ETFCard key={e.ticker} etf={e} />)}
                </div>
              </div>

              {/* Block 3 — VCX Hype Gauge */}
              <div>
                <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em] mb-3">AI Hype Gauge</h3>
                <VCXBlock gauge={data.vcxGauge} />
              </div>

              {/* Blocks 4 + 5 — YTD vs Market & Capex */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em] mb-3">AI Sector vs Market YTD</h3>
                  <YTDChart items={data.ytdComparison} />
                </div>
                <div>
                  <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em] mb-3">AI Capex — Last 5 Quarters ($B)</h3>
                  <CapexChart quarters={data.capexChart} />
                </div>
              </div>

              {/* Block 6 — Momentum Gauge + Summary */}
              <div>
                <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em] mb-4">Sector Momentum</h3>
                <MomentumBlock momentum={data.momentum} />
              </div>

            </div>
          )}
        </div>
      </div>
    </section>
  )
}
