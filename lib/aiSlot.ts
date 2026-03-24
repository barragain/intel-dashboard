/**
 * Returns a string that changes at 09:00 and 21:00 Taiwan time (UTC+8).
 * Used as an argument to unstable_cache so the cache key naturally
 * rotates twice per day without needing revalidateTag.
 *
 * Slot A: 01:00–13:00 UTC  =  09:00–21:00 Taiwan
 * Slot B: 13:00–01:00 UTC  =  21:00–09:00 Taiwan
 */
export function getAISlot(): string {
  const now = new Date()
  const utcH = now.getUTCHours()
  let slotDate = now.toISOString().slice(0, 10) // YYYY-MM-DD
  let slotName: string

  if (utcH >= 13) {
    slotName = 'evening'
  } else if (utcH >= 1) {
    slotName = 'morning'
  } else {
    // 00:xx UTC = still in previous day's evening slot
    const prev = new Date(now.getTime() - 24 * 3600 * 1000)
    slotDate = prev.toISOString().slice(0, 10)
    slotName = 'evening'
  }

  return `${slotDate}-${slotName}`
}
