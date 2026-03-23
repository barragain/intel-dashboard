'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import { fmtTimestamp } from '@/lib/utils'
import type { RiskData } from '@/lib/types'
import { AlertTriangle, RefreshCw, KeyRound } from 'lucide-react'
import Tooltip from '@/components/ui/Tooltip'

function SectionHeader({ label, subtitle }: { label: string; subtitle: string }) {
  return (
    <div className="px-6 pt-6 pb-4 border-b border-intel-border">
      <div className="flex items-center gap-2 mb-0.5">
        <div className="w-1.5 h-1.5 rounded-full bg-intel-gold" />
        <span className="text-[13px] font-mono text-intel-gold tracking-[0.2em] uppercase">
          Section 01
        </span>
      </div>
      <h2 className="font-display font-bold text-xl text-intel-text">{label}</h2>
      <p className="text-[13px] text-intel-muted mt-0.5">{subtitle}</p>
    </div>
  )
}

const STATUS_CONFIG = {
  STABLE: {
    color: 'text-risk-stable',
    bgClass: 'bg-risk-stable-bg border-risk-stable-border',
    glowClass: 'risk-glow-stable',
    shadowClass: 'shadow-glow-stable',
    dotColor: 'bg-risk-stable',
    tKey: 'stable' as const,
    sentenceTKey: 'riskSentenceStable' as const,
  },
  WATCH: {
    color: 'text-risk-watch',
    bgClass: 'bg-risk-watch-bg border-risk-watch-border',
    glowClass: 'risk-glow-watch',
    shadowClass: 'shadow-glow-watch',
    dotColor: 'bg-risk-watch',
    tKey: 'watch' as const,
    sentenceTKey: 'riskSentenceWatch' as const,
  },
  WORRIED: {
    color: 'text-risk-worried',
    bgClass: 'bg-risk-worried-bg border-risk-worried-border',
    glowClass: 'risk-glow-worried',
    shadowClass: 'shadow-glow-worried',
    dotColor: 'bg-risk-worried',
    tKey: 'worried' as const,
    sentenceTKey: 'riskSentenceWorried' as const,
  },
} as const

const DRIVER_IMPACT_CLASSES = {
  positive: 'text-trend-up',
  negative: 'text-trend-down',
  neutral: 'text-intel-muted',
}

const LEGEND = [
  { tKey: 'stable' as const, dotColor: 'bg-risk-stable', range: '0–33' },
  { tKey: 'watch' as const, dotColor: 'bg-risk-watch', range: '34–66' },
  { tKey: 'worried' as const, dotColor: 'bg-risk-worried', range: '67–100' },
]

