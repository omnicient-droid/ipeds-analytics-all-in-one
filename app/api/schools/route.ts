import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'   // ← named import
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get('query')||'').trim()
    if (!q) return NextResponse.json({ results: [] })
    const results = await prisma.university.findMany({
      where:{ name: { contains: q, mode:'insensitive' } },
      select:{ unitid:true, name:true, city:true, state:true },
      take: 20
    })
    return NextResponse.json({ results })
  } catch (e:any) {
    console.error('[schools] error:', e)
    return NextResponse.json({ error: String(e?.message||e) }, { status: 500 })
  }
}
