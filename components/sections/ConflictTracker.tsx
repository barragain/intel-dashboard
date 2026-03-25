'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import type { ConflictsData, Conflict } from '@/lib/types'
import StatusBadge from '@/components/ui/StatusBadge'
import { AlertTriangle, RefreshCw, KeyRound, Newspaper } from 'lucide-react'
import NextRefresh from '@/components/ui/NextRefresh'

const STATUS_TKEYS: Record<string, 'escalating' | 'conflictStable' | 'deEscalating'> = {
  escalating: 'escalating',
  stable: 'conflictStable',
  'de-escalating': 'deEscalating',
}

const STATUS_DOT_COLORS: Record<string, string> = {
  escalating: 'bg-risk-worried',
  stable: 'bg-risk-watch',
  'de-escalating': 'bg-risk-stable',
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function ConflictCard({ conflict, updatedAt, t }: { conflict: Conflict; updatedAt: string; t: ReturnType<typeof useLanguage>['t'] }) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const tKey = STATUS_TKEYS[conflict.status]
  const statusLabel = tKey ? t[tKey] : conflict.status
  const dotColor = STATUS_DOT_COLORS[conflict.status] ?? 'bg-intel-muted'
  const firstHeadline = conflict.headlines?.[0]

  return (
    <div className="border border-intel-border rounded-lg overflow-visible relative">
      {/* Hover headline preview — shown above the row */}
      {firstHeadline && hovered && !expanded && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-50 pointer-events-none">
          <div className="mx-1 px-3 py-2 bg-[#111114] border border-[#27272A] rounded-lg shadow-xl shadow-black/40">
            <div className="flex items-center gap-1.5 mb-1">
              <Newspaper size={11} className="text-intel-gold flex-shrink-0" />
              <span className="text-[11px] font-mono text-intel-gold uppercase tracking-wider">{t.latestHeadline}</span>
            </div>
            <p className="text-[13px] text-zinc-300 leading-relaxed">{firstHeadline.text}</p>
            <span className="absolute top-full left-6 border-[5px] border-transparent border-t-[#27272A]" aria-hidden="true" />
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-intel-elevated/50 transition-colors text-left rounded-lg"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex-shrink-0 w-2 h-2 rounded-full ${dotColor} ${conflict.status === 'escalating' ? 'animate-pulse' : ''}`} />
          <div className="min-w-0">
            <span className="text-sm font-medium text-intel-text block truncate">{conflict.name}</span>
            <span className="text-[13px] text-intel-muted">{conflict.location}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {firstHeadline && !expanded && (
            <Newspaper size={12} className="text-intel-dim" aria-hidden="true" />
          )}
          <StatusBadge status={statusLabel} variant={conflict.status} size="sm" />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-2.5 border-t border-intel-border/50 bg-intel-elevated/30 animate-in rounded-b-lg">
          <div>
            <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wider block mb-1">
              {t.currentDetails}
            </span>
            <p className="text-sm text-intel-secondary leading-relaxed">{conflict.details}</p>
          </div>
          <div>
            <span className="text-[13px] font-mono text-intel-gold uppercase tracking-wider block mb-1">
              {t.whyItMatters}
            </span>
            <p className="text-sm text-intel-secondary leading-relaxed">{conflict.relevance}</p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[13px] font-mono text-intel-muted uppercase tracking-wider">
              {t.keyImpact}:
            </span>
            <span className="text-[13px] font-mono text-intel-gold">{conflict.keyImpact}</span>
          </div>
          {/* Supporting headlines */}
          {conflict.headlines && conflict.headlines.length > 0 && (
            <div className="pt-1 border-t border-intel-border/30">
              <div className="flex items-center gap-1.5 mb-2">
                <Newspaper size={11} className="text-intel-gold" />
                <span className="text-[13px] font-mono text-intel-gold uppercase tracking-wider">
                  {t.supportingHeadlines}
                </span>
              </div>
              <div className="space-y-1.5">
                {conflict.headlines.map((h, i) => (
                  <div key={i} className="pl-3 border-l border-intel-border">
                    {h.url ? (
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-intel-dim leading-relaxed hover:text-intel-gold hover:underline transition-colors"
                      >
                        {h.text}
                      </a>
                    ) : (
                      <p className="text-[13px] text-intel-dim leading-relaxed">{h.text}</p>
                    )}
                    {h.date && (
                      <span className="text-[11px] font-mono text-intel-dim/60 mt-0.5 block">{fmtDate(h.date)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Analysis date */}
          <div className="pt-2 border-t border-intel-border/20">
            <span className="text-[11px] font-mono text-intel-dim/60">
              {t.dataFrom} {new Date(updatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConflictTracker() {
  const { t, language } = useLanguage()
  const [data, setData] = useState<ConflictsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsApiKey, setNeedsApiKey] = useState(false)

  useEffect(() => {
    load()
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    setError(null)
    setNeedsApiKey(false)
    try {
      const res = await fetch(`/api/conflicts?lang=${language}`)
      const json = await res.json()
      if (!res.ok) {
        if (json.needsApiKey) { setNeedsApiKey(true); setError(t.noApiKey) }
        else if (json.rateLimited) { setError(t.rateLimited) }
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
          <h2 className="font-display font-bold text-xl text-intel-text" id="conflict-title">
            {t.section3Title}
          </h2>
          <p className="text-sm text-intel-muted mt-0.5">{t.section3Subtitle}</p>
        </div>

        <div className="p-6">
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
              <p className="text-sm text-intel-muted max-w-xs">{t.noApiKeyDetail}</p>
            </div>
          )}

          {!loading && error && !needsApiKey && (
            <div className="flex flex-col items-center py-8 gap-3">
              <AlertTriangle size={18} className="text-risk-worried" />
              <p className="text-sm text-intel-muted">{error}</p>
              <button onClick={load} className="flex items-center gap-2 text-sm font-mono text-intel-gold border border-intel-gold/30 px-3 py-1.5 rounded hover:bg-intel-gold/10 transition-colors">
                <RefreshCw size={12} /> {t.retry}
              </button>
            </div>
          )}

          {!loading && data && (
            <div className="space-y-3 animate-in">
              <p className="text-sm text-intel-secondary leading-relaxed pb-2">
                {data.overallAssessment}
              </p>
              {data.conflicts.map((conflict) => (
                <ConflictCard key={conflict.id} conflict={conflict} updatedAt={data.updatedAt} t={t} />
              ))}
              <div className="flex items-center justify-between pt-1">
                <NextRefresh />
                <span className="text-[13px] font-mono text-intel-dim" title={new Date(data.updatedAt).toLocaleString()}>
                  {t.dataFrom} {new Date(data.updatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
