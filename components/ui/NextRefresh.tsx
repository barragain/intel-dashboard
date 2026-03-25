'use client'

import { useEffect, useState } from 'react'

/**
 * Calculates seconds until the next AI slot change.
 * Slots change at 01:00 UTC (9am Taiwan) and 13:00 UTC (9pm Taiwan).
 */
function secondsUntilNextSlot(): number {
  const now = new Date()
  const total = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()
  const slot1 = 1 * 3600   // 01:00 UTC = 09:00 Taiwan
  const slot2 = 13 * 3600  // 13:00 UTC = 21:00 Taiwan
  const day = 24 * 3600

  if (total < slot1) return slot1 - total
  if (total < slot2) return slot2 - total
  return day - total + slot1
}

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * Shows a live countdown to the next data refresh (9am / 9pm Taiwan time).
 */
export default function NextRefresh() {
  const [label, setLabel] = useState('')

  useEffect(() => {
    const update = () => setLabel(fmt(secondsUntilNextSlot()))
    update()
    const id = setInterval(update, 1_000)
    return () => clearInterval(id)
  }, [])

  if (!label) return null
  return (
    <span className="text-[11px] font-mono text-intel-dim" title="Refreshes at 9am and 9pm Taiwan time">
      ↻ {label}
    </span>
  )
}
