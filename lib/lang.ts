import type { NextRequest } from 'next/server'

export function getLang(request: NextRequest): 'en' | 'fr' {
  const lang = request.nextUrl.searchParams.get('lang')
  return lang === 'fr' ? 'fr' : 'en'
}
