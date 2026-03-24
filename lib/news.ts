/**
 * News aggregator — fetches headlines from GNews, The Guardian, NY Times, and Currents.
 * Results are deduplicated by title similarity and cached for 6 hours per topic.
 */

export interface NewsHeadline {
  title: string
  source: string
  date: string  // ISO 8601
  url: string
  provider: 'gnews' | 'guardian' | 'nytimes' | 'currents' | 'rss'
}

// ─── In-process cache (survives Next.js HMR in dev) ──────────────────────────

const NEWS_TTL = 6 * 60 * 60 * 1000 // 6 hours

interface NewsCacheEntry {
  data: NewsHeadline[]
  timestamp: number
}

declare global {
  // eslint-disable-next-line no-var
  var __newsCacheStore: Map<string, NewsCacheEntry> | undefined
}

const newsStore: Map<string, NewsCacheEntry> =
  globalThis.__newsCacheStore ?? (globalThis.__newsCacheStore = new Map())

// ─── Title deduplication ──────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or',
  'is', 'are', 'was', 'were', 'it', 'its', 'be', 'been', 'by', 'with',
  'from', 'as', 'that', 'this', 'these', 'those', 'how', 'what', 'why',
  'when', 'who', 'will', 'can', 'has', 'have', 'had', 'not', 'but',
  'after', 'over', 'into', 'about', 'more', 'up', 'out', 'new', 'says',
])

function tokenize(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const w of a) if (b.has(w)) intersection++
  const union = a.size + b.size - intersection
  return intersection / union
}

function deduplicate(headlines: NewsHeadline[]): NewsHeadline[] {
  const result: NewsHeadline[] = []
  const tokenSets = new Map<NewsHeadline, Set<string>>()

  for (const h of headlines) {
    const tokens = tokenize(h.title)
    const isDupe = result.some((r) => {
      const rt = tokenSets.get(r)!
      return jaccardSimilarity(tokens, rt) >= 0.5
    })
    if (!isDupe) {
      result.push(h)
      tokenSets.set(h, tokens)
    }
  }

  return result
}

// ─── Per-API fetchers ─────────────────────────────────────────────────────────

const FETCH_OPTS: RequestInit = {
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; INTEL-Dashboard/1.0)' },
  next: { revalidate: 0 },
}

/** GNews — https://gnews.io/docs */
async function fetchGNews(topic: string, since: Date): Promise<NewsHeadline[]> {
  const key = process.env.GNEWS_API_KEY
  if (!key) return []
  try {
    const params = new URLSearchParams({
      q: topic,
      lang: 'en',
      max: '10',
      sortby: 'publishedAt',
      from: since.toISOString(),
      token: key,
    })
    const res = await fetch(`https://gnews.io/api/v4/search?${params}`, FETCH_OPTS)
    if (!res.ok) {
      console.warn(`[news] GNews ${res.status}: ${await res.text().catch(() => '')}`)
      return []
    }
    const json = await res.json()
    return (json.articles ?? []).map((a: Record<string, unknown>) => ({
      title: (a.title as string) ?? '',
      source: (a.source as Record<string, string>)?.name ?? 'GNews',
      date: (a.publishedAt as string) ?? '',
      url: (a.url as string) ?? '',
      provider: 'gnews' as const,
    }))
  } catch (err) {
    console.warn('[news] GNews fetch failed:', err)
    return []
  }
}

