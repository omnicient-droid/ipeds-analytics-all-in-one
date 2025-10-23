// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = [
  /^\/admin(\/|$)/,
  /^\/present(\/|$)/,
  /^\/api\/(?:revalidate|ingest)(?:\/|$)/, // NOTE: /api/series NOT here
]

function isProtected(path: string) {
  return PROTECTED.some((r) => r.test(path))
}
function unauthorized() {
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Secure Zone"' },
  })
}

export async function middleware(req: NextRequest) {
  const url = new URL(req.url)
  const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

  // 1) Allowed host — prod only
  if (isProd) {
    const allowed = (process.env.ALLOWED_HOSTS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const host = (req.headers.get('host') || '').toLowerCase()
    if (allowed.length && !allowed.includes(host))
      return new Response('Forbidden host', { status: 403 })
  }

  // 2) Cloudflare origin verify — prod only
  if (isProd && process.env.ORIGIN_VERIFY) {
    const got = req.headers.get('x-origin-verify')
    if (got !== process.env.ORIGIN_VERIFY) return new Response('Forbidden', { status: 403 })
  }

  // 3) Basic auth for protected surfaces only
  if (isProtected(url.pathname)) {
    const hdr = req.headers.get('authorization') || ''
    const [scheme, encoded] = hdr.split(' ')
    if (scheme !== 'Basic' || !encoded) return unauthorized()
    const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':')
    const entries = (process.env.BASIC_AUTH_USERS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const ok = entries.some((e) => {
      const [u, p] = e.split(':')
      return u === user && p === pass
    })
    if (!ok) return unauthorized()
  }

  // 4) /present: add noindex
  if (url.pathname.startsWith('/present')) {
    const res = NextResponse.next()
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|logos|public).*)'],
}
