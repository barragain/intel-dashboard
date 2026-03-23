interface CacheEntry {
  data: unknown
  timestamp: number
}

const store = new Map<string, CacheEntry>()

const TTL: Record<string, number> = {
  crypto: 5 * 60 * 1000,        // 5 min — market data refreshes frequently
  economies: 10 * 60 * 1000,    // 10 min
  risk: 24 * 60 * 60 * 1000,    // 24 hours — user triggers manually
  conflicts: 24 * 60 * 60 * 1000,
  sentiment: 24 * 60 * 60 * 1000,
  historical: 24 * 60 * 60 * 1000,
}

export function getCached(key: string): unknown | null {
  const entry = store.get(key)
  if (!entry) return null
  const ttl = TTL[key] ?? 15 * 60 * 1000
  if (Date.now() - entry.timestamp > ttl) {
    store.delete(key)
    return null
  }
  return entry.data
}

export function setCached(key: string, data: unknown): void {
  store.set(key, { data, timestamp: Date.now() })
}
