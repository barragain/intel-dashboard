'use client'

import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import { fmtTimestamp } from '@/lib/utils'
import type { HistoricalData, HistoricalParallel, ExpertPrediction } from '@/lib/types'
import { AlertTriangle, RefreshCw, KeyRound, Clock, BookOpen } from 'lucide-react'
import NextRefresh from '@/components/ui/NextRefresh'
import StatusBadge from '@/components/ui/StatusBadge'

const SENTIMENT_CONFIG: Record<string, { tKey: 'optimistic' | 'pessimistic' | 'neutral'; color: string }> = {
  optimistic: { tKey: 'optimistic', color: 'text-trend-up' },
  pessimistic: { tKey: 'pessimistic', color: 'text-trend-down' },
  neutral: { tKey: 'neutral', color: 'text-intel-muted' },
}

const CONFIDENCE_CONFIG: Record<string, { tKey: 'confidenceHigh' | 'confidenceMedium' | 'confidenceLow'; variant: 'low' | 'medium' | 'high' }> = {
  high: { tKey: 'confidenceHigh', variant: 'low' },
  medium: { tKey: 'confidenceMedium', variant: 'medium' },
  low: { tKey: 'confidenceLow', variant: 'high' },
}

function ParallelCard({ parallel, t }: { parallel: HistoricalParallel; t: ReturnType<typeof useLanguage>['t'] }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-intel-elevated/70 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded bg-intel-bg border border-intel-border flex items-center justify-center mt-0.5">
            <BookOpen size={13} className="text-intel-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[13px] font-mono font-bold text-intel-gold">{parallel.historicalEvent}</span>
              <span className="text-[13px] font-mono text-intel-muted border border-intel-border rounded px-1.5 py-0.5">
                {parallel.period}
              </span>
            </div>
            <p className="text-sm text-intel-secondary leading-relaxed">{parallel.currentSituation}</p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-intel-border/50 animate-in">
          <div className="pt-3">
            <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wider block mb-1.5">
              {t.whatHappened}
            </span>
            <p className="text-sm text-intel-secondary leading-relaxed">{parallel.whatHappened}</p>
          </div>
          <div className="bg-intel-bg rounded border border-intel-gold/20 px-3 py-2.5">
            <span className="text-[13px] font-mono text-intel-gold uppercase tracking-wider block mb-1">
              {t.personalImplication}
            </span>
            <p className="text-sm text-intel-secondary leading-relaxed">{parallel.personalImplication}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function PredictionCard({ prediction, t }: { prediction: ExpertPrediction; t: ReturnType<typeof useLanguage>['t'] }) {
  const sentCfg = SENTIMENT_CONFIG[prediction.sentiment]
  const confCfg = CONFIDENCE_CONFIG[prediction.confidence]
  const sentLabel = sentCfg ? t[sentCfg.tKey] : prediction.sentiment
  const confLabel = confCfg ? t[confCfg.tKey] : prediction.confidence

  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm font-medium text-intel-text">{prediction.source}</span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[13px] font-mono font-bold ${sentCfg?.color ?? 'text-intel-muted'}`}>
            {sentLabel}
          </span>
          <StatusBadge status={confLabel} variant={confCfg?.variant} size="sm" />
        </div>
      </div>
      <p className="text-sm text-intel-secondary leading-relaxed mb-2">{prediction.prediction}</p>
      <div className="flex items-center gap-1.5 text-intel-muted">
        <Clock size={10} />
        <span className="text-[13px] font-mono">{prediction.timeframe}</span>
      </div>
    </div>
  )
}

export default function HistoricalContext() {
  const { t, language } = useLanguage()
  const [data, setData] = useState<HistoricalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsApiKey, setNeedsApiKey] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNeedsApiKey(false)
    try {
      const res = await fetch(`/api/historical?lang=${language}`)
      const json = await res.json()
      if (!res.ok) {
        if (json.needsApiKey) { setNeedsApiKey(true); setError(t.noApiKey) }
        else if (json.rateLimited) { setError(t.rateLimited) }
        else setError(json.error ?? t.error)
        return
      }
      setData(json as HistoricalData)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section aria-labelledby="historical-title">
      <div className="bg-intel-surface border border-intel-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-intel-border flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-intel-text" id="historical-title">
              {t.section6Title}
            </h2>
            <p className="text-sm text-intel-muted mt-0.5">{t.section6Subtitle}</p>
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
          {loading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg shimmer" aria-hidden="true" />)}
              </div>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-lg shimmer" aria-hidden="true" />)}
              </div>
            </div>
          )}

          {!loading && needsApiKey && (
            <div className="flex flex-col items-center py-10 gap-3 text-center">
              <KeyRound size={20} className="text-intel-gold" />
              <p className="text-sm font-medium text-intel-text">{t.noApiKey}</p>
              <p className="text-sm text-intel-muted max-w-sm">{t.noApiKeyDetail}</p>
            </div>
          )}

          {!loading && error && !needsApiKey && (
            <div className="flex flex-col items-center py-10 gap-3">
              <AlertTriangle size={18} className="text-risk-worried" />
              <p className="text-sm text-intel-muted">{error}</p>
              <button onClick={load} className="flex items-center gap-2 text-sm font-mono text-intel-gold border border-intel-gold/30 px-3 py-1.5 rounded hover:bg-intel-gold/10 transition-colors">
                <RefreshCw size={12} /> {t.retry}
              </button>
            </div>
          )}

          {!loading && data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in">
              {/* Historical parallels */}
              <div>
                <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em] mb-4">
                  {t.historicalParallels}
                </h3>
                <div className="space-y-3">
                  {data.parallels.map((p) => (
                    <ParallelCard key={p.id} parallel={p} t={t} />
                  ))}
                </div>
              </div>

              {/* Expert predictions */}
              <div>
                <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em] mb-4">
                  {t.expertPredictions}
                </h3>
                <div className="space-y-3">
                  {data.predictions.map((p, i) => (
                    <PredictionCard key={i} prediction={p} t={t} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
