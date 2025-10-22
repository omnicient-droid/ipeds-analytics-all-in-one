import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type SeriesPoint = { year:number; value:number }

export async function GET(req: NextRequest, { params }: { params: { unitid: string } }) {
  const unitid = Number(params.unitid ?? req.nextUrl.searchParams.get('unitid'))
  const metric = String(req.nextUrl.searchParams.get('metric') ?? '')
  if (!unitid || !metric) return NextResponse.json({ error:'unitid and metric are required' }, { status: 400 })

  const u = await prisma.university.findFirst({ where:{ unitid }, select:{ id:true } })
  const m = await prisma.metric.findUnique({ where:{ code: metric }, select:{ id:true, code:true, name:true, unit:true } })
  if (!u || !m) return NextResponse.json({ error:'unknown unitid/metric' }, { status: 404 })

  const rows = await prisma.timeSeries.findMany({
    where:{ universityId: u.id, metricId: m.id },
    orderBy:{ year:'asc' },
    select:{ year:true, value:true }
  })
  const toNum = (v:any) => (v == null ? 0 : Number(v))
  const data: SeriesPoint[] = rows.map(r => ({ year: r.year, value: toNum(r.value) }))
  return NextResponse.json({ metric: m, data })
}
