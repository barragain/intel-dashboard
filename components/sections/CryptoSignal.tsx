'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import type { CryptoData } from '@/lib/types'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import TrendArrow from '@/components/ui/TrendArrow'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import NextRefresh from '@/components/ui/NextRefresh'

const FG_CONFIG = [
  { max: 24, tKey: 'extremeFear' as const, color: 'text-risk-worried', bg: 'bg-risk-worried-bg border-risk-worried-border' },
  { max: 44, tKey: 'fear' as const, color: 'text-trend-down', bg: 'bg-risk-worried-bg border-risk-worried-border' },
  { max: 55, tKey: 'cryptoNeutral' as const, color: 'text-intel-muted', bg: 'bg-intel-elevated border-intel-border' },
  { max: 74, tKey: 'greed' as const, color: 'text-trend-up', bg: 'bg-risk-stable-bg border-risk-stable-border' },
  { max: 100, tKey: 'extremeGreed' as const, color: 'text-risk-stable', bg: 'bg-risk-stable-bg border-risk-stable-border' },
]

function getFgConfig(score: number) {
  return FG_CONFIG.find((c) => score <= c.max) ?? FG_CONFIG[FG_CONFIG.length - 1]
}

interface SparkPoint { value: number; timestamp: number }

function fgFillColor(value: number): string {
  if (value <= 24) return '#cd5c5c'
  if (value <= 44) return '#cd5c5c'
  if (value <= 55) return '#f0ad4e'
  if (value <= 74) return '#778c70'
  return '#778c70'
}

