import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECT_PREFIXES = ['/api/schools','/api/series','/api/compare']

export function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname
  if (!PROTECT_PREFIXES.some(p => url.startsWith(p))) return NextResponse.next()
  const auth = req.headers.get('authorization') || ''
  const expected = process.env.ACTIONS_BEARER || ''
  if (!expected || !auth.startsWith('Bearer ') || auth.slice(7) !== expected) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  return NextResponse.next()
}
