'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import type { EconomiesData, EconomyCard } from '@/lib/types'
import TrendArrow from '@/components/ui/TrendArrow'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import Tooltip from '@/components/ui/Tooltip'
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import NextRefresh from '@/components/ui/NextRefresh'

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
    'VIX':          t.metricVIX,
    'DXY':          t.metricDXY,
    'S&P 500':      t.metricSP500,
    'Gold (oz)':    t.metricGold,
    'Oil WTI':      t.metricOilWTI,
    'TAIEX':        t.metricTAIEX,
    'TWD/USD':      t.metricTWDUSD,
    'CAC 40':       t.metricCAC40,
    'EUR/USD':      t.metricEURUSD,
    'PYG/USD':      t.metricPYGUSD,
    'Silver (oz)':  'Silver price per troy ounce. Like gold, silver is a safe-haven asset — it rises when investors are nervous and falls when confidence returns.',
    'Brent Crude':  'Brent Crude is the global oil benchmark (priced in US dollars per barrel). It affects fuel costs, airline tickets, shipping, and consumer prices worldwide.',
  }
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]+[.!?]/)
  return m ? m[0] : text
}

/** Tiny inline sparkline used inside Global card per-indicator */
function MiniSparkline({ data, color, id }: { data: { price: number; date: string }[]; color: string; id: string }) {
  if (!data || data.length < 3) return null
  const gradId = `mini-${id}`
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 1, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <RechartsTooltip
          content={({ active, payload, label }: any) => {
            if (!active || !payload?.length) return null
            return (
              <div className="bg-intel-elevated border border-intel-border rounded px-2 py-1 text-[10px] font-mono">
                <div className="text-intel-muted">{label}</div>
                <div style={{ color }} className="font-bold">{payload[0].value.toFixed(2)}</div>
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Green if today's change is positive, red if negative.
// Paraguay's first indicator already has changeType inverted in the route.
function sparklineColor(changeType: string | undefined): string {
  if (changeType === 'negative') return '#EF4444'
  return '#22C55E'
}

/** Global card — wide layout with 6 indicators each showing a mini sparkline */
function GlobalCard({ card, t }: { card: EconomyCard; t: T }) {
  const dirKey = DIR_TKEYS[card.direction]
  const dirLabel = dirKey ? t[dirKey] : card.direction
  const statusColor = STATUS_COLORS[card.status]
  const metricTips = getMetricTips(t)

  // Static per-indicator colors for global macro charts
  const INDICATOR_COLORS: Record<string, string> = {
    'VIX':         '#EF4444', // red — fear index
    'DXY':         '#C8A96E', // gold — dollar
    'Gold (oz)':   '#F59E0B', // amber
    'Silver (oz)': '#94A3B8', // slate
    'Oil WTI':     '#60A5FA', // blue
    'Brent Crude': '#818CF8', // indigo
  }

  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border flex flex-col">
      {/* Header */}
      <Tooltip text={firstSentence(card.summary)} width="lg" position="bottom" align="left" display="block">
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

      {/* Indicators grid — 3 or 6 columns, each with mini sparkline */}
      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-3">
        {card.indicators.map((ind, i) => {
          const color = INDICATOR_COLORS[ind.label] ?? '#C8A96E'
          return (
            <div key={i} className="flex flex-col">
              {metricTips[ind.label] ? (
                <Tooltip text={metricTips[ind.label]} width="md" position="top" align="left">
                  <span className="text-[12px] font-mono text-intel-muted uppercase tracking-wide underline decoration-dotted decoration-intel-dim underline-offset-2 cursor-help">
                    {ind.label}
                  </span>
                </Tooltip>
              ) : (
                <span className="text-[12px] font-mono text-intel-muted uppercase tracking-wide">{ind.label}</span>
              )}
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-sm font-mono font-semibold text-intel-text tabular-nums">{ind.value}</span>
                {ind.change && ind.change !== 'N/A' && (
                  <span className={`text-[12px] font-mono ${CHANGE_COLORS[ind.changeType ?? 'neutral']}`}>
                    {ind.change}
                  </span>
                )}
              </div>
              {ind.sparkline && ind.sparkline.length > 3 && (
                <div className="mt-1">
                  <MiniSparkline data={ind.sparkline} color={color} id={`global-${i}`} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-t border-intel-border">
        <p className="text-sm text-intel-secondary leading-relaxed">{card.summary}</p>
      </div>
    </div>
  )
}

/** Standard card for country/sector entries — shows indicators + optional bottom sparkline */
function EconomyCardComponent({ card, t }: { card: EconomyCard; t: T }) {
  const dirKey = DIR_TKEYS[card.direction]
  const dirLabel = dirKey ? t[dirKey] : card.direction
  const statusColor = STATUS_COLORS[card.status]
  const cardTip = firstSentence(card.summary)
  const metricTips = getMetricTips(t)
  const sparkColor = sparklineColor(card.indicators[0]?.changeType)

  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border flex flex-col">
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
              {ind.change && ind.change !== 'N/A' && (
                <span className={`text-[13px] font-mono ${CHANGE_COLORS[ind.changeType ?? 'neutral']}`}>
                  {ind.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom sparkline for the card's main indicator */}
      {card.sparkline && card.sparkline.length > 0 && (
        <div className="px-4 pt-3 pb-1 border-b border-intel-border">
          <span className="text-[11px] font-mono text-intel-muted uppercase tracking-wider block mb-1.5">
            30-day chart
          </span>
          <ResponsiveContainer width="100%" height={64}>
            <AreaChart data={card.sparkline} margin={{ top: 2, right: 0, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id={`econ-spark-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={sparkColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={sparkColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: '#6B7280', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                interval={Math.floor(card.sparkline.length / 4)}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#6B7280', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(v) => `${v.toFixed(0)}`}
              />
              <RechartsTooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-intel-elevated border border-intel-border rounded px-2 py-1 text-[11px] font-mono">
                      <div className="text-intel-muted">{label}</div>
                      <div className="text-intel-text font-bold">{payload[0].value.toFixed(2)}</div>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={sparkColor}
                strokeWidth={1.5}
                fill={`url(#econ-spark-${card.id})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

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

  const globalCard = economies.find((e) => e.id === 'global')
  const otherCards = economies.filter((e) => e.id !== 'global')

  return (
    <section aria-labelledby="economy-title">
      <div className="bg-intel-surface border border-intel-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-intel-border flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-intel-text" id="economy-title">
              {t.section2Title}
            </h2>
            <p className="text-sm text-intel-muted mt-0.5">{t.section2Subtitle}</p>
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
          {loading && (
            <div className="space-y-4">
              <div className="bg-intel-elevated rounded-lg border border-intel-border h-40 shimmer" aria-hidden="true" />
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-intel-elevated rounded-lg border border-intel-border h-48 shimmer" aria-hidden="true" />
                ))}
              </div>
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
            <div className="space-y-4 animate-in">
              {/* Global — full width with per-indicator sparklines */}
              {globalCard && <GlobalCard card={globalCard} t={t} />}

              {/* Country + sector cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {otherCards.map((card) => (
                  <EconomyCardComponent key={card.id} card={card} t={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