/** The Guardian — https://open-platform.theguardian.com/documentation */
async function fetchGuardian(topic: string, since: Date): Promise<NewsHeadline[]> {
  const key = process.env.GUARDIAN_API_KEY
  if (!key) return []
  try {
    const params = new URLSearchParams({
      q: topic,
      'api-key': key,
      'order-by': 'newest',
      'page-size': '10',
      'from-date': since.toISOString().split('T')[0], // YYYY-MM-DD
    })
    const res = await fetch(
      `https://content.guardianapis.com/search?${params}`,
      FETCH_OPTS,
    )
    if (!res.ok) {
      console.warn(`[news] Guardian ${res.status}: ${await res.text().catch(() => '')}`)
      return []
    }
    const json = await res.json()
    return (json.response?.results ?? []).map((a: Record<string, string>) => ({
      title: a.webTitle ?? '',
      source: 'The Guardian',
      date: a.webPublicationDate ?? '',
      url: a.webUrl ?? '',
      provider: 'guardian' as const,
    }))
  } catch (err) {
    console.warn('[news] Guardian fetch failed:', err)
    return []
  }
}

/** NY Times Article Search — https://developer.nytimes.com/docs/articlesearch-product/1/overview */
async function fetchNYT(topic: string, since: Date): Promise<NewsHeadline[]> {
  const key = process.env.NYT_API_KEY
  if (!key) return []
  try {
    // begin_date format: YYYYMMDD
    const beginDate = since.toISOString().replace(/[-T:Z.]/g, '').slice(0, 8)
    const params = new URLSearchParams({
      q: topic,
      sort: 'newest',
      begin_date: beginDate,
      'api-key': key,
    })
    const res = await fetch(
      `https://api.nytimes.com/svc/search/v2/articlesearch.json?${params}`,
      FETCH_OPTS,
    )
    if (!res.ok) {
      console.warn(`[news] NYT ${res.status}: ${await res.text().catch(() => '')}`)
      return []
    }
    const json = await res.json()
    return (json.response?.docs ?? [])
      .slice(0, 10)
      .map((a: Record<string, unknown>) => ({
        title: (a.headline as Record<string, string>)?.main ?? '',
        source: (a.source as string) ?? 'The New York Times',
        date: (a.pub_date as string) ?? '',
        url: (a.web_url as string) ?? '',
        provider: 'nytimes' as const,
      }))
  } catch (err) {
    console.warn('[news] NYT fetch failed:', err)
    return []
  }
}

/** Currents API — https://currentsapi.services/en/docs */
async function fetchCurrents(topic: string, since: Date): Promise<NewsHeadline[]> {
  const key = process.env.CURRENTS_API_KEY
  if (!key) return []
  try {
    // start_date format: "YYYY-MM-DD HH:MM:SS"
    const startDate = since.toISOString().replace('T', ' ').slice(0, 19)
    const params = new URLSearchParams({
      keywords: topic,
      language: 'en',
      start_date: startDate,
      apiKey: key,
    })
    const res = await fetch(
      `https://api.currentsapi.services/v1/search?${params}`,
      FETCH_OPTS,
    )
    if (!res.ok) {
      console.warn(`[news] Currents ${res.status}: ${await res.text().catch(() => '')}`)
      return []
    }
    const json = await res.json()
    return (json.news ?? [])
      .slice(0, 10)
      .map((a: Record<string, string>) => ({
        title: a.title ?? '',
        source: a.author ?? 'Currents',
        date: a.published ?? '',
        url: a.url ?? '',
        provider: 'currents' as const,
      }))
  } catch (err) {
    console.warn('[news] Currents fetch failed:', err)
    return []
  }
}

// ─── Paraguay RSS ─────────────────────────────────────────────────────────────

const PARAGUAY_RSS_FEEDS = [
  'https://www.abc.com.py/arc/outboundfeeds/rss/nacionales/',
  'https://www.abc.com.py/arc/outboundfeeds/rss/noticias-del-dia/',
]

/**
 * Parses RSS 2.0 XML and returns raw item fields.
 * Handles both plain text and CDATA-wrapped values.
 */
