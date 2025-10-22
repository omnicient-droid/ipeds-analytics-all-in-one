import { NextRequest, NextResponse } from 'next/server'
import prisma from "../../../lib/prisma"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const unitids = (req.nextUrl.searchParams.get('unitids')||'').split(',').map(s=>Number(s.trim())).filter(Boolean)
  const codes = (req.nextUrl.searchParams.get('codes')||'').split(',').map(s=>s.trim()).filter(Boolean)
  const from = Number(req.nextUrl.searchParams.get('from')||0) || undefined
  const to = Number(req.nextUrl.searchParams.get('to')||0) || undefined
  if (!unitids.length || !codes.length) return NextResponse.json({ error:'unitids and codes required' }, { status:400 })

  const unis = await prisma.university.findMany({ where: { unitid: { in: unitids } }, select: { id:true, unitid:true, name:true } })
  const metrics = await prisma.metric.findMany({ where: { code: { in: codes } }, select: { id:true, code:true, name:true, unit:true } })

  const out:any = { universities: unis, metrics, data:{} as any }
  for (const m of metrics) {
    out.data[m.code] = {}
    for (const u of unis) {
      const where:any = { universityId: u.id, metricId: m.id }
      if (from!==undefined || to!==undefined) where.year = { ...(from?{gte:from}:{}) , ...(to?{lte:to}:{}) }
      const rows = await prisma.timeSeries.findMany({ where, orderBy:{ year:'asc' }, select:{ year:true, value:true } })
      out.data[m.code][u.unitid] = rows
    }
  }
  return NextResponse.json(out)
}
