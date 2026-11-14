import { NextResponse, type NextRequest } from 'next/server'
import { AUDIENCE_COOKIE, isAudience } from '@/lib/audience'

// A visitor who has already chosen Teachers or Parents is sent from `/` straight to that page, before any
// HTML is served, so the welcome pop-up never flashes. Temporary and never cached: the choice can change.
// With no cookie the request falls through to app/(site)/page.tsx, which shows the pop-up.
export function middleware(request: NextRequest) {
  const audience = request.cookies.get(AUDIENCE_COOKIE)?.value
  if (!isAudience(audience)) return NextResponse.next()
  const response = NextResponse.redirect(new URL(`/${audience}`, request.url), 307)
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export const config = { matcher: '/' }
