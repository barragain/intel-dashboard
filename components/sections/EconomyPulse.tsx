'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import type { EconomiesData, EconomyCard } from '@/lib/types'
import TrendArrow from '@/components/ui/TrendArrow'
import { AlertTriangle, RefreshCw } from 'lucide-react'

const STATUS_COLORS = {
  green: 'text-trend-up border-risk-stable',
  yellow: 'text-risk-watch border-risk-watch',
  red: 'text-trend-down border-risk-worried',
}

const CHANGE_COLORS = {
  positive: 'text-trend-up',
  negative: 'text-trend-down',
  neutral: 'text-intel-muted',
}

const DIR_TKEYS: Record<string, 'improving' | 'stable2' | 'deteriorating'> = {
  improving: 'improving',
  stable: 'stable2',
  deteriorating: 'deteriorating',
}

function EconomyCardComponent({ card, t }: { card: EconomyCard; t: ReturnType<typeof useLanguage>['t'] }) {
  const dirKey = DIR_TKEYS[card.direction]
  const dirLabel = dirKey ? t[dirKey] : card.direction
  const statusColor = STATUS_COLORS[card.status]

  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border flex flex-col">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-intel-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">{card.emoji}</span>
          <span className="text-sm font-display font-semibold text-intel-text">{card.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono uppercase border rounded px-1.5 py-0.5 ${statusColor}`}>
            {dirLabel}
          </span>
          <TrendArrow direction={card.direction} />
        </div>
      </div>

      {/* Indicators */}
      <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 border-b border-intel-border">
        {card.indicators.map((ind, i) => (
          <div key={i} className="flex flex-col">
            <span className="text-[10px] font-mono text-intel-muted uppercase tracking-wide">{ind.label}</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm font-mono font-semibold text-intel-text tabular-nums">
                {ind.value}
              </span>
              {ind.change && (
                <span className={`text-[11px] font-mono ${CHANGE_COLORS[ind.changeType ?? 'neutral']}`}>
                  {ind.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="px-4 py-3 flex-1">
        <p className="text-xs text-intel-secondary leading-relaxed">{card.summary}</p>
      </div>
    </div>
  )
}

export default function EconomyPulse() {
  const { t, language } = useLanguage()
  const [data, setData] = useState<EconomiesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/economies')
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? t.error)
        return
      }
      setData(json as EconomiesData)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Map economy IDs to translated names
  const nameMap: Record<string, string> = {
    global: t.econGlobal,
    us: t.econUS,
    taiwan: t.econTaiwan,
    france: t.econFrance,
    paraguay: t.econParaguay,
  }

  const economies = data?.economies?.map((e) => ({
    ...e,
    name: nameMap[e.id] ?? e.name,
  })) ?? []

  return (
    <section aria-labelledby="economy-title">
      <div className="bg-intel-surface border border-intel-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-intel-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-intel-gold" />
              <span className="text-[10px] font-mono text-intel-gold tracking-[0.2em] uppercase">
                Section 02
              </span>
            </div>
            <h2 className="font-display font-bold text-xl text-intel-text" id="economy-title">
              {t.section2Title}
            </h2>
            <p className="text-xs text-intel-muted mt-0.5">{t.section2Subtitle}</p>
          </div>
          {data && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-intel-dim">
                {new Date(data.updatedAt).toLocaleTimeString()}
              </span>
              <button onClick={load} className="text-intel-dim hover:text-intel-gold transition-colors" aria-label={t.retry}>
                <RefreshCw size={11} />
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-intel-elevated rounded-lg border border-intel-border h-48 shimmer" aria-hidden="true" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center py-10 gap-3">
              <AlertTriangle size={18} className="text-risk-worried" />
              <p className="text-sm text-intel-muted">{error}</p>
              <button onClick={load} className="flex items-center gap-2 text-xs font-mono text-intel-gold border border-intel-gold/30 px-3 py-1.5 rounded hover:bg-intel-gold/10 transition-colors">
                <RefreshCw size={12} /> {t.retry}
              </button>
            </div>
          )}

          {!loading && economies.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in">
              {economies.map((card) => (
                <EconomyCardComponent key={card.id} card={card} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
