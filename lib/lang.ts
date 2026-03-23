import type { NextRequest } from 'next/server'

export type Lang = 'en' | 'fr' | 'es'

export function getLang(request: NextRequest): Lang {
  const lang = request.nextUrl.searchParams.get('lang')
  if (lang === 'fr') return 'fr'
  if (lang === 'es') return 'es'
  return 'en'
}
