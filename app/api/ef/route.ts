// app/api/ef/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const code = (url.searchParams.get('code') || '').trim() // e.g. EF.EFYBLACK
    const unitidsParam = (url.searchParams.get('unitids') || '').trim()
    const ids = unitidsParam
      ? unitidsParam
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n))
      : []

    if (!code || !ids.length) {
      return NextResponse.json({ error: 'code and unitids are required' }, { status: 400 })
    }

    const metric = await prisma.metric.findUnique({
      where: { code },
      select: { id: true, code: true, name: true, unit: true },
    })
    if (!metric) return NextResponse.json({ error: 'metric not found' }, { status: 404 })

    // map UNITID → university.id (internal)
    const unis = await prisma.university.findMany({
      where: { unitid: { in: ids } },
      select: { id: true, unitid: true, name: true },
    })
    const byUnitid = new Map(unis.map((u) => [u.unitid, u]))

    const series = await Promise.all(
      ids.map(async (unitid) => {
        const u = byUnitid.get(unitid)
        if (!u)
          return { unitid, name: null as any, data: [] as { year: number; value: number | null }[] }
        const rows = await prisma.timeSeries.findMany({
          where: { universityId: u.id, metricId: metric.id },
          orderBy: { year: 'asc' },
          select: { year: true, value: true },
        })
        return {
          unitid,
          name: u.name,
          data: rows.map((r) => ({ year: r.year, value: Number(r.value) })),
        }
      }),
    )

    return NextResponse.json({ metric, series })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
