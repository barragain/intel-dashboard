'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLanguage } from '@/lib/i18n'
import type { SentimentData, InvestmentOpportunity } from '@/lib/types'
import StatusBadge from '@/components/ui/StatusBadge'
import { AlertTriangle, RefreshCw, KeyRound, Calculator, ChevronDown, ChevronUp } from 'lucide-react'

const MOOD_LABELS: Record<string, { en: string; fr: string }> = {
  bullish: { en: 'Bullish', fr: 'Haussier' },
  bearish: { en: 'Bearish', fr: 'Baissier' },
  neutral: { en: 'Neutral', fr: 'Neutre' },
  fearful: { en: 'Fearful', fr: 'Craintif' },
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  community: 'Community',
  institutional: 'Institutional',
  prediction: 'Prediction Mkt',
}

const RISK_LABELS: Record<string, { en: string; fr: string }> = {
  low: { en: 'Low Risk', fr: 'Risque Faible' },
  medium: { en: 'Medium Risk', fr: 'Risque Moyen' },
  high: { en: 'High Risk', fr: 'Risque Élevé' },
}

const HORIZON_LABELS: Record<string, { en: string; fr: string }> = {
  short: { en: 'Short < 6mo', fr: 'Court < 6 mois' },
  medium: { en: 'Medium 6–18mo', fr: 'Moyen 6–18 mois' },
  long: { en: 'Long 2+ yr', fr: 'Long 2+ ans' },
}

function calcProjection(principal: number, annualReturn: number, volatility: number, months: number) {
  const years = months / 12
  const conservative = principal * Math.pow(1 + annualReturn * 0.45, years)
  const expected = principal * Math.pow(1 + annualReturn, years)
  const optimistic = principal * Math.pow(1 + annualReturn * 1.8, years)
  return { conservative, expected, optimistic }
}

