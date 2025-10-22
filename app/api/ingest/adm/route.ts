import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()
const BASE = 'https://educationdata.urban.org/api/v1/college-university/ipeds'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchJSON(url: string, tries = 0): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) {
    if ((res.status === 429 || res.status >= 500) && tries < 6) {
      await sleep(400 * 2 ** tries)
      return fetchJSON(url, tries + 1)
    }
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${text ? ' – ' + text : ''}`)
  }
  return res.json()
}

async function upsertMetric(code: string, name: string, unit: string) {
  return prisma.metric.upsert({
    where: { code },
    update: { name, unit },
    create: { code, name, unit },
    select: { id: true },
  })
}
async function upsertUniversity(unitid: number, name: string | null) {
  return prisma.university.upsert({
    where: { unitid },
    update: { name: name ?? undefined },
    create: { unitid, name },
    select: { id: true },
  })
}
async function point(universityId: number, metricId: number, year: number, value: number) {
  await prisma.timeSeries.upsert({
    where: { universityId_metricId_year: { universityId, metricId, year } },
    update: { value },
    create: { universityId, metricId, year, value },
  })
}

export async function POST(req: NextRequest) {
  // Bearer check
  const auth = req.headers.get('authorization') || ''
  const expected = process.env.ACTIONS_BEARER || ''
  if (!expected || !auth.startsWith('Bearer ') || auth.slice(7) !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { unitid, start, end } = (await req.json()) as {
      unitid: number
      start: number
      end?: number
    }
    if (!unitid || !start)
      return NextResponse.json({ error: 'unitid and start required' }, { status: 400 })

    const mApps = await upsertMetric('ADM.APPLICANTS', 'Applications', 'count')
    const mAdmit = await upsertMetric('ADM.ADMITTED', 'Admitted', 'count')
    const mRate = await upsertMetric('SC.ADM.RATE', 'Admission rate (overall)', 'ratio')

    let total = 0
    const last = end ?? start
    for (let y = start; y <= last; y++) {
      const url = `${BASE}/adm/${y}?unitid=${unitid}`
      const js = await fetchJSON(url)
      const row = js?.results?.[0]
      if (!row) continue

      const name = row.instnm ?? null
      const uni = await upsertUniversity(unitid, name)
      const apps = Number(row.applcn)
      const admits = Number(row.admssn)

      if (Number.isFinite(apps)) await point(uni.id, mApps.id, y, apps)
      if (Number.isFinite(admits)) await point(uni.id, mAdmit.id, y, admits)
      if (Number.isFinite(apps) && apps > 0 && Number.isFinite(admits) && admits >= 0) {
        await point(uni.id, mRate.id, y, admits / apps)
        total++
      }
    }

    return NextResponse.json({ ok: true, wrote: total })
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 })
  }
}