function FearGreedSparkline({ history, label }: { history: SparkPoint[]; label: string }) {
  if (!history || history.length === 0) return null

  // API returns newest-first — reverse to chronological order
  const data = [...history].reverse().map((d) => ({
    value: d.value,
    date: new Date(d.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const val = payload[0].value as number
    return (
      <div className="bg-intel-elevated border border-intel-border rounded px-2.5 py-1.5 text-[13px] font-mono">
        <div className="text-intel-muted">{label}</div>
        <div style={{ color: fgFillColor(val) }} className="font-bold">{val}/100</div>
      </div>
    )
  }

  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border p-3">
      <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wider block mb-2">
        {label}
      </span>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="fgGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#778c70" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#f0ad4e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#cd5c5c" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#6b6351', fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            interval={6}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#6b6351', fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={50} stroke="#bab19b" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#cd5c5c"
            strokeWidth={1.5}
            fill="url(#fgGradient)"
            dot={false}
            activeDot={{ r: 3, fill: '#cd5c5c', stroke: '#fdf5e6', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function fmtPrice(n: number): string {
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return '$' + n.toFixed(4)
}

function fmtBillions(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(0)}B`
  return `$${n.toLocaleString()}`
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export default function CryptoSignal() {
  const { t, language } = useLanguage()
  const [data, setData] = useState<CryptoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/crypto?lang=${language}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? t.error); return }
      setData(json as CryptoData)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  const fgCfg = data ? getFgConfig(data.fearGreedIndex) : null
  const fgLabel = fgCfg ? t[fgCfg.tKey] : ''

  return (
    <section aria-labelledby="crypto-title">
      <div className="bg-intel-surface border border-intel-border rounded-xl overflow-hidden h-full">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-intel-border">
          <h2 className="font-display font-bold text-xl text-intel-text" id="crypto-title">
            {t.section5Title}
          </h2>
          <p className="text-sm text-intel-muted mt-0.5">{t.section5Subtitle}</p>
        </div>

        <div className="p-6">
          {loading && (
            <div className="space-y-4">
              <div className="h-24 rounded-lg shimmer" aria-hidden="true" />
              <div className="h-16 rounded-lg shimmer" aria-hidden="true" />
              <div className="h-20 rounded-lg shimmer" aria-hidden="true" />
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center py-8 gap-3">
              <AlertTriangle size={18} className="text-risk-worried" />
              <p className="text-sm text-intel-muted">{error}</p>
              <button onClick={load} className="flex items-center gap-2 text-sm font-mono text-intel-gold border border-intel-gold/30 px-3 py-1.5 rounded hover:bg-intel-gold/10 transition-colors">
                <RefreshCw size={12} /> {t.retry}
              </button>
            </div>
          )}

          {!loading && data && fgCfg && (
            <div className="space-y-4 animate-in">
              {/* Crypto assets */}
              <div className="grid grid-cols-2 gap-3">
                {data.assets.map((asset) => {
                  const color = asset.priceChange7d >= 0 ? '#778c70' : '#cd5c5c'
                  const rawSpark = asset.sparkline ? asset.sparkline.filter(Boolean) : null
                  const now = Date.now()
                  const sparkData = rawSpark
                    ? rawSpark.map((v, i) => ({
                        v,
                        i,
                        date: new Date(now - (rawSpark.length - 1 - i) * 3600000)
                          .toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      }))
                    : null
                  return (
                    <div key={asset.id} className="bg-intel-elevated rounded-lg border border-intel-border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-mono font-bold text-intel-text">{asset.symbol}</span>
                        <TrendArrow direction={asset.priceChange24h >= 0 ? 'up' : 'down'} />
                      </div>
                      <div className="text-base font-mono font-bold text-intel-text tabular-nums">
                        {fmtPrice(asset.price)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[13px] font-mono ${asset.priceChange24h >= 0 ? 'text-trend-up' : 'text-trend-down'}`}>
                          {fmtPct(asset.priceChange24h)} {t.dayChange.split(' ').pop()}
                        </span>
                        <span className={`text-[13px] font-mono ${asset.priceChange7d >= 0 ? 'text-trend-up' : 'text-trend-down'}`}>
                          {fmtPct(asset.priceChange7d)} 7d
                        </span>
                      </div>
                      {sparkData && sparkData.length > 4 && (
                        <div className="mt-2 -mx-1">
                          <ResponsiveContainer width="100%" height={64}>
                            <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: -28, bottom: 0 }}>
                              <defs>
                                <linearGradient id={`spark-${asset.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                                  <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 9, fill: '#6b6351', fontFamily: 'monospace' }}
                                tickLine={false}
                                axisLine={false}
                                interval={Math.floor(sparkData.length / 4)}
                              />
                              <YAxis
                                tick={{ fontSize: 9, fill: '#6b6351', fontFamily: 'monospace' }}
                                tickLine={false}
                                axisLine={false}
                                domain={['auto', 'auto']}
                                tickFormatter={(v) => fmtPrice(v)}
                              />
                              <Area
                                type="monotone"
                                dataKey="v"
                                stroke={color}
                                strokeWidth={1.5}
                                fill={`url(#spark-${asset.id})`}
                                dot={false}
                                isAnimationActive={false}
                              />
                              <Tooltip
                                content={({ active, payload, label }: any) => {
                                  if (!active || !payload?.length) return null
                                  return (
                                    <div className="bg-intel-elevated border border-intel-border rounded px-2 py-1 text-[11px] font-mono">
                                      <div className="text-intel-muted">{label}</div>
                                      <div style={{ color }}>{fmtPrice(payload[0].value)}</div>
                                    </div>
                                  )
                                }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Market cap */}
              <div className="bg-intel-elevated rounded-lg border border-intel-border p-3 flex items-center justify-between">
                <div>
                  <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wider">{t.totalMarketCap}</span>
                  <div className="text-sm font-mono font-bold text-intel-text mt-0.5 tabular-nums">
                    {fmtBillions(data.totalMarketCap)}
                  </div>
                </div>
                <div className={`text-sm font-mono font-bold tabular-nums ${data.totalMarketCapChange24h >= 0 ? 'text-trend-up' : 'text-trend-down'}`}>
                  {fmtPct(data.totalMarketCapChange24h)}
                </div>
              </div>

              {/* Fear & Greed */}
              <div className={`rounded-lg border p-4 ${fgCfg.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wider">{t.fearGreed}</span>
                  <span className={`text-sm font-mono font-bold uppercase ${fgCfg.color}`}>{fgLabel}</span>
                </div>
                {/* Gauge bar */}
                <div className="relative h-2 bg-gradient-to-r from-risk-worried via-risk-watch to-risk-stable rounded-full mb-2">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-intel-text rounded-full border-2 border-intel-bg shadow-lg transition-all duration-700"
                    style={{ left: `calc(${data.fearGreedIndex}% - 6px)` }}
                  />
                </div>
                <div className="flex justify-between text-[13px] font-mono text-intel-dim">
                  <span>0</span>
                  <span className={`text-3xl font-black font-mono tabular-nums ${fgCfg.color}`}>{data.fearGreedIndex}</span>
                  <span>100</span>
                </div>
              </div>

              {/* Fear & Greed 30-day sparkline */}
              {data.fearGreedHistory && data.fearGreedHistory.length > 1 && (
                <FearGreedSparkline history={data.fearGreedHistory} label={t.thirtyDayHistory} />
              )}

              {/* Macro signal */}
              <div>
                <span className="text-[13px] font-mono text-intel-gold uppercase tracking-wider block mb-1.5">
                  {t.macroSignal}
                </span>
                <p className="text-[13px] font-mono text-intel-secondary leading-relaxed bg-intel-elevated rounded px-3 py-2 border border-intel-border">
                  {data.macroSignal}
                </p>
              </div>

              {/* Interpretation */}
              <div>
                <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wider block mb-1">
                  {t.cryptoInterpretation}
                </span>
                <p className="text-sm text-intel-secondary leading-relaxed">{data.interpretation}</p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <NextRefresh />
                <span className="text-[13px] font-mono text-intel-dim" title={new Date(data.updatedAt).toLocaleString()}>
                  {t.lastUpdated}: {new Date(data.updatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
