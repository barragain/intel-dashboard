import type { RedditPost, RedditComment } from './types'

const SUBREDDITS = ['investing', 'wallstreetbets', 'economics']
const POSTS_PER_SUB = 5
const COMMENTS_PER_POST = 3
const TIMEOUT_MS = 90_000

function normalizeSubreddit(raw: string): string {
  return String(raw ?? '').replace(/^r\//, '').toLowerCase()
}

function parseComments(raw: unknown): RedditComment[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((c: any) => ({
      id: String(c.id ?? Math.random()),
      text: String(c.body ?? c.text ?? '').trim(),
      score: Number(c.score ?? c.ups ?? 0),
      author: String(c.author ?? c.username ?? 'unknown'),
    }))
    .filter((c) => c.text.length > 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, COMMENTS_PER_POST)
}

export async function fetchRedditPosts(): Promise<RedditPost[]> {
  const apiKey = process.env.APIFY_API_KEY
  if (!apiKey) return []

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS + 5_000)

  try {
    const startUrls = SUBREDDITS.map((sub) => ({
      url: `https://www.reddit.com/r/${sub}/top/?t=day`,
    }))

    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~reddit-scraper/run-sync-gets-dataset-items?token=${apiKey}&timeout=${TIMEOUT_MS / 1000}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls,
          maxItems: POSTS_PER_SUB * SUBREDDITS.length,
          maxPostCount: POSTS_PER_SUB,
          maxComments: COMMENTS_PER_POST,
          skipComments: false,
          sort: 'top',
        }),
        signal: controller.signal,
      },
    )

    if (!res.ok) return []

    const raw: unknown = await res.json()
    if (!Array.isArray(raw)) return []

    return (raw as any[])
      .filter((item) => item.title && (item.type === 'post' || !item.type || item.type !== 'comment'))
      .map((item): RedditPost => ({
        id: String(item.id ?? Math.random()),
        title: String(item.title ?? '').trim(),
        score: Number(item.score ?? item.ups ?? 0),
        numComments: Number(item.numberOfComments ?? item.numComments ?? item.num_comments ?? 0),
        subreddit: normalizeSubreddit(item.communityName ?? item.subreddit ?? 'reddit'),
        url: String(item.url ?? item.permalink ?? ''),
        topComments: parseComments(item.comments),
      }))
      .filter((p) => p.title.length > 0)
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

export function buildRedditContext(posts: RedditPost[]): string {
  if (posts.length === 0) return ''

  const bySub = new Map<string, RedditPost[]>()
  for (const post of posts) {
    const key = post.subreddit
    if (!bySub.has(key)) bySub.set(key, [])
    bySub.get(key)!.push(post)
  }

  const lines = [
    '\n\nREAL REDDIT DATA SCRAPED TODAY — use these as your community sentiment sources.',
    'Reference specific posts or comments when writing the community sentiment items.',
  ]

  for (const [sub, subPosts] of bySub) {
    const top = [...subPosts].sort((a, b) => b.score - a.score).slice(0, POSTS_PER_SUB)
    lines.push(`\nr/${sub} top posts today:`)
    for (const post of top) {
      lines.push(`  • "${post.title}" — ${post.score.toLocaleString()} upvotes`)
      for (const c of post.topComments.slice(0, 2)) {
        const preview = c.text.slice(0, 280).replace(/\n+/g, ' ')
        lines.push(`    ↳ u/${c.author}: "${preview}" (${c.score} upvotes)`)
      }
    }
  }

  return lines.join('\n')
}

/** Pick the top post by score from each subreddit — returns up to 3 for display */
export function selectDisplayPosts(posts: RedditPost[]): RedditPost[] {
  const bySub = new Map<string, RedditPost>()
  for (const post of posts) {
    const existing = bySub.get(post.subreddit)
    if (!existing || post.score > existing.score) bySub.set(post.subreddit, post)
  }
  return Array.from(bySub.values()).slice(0, 3)
}
