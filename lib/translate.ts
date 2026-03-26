/**
 * Free translation via Google Translate's public endpoint.
 * No API key required. Used for FR/ES sections so those
 * don't need separate Gemini calls.
 *
 * Falls back to the original English text on any error.
 */

import type { RiskData, ConflictsData, HistoricalData, EconomiesData, CryptoData, AISectorData } from '@/lib/types'

const GT_URL = 'https://translate.googleapis.com/translate_a/single'

export async function translateText(text: string, lang: string): Promise<string> {
  if (!text || lang === 'en') return text
  try {
    const url = new URL(GT_URL)
    url.searchParams.set('client', 'gtx')
    url.searchParams.set('sl', 'en')
    url.searchParams.set('tl', lang)
    url.searchParams.set('dt', 't')
    url.searchParams.set('q', text)

    const res = await fetch(url.toString())
    if (!res.ok) return text
    // Response shape: [ [ ["translated chunk", "orig", ...], ... ], null, "en", ... ]
    const json = await res.json()
    const translated = (json[0] as [string][]).map((chunk) => chunk[0]).join('')
    return translated || text
  } catch {
    return text
  }
}

// ─── Route-specific helpers ───────────────────────────────────────────────────

export async function translateRiskData(data: RiskData, lang: string): Promise<RiskData> {
  const details = data.drivers.map((d) => d.detail)
  const whys = data.drivers.map((d) => d.whyItMatters ?? '')

  const results = await Promise.all([
    translateText(data.explanation, lang),
    ...details.map((t) => translateText(t, lang)),
    ...whys.map((t) => translateText(t, lang)),
  ])

  const explanation = results[0]
  const n = data.drivers.length
  const translatedDetails = results.slice(1, 1 + n)
  const translatedWhys = results.slice(1 + n)

  const drivers = data.drivers.map((d, i) => ({
    ...d,
    detail: translatedDetails[i] ?? d.detail,
    whyItMatters: translatedWhys[i] || d.whyItMatters,
  }))

  return { ...data, explanation, drivers }
}

export async function translateConflictsData(data: ConflictsData, lang: string): Promise<ConflictsData> {
  const relevances = data.conflicts.map((c) => c.relevance)
  const impacts = data.conflicts.map((c) => c.keyImpact)
  const details = data.conflicts.map((c) => c.details)

  const results = await Promise.all([
    translateText(data.overallAssessment, lang),
    ...relevances.map((t) => translateText(t, lang)),
    ...impacts.map((t) => translateText(t, lang)),
    ...details.map((t) => translateText(t, lang)),
  ])

  const overallAssessment = results[0]
  const n = data.conflicts.length
  const tRelevances = results.slice(1, 1 + n)
  const tImpacts = results.slice(1 + n, 1 + n * 2)
  const tDetails = results.slice(1 + n * 2)

  const conflicts = data.conflicts.map((c, i) => ({
    ...c,
    relevance: tRelevances[i] ?? c.relevance,
    keyImpact: tImpacts[i] ?? c.keyImpact,
    details: tDetails[i] ?? c.details,
  }))

  return { ...data, overallAssessment, conflicts }
}

export async function translateHistoricalData(data: HistoricalData, lang: string): Promise<HistoricalData> {
  const situations = data.parallels.map((p) => p.currentSituation)
  const happened = data.parallels.map((p) => p.whatHappened)
  const implications = data.parallels.map((p) => p.personalImplication)
  const predictions = data.predictions.map((p) => p.prediction)

  const results = await Promise.all([
    ...situations.map((t) => translateText(t, lang)),
    ...happened.map((t) => translateText(t, lang)),
    ...implications.map((t) => translateText(t, lang)),
    ...predictions.map((t) => translateText(t, lang)),
  ])

  const n = data.parallels.length
  const m = data.predictions.length
  const tSituations = results.slice(0, n)
  const tHappened = results.slice(n, n * 2)
  const tImplications = results.slice(n * 2, n * 3)
  const tPredictions = results.slice(n * 3, n * 3 + m)

  const parallels = data.parallels.map((p, i) => ({
    ...p,
    currentSituation: tSituations[i] ?? p.currentSituation,
    whatHappened: tHappened[i] ?? p.whatHappened,
    personalImplication: tImplications[i] ?? p.personalImplication,
  }))

  const translatedPredictions = data.predictions.map((p, i) => ({
    ...p,
    prediction: tPredictions[i] ?? p.prediction,
  }))

  return { ...data, parallels, predictions: translatedPredictions }
}

export async function translateEconomiesData(data: EconomiesData, lang: string): Promise<EconomiesData> {
  const summaries = data.economies.map((e) => e.summary)
  const translated = await Promise.all(summaries.map((s) => translateText(s, lang)))
  const economies = data.economies.map((e, i) => ({ ...e, summary: translated[i] ?? e.summary }))
  return { ...data, economies }
}

export async function translateCryptoData(data: CryptoData, lang: string): Promise<CryptoData> {
  const [interpretation, macroSignal] = await Promise.all([
    translateText(data.interpretation, lang),
    translateText(data.macroSignal, lang),
  ])
  return { ...data, interpretation, macroSignal }
}

export async function translateAISectorData(data: AISectorData, lang: string): Promise<AISectorData> {
  const [summary, personal_angle, label, interpretation] = await Promise.all([
    translateText(data.momentum.summary, lang),
    translateText(data.momentum.personal_angle, lang),
    translateText(data.momentum.label, lang),
    translateText(data.vcxGauge.interpretation, lang),
  ])
  return {
    ...data,
    momentum: { ...data.momentum, summary, personal_angle, label },
    vcxGauge: { ...data.vcxGauge, interpretation },
  }
}
