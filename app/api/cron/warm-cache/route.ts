import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Called by Vercel Cron at 01:00 UTC (09:00 Taiwan) and 13:00 UTC (21:00 Taiwan).
 * Warms the cache for all AI-powered sections so the first real visitor doesn't
 * trigger a Gemini call and wait for it.
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

  // Warm all AI sections in parallel. Errors are logged but don't fail the cron.
  const routes = [
    '/api/sentiment?lang=en',
    '/api/risk?lang=en',
    '/api/conflicts?lang=en',
    '/api/historical?lang=en',
  ]

  const results = await Promise.allSettled(
    routes.map((path) =>
      fetch(`${baseUrl}${path}`, { headers: { 'x-cron-warm': '1' } })
        .then((r) => ({ path, status: r.status }))
        .catch((e) => ({ path, error: String(e) })),
    ),
  )

  const summary = results.map((r) => (r.status === 'fulfilled' ? r.value : r.reason))
  console.log('[cron] warm-cache complete', summary)

  return NextResponse.json({ ok: true, warmed: summary, at: new Date().toISOString() })
}
