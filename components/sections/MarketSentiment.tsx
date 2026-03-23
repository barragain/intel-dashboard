'use client'

import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import { fmtTimestamp } from '@/lib/utils'
import type { SentimentData, InvestmentOpportunity, RedditPost } from '@/lib/types'
import StatusBadge from '@/components/ui/StatusBadge'
import { AlertTriangle, RefreshCw, KeyRound, Calculator, ChevronDown, ChevronUp, Sparkles, ArrowUp, MessageSquare } from 'lucide-react'

const MOOD_TKEYS: Record<string, 'bullish' | 'bearish' | 'neutral' | 'fearful'> = {
  bullish: 'bullish', bearish: 'bearish', neutral: 'neutral', fearful: 'fearful',
}

const SOURCE_TYPE_TKEYS: Record<string, 'sourceTypeCommunity' | 'sourceTypeInstitutional' | 'sourceTypePrediction'> = {
  community: 'sourceTypeCommunity',
  institutional: 'sourceTypeInstitutional',
  prediction: 'sourceTypePrediction',
}

const RISK_TKEYS: Record<string, 'riskLow' | 'riskMedium' | 'riskHigh'> = {
  low: 'riskLow', medium: 'riskMedium', high: 'riskHigh',
}

const HORIZON_TKEYS: Record<string, 'horizonShort' | 'horizonMedium' | 'horizonLong'> = {
  short: 'horizonShort', medium: 'horizonMedium', long: 'horizonLong',
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

function ProfitCalc({ opp, t }: { opp: InvestmentOpportunity; t: ReturnType<typeof useLanguage>['t'] }) {
  const [amount, setAmount] = useState(1000)
  const [months, setMonths] = useState(12)
  const result = calcProjection(amount, opp.expectedAnnualReturn, opp.volatility, months)
  return (
    <div className="mt-3 pt-3 border-t border-intel-border/50 space-y-3">
      <div className="flex items-center gap-2 text-[13px] font-mono text-intel-gold uppercase tracking-wider">
        <Calculator size={11} />
        {t.profitCalc}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[13px] font-mono text-intel-muted block mb-1">{t.calcAmount}</label>
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
          <label className="text-[13px] font-mono text-intel-muted block mb-1">
            {t.calcMonths}: <span className="text-intel-gold">{months}</span>
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
          { label: t.calcConservative, value: result.conservative, color: 'text-trend-down' },
          { label: t.calcExpected, value: result.expected, color: 'text-intel-text' },
          { label: t.calcOptimistic, value: result.optimistic, color: 'text-trend-up' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-intel-bg rounded border border-intel-border p-2 text-center">
            <span className="text-[13px] font-mono text-intel-muted block">{label}</span>
            <span className={`text-sm font-mono font-bold tabular-nums ${color}`}>{fmtUSD(value)}</span>
            <span className={`text-[13px] font-mono ${color}`}>{fmtReturn(amount, value)}</span>
          </div>
        ))}
      </div>
      <p className="text-[13px] text-intel-dim italic">{t.calcDisclaimer}</p>
    </div>
  )
}

function OpportunityCard({ opp, t }: { opp: InvestmentOpportunity; t: ReturnType<typeof useLanguage>['t'] }) {
  const [showCalc, setShowCalc] = useState(false)
  const riskKey = RISK_TKEYS[opp.riskLevel]
  const horizonKey = HORIZON_TKEYS[opp.timeHorizon]
  const riskLabel = riskKey ? t[riskKey] : opp.riskLevel
  const horizonLabel = horizonKey ? t[horizonKey] : opp.timeHorizon

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
          <span className="text-[13px] font-mono text-intel-muted border border-intel-border rounded px-1.5 py-0.5">
            {horizonLabel}
          </span>
          <span className="text-[13px] font-mono text-intel-gold border border-intel-gold/30 rounded px-1.5 py-0.5">
            ~{(opp.expectedAnnualReturn * 100).toFixed(0)}{t.percentYearEst}
          </span>
        </div>
        <p className="text-sm text-intel-secondary leading-relaxed mb-2">{opp.thesis}</p>
        {opp.assets && opp.assets.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {opp.assets.map((a) => (
              <span key={a} className="text-[13px] font-mono bg-intel-bg border border-intel-border rounded px-1.5 py-0.5 text-intel-secondary">
                {a}
              </span>
            ))}
          </div>
        )}
        {opp.caveat && (
          <p className="mt-2 text-[13px] text-intel-muted italic border-l-2 border-intel-border pl-2">
            {opp.caveat}
          </p>
        )}

        <button
          onClick={() => setShowCalc(!showCalc)}
          className="mt-3 flex items-center gap-1 text-[13px] font-mono text-intel-gold hover:text-intel-gold-bright transition-colors"
        >
          <Calculator size={11} />
          {t.calculateProfit}
          {showCalc ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        {showCalc && <ProfitCalc opp={opp} t={t} />}
      </div>
    </div>
  )
}

function selectDisplayPosts(posts: RedditPost[]): RedditPost[] {
  const bySub = new Map<string, RedditPost>()
  for (const post of posts) {
    const existing = bySub.get(post.subreddit)
    if (!existing || post.score > existing.score) bySub.set(post.subreddit, post)
  }
  return Array.from(bySub.values()).slice(0, 3)
}

