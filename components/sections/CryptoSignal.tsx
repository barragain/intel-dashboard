'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import type { CryptoData } from '@/lib/types'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import TrendArrow from '@/components/ui/TrendArrow'

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
      const res = await fetch('/api/crypto')
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? t.error); return }
      setData(json as CryptoData)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fgCfg = data ? getFgConfig(data.fearGreedIndex) : null
  const fgLabel = fgCfg ? t[fgCfg.tKey] : ''

  return (
    <section aria-labelledby="crypto-title">
      <div className="bg-intel-surface border border-intel-border rounded-xl overflow-hidden h-full">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-intel-border">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-intel-gold" />
            <span className="text-[10px] font-mono text-intel-gold tracking-[0.2em] uppercase">Section 05</span>
          </div>
          <h2 className="font-display font-bold text-xl text-intel-text" id="crypto-title">
            {t.section5Title}
          </h2>
          <p className="text-xs text-intel-muted mt-0.5">{t.section5Subtitle}</p>
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
              <button onClick={load} className="flex items-center gap-2 text-xs font-mono text-intel-gold border border-intel-gold/30 px-3 py-1.5 rounded hover:bg-intel-gold/10 transition-colors">
                <RefreshCw size={12} /> {t.retry}
              </button>
            </div>
          )}

          {!loading && data && fgCfg && (
            <div className="space-y-4 animate-in">
              {/* Crypto assets */}
              <div className="grid grid-cols-2 gap-3">
                {data.assets.map((asset) => (
                  <div key={asset.id} className="bg-intel-elevated rounded-lg border border-intel-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-intel-text">{asset.symbol}</span>
                      <TrendArrow direction={asset.priceChange24h >= 0 ? 'up' : 'down'} />
                    </div>
                    <div className="text-base font-mono font-bold text-intel-text tabular-nums">
                      {fmtPrice(asset.price)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[11px] font-mono ${asset.priceChange24h >= 0 ? 'text-trend-up' : 'text-trend-down'}`}>
                        {fmtPct(asset.priceChange24h)} {t.dayChange.split(' ').pop()}
                      </span>
                      <span className={`text-[11px] font-mono ${asset.priceChange7d >= 0 ? 'text-trend-up' : 'text-trend-down'}`}>
                        {fmtPct(asset.priceChange7d)} 7d
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Market cap */}
              <div className="bg-intel-elevated rounded-lg border border-intel-border p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-intel-muted uppercase tracking-wider">{t.totalMarketCap}</span>
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
                  <span className="text-[10px] font-mono text-intel-muted uppercase tracking-wider">{t.fearGreed}</span>
                  <span className={`text-xs font-mono font-bold uppercase ${fgCfg.color}`}>{fgLabel}</span>
                </div>
                {/* Gauge bar */}
                <div className="relative h-2 bg-gradient-to-r from-risk-worried via-risk-watch to-risk-stable rounded-full mb-2">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-intel-text rounded-full border-2 border-intel-bg shadow-lg transition-all duration-700"
                    style={{ left: `calc(${data.fearGreedIndex}% - 6px)` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-intel-dim">
                  <span>0</span>
                  <span className={`text-3xl font-black font-mono tabular-nums ${fgCfg.color}`}>{data.fearGreedIndex}</span>
                  <span>100</span>
                </div>
              </div>

              {/* Macro signal */}
              <div>
                <span className="text-[10px] font-mono text-intel-gold uppercase tracking-wider block mb-1.5">
                  {t.macroSignal}
                </span>
                <p className="text-[11px] font-mono text-intel-secondary leading-relaxed bg-intel-elevated rounded px-3 py-2 border border-intel-border">
                  {data.macroSignal}
                </p>
              </div>

              {/* Interpretation */}
              <div>
                <span className="text-[10px] font-mono text-intel-muted uppercase tracking-wider block mb-1">
                  {t.cryptoInterpretation}
                </span>
                <p className="text-xs text-intel-secondary leading-relaxed">{data.interpretation}</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <span className="text-[11px] font-mono text-intel-dim">
                  {t.lastUpdated}: {new Date(data.updatedAt).toLocaleTimeString()}
                </span>
                <button onClick={load} className="text-intel-dim hover:text-intel-gold transition-colors" aria-label={t.retry}>
                  <RefreshCw size={11} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
