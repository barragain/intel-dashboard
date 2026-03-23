// ─── Risk Meter ───────────────────────────────────────────────────────────────

export type RiskLevel = 'STABLE' | 'WATCH' | 'WORRIED'

export interface RiskDriver {
  name: string
  impact: 'positive' | 'negative' | 'neutral'
  detail: string
  whyItMatters?: string // 2-sentence hover explanation
}

export interface RiskData {
  status: RiskLevel
  score: number // 0–100
  explanation: string
  drivers: RiskDriver[]
  quotes: Quote[]
  sources: NewsSource[]
  updatedAt: string
}

// ─── Economy Pulse ────────────────────────────────────────────────────────────

export type TrendDirection = 'improving' | 'stable' | 'deteriorating'
export type EconomyStatus = 'green' | 'yellow' | 'red'

export interface EconomyIndicator {
  label: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
}

export interface EconomyCard {
  id: string
  name: string
  emoji: string
  indicators: EconomyIndicator[]
  summary: string
  direction: TrendDirection
  status: EconomyStatus
}

export interface EconomiesData {
  economies: EconomyCard[]
  updatedAt: string
}

// ─── Conflict Tracker ─────────────────────────────────────────────────────────

export type ConflictStatus = 'escalating' | 'stable' | 'de-escalating'

export interface Conflict {
  id: string
  name: string
  location: string
  relevance: string
  status: ConflictStatus
  keyImpact: string
  details: string
  headlines?: string[] // 1-2 real news headlines from search grounding
}

export interface ConflictsData {
  conflicts: Conflict[]
  overallAssessment: string
  quotes: Quote[]
  sources: NewsSource[]
  updatedAt: string
}

// ─── Market Sentiment ─────────────────────────────────────────────────────────

export type MarketMood = 'bullish' | 'neutral' | 'bearish' | 'fearful'
export type InvestRisk = 'low' | 'medium' | 'high'
export type TimeHorizon = 'short' | 'medium' | 'long'

export interface SentimentItem {
  source: string
  sourceType: 'community' | 'institutional' | 'prediction'
  mood: MarketMood
  summary: string
}

export interface InvestmentOpportunity {
  id: string
  title: string
  thesis: string
  riskLevel: InvestRisk
  timeHorizon: TimeHorizon
  assets: string[]
  expectedAnnualReturn: number // decimal, e.g. 0.10 = 10%
  volatility: number // standard deviation as decimal
  caveat: string
}

export interface RedditComment {
  id: string
  text: string
  score: number
  author: string
}

export interface RedditPost {
  id: string
  title: string
  score: number
  numComments: number
  subreddit: string
  url: string
  topComments: RedditComment[]
}

export interface PredictionMarket {
  id: string
  question: string
  probability: number // 0–1, represents "Yes" probability
  source: 'polymarket'
  volume?: number
  url?: string
}

export interface SentimentData {
  overallMood: MarketMood
  items: SentimentItem[]
  opportunities: InvestmentOpportunity[]
  redditPosts?: RedditPost[]
  predictionMarkets?: PredictionMarket[]
  predictionMarketsAnalysis?: string
  quotes: Quote[]
  sources: NewsSource[]
  updatedAt: string
}

// ─── Crypto Signal ────────────────────────────────────────────────────────────

export interface CryptoAsset {
  id: string
  symbol: string
  name: string
  price: number
  priceChange24h: number
  priceChange7d: number
  marketCap: number
  sparkline?: number[]
}

export interface CryptoData {
  assets: CryptoAsset[]
  totalMarketCap: number
  totalMarketCapChange24h: number
  fearGreedIndex: number
  fearGreedLabel: string
  fearGreedHistory: { value: number; timestamp: number }[]
  interpretation: string
  macroSignal: string
  updatedAt: string
}

// ─── Historical Context ───────────────────────────────────────────────────────

export interface HistoricalParallel {
  id: string
  currentSituation: string
  historicalEvent: string
  period: string
  whatHappened: string
  personalImplication: string
}

export type PredictionSentiment = 'optimistic' | 'pessimistic' | 'neutral'
export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface ExpertPrediction {
  source: string
  prediction: string
  timeframe: string
  sentiment: PredictionSentiment
  confidence: ConfidenceLevel
}

export interface HistoricalData {
  parallels: HistoricalParallel[]
  predictions: ExpertPrediction[]
  quotes: Quote[]
  sources: NewsSource[]
  updatedAt: string
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface Quote {
  text: string
  author: string
  institution: string
  date: string
}

export interface NewsSource {
  title: string
  source: string
  date: string
}

export interface ApiError {
  error: string
  needsApiKey?: boolean
}