function RedditPostCard({ post }: { post: RedditPost }) {
  const [expanded, setExpanded] = useState(false)
  const displayComments = post.topComments.slice(0, 2)

  return (
    <div className="bg-intel-elevated rounded-lg border border-intel-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left hover:bg-intel-elevated/70 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          <span className="text-[13px] font-mono text-intel-gold border border-intel-gold/30 rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5">
            r/{post.subreddit}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-intel-text leading-snug">{post.title}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-[13px] font-mono text-intel-muted">
                <ArrowUp size={11} />
                {post.score.toLocaleString()}
              </span>
              {post.numComments > 0 && (
                <span className="flex items-center gap-1 text-[13px] font-mono text-intel-dim">
                  <MessageSquare size={10} />
                  {post.numComments.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          {displayComments.length > 0 && (
            expanded
              ? <ChevronUp size={13} className="text-intel-muted flex-shrink-0 mt-1" />
              : <ChevronDown size={13} className="text-intel-muted flex-shrink-0 mt-1" />
          )}
        </div>
      </button>

      {expanded && displayComments.length > 0 && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-intel-border/40 animate-in">
          {displayComments.map((comment) => (
            <div key={comment.id} className="pt-2.5 pl-3 border-l-2 border-intel-border">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-mono text-intel-gold">u/{comment.author}</span>
                <span className="flex items-center gap-0.5 text-[13px] font-mono text-intel-dim">
                  <ArrowUp size={10} />
                  {comment.score.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-intel-secondary leading-relaxed">{comment.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MarketSentiment({ autoLoadDelay }: { autoLoadDelay?: number }) {
  const { t, language } = useLanguage()
  const [data, setData] = useState<SentimentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsApiKey, setNeedsApiKey] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNeedsApiKey(false)
    try {
      const res = await fetch(`/api/sentiment?lang=${language}`)
      const json = await res.json()
      if (!res.ok) {
        if (json.needsApiKey) { setNeedsApiKey(true); setError(t.noApiKey) }
        else if (json.rateLimited) { setError(t.rateLimited) }
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

  useEffect(() => {
    if (autoLoadDelay === undefined) return
    const timer = setTimeout(load, autoLoadDelay)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const moodTKey = data ? MOOD_TKEYS[data.overallMood] : undefined
  const moodLabel = moodTKey ? t[moodTKey] : (data?.overallMood ?? '')

  return (
    <section aria-labelledby="sentiment-title">
      <div className="bg-intel-surface border border-intel-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-intel-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-intel-gold" />
              <span className="text-[13px] font-mono text-intel-gold tracking-[0.2em] uppercase">Section 04</span>
            </div>
            <h2 className="font-display font-bold text-xl text-intel-text" id="sentiment-title">
              {t.section4Title}
            </h2>
            <p className="text-sm text-intel-muted mt-0.5">{t.section4Subtitle}</p>
          </div>
          {data && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[13px] font-mono text-intel-muted uppercase">{t.overallMood}</div>
                <StatusBadge status={moodLabel} variant={data.overallMood} size="md" />
              </div>
              <button onClick={load} className="text-intel-dim hover:text-intel-gold transition-colors" aria-label={t.retry}>
                <RefreshCw size={13} />
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
                <p className="text-sm text-intel-muted">{t.loadDataDesc}</p>
                <p className="text-[13px] font-mono text-intel-dim">{t.loadDataEst}</p>
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
              {/* Part A — Sentiment voices */}
              <div>
                <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em] mb-4">
                  {t.communityVoices}
                </h3>
                <div className="space-y-3">
                  {data.items.map((item, i) => (
                    <div key={i} className="bg-intel-elevated rounded-lg border border-intel-border p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-intel-text">{item.source}</span>
                          <span className="text-[13px] font-mono text-intel-dim border border-intel-border rounded px-1 py-0.5">
                            {t[SOURCE_TYPE_TKEYS[item.sourceType]] ?? item.sourceType}
                          </span>
                        </div>
                        <StatusBadge
                          status={t[MOOD_TKEYS[item.mood]] ?? item.mood}
                          variant={item.mood}
                          size="sm"
                        />
                      </div>
                      <p className="text-sm text-intel-secondary leading-relaxed">{item.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Part B — Investment radar */}
              <div>
                <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em] mb-4">
                  {t.investmentRadar}
                </h3>
                <div className="space-y-3">
                  {data.opportunities.map((opp) => (
                    <OpportunityCard key={opp.id} opp={opp} t={t} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reddit posts */}
          {data?.redditPosts && data.redditPosts.length > 0 && (() => {
            const displayPosts = selectDisplayPosts(data.redditPosts!)
            if (displayPosts.length === 0) return null
            return (
              <div className="mt-6 border-t border-intel-border pt-6 animate-in">
                <h3 className="text-[13px] font-mono text-intel-muted uppercase tracking-[0.2em] mb-4">
                  {t.redditSentiment}
                </h3>
                <div className="space-y-3">
                  {displayPosts.map((post) => (
                    <RedditPostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )
          })()}

          {data && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <span className="text-[13px] font-mono text-intel-dim">
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
          )}
        </div>
      </div>
    </section>
  )
}
