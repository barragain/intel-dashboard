import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Called by Vercel Cron at 01:00 UTC (09:00 Taiwan) and 13:00 UTC (21:00 Taiwan).
 *
 * The AI routes use unstable_cache keyed on the current slot string (e.g.
 * "2026-03-24-morning"). When the slot changes at 9am/9pm Taiwan, the cache
 * key changes and the next request would miss and call Gemini.
 *
 * This cron fires right as the slot rolls over and warms all routes
 * immediately, so users always hit a pre-populated cache.
 *
 * Language strategy:
 *   EN  — always pre-cached here. Each route uses unstable_cache keyed
 *          only by slot (no lang arg), so hitting ?lang=en fills the
 *          persistent cache that all subsequent EN requests will hit.
 *   FR/ES — intentionally excluded. Those languages use the in-memory
 *          getCached/setCached store and are populated on first user
 *          request only. They are never pre-warmed.
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

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const routes = [
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