function parseRssItems(xml: string): Array<{ title: string; url: string; pubDate: string }> {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/g) ?? []
  return items.map((item) => {
    const cdataOrText = (tag: string) => {
      const cdata = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))
      if (cdata) return cdata[1].trim()
      const plain = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
      return plain ? plain[1].trim() : ''
    }

    const title = cdataOrText('title')
    // <link> in RSS 2.0 may come as text node or be superseded by <guid isPermaLink="true">
    const link =
      cdataOrText('link') ||
      item.match(/<guid[^>]*isPermaLink="true"[^>]*>([\s\S]*?)<\/guid>/)?.[1]?.trim() ||
      cdataOrText('guid')
    const pubDate = cdataOrText('pubDate')

    return { title, url: link ?? '', pubDate }
  })
}

/**
 * Fetches headlines from ABC Paraguay RSS feeds.
 * Articles are in Spanish — Gemini handles Spanish natively; no translation needed.
 * Cached alongside the other providers within the shared 6-hour news cache.
 */
async function fetchParaguayRSS(since: Date): Promise<NewsHeadline[]> {
  const MAX_AGE = 7 * 24 * 60 * 60 * 1000
  const results: NewsHeadline[] = []

  await Promise.all(
    PARAGUAY_RSS_FEEDS.map(async (feedUrl) => {
      try {
        const res = await fetch(feedUrl, { ...FETCH_OPTS, next: { revalidate: 0 } })
        if (!res.ok) {
          console.warn(`[news] Paraguay RSS ${res.status}: ${feedUrl}`)
          return
        }
        const xml = await res.text()
        const items = parseRssItems(xml)

        for (const { title, url, pubDate } of items) {
          if (!title || !url) continue
          const date = pubDate ? new Date(pubDate) : null
          if (!date || isNaN(date.getTime())) continue
          const age = Date.now() - date.getTime()
          if (age > MAX_AGE || date < since) continue

          results.push({
            title,
            source: 'ABC Paraguay',
            date: date.toISOString(),
            url,
            provider: 'rss',
          })
        }
      } catch (err) {
        console.warn(`[news] Paraguay RSS fetch failed (${feedUrl}):`, err)
      }
    }),
  )

  return results
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch recent headlines for a topic from all four news APIs.
 * Results are merged, deduplicated by title similarity, sorted newest-first,
 * and cached for 6 hours per topic.
 *
 * Individual API failures are swallowed — results from the remaining APIs
 * are still returned.
 */
export async function fetchNews(topic: string): Promise<NewsHeadline[]> {
  const cacheKey = `news_${topic.toLowerCase().replace(/\s+/g, '_')}`

  const cached = newsStore.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < NEWS_TTL) {
    console.log(`[news] cache HIT  ${cacheKey}`)
    return cached.data
  }

  console.log(`[news] cache MISS ${cacheKey} — fetching from APIs`)

  // Only fetch articles from the last 72 hours
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000)

  // Include Paraguay RSS feeds when the topic is Paraguay-specific
  const isParaguayTopic = /paraguay/i.test(topic)

  const [gnews, guardian, nyt, currents, rss] = await Promise.all([
    fetchGNews(topic, since),
    fetchGuardian(topic, since),
    fetchNYT(topic, since),
    fetchCurrents(topic, since),
    isParaguayTopic ? fetchParaguayRSS(since) : Promise.resolve([]),
  ])

  const MAX_AGE = 7 * 24 * 60 * 60 * 1000 // hard ceiling: 7 days

  const all = [...gnews, ...guardian, ...nyt, ...currents, ...rss]
    .filter((h) => !!h.title && !!h.url)
    .filter((h) => {
      const age = Date.now() - new Date(h.date).getTime()
      return !isNaN(age) && age < MAX_AGE
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const deduped = deduplicate(all)

  newsStore.set(cacheKey, { data: deduped, timestamp: Date.now() })
  console.log(
    `[news] fetched ${all.length} raw → ${deduped.length} deduped for "${topic}" ` +
    `(gnews:${gnews.length} guardian:${guardian.length} nyt:${nyt.length} currents:${currents.length} rss:${rss.length})`,
  )

  return deduped
}
