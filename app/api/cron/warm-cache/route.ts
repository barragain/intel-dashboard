import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'

/**
 * Called by Vercel Cron at 01:00 UTC (09:00 Taiwan) and 13:00 UTC (21:00 Taiwan).
 *
 * 1. Revalidates all AI data cache tags — any cached Gemini response is marked stale.
 * 2. Immediately warms the cache by fetching each route, so the first real visitor
 *    gets instant results instead of waiting for a fresh Gemini call.
 *
 * Protect with CRON_SECRET env var in Vercel project settings.
 * Vercel automatically sends: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Bust all cached AI responses
  revalidateTag('ai-data')

  // Warm the cache immediately so users don't wait on the next visit.
  // VERCEL_URL is set automatically by Vercel on deployed environments.
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const routes = [
    '/api/sentiment?lang=en',
    '/api/risk?lang=en',
    '/api/conflicts?lang=en',
    '/api/historical?lang=en',
  ]

  const results = await Promise.allSettled(
    routes.map((path) =>
      fetch(`${baseUrl}${path}`)
        .then((r) => ({ path, status: r.status }))
        .catch((e) => ({ path, error: String(e) })),
    ),
  )

  const summary = results.map((r) => (r.status === 'fulfilled' ? r.value : r.reason))
  console.log('[cron] warm-cache complete', new Date().toISOString(), summary)

  return NextResponse.json({ ok: true, warmed: summary, at: new Date().toISOString() })
}
