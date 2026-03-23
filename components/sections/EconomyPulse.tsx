'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import type { EconomiesData, EconomyCard } from '@/lib/types'
import TrendArrow from '@/components/ui/TrendArrow'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import Tooltip from '@/components/ui/Tooltip'

// Map economy IDs to ISO 3166-1 alpha-2 codes for flag-icons
const FLAG_ISO: Record<string, string> = {
  us: 'us',
  taiwan: 'tw',
  france: 'fr',
  paraguay: 'py',
}

function FlagIcon({ id }: { id: string }) {
  const code = FLAG_ISO[id]
  if (!code) {
    // Global / no country flag — render the globe emoji (renders fine on all platforms)
    return <span className="text-base leading-none" aria-hidden="true">🌐</span>
  }
  return (
    <span
      className={`fi fi-${code}`}
      style={{ width: '1.25em', height: '0.94em', display: 'inline-block', borderRadius: '2px' }}
      aria-hidden="true"
    />
  )
}

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

type T = ReturnType<typeof useLanguage>['t']

function getMetricTips(t: T): Record<string, string> {
  return {
    'VIX':       t.metricVIX,
    'DXY':       t.metricDXY,
    'S&P 500':   t.metricSP500,
    'Gold (oz)': t.metricGold,
    'Oil WTI':   t.metricOilWTI,
    'TAIEX':     t.metricTAIEX,
    'TWD/USD':   t.metricTWDUSD,
    'CAC 40':    t.metricCAC40,
    'EUR/USD':   t.metricEURUSD,
    'PYG/USD':   t.metricPYGUSD,
  }
}

// Extract the first sentence as a one-liner for the card hover tooltip
function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]+[.!?]/)
  return m ? m[0] : text
}

function EconomyCardComponent({ card, t }: { card: EconomyCard; t: T }) {
  const dirKey = DIR_TKEYS[card.direction]
  const dirLabel = dirKey ? t[dirKey] : card.direction
  const statusColor = STATUS_COLORS[card.status]
  const cardTip = firstSentence(card.summary)
  const metricTips = getMetricTips(t)

  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border flex flex-col">
      {/* Card header — hover shows one-liner summary tooltip */}
      <Tooltip text={cardTip} width="lg" position="bottom" align="left" display="block">
        <div className="w-full px-4 py-3 border-b border-intel-border flex items-center justify-between cursor-default hover:bg-intel-elevated/60 transition-colors rounded-t-lg">
          <div className="flex items-center gap-2">
            <FlagIcon id={card.id} />
            <span className="text-sm font-display font-semibold text-intel-text">{card.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[13px] font-mono uppercase border rounded px-1.5 py-0.5 ${statusColor}`}>
              {dirLabel}
            </span>
            <TrendArrow direction={card.direction} />
          </div>
        </div>
      </Tooltip>

      {/* Indicators — metric label has tooltip explaining what it measures */}
      <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 border-b border-intel-border">
        {card.indicators.map((ind, i) => (
          <div key={i} className="flex flex-col">
            {metricTips[ind.label] ? (
              <Tooltip text={metricTips[ind.label]} width="md" position="top" align="left">
                <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wide underline decoration-dotted decoration-intel-dim underline-offset-2 cursor-help">
                  {ind.label}
                </span>
              </Tooltip>
            ) : (
              <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wide">{ind.label}</span>
            )}
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm font-mono font-semibold text-intel-text tabular-nums">
                {ind.value}
              </span>
              {ind.change && (
                <span className={`text-[13px] font-mono ${CHANGE_COLORS[ind.changeType ?? 'neutral']}`}>
                  {ind.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="px-4 py-3 flex-1">
        <p className="text-sm text-intel-secondary leading-relaxed">{card.summary}</p>
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
              <span className="text-[13px] font-mono text-intel-gold tracking-[0.2em] uppercase">
                Section 02
              </span>
            </div>
            <h2 className="font-display font-bold text-xl text-intel-text" id="economy-title">
              {t.section2Title}
            </h2>
            <p className="text-sm text-intel-muted mt-0.5">{t.section2Subtitle}</p>
          </div>
          {data && (
            <span className="text-[13px] font-mono text-intel-dim" title={new Date(data.updatedAt).toLocaleString()}>
              {new Date(data.updatedAt).toLocaleTimeString()}
            </span>
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
              <button onClick={load} className="flex items-center gap-2 text-sm font-mono text-intel-gold border border-intel-gold/30 px-3 py-1.5 rounded hover:bg-intel-gold/10 transition-colors">
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
