/**
 * Format a timestamp ISO string into a human-readable "data age" label.
 * Shows relative time when recent, full date+time when older (important for 24h cache).
 */
export function fmtTimestamp(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`

  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`

  // For data older than 24h, show the full date + time so user knows exactly when it's from
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
