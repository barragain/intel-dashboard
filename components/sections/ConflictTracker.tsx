'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import { fmtTimestamp } from '@/lib/utils'
import type { ConflictsData, Conflict } from '@/lib/types'
import StatusBadge from '@/components/ui/StatusBadge'
import { AlertTriangle, RefreshCw, KeyRound, Sparkles } from 'lucide-react'

const STATUS_LABELS: Record<string, { en: string; fr: string }> = {
  escalating: { en: 'Escalating', fr: 'En escalade' },
  stable: { en: 'Stable', fr: 'Stable' },
  'de-escalating': { en: 'De-escalating', fr: 'En désescalade' },
}

const STATUS_DOT_COLORS: Record<string, string> = {
  escalating: 'bg-risk-worried',
  stable: 'bg-risk-watch',
  'de-escalating': 'bg-risk-stable',
}

function ConflictCard({ conflict, lang }: { conflict: Conflict; lang: string }) {
  const [expanded, setExpanded] = useState(false)
  const statusLabel = STATUS_LABELS[conflict.status]?.[lang as 'en' | 'fr'] ?? conflict.status
  const dotColor = STATUS_DOT_COLORS[conflict.status] ?? 'bg-intel-muted'

  return (
    <div className="border border-intel-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-intel-elevated/50 transition-colors text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex-shrink-0 w-2 h-2 rounded-full ${dotColor} ${conflict.status === 'escalating' ? 'animate-pulse' : ''}`} />
          <div className="min-w-0">
            <span className="text-sm font-medium text-intel-text block truncate">{conflict.name}</span>
            <span className="text-[11px] text-intel-muted">{conflict.location}</span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <StatusBadge status={statusLabel} variant={conflict.status} size="sm" />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-2.5 border-t border-intel-border/50 bg-intel-elevated/30 animate-in">
          <div>
            <span className="text-[10px] font-mono text-intel-gold uppercase tracking-wider block mb-1">
              {lang === 'fr' ? 'Pourquoi cela vous concerne' : 'Why it matters to you'}
            </span>
            <p className="text-xs text-intel-secondary leading-relaxed">{conflict.relevance}</p>
          </div>
          <div>
            <span className="text-[10px] font-mono text-intel-muted uppercase tracking-wider block mb-1">
              {lang === 'fr' ? 'Détails actuels' : 'Current details'}
            </span>
            <p className="text-xs text-intel-secondary leading-relaxed">{conflict.details}</p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-mono text-intel-muted uppercase tracking-wider">
              {lang === 'fr' ? 'Impact' : 'Key impact'}:
            </span>
            <span className="text-[11px] font-mono text-intel-gold">{conflict.keyImpact}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConflictTracker({ autoLoadDelay }: { autoLoadDelay?: number }) {
  const { t, language } = useLanguage()
  const [data, setData] = useState<ConflictsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsApiKey, setNeedsApiKey] = useState(false)

  useEffect(() => {
    if (autoLoadDelay === undefined) return
    const timer = setTimeout(load, autoLoadDelay)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    setError(null)
    setNeedsApiKey(false)
    try {
      const res = await fetch('/api/conflicts')
      const json = await res.json()
      if (!res.ok) {
        if (json.needsApiKey) { setNeedsApiKey(true); setError(t.noApiKey) }
        else setError(json.error ?? t.error)
        return
      }
      setData(json as ConflictsData)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section aria-labelledby="conflict-title">
      <div className="bg-intel-surface border border-intel-border rounded-xl overflow-hidden h-full">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-intel-border">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-intel-gold" />
            <span className="text-[10px] font-mono text-intel-gold tracking-[0.2em] uppercase">Section 03</span>
          </div>
          <h2 className="font-display font-bold text-xl text-intel-text" id="conflict-title">
            {t.section3Title}
          </h2>
          <p className="text-xs text-intel-muted mt-0.5">{t.section3Subtitle}</p>
        </div>

        <div className="p-6">
          {/* Idle */}
          {!loading && !data && !error && !needsApiKey && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
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
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg shimmer" aria-hidden="true" />
              ))}
            </div>
          )}

          {!loading && needsApiKey && (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <KeyRound size={18} className="text-intel-gold" />
              <p className="text-xs text-intel-muted max-w-xs">{t.noApiKeyDetail}</p>
            </div>
          )}

          {!loading && error && !needsApiKey && (
            <div className="flex flex-col items-center py-8 gap-3">
              <AlertTriangle size={18} className="text-risk-worried" />
              <p className="text-sm text-intel-muted">{error}</p>
              <button onClick={load} className="flex items-center gap-2 text-xs font-mono text-intel-gold border border-intel-gold/30 px-3 py-1.5 rounded hover:bg-intel-gold/10 transition-colors">
                <RefreshCw size={12} /> {t.retry}
              </button>
            </div>
          )}

          {!loading && data && (
            <div className="space-y-3 animate-in">
              <p className="text-xs text-intel-secondary leading-relaxed pb-2">
                {data.overallAssessment}
              </p>
              {data.conflicts.map((conflict) => (
                <ConflictCard key={conflict.id} conflict={conflict} lang={language} />
              ))}
              <div className="flex items-center justify-end gap-2 pt-1">
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
