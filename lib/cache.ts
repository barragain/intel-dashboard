interface CacheEntry {
  data: unknown
  timestamp: number
}

// Persist across Next.js hot module replacement in dev mode.
// Without globalThis, every file save resets the Map and Gemini is called on every reload.
declare global {
  // eslint-disable-next-line no-var
  var __intelCacheStore: Map<string, CacheEntry> | undefined
}
const store: Map<string, CacheEntry> =
  globalThis.__intelCacheStore ??
  (globalThis.__intelCacheStore = new Map())

const TTL: Record<string, number> = {
  crypto: 5 * 60 * 1000,        // 5 min — live market data
  economies: 10 * 60 * 1000,    // 10 min — live market data
  risk: 24 * 60 * 60 * 1000,    // 24 hours — AI analysis
  conflicts: 24 * 60 * 60 * 1000,
  historical: 24 * 60 * 60 * 1000,
}

export function getCached(key: string): unknown | null {
  const entry = store.get(key)
  if (!entry) {
    console.log(`[cache] MISS  ${key}`)
    return null
  }
  const baseKey = key.replace(/_(en|fr|es)$/, '')
  const ttl = TTL[baseKey] ?? TTL[key] ?? 15 * 60 * 1000
  if (Date.now() - entry.timestamp > ttl) {
    const ageMins = Math.round((Date.now() - entry.timestamp) / 60_000)
    console.log(`[cache] EXPIRED ${key} (age ${ageMins}m, ttl ${ttl / 60_000}m)`)
    store.delete(key)
    return null
  }
  const ageMins = Math.round((Date.now() - entry.timestamp) / 60_000)
  console.log(`[cache] HIT   ${key} (age ${ageMins}m)`)
  return entry.data
}

export function setCached(key: string, data: unknown): void {
  console.log(`[cache] SET   ${key}`)
  store.set(key, { data, timestamp: Date.now() })
}

export function clearAll(): void {
  store.clear()
  if (globalThis.__intelCacheStore) globalThis.__intelCacheStore.clear()
}
