import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'   // ← named import
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  try {
    const u = Number(req.nextUrl.searchParams.get('unitid')||0)
    const codes = (req.nextUrl.searchParams.get('codes')||'').split(',').map(s=>s.trim()).filter(Boolean)
    const from = Number(req.nextUrl.searchParams.get('from')||0) || undefined
    const to = Number(req.nextUrl.searchParams.get('to')||0) || undefined
    if (!u || !codes.length) return NextResponse.json({ error:'unitid and codes required' }, { status:400 })

    const uni = await prisma.university.findUnique({ where:{ unitid:u }, select:{ id:true, unitid:true, name:true }})
    if (!uni) return NextResponse.json({ error:'unknown unitid' }, { status:404 })

    const metrics = await prisma.metric.findMany({
      where:{ code:{ in: codes } }, select:{ id:true, code:true, name:true, unit:true }
    })

    const out:any = { university: uni, series:{} as any }
    for (const m of metrics) {
      const where:any = { universityId: uni.id, metricId: m.id }
      if (from!==undefined || to!==undefined) where.year = { ...(from?{gte:from}:{}) , ...(to?{lte:to}:{}) }
      const rows = await prisma.timeSeries.findMany({ where, orderBy:{ year:'asc' }, select:{ year:true, value:true } })
      out.series[m.code] = { meta:{ code:m.code, name:m.name, unit:m.unit }, points: rows }
    }
    return NextResponse.json(out)
  } catch (e:any) {
    console.error('[series] error:', e)
    return NextResponse.json({ error: String(e?.message||e) }, { status: 500 })
  }
}
