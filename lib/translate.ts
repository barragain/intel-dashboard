/**
 * Free translation using the MyMemory public API.
 * No API key required. Free up to ~1000 words/day per IP.
 * Falls back to English silently on any error.
 *
 * Used for FR/ES in risk, conflicts, and historical routes so those
 * sections no longer require separate Gemini calls.
 */

import type { RiskData, ConflictsData, HistoricalData } from '@/lib/types'

const MYMEMORY = 'https://api.mymemory.translated.world/get'

export async function translateText(text: string, lang: string): Promise<string> {
  if (!text || lang === 'en') return text
  try {
    const res = await fetch(`${MYMEMORY}?q=${encodeURIComponent(text)}&langpair=en|${lang}`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return text
    const json = await res.json()
    if (json?.responseStatus === 200 && json?.responseData?.translatedText) {
      return json.responseData.translatedText as string
    }
    return text
  } catch {
    return text
  }
}

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