function fmtUSD(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtReturn(principal: number, projected: number): string {
  const pct = ((projected - principal) / principal) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

function ProfitCalc({ opp, lang }: { opp: InvestmentOpportunity; lang: string }) {
  const [amount, setAmount] = useState(1000)
  const [months, setMonths] = useState(12)
  const result = calcProjection(amount, opp.expectedAnnualReturn, opp.volatility, months)
  const t_calc = {
    amount: lang === 'fr' ? 'Investissement (USD)' : 'Investment (USD)',
    months: lang === 'fr' ? 'Durée (mois)' : 'Duration (months)',
    conservative: lang === 'fr' ? 'Conservateur' : 'Conservative',
    expected: lang === 'fr' ? 'Attendu' : 'Expected',
    optimistic: lang === 'fr' ? 'Optimiste' : 'Optimistic',
    disclaimer: lang === 'fr' ? 'Basé sur rendements historiques. Pas un conseil financier.' : 'Based on historical asset class returns. Not financial advice.',
  }
  return (
    <div className="mt-3 pt-3 border-t border-intel-border/50 space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-mono text-intel-gold uppercase tracking-wider">
        <Calculator size={11} />
        {lang === 'fr' ? 'Calculateur de Profit' : 'Profit Calculator'}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-mono text-intel-muted block mb-1">{t_calc.amount}</label>
          <input
            type="number"
            value={amount}
            min={100}
            max={1000000}
            step={100}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
            className="w-full bg-intel-bg border border-intel-border rounded px-2 py-1.5 text-sm font-mono text-intel-text focus:border-intel-gold focus:outline-none tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono text-intel-muted block mb-1">
            {t_calc.months}: <span className="text-intel-gold">{months}</span>
          </label>
          <input
            type="range"
            value={months}
            min={1}
            max={60}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="w-full mt-1 accent-intel-gold"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: t_calc.conservative, value: result.conservative, color: 'text-trend-down' },
          { label: t_calc.expected, value: result.expected, color: 'text-intel-text' },
          { label: t_calc.optimistic, value: result.optimistic, color: 'text-trend-up' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-intel-bg rounded border border-intel-border p-2 text-center">
            <span className="text-[10px] font-mono text-intel-muted block">{label}</span>
            <span className={`text-sm font-mono font-bold tabular-nums ${color}`}>{fmtUSD(value)}</span>
            <span className={`text-[10px] font-mono ${color}`}>{fmtReturn(amount, value)}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-intel-dim italic">{t_calc.disclaimer}</p>
    </div>
  )
}

function OpportunityCard({ opp, lang }: { opp: InvestmentOpportunity; lang: string }) {
  const [showCalc, setShowCalc] = useState(false)
  const riskLabel = RISK_LABELS[opp.riskLevel]?.[lang as 'en' | 'fr'] ?? opp.riskLevel
  const horizonLabel = HORIZON_LABELS[opp.timeHorizon]?.[lang as 'en' | 'fr'] ?? opp.timeHorizon

  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="text-sm font-medium text-intel-text leading-tight">{opp.title}</h4>
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <StatusBadge status={riskLabel} variant={opp.riskLevel} size="sm" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-[10px] font-mono text-intel-muted border border-intel-border rounded px-1.5 py-0.5">
            {horizonLabel}
          </span>
          <span className="text-[10px] font-mono text-intel-gold border border-intel-gold/30 rounded px-1.5 py-0.5">
            ~{(opp.expectedAnnualReturn * 100).toFixed(0)}%/yr est.
          </span>
        </div>
        <p className="text-xs text-intel-secondary leading-relaxed mb-2">{opp.thesis}</p>
        {opp.assets && opp.assets.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {opp.assets.map((a) => (
              <span key={a} className="text-[10px] font-mono bg-intel-bg border border-intel-border rounded px-1.5 py-0.5 text-intel-secondary">
                {a}
              </span>
            ))}
          </div>
        )}
        {opp.caveat && (
          <p className="mt-2 text-[11px] text-intel-muted italic border-l-2 border-intel-border pl-2">
            {opp.caveat}
          </p>
        )}

        <button
          onClick={() => setShowCalc(!showCalc)}
          className="mt-3 flex items-center gap-1 text-[11px] font-mono text-intel-gold hover:text-intel-gold-bright transition-colors"
        >
          <Calculator size={11} />
          {lang === 'fr' ? 'Calculer le profit' : 'Calculate profit'}
          {showCalc ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        {showCalc && <ProfitCalc opp={opp} lang={lang} />}
      </div>
    </div>
  )
}

export default function MarketSentiment() {
  const { t, language } = useLanguage()
  const [data, setData] = useState<SentimentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsApiKey, setNeedsApiKey] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sentiment')
      const json = await res.json()
      if (!res.ok) {
        if (json.needsApiKey) { setNeedsApiKey(true); setError(t.noApiKey) }
        else setError(json.error ?? t.error)
        return
      }
      setData(json as SentimentData)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const moodLabel = data ? (MOOD_LABELS[data.overallMood]?.[language] ?? data.overallMood) : ''

  return (
    <section aria-labelledby="sentiment-title">
      <div className="bg-intel-surface border border-intel-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-intel-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-intel-gold" />
              <span className="text-[10px] font-mono text-intel-gold tracking-[0.2em] uppercase">Section 04</span>
            </div>
            <h2 className="font-display font-bold text-xl text-intel-text" id="sentiment-title">
              {t.section4Title}
            </h2>
            <p className="text-xs text-intel-muted mt-0.5">{t.section4Subtitle}</p>
          </div>
          {data && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] font-mono text-intel-muted uppercase">{t.overallMood}</div>
                <StatusBadge status={moodLabel} variant={data.overallMood} size="md" />
              </div>
              <button onClick={load} className="text-intel-dim hover:text-intel-gold transition-colors" aria-label={t.retry}>
                <RefreshCw size={13} />
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          {loading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-lg shimmer" aria-hidden="true" />)}
              </div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-lg shimmer" aria-hidden="true" />)}
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
              {/* Part A — Sentiment voices */}
              <div>
                <h3 className="text-[10px] font-mono text-intel-muted uppercase tracking-[0.2em] mb-4">
                  {t.communityVoices}
                </h3>
                <div className="space-y-3">
                  {data.items.map((item, i) => (
                    <div key={i} className="bg-intel-elevated rounded-lg border border-intel-border p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-intel-text">{item.source}</span>
                          <span className="text-[10px] font-mono text-intel-dim border border-intel-border rounded px-1 py-0.5">
                            {SOURCE_TYPE_LABELS[item.sourceType] ?? item.sourceType}
                          </span>
                        </div>
                        <StatusBadge
                          status={MOOD_LABELS[item.mood]?.[language] ?? item.mood}
                          variant={item.mood}
                          size="sm"
                        />
                      </div>
                      <p className="text-xs text-intel-secondary leading-relaxed">{item.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Part B — Investment radar */}
              <div>
                <h3 className="text-[10px] font-mono text-intel-muted uppercase tracking-[0.2em] mb-4">
                  {t.investmentRadar}
                </h3>
                <div className="space-y-3">
                  {data.opportunities.map((opp) => (
                    <OpportunityCard key={opp.id} opp={opp} lang={language} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {data && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <span className="text-[11px] font-mono text-intel-dim">
                {t.lastUpdated}: {new Date(data.updatedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
