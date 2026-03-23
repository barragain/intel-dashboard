interface CacheEntry {
  data: unknown
  timestamp: number
}

const store = new Map<string, CacheEntry>()

const TTL: Record<string, number> = {
  crypto: 5 * 60 * 1000,        // 5 min — live market data
  economies: 10 * 60 * 1000,    // 10 min — live market data
  risk: 24 * 60 * 60 * 1000,    // 24 hours — AI analysis
  conflicts: 24 * 60 * 60 * 1000,
  sentiment: 24 * 60 * 60 * 1000,
  historical: 24 * 60 * 60 * 1000,
}

export function getCached(key: string): unknown | null {
  const entry = store.get(key)
  if (!entry) return null
  const baseKey = key.replace(/_(en|fr|es)$/, '')
  const ttl = TTL[baseKey] ?? TTL[key] ?? 15 * 60 * 1000
  if (Date.now() - entry.timestamp > ttl) {
    store.delete(key)
    return null
  }
  return entry.data
}

export function setCached(key: string, data: unknown): void {
  store.set(key, { data, timestamp: Date.now() })
}

export function clearAll(): void {
  store.clear()
}
