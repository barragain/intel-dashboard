'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import { fmtTimestamp } from '@/lib/utils'
import type { RiskData } from '@/lib/types'
import { AlertTriangle, RefreshCw, KeyRound, Sparkles } from 'lucide-react'

function SectionHeader({ label, subtitle }: { label: string; subtitle: string }) {
  return (
    <div className="px-6 pt-6 pb-4 border-b border-intel-border">
      <div className="flex items-center gap-2 mb-0.5">
        <div className="w-1.5 h-1.5 rounded-full bg-intel-gold" />
        <span className="text-[10px] font-mono text-intel-gold tracking-[0.2em] uppercase">
          Section 01
        </span>
      </div>
      <h2 className="font-display font-bold text-xl text-intel-text">{label}</h2>
      <p className="text-xs text-intel-muted mt-0.5">{subtitle}</p>
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
    label: 'STABLE',
    fr: 'STABLE',
  },
  WATCH: {
    color: 'text-risk-watch',
    bgClass: 'bg-risk-watch-bg border-risk-watch-border',
    glowClass: 'risk-glow-watch',
    shadowClass: 'shadow-glow-watch',
    dotColor: 'bg-risk-watch',
    label: 'WATCH',
    fr: 'VIGILANCE',
  },
  WORRIED: {
    color: 'text-risk-worried',
    bgClass: 'bg-risk-worried-bg border-risk-worried-border',
    glowClass: 'risk-glow-worried',
    shadowClass: 'shadow-glow-worried',
    dotColor: 'bg-risk-worried',
    label: 'WORRIED',
    fr: 'ALERTE',
  },
} as const

const DRIVER_IMPACT_CLASSES = {
  positive: 'text-trend-up',
  negative: 'text-trend-down',
  neutral: 'text-intel-muted',
}

export default function RiskMeter({ autoLoadDelay }: { autoLoadDelay?: number }) {
  const { t, language } = useLanguage()
  const [data, setData] = useState<RiskData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsApiKey, setNeedsApiKey] = useState(false)
  const [visible, setVisible] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    setNeedsApiKey(false)
    try {
      const res = await fetch('/api/risk')
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
    if (autoLoadDelay === undefined) return
    const timer = setTimeout(load, autoLoadDelay)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const status = data?.status ?? 'WATCH'
  const cfg = STATUS_CONFIG[status]
  const statusLabel = language === 'fr' ? cfg.fr : cfg.label

  return (
    <section aria-labelledby="risk-title" className="pt-6">
      <div className="bg-intel-surface border border-intel-border rounded-xl overflow-hidden">
        <SectionHeader label={t.section1Title} subtitle={t.section1Subtitle} />

        <div className="p-6">
          {/* Idle — not yet loaded */}
          {!loading && !data && !error && !needsApiKey && (
            <div className="flex flex-col items-center justify-center py-14 gap-5 text-center">
              <div className="w-12 h-12 rounded-full bg-intel-elevated border border-intel-border flex items-center justify-center">
                <Sparkles size={20} className="text-intel-gold" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-intel-muted">{t.loadDataDesc}</p>
                <p className="text-[11px] font-mono text-intel-dim">{t.loadDataEst}</p>
              </div>
              <button
                onClick={load}
                className="flex items-center gap-2 text-sm font-mono font-medium text-intel-bg bg-intel-gold px-5 py-2 rounded hover:bg-intel-gold-bright transition-colors"
              >
                <Sparkles size={13} />
                {t.loadData}
              </button>
            </div>
          )}

          {/* Loading spinner */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-intel-border border-t-intel-gold animate-spin" />
              <span className="text-sm text-intel-muted font-mono">{t.loading}</span>
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
                <p className="text-xs text-intel-muted mt-1 max-w-sm">{t.noApiKeyDetail}</p>
              </div>
              <code className="text-xs font-mono bg-intel-elevated px-3 py-1.5 rounded border border-intel-border text-intel-gold">
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
                className="flex items-center gap-2 text-xs font-mono text-intel-gold border border-intel-gold/30 px-3 py-1.5 rounded hover:bg-intel-gold/10 transition-colors"
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

                {/* Score bar */}
                <div className="relative mb-6">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="flex-1 max-w-48 h-1 bg-intel-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${cfg.dotColor}`}
                        style={{ width: `${Math.min(100, data.score)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-intel-muted">
                      {t.riskScore}: <span className={`${cfg.color} font-bold`}>{data.score}/100</span>
                    </span>
                    <div className="flex-1 max-w-48 h-1 bg-intel-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${cfg.dotColor} ml-auto`}
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

                {/* Explanation */}
                <p className="relative mt-8 text-sm md:text-base text-intel-secondary leading-relaxed max-w-2xl mx-auto">
                  {data.explanation}
                </p>
              </div>

              {/* Drivers */}
              {data.drivers && data.drivers.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[10px] font-mono text-intel-muted tracking-[0.2em] uppercase mb-3">
                    {t.keyDrivers}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {data.drivers.map((driver, i) => (
                      <div key={i} className="bg-intel-elevated rounded-lg border border-intel-border p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-intel-text">{driver.name}</span>
                          <span className={`text-[10px] font-mono uppercase ${DRIVER_IMPACT_CLASSES[driver.impact]}`}>
                            {driver.impact}
                          </span>
                        </div>
                        <p className="text-[11px] text-intel-muted leading-relaxed">{driver.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp + refresh */}
              <div className="mt-4 flex items-center justify-end gap-2">
                <span className="text-[11px] font-mono text-intel-dim">
                  {t.dataFrom} {fmtTimestamp(data.updatedAt)}
                </span>
                <button
                  onClick={load}
                  className="text-intel-dim hover:text-intel-gold transition-colors"
                  aria-label={t.retry}
                  title={new Date(data.updatedAt).toLocaleString()}
                >
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
