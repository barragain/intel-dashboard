'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

export type Language = 'en' | 'fr'

const translations = {
  en: {
    // App
    appName: 'INTEL',
    appSubtitle: 'Personal Financial Intelligence',
    lastUpdated: 'Updated',
    loading: 'Loading...',
    error: 'Error loading data',
    retry: 'Retry',
    live: 'LIVE',
    noApiKey: 'GEMINI_API_KEY not configured',
    noApiKeyDetail: 'Add your Gemini API key to .env.local to enable AI-powered analysis.',
    rateLimited: 'Rate limit hit — wait a minute and retry',
    configureKey: 'Configure API Key',
    loadData: 'Load Data',
    loadDataDesc: 'AI-powered — uses Gemini with live web search',
    loadDataEst: 'Est. 15–30 seconds',
    dataFrom: 'Data from',
    expertQuotes: 'Expert Quotes',
    newsSources: 'News Sources',
    sevenDayChange: '7d',

    // Sections
    section1Title: 'Personal Risk Meter',
    section1Subtitle: 'Should I be nervous right now?',
    section2Title: 'Economy Pulse',
    section2Subtitle: '5 economies, real-time',
    section3Title: 'Conflict & Tension Tracker',
    section3Subtitle: 'Active hotspots that affect you',
    section4Title: 'Market Sentiment',
    section4Subtitle: 'Community, institutions & prediction markets',
    section5Title: 'Crypto Sentiment Signal',
    section5Subtitle: 'What crypto is signaling about global risk appetite',
    section6Title: 'Historical Context',
    section6Subtitle: 'Parallels & expert predictions',

    // Risk levels
    stable: 'STABLE',
    watch: 'WATCH',
    worried: 'WORRIED',
    riskScore: 'Risk Score',
    keyDrivers: 'Key Drivers',
    riskSentenceStable: 'Conditions look stable',
    riskSentenceWatch: 'Keep an eye on things',
    riskSentenceWorried: 'High alert',

    // Economy
    improving: 'Improving',
    stable2: 'Stable',
    deteriorating: 'Deteriorating',
    gdp: 'GDP Growth',
    inflation: 'Inflation',
    unemployment: 'Unemployment',
    currency: 'vs USD',
    index: 'Index',
    fedRate: 'Fed Rate',
    oilPrice: 'Oil (WTI)',
    goldPrice: 'Gold',
    vix: 'VIX',
    dxy: 'DXY',

    // Economy names
    econGlobal: 'Global',
    econUS: 'United States',
    econTaiwan: 'Taiwan',
    econFrance: 'France',
    econParaguay: 'Paraguay',

    // Conflicts
    escalating: 'Escalating',
    conflictStable: 'Stable',
    deEscalating: 'De-escalating',
    whyItMatters: 'Why it matters to you',
    currentDetails: 'Current details',
    keyImpact: 'Key impact',
    overallAssessment: 'Overall assessment',

    // Sentiment
    bullish: 'Bullish',
    neutral: 'Neutral',
    bearish: 'Bearish',
    fearful: 'Fearful',
    overallMood: 'Overall Mood',
    communityVoices: 'Community & Institutional Voices',
    redditSentiment: 'What people are saying',
    predictionMarketsTitle: 'What prediction markets say',
    investmentRadar: 'Investment Radar',
    thesis: 'Thesis',
    riskLow: 'Low Risk',
    riskMedium: 'Medium Risk',
    riskHigh: 'High Risk',
    horizonShort: 'Short < 6 months',
    horizonMedium: 'Medium 6–18 months',
    horizonLong: 'Long 2+ years',
    assets: 'Assets to consider',
    caveat: 'Important caveat',
    profitCalc: 'Profit Calculator',
    calculateProfit: 'Calculate profit',
    percentYearEst: '%/yr est.',
    sourceTypeCommunity: 'Community',
    sourceTypeInstitutional: 'Institutional',
    sourceTypePrediction: 'Prediction Mkt',
    calcAmount: 'Investment (USD)',
    calcMonths: 'Time (months)',
    calcConservative: 'Conservative',
    calcExpected: 'Expected',
    calcOptimistic: 'Optimistic',
    calcProjected: 'Projected value',
    calcReturn: 'Net return',
    calcDisclaimer: 'Based on historical asset class returns. Not financial advice.',

    // Crypto
    fearGreed: 'Fear & Greed Index',
    extremeFear: 'Extreme Fear',
    fear: 'Fear',
    cryptoNeutral: 'Neutral',
    greed: 'Greed',
    extremeGreed: 'Extreme Greed',
    totalMarketCap: 'Total Market Cap',
    dayChange: '24h Change',
    weekChange: '7d Change',
    macroSignal: 'Macro Signal',
    cryptoInterpretation: 'What crypto is signaling',

    // Historical
    historicalParallels: 'Historical Parallels',
    expertPredictions: 'Expert Predictions',
    currentSituation: 'Current situation',
    historicalEvent: 'Historical parallel',
    whatHappened: 'What happened',
    personalImplication: 'What this means for you',
    source: 'Source',
    timeframe: 'Timeframe',
    optimistic: 'Optimistic',
    pessimistic: 'Pessimistic',
    confidenceHigh: 'High confidence',
    confidenceMedium: 'Medium confidence',
    confidenceLow: 'Low confidence',
  },
  fr: {
    // App
    appName: 'INTEL',
    appSubtitle: 'Intelligence Financière Personnelle',
    lastUpdated: 'Mis à jour',
    loading: 'Chargement...',
    error: 'Erreur de chargement',
    retry: 'Réessayer',
    live: 'EN DIRECT',
    noApiKey: 'GEMINI_API_KEY non configurée',
    noApiKeyDetail: "Ajoutez votre clé API Gemini dans .env.local pour activer l'analyse IA.",
    rateLimited: 'Limite de débit atteinte — attendez une minute et réessayez',
    configureKey: 'Configurer la clé API',
    loadData: 'Charger les données',
    loadDataDesc: 'Propulsé par IA — utilise Gemini avec recherche web en direct',
    loadDataEst: 'Env. 15–30 secondes',
    dataFrom: 'Données du',
    expertQuotes: "Citations d'Experts",
    newsSources: "Sources d'Actualités",
    sevenDayChange: '7j',

    // Sections
    section1Title: 'Indicateur de Risque',
    section1Subtitle: 'Dois-je être inquiet en ce moment ?',
    section2Title: 'Pouls Économique',
    section2Subtitle: '5 économies en temps réel',
    section3Title: 'Suivi des Conflits',
    section3Subtitle: 'Points chauds qui vous affectent',
    section4Title: 'Sentiment du Marché',
    section4Subtitle: 'Communauté, institutions et marchés prédictifs',
    section5Title: 'Signal Crypto',
    section5Subtitle: "Ce que la crypto signale sur l'appétit au risque",
    section6Title: 'Contexte Historique',
    section6Subtitle: 'Parallèles et prédictions d\'experts',

    // Risk levels
    stable: 'STABLE',
    watch: 'VIGILANCE',
    worried: 'ALERTE',
    riskScore: 'Score de Risque',
    keyDrivers: 'Facteurs Clés',
    riskSentenceStable: 'La situation est stable',
    riskSentenceWatch: 'Restez vigilant',
    riskSentenceWorried: 'Alerte élevée',

    // Economy
    improving: 'En amélioration',
    stable2: 'Stable',
    deteriorating: 'En détérioration',
    gdp: 'Croissance PIB',
    inflation: 'Inflation',
    unemployment: 'Chômage',
    currency: 'vs USD',
    index: 'Indice',
    fedRate: 'Taux Fed',
    oilPrice: 'Pétrole (WTI)',
    goldPrice: 'Or',
    vix: 'VIX',
    dxy: 'DXY',

    // Economy names
    econGlobal: 'Mondial',
    econUS: 'États-Unis',
    econTaiwan: 'Taïwan',
    econFrance: 'France',
    econParaguay: 'Paraguay',

    // Conflicts
    escalating: 'En escalade',
    conflictStable: 'Stable',
    deEscalating: 'En désescalade',
    whyItMatters: 'Pourquoi cela vous concerne',
    currentDetails: 'Détails actuels',
    keyImpact: 'Impact principal',
    overallAssessment: 'Évaluation globale',

    // Sentiment
    bullish: 'Haussier',
    neutral: 'Neutre',
    bearish: 'Baissier',
    fearful: 'Craintif',
    overallMood: 'Humeur Générale',
    communityVoices: 'Voix Communautaires & Institutionnelles',
    redditSentiment: 'Ce que les gens disent',
    predictionMarketsTitle: 'Ce que disent les marchés prédictifs',
    investmentRadar: 'Radar Investissement',
    thesis: 'Thèse',
    riskLow: 'Risque Faible',
    riskMedium: 'Risque Moyen',
    riskHigh: 'Risque Élevé',
    horizonShort: 'Court < 6 mois',
    horizonMedium: 'Moyen 6–18 mois',
    horizonLong: 'Long 2+ ans',
    assets: 'Actifs à considérer',
    caveat: 'Mise en garde',
    profitCalc: 'Calculateur de Profit',
    calcAmount: 'Investissement (USD)',
    calcMonths: 'Durée (mois)',
    calcConservative: 'Conservateur',
    calcExpected: 'Attendu',
    calcOptimistic: 'Optimiste',
    calcProjected: 'Valeur projetée',
    calcReturn: 'Rendement net',
    calcDisclaimer: "Basé sur les rendements historiques. Pas un conseil financier.",
    calculateProfit: 'Calculer le profit',
    percentYearEst: '%/an est.',
    sourceTypeCommunity: 'Communauté',
    sourceTypeInstitutional: 'Institutionnel',
    sourceTypePrediction: 'Marché Préd.',

    // Crypto
    fearGreed: 'Indice Peur & Avidité',
    extremeFear: 'Peur Extrême',
    fear: 'Peur',
    cryptoNeutral: 'Neutre',
    greed: 'Avidité',
    extremeGreed: 'Avidité Extrême',
    totalMarketCap: 'Capitalisation Totale',
    dayChange: 'Variation 24h',
    weekChange: 'Variation 7j',
    macroSignal: 'Signal Macro',
    cryptoInterpretation: 'Ce que la crypto signale',

    // Historical
    historicalParallels: 'Parallèles Historiques',
    expertPredictions: "Prédictions d'Experts",
    currentSituation: 'Situation actuelle',
    historicalEvent: 'Parallèle historique',
    whatHappened: 'Ce qui s\'est passé',
    personalImplication: 'Ce que cela signifie pour vous',
    source: 'Source',
    timeframe: 'Horizon',
    optimistic: 'Optimiste',
    pessimistic: 'Pessimiste',
    confidenceHigh: 'Haute confiance',
    confidenceMedium: 'Confiance moyenne',
    confidenceLow: 'Faible confiance',
  },
} as const

export type TranslationKey = keyof typeof translations.en

type TranslationsType = typeof translations
type LanguageTranslations = TranslationsType[Language]

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: LanguageTranslations
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t: translations[language] }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