export default function RiskMeter() {
  const { t, language } = useLanguage()
  const [data, setData] = useState<RiskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsApiKey, setNeedsApiKey] = useState(false)
  const [visible, setVisible] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    setNeedsApiKey(false)
    try {
      const res = await fetch(`/api/risk?lang=${language}`)
      const json = await res.json()
      if (!res.ok) {
        if (json.needsApiKey) {
          setNeedsApiKey(true)
          setError(t.noApiKey)
        } else if (json.rateLimited) {
          setError(t.rateLimited)
        } else {
          setError(json.error ?? t.error)
        }
        return
      }
      setVisible(false)
      setData(json as RiskData)
      setTimeout(() => setVisible(true), 50)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const status = data?.status ?? 'WATCH'
  const cfg = STATUS_CONFIG[status]
  const statusLabel = t[cfg.tKey]
  const sentencePrefix = t[cfg.sentenceTKey]

  // Top driver = first negative-impact driver, else first driver
  const topDriver = data?.drivers?.find(d => d.impact === 'negative') ?? data?.drivers?.[0] ?? null

  return (
    <section aria-labelledby="risk-title" className="pt-6">
      <div className="bg-intel-surface border border-intel-border rounded-xl overflow-hidden">
        <SectionHeader label={t.section1Title} subtitle={t.section1Subtitle} />

        <div className="p-6">
          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-4">
              {/* Big status block skeleton */}
              <div className="rounded-lg border border-intel-border bg-intel-elevated/40 p-8 md:p-12 flex flex-col items-center gap-4">
                <div className="h-3 w-24 rounded shimmer" />
                <div className="h-20 w-64 rounded-lg shimmer" />
                <div className="h-8 w-20 rounded shimmer" />
                <div className="h-4 w-96 max-w-full rounded shimmer" />
                <div className="flex gap-5">
                  <div className="h-3 w-20 rounded shimmer" />
                  <div className="h-3 w-20 rounded shimmer" />
                  <div className="h-3 w-20 rounded shimmer" />
                </div>
              </div>
              {/* Drivers skeleton */}
              <div className="h-3 w-24 rounded shimmer" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-lg shimmer" aria-hidden="true" />
                ))}
              </div>
            </div>
          )}

          {/* No API key */}
          {!loading && needsApiKey && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-intel-elevated border border-intel-border flex items-center justify-center">
                <KeyRound size={20} className="text-intel-gold" />
              </div>
              <div>
                <p className="text-sm font-medium text-intel-text">{t.noApiKey}</p>
                <p className="text-sm text-intel-muted mt-1 max-w-sm">{t.noApiKeyDetail}</p>
              </div>
              <code className="text-sm font-mono bg-intel-elevated px-3 py-1.5 rounded border border-intel-border text-intel-gold">
                GEMINI_API_KEY=AIza...
              </code>
            </div>
          )}

          {/* Error */}
          {!loading && error && !needsApiKey && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertTriangle size={20} className="text-risk-worried" />
              <p className="text-sm text-intel-muted">{error}</p>
              <button
                onClick={load}
                className="flex items-center gap-2 text-sm font-mono text-intel-gold border border-intel-gold/30 px-3 py-1.5 rounded hover:bg-intel-gold/10 transition-colors"
              >
                <RefreshCw size={12} />
                {t.retry}
              </button>
            </div>
          )}

          {/* Data */}
          {!loading && data && (
            <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {/* Main status display */}
              <div className={`relative rounded-lg border ${cfg.bgClass} p-8 md:p-12 text-center overflow-hidden ${cfg.shadowClass}`}>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                  <div className={`w-96 h-96 rounded-full blur-3xl opacity-10 ${cfg.dotColor}`} />
                </div>

                {/* Score bar — visual framing only */}
                <div className="relative mb-6">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex-1 max-w-48 h-1 bg-intel-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${cfg.dotColor}`}
                        style={{ width: `${Math.min(100, data.score)}%` }}
                      />
                    </div>
                    <div className="flex-1 max-w-48 h-1 bg-intel-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${cfg.dotColor}`}
                        style={{ width: `${Math.min(100, data.score)}%`, float: 'right' }}
                      />
                    </div>
                  </div>
                </div>

                {/* BIG status text */}
                <div className="relative">
                  <div
                    className={`font-display font-black tracking-[0.25em] leading-none select-none
                      text-6xl sm:text-7xl md:text-8xl lg:text-9xl
                      ${cfg.color} ${cfg.glowClass}`}
                    id="risk-title"
                    aria-live="polite"
                  >
                    {statusLabel}
                  </div>
                </div>

                {/* Score X/100 */}
                <div className={`relative mt-3 text-4xl font-mono font-black tabular-nums ${cfg.color} opacity-70`}>
                  {data.score}/100
                </div>

                {/* Dynamic sentence from top driver */}
                {topDriver && (
                  <p className="relative mt-5 text-base text-intel-secondary leading-relaxed max-w-xl mx-auto italic">
                    "{sentencePrefix} — {topDriver.detail}"
                  </p>
                )}

                {/* Legend */}
                <div className="relative mt-5 flex items-center justify-center gap-5 flex-wrap">
                  {LEGEND.map(({ tKey, dotColor, range }) => (
                    <div key={tKey} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
                      <span className="text-[13px] font-mono text-intel-muted">{t[tKey]} {range}</span>
                    </div>
                  ))}
                </div>

                {/* Full explanation — secondary context */}
                <p className="relative mt-6 text-sm text-intel-secondary leading-relaxed max-w-2xl mx-auto opacity-80">
                  {data.explanation}
                </p>
              </div>

              {/* Drivers */}
              {data.drivers && data.drivers.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[13px] font-mono text-intel-muted tracking-[0.2em] uppercase mb-3">
                    {t.keyDrivers}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {data.drivers.map((driver, i) => (
                      <div
                        key={i}
                        className="relative bg-intel-elevated rounded-lg border border-intel-border p-3 transition-colors duration-150 hover:border-intel-gold/30 hover:bg-intel-elevated/80 group"
                      >
                        {/* Hover tooltip with whyItMatters */}
                        {driver.whyItMatters && (
                          <div className="absolute bottom-full left-0 right-0 mb-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                            <div className="mx-1 px-3 py-2.5 bg-[#111114] border border-[#27272A] rounded-lg text-[13px] leading-relaxed text-zinc-300 shadow-xl shadow-black/40">
                              {driver.whyItMatters}
                              <span className="absolute top-full left-6 border-[5px] border-transparent border-t-[#27272A]" aria-hidden="true" />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-intel-text">{driver.name}</span>
                          <span className={`text-[13px] font-mono uppercase ${DRIVER_IMPACT_CLASSES[driver.impact]}`}>
                            {driver.impact}
                          </span>
                        </div>
                        <p className="text-[13px] text-intel-muted leading-relaxed">{driver.detail}</p>
                        {driver.whyItMatters && (
                          <span className="absolute top-2 right-2 text-[10px] text-intel-dim group-hover:text-intel-gold/60 transition-colors" aria-hidden="true">?</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="mt-4 flex items-center justify-end">
                <span className="text-[13px] font-mono text-intel-dim" title={new Date(data.updatedAt).toLocaleString()}>
                  {t.dataFrom} {fmtTimestamp(data.updatedAt)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
