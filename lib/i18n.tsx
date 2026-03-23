'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

export type Language = 'en' | 'fr' | 'es'

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
    supportingHeadlines: 'Supporting headlines',
    latestHeadline: 'Latest',

    // Sentiment
    bullish: 'Bullish',
    neutral: 'Neutral',
    bearish: 'Bearish',
    fearful: 'Fearful',
    overallMood: 'Overall Mood',
    communityVoices: 'Community & Institutional Voices',
    redditSentiment: 'What people are saying',
    predictionMarketsTitle: 'What prediction markets say',
    whatThisMeans: 'What this means',
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
    thirtyDayHistory: '30-Day History',

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

    // Metric tooltips (Economy Pulse)
    metricVIX: 'Measures how nervous the US stock market is right now. Higher = more fear, lower = more calm.',
    metricDXY: 'Tracks the US dollar against major currencies. Higher = stronger dollar, which tightens financial conditions worldwide.',
    metricSP500: 'Index of the 500 biggest US companies. When it rises, US stocks are doing well overall.',
    metricGold: 'Price of gold per ounce in USD. Rises when investors are scared and want a safe place to park money.',
    metricOilWTI: 'US benchmark crude oil price. Higher oil raises costs for shipping, manufacturing, and everyday life globally.',
    metricTAIEX: "Taiwan's main stock market index. Tracks how Taiwan's economy and tech sector are performing.",
    metricTWDUSD: 'How many Taiwanese dollars equal one US dollar. A higher number means the TWD is weaker vs the dollar.',
    metricCAC40: "France's top 40 companies by market cap. Rises and falls with the French and broader EU economy.",
    metricEURUSD: 'How many US dollars one euro buys. Higher = stronger euro. Relevant for anyone earning or spending in European markets.',
    metricPYGUSD: "How many Paraguayan guaraníes equal one US dollar. Tracks Paraguay's currency stability.",
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
    section6Subtitle: "Parallèles et prédictions d'experts",

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
    supportingHeadlines: "Titres d'appui",
    latestHeadline: 'Récent',

    // Sentiment
    bullish: 'Haussier',
    neutral: 'Neutre',
    bearish: 'Baissier',
    fearful: 'Craintif',
    overallMood: 'Humeur Générale',
    communityVoices: 'Voix Communautaires & Institutionnelles',
    redditSentiment: 'Ce que les gens disent',
    predictionMarketsTitle: 'Ce que disent les marchés prédictifs',
    whatThisMeans: 'Ce que cela signifie',
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
    calculateProfit: 'Calculer le profit',
    percentYearEst: '%/an est.',
    sourceTypeCommunity: 'Communauté',
    sourceTypeInstitutional: 'Institutionnel',
    sourceTypePrediction: 'Marché Préd.',
    calcAmount: 'Investissement (USD)',
    calcMonths: 'Durée (mois)',
    calcConservative: 'Conservateur',
    calcExpected: 'Attendu',
    calcOptimistic: 'Optimiste',
    calcProjected: 'Valeur projetée',
    calcReturn: 'Rendement net',
    calcDisclaimer: "Basé sur les rendements historiques. Pas un conseil financier.",

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
    thirtyDayHistory: 'Historique 30 jours',

    // Historical
    historicalParallels: 'Parallèles Historiques',
    expertPredictions: "Prédictions d'Experts",
    currentSituation: 'Situation actuelle',
    historicalEvent: 'Parallèle historique',
    whatHappened: "Ce qui s'est passé",
    personalImplication: 'Ce que cela signifie pour vous',
    source: 'Source',
    timeframe: 'Horizon',
    optimistic: 'Optimiste',
    pessimistic: 'Pessimiste',
    confidenceHigh: 'Haute confiance',
    confidenceMedium: 'Confiance moyenne',
    confidenceLow: 'Faible confiance',

    // Metric tooltips
    metricVIX: "Mesure le niveau de nervosité du marché boursier américain. Plus élevé = plus de peur, plus bas = plus calme.",
    metricDXY: "Suit le dollar américain par rapport aux principales monnaies. Plus élevé = dollar plus fort, ce qui resserre les conditions financières mondiales.",
    metricSP500: "Indice des 500 plus grandes entreprises américaines. Quand il monte, les actions américaines vont globalement bien.",
    metricGold: "Prix de l'or par once en USD. Augmente quand les investisseurs ont peur et cherchent un refuge sûr.",
    metricOilWTI: "Prix de référence du pétrole brut américain. Un pétrole plus cher augmente les coûts de transport, de fabrication et du quotidien.",
    metricTAIEX: "Principal indice boursier de Taïwan. Suit la performance de l'économie taïwanaise et du secteur technologique.",
    metricTWDUSD: "Combien de dollars taïwanais valent un dollar américain. Un nombre plus élevé signifie que le TWD est plus faible.",
    metricCAC40: "Les 40 premières entreprises françaises par capitalisation boursière. Suit l'économie française et européenne.",
    metricEURUSD: "Combien de dollars américains achète un euro. Plus élevé = euro plus fort. Pertinent pour ceux qui gagnent ou dépensent en euros.",
    metricPYGUSD: "Combien de guaranis paraguayens valent un dollar américain. Suit la stabilité monétaire du Paraguay.",
  },

  es: {
    // App
    appName: 'INTEL',
    appSubtitle: 'Inteligencia Financiera Personal',
    lastUpdated: 'Actualizado',
    loading: 'Cargando...',
    error: 'Error al cargar datos',
    retry: 'Reintentar',
    live: 'EN VIVO',
    noApiKey: 'GEMINI_API_KEY no configurada',
    noApiKeyDetail: 'Añade tu clave API de Gemini en .env.local para activar el análisis con IA.',
    rateLimited: 'Límite de solicitudes alcanzado — espera un minuto y vuelve a intentarlo',
    configureKey: 'Configurar clave API',
    loadData: 'Cargar datos',
    loadDataDesc: 'Con IA — usa Gemini con búsqueda web en vivo',
    loadDataEst: 'Est. 15–30 segundos',
    dataFrom: 'Datos del',
    expertQuotes: 'Citas de Expertos',
    newsSources: 'Fuentes de Noticias',
    sevenDayChange: '7d',

    // Sections
    section1Title: 'Medidor de Riesgo',
    section1Subtitle: '¿Debo estar nervioso ahora?',
    section2Title: 'Pulso Económico',
    section2Subtitle: '5 economías en tiempo real',
    section3Title: 'Rastreador de Conflictos',
    section3Subtitle: 'Puntos calientes que te afectan',
    section4Title: 'Sentimiento del Mercado',
    section4Subtitle: 'Comunidad, instituciones y mercados predictivos',
    section5Title: 'Señal Cripto',
    section5Subtitle: 'Lo que la cripto señala sobre el apetito al riesgo global',
    section6Title: 'Contexto Histórico',
    section6Subtitle: 'Paralelos y predicciones de expertos',

    // Risk levels
    stable: 'ESTABLE',
    watch: 'VIGILAR',
    worried: 'ALERTA',
    riskScore: 'Puntuación de Riesgo',
    keyDrivers: 'Factores Clave',
    riskSentenceStable: 'La situación es estable',
    riskSentenceWatch: 'Presta atención',
    riskSentenceWorried: 'Alerta elevada',

    // Economy
    improving: 'Mejorando',
    stable2: 'Estable',
    deteriorating: 'Deteriorando',
    gdp: 'Crecimiento PIB',
    inflation: 'Inflación',
    unemployment: 'Desempleo',
    currency: 'vs USD',
    index: 'Índice',
    fedRate: 'Tasa Fed',
    oilPrice: 'Petróleo (WTI)',
    goldPrice: 'Oro',
    vix: 'VIX',
    dxy: 'DXY',

    // Economy names
    econGlobal: 'Global',
    econUS: 'Estados Unidos',
    econTaiwan: 'Taiwán',
    econFrance: 'Francia',
    econParaguay: 'Paraguay',

    // Conflicts
    escalating: 'Escalando',
    conflictStable: 'Estable',
    deEscalating: 'Desescalando',
    whyItMatters: 'Por qué importa',
    currentDetails: 'Detalles actuales',
    keyImpact: 'Impacto clave',
    overallAssessment: 'Evaluación general',
    supportingHeadlines: 'Titulares de apoyo',
    latestHeadline: 'Reciente',

    // Sentiment
    bullish: 'Alcista',
    neutral: 'Neutral',
    bearish: 'Bajista',
    fearful: 'Temeroso',
    overallMood: 'Sentimiento General',
    communityVoices: 'Voces Comunitarias e Institucionales',
    redditSentiment: 'Lo que dice la gente',
    predictionMarketsTitle: 'Lo que dicen los mercados predictivos',
    whatThisMeans: 'Lo que esto significa',
    investmentRadar: 'Radar de Inversión',
    thesis: 'Tesis',
    riskLow: 'Riesgo Bajo',
    riskMedium: 'Riesgo Medio',
    riskHigh: 'Riesgo Alto',
    horizonShort: 'Corto < 6 meses',
    horizonMedium: 'Medio 6–18 meses',
    horizonLong: 'Largo 2+ años',
    assets: 'Activos a considerar',
    caveat: 'Advertencia importante',
    profitCalc: 'Calculadora de Ganancias',
    calculateProfit: 'Calcular ganancia',
    percentYearEst: '%/año est.',
    sourceTypeCommunity: 'Comunidad',
    sourceTypeInstitutional: 'Institucional',
    sourceTypePrediction: 'Mercado Pred.',
    calcAmount: 'Inversión (USD)',
    calcMonths: 'Tiempo (meses)',
    calcConservative: 'Conservador',
    calcExpected: 'Esperado',
    calcOptimistic: 'Optimista',
    calcProjected: 'Valor proyectado',
    calcReturn: 'Rendimiento neto',
    calcDisclaimer: 'Basado en rendimientos históricos. No es asesoramiento financiero.',

    // Crypto
    fearGreed: 'Índice Miedo y Codicia',
    extremeFear: 'Miedo Extremo',
    fear: 'Miedo',
    cryptoNeutral: 'Neutral',
    greed: 'Codicia',
    extremeGreed: 'Codicia Extrema',
    totalMarketCap: 'Cap. Total del Mercado',
    dayChange: 'Cambio 24h',
    weekChange: 'Cambio 7d',
    macroSignal: 'Señal Macro',
    cryptoInterpretation: 'Lo que señala la cripto',
    thirtyDayHistory: 'Historial de 30 días',

    // Historical
    historicalParallels: 'Paralelos Históricos',
    expertPredictions: 'Predicciones de Expertos',
    currentSituation: 'Situación actual',
    historicalEvent: 'Paralelo histórico',
    whatHappened: 'Lo que sucedió',
    personalImplication: 'Lo que significa para ti',
    source: 'Fuente',
    timeframe: 'Horizonte temporal',
    optimistic: 'Optimista',
    pessimistic: 'Pesimista',
    confidenceHigh: 'Alta confianza',
    confidenceMedium: 'Confianza media',
    confidenceLow: 'Baja confianza',

    // Metric tooltips
    metricVIX: 'Mide el nerviosismo del mercado bursátil de EE.UU. Mayor = más miedo, menor = más calma.',
    metricDXY: 'Rastrea el dólar estadounidense frente a las principales divisas. Mayor = dólar más fuerte, lo que endurece las condiciones financieras globales.',
    metricSP500: 'Índice de las 500 mayores empresas de EE.UU. Cuando sube, las acciones estadounidenses van bien en general.',
    metricOilWTI: 'Precio de referencia del crudo estadounidense. El petróleo más caro encarece el transporte, la fabricación y la vida cotidiana.',
    metricGold: 'Precio del oro por onza en USD. Sube cuando los inversores tienen miedo y buscan un refugio seguro.',
    metricTAIEX: 'Principal índice bursátil de Taiwán. Refleja el desempeño de la economía taiwanesa y su sector tecnológico.',
    metricTWDUSD: 'Cuántos dólares taiwaneses equivalen a un dólar estadounidense. Un número mayor significa que el TWD está más débil.',
    metricCAC40: 'Las 40 mayores empresas de Francia por capitalización. Sube y baja con la economía francesa y de la UE.',
    metricEURUSD: 'Cuántos dólares estadounidenses compra un euro. Mayor = euro más fuerte. Relevante para quienes ganan o gastan en mercados europeos.',
    metricPYGUSD: 'Cuántos guaraníes paraguayos equivalen a un dólar estadounidense. Refleja la estabilidad monetaria de Paraguay.',
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
