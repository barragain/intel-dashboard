'use client'

import { useState, useCallback } from 'react'
import { useLanguage } from '@/lib/i18n'
import { fmtTimestamp } from '@/lib/utils'
import type { HistoricalData, HistoricalParallel, ExpertPrediction } from '@/lib/types'
import { AlertTriangle, RefreshCw, KeyRound, Clock, BookOpen, Sparkles } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'

const SENTIMENT_CONFIG: Record<string, { label: { en: string; fr: string }; color: string }> = {
  optimistic: { label: { en: 'Optimistic', fr: 'Optimiste' }, color: 'text-trend-up' },
  pessimistic: { label: { en: 'Pessimistic', fr: 'Pessimiste' }, color: 'text-trend-down' },
  neutral: { label: { en: 'Neutral', fr: 'Neutre' }, color: 'text-intel-muted' },
}

const CONFIDENCE_CONFIG: Record<string, { label: { en: string; fr: string }; variant: 'low' | 'medium' | 'high' }> = {
  high: { label: { en: 'High conf.', fr: 'Haute conf.' }, variant: 'low' },
  medium: { label: { en: 'Medium conf.', fr: 'Conf. moy.' }, variant: 'medium' },
  low: { label: { en: 'Low conf.', fr: 'Faible conf.' }, variant: 'high' },
}

function ParallelCard({ parallel, lang }: { parallel: HistoricalParallel; lang: string }) {
  const [expanded, setExpanded] = useState(false)
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
              <span className="text-[11px] font-mono font-bold text-intel-gold">{parallel.historicalEvent}</span>
              <span className="text-[10px] font-mono text-intel-muted border border-intel-border rounded px-1.5 py-0.5">
                {parallel.period}
              </span>
            </div>
            <p className="text-xs text-intel-secondary leading-relaxed">{parallel.currentSituation}</p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-intel-border/50 animate-in">
          <div className="pt-3">
            <span className="text-[10px] font-mono text-intel-muted uppercase tracking-wider block mb-1.5">
              {lang === 'fr' ? 'Ce qui s\'est passé' : 'What happened'}
            </span>
            <p className="text-xs text-intel-secondary leading-relaxed">{parallel.whatHappened}</p>
          </div>
          <div className="bg-intel-bg rounded border border-intel-gold/20 px-3 py-2.5">
            <span className="text-[10px] font-mono text-intel-gold uppercase tracking-wider block mb-1">
              {lang === 'fr' ? 'Ce que cela signifie pour vous' : 'What this means for you'}
            </span>
            <p className="text-xs text-intel-secondary leading-relaxed">{parallel.personalImplication}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function PredictionCard({ prediction, lang }: { prediction: ExpertPrediction; lang: string }) {
  const sentCfg = SENTIMENT_CONFIG[prediction.sentiment]
  const confCfg = CONFIDENCE_CONFIG[prediction.confidence]
  const sentLabel = sentCfg?.label[lang as 'en' | 'fr'] ?? prediction.sentiment
  const confLabel = confCfg?.label[lang as 'en' | 'fr'] ?? prediction.confidence

  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-medium text-intel-text">{prediction.source}</span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-mono font-bold ${sentCfg?.color ?? 'text-intel-muted'}`}>
            {sentLabel}
          </span>
          <StatusBadge status={confLabel} variant={confCfg?.variant} size="sm" />
        </div>
      </div>
      <p className="text-xs text-intel-secondary leading-relaxed mb-2">{prediction.prediction}</p>
      <div className="flex items-center gap-1.5 text-intel-muted">
        <Clock size={10} />
        <span className="text-[10px] font-mono">{prediction.timeframe}</span>
      </div>
    </div>
  )
}

export default function HistoricalContext() {
  const { t, language } = useLanguage()
  const [data, setData] = useState<HistoricalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsApiKey, setNeedsApiKey] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNeedsApiKey(false)
    try {
      const res = await fetch('/api/historical')
      const json = await res.json()
      if (!res.ok) {
        if (json.needsApiKey) { setNeedsApiKey(true); setError(t.noApiKey) }
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

  return (
    <section aria-labelledby="historical-title">
      <div className="bg-intel-surface border border-intel-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-intel-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-intel-gold" />
              <span className="text-[10px] font-mono text-intel-gold tracking-[0.2em] uppercase">Section 06</span>
            </div>
            <h2 className="font-display font-bold text-xl text-intel-text" id="historical-title">
              {t.section6Title}
            </h2>
            <p className="text-xs text-intel-muted mt-0.5">{t.section6Subtitle}</p>
          </div>
          {data && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-intel-dim">
                {t.dataFrom} {fmtTimestamp(data.updatedAt)}
              </span>
              <button onClick={load} className="text-intel-dim hover:text-intel-gold transition-colors" aria-label={t.retry} title={new Date(data.updatedAt).toLocaleString()}>
                <RefreshCw size={11} />
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Idle */}
          {!loading && !data && !error && !needsApiKey && (
            <div className="flex flex-col items-center justify-center py-14 gap-5 text-center">
              <div className="w-10 h-10 rounded-full bg-intel-elevated border border-intel-border flex items-center justify-center">
                <Sparkles size={16} className="text-intel-gold" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-intel-muted">{t.loadDataDesc}</p>
                <p className="text-[11px] font-mono text-intel-dim">{t.loadDataEst}</p>
              </div>
              <button
                onClick={load}
                className="flex items-center gap-2 text-sm font-mono font-medium text-intel-bg bg-intel-gold px-4 py-2 rounded hover:bg-intel-gold-bright transition-colors"
              >
                <Sparkles size={13} />
                {t.loadData}
              </button>
            </div>
          )}

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
              <p className="text-xs text-intel-muted max-w-sm">{t.noApiKeyDetail}</p>
            </div>
          )}

          {!loading && error && !needsApiKey && (
            <div className="flex flex-col items-center py-10 gap-3">
              <AlertTriangle size={18} className="text-risk-worried" />
              <p className="text-sm text-intel-muted">{error}</p>
              <button onClick={load} className="flex items-center gap-2 text-xs font-mono text-intel-gold border border-intel-gold/30 px-3 py-1.5 rounded hover:bg-intel-gold/10 transition-colors">
                <RefreshCw size={12} /> {t.retry}
              </button>
            </div>
          )}

          {!loading && data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in">
              {/* Historical parallels */}
              <div>
                <h3 className="text-[10px] font-mono text-intel-muted uppercase tracking-[0.2em] mb-4">
                  {t.historicalParallels}
                </h3>
                <div className="space-y-3">
                  {data.parallels.map((p) => (
                    <ParallelCard key={p.id} parallel={p} lang={language} />
                  ))}
                </div>
              </div>

              {/* Expert predictions */}
              <div>
                <h3 className="text-[10px] font-mono text-intel-muted uppercase tracking-[0.2em] mb-4">
                  {t.expertPredictions}
                </h3>
                <div className="space-y-3">
                  {data.predictions.map((p, i) => (
                    <PredictionCard key={i} prediction={p} lang={language} />
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
