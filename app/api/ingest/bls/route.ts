// app/api/ingest/bls/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// Default series: national unemployment rate (seasonally adjusted) by race
// (you can add more later)
const DEFAULT_SERIES = [
  {
    bls: 'LNS14000006',
    code: 'BLS.UNRATE.BLACK',
    name: 'Unemployment rate – Black or African American (SA)',
    unit: 'percent',
  },
  {
    bls: 'LNS14000003',
    code: 'BLS.UNRATE.WHITE',
    name: 'Unemployment rate – White (SA)',
    unit: 'percent',
  },
  {
    bls: 'LNS14000009',
    code: 'BLS.UNRATE.HISP',
    name: 'Unemployment rate – Hispanic or Latino (SA)',
    unit: 'percent',
  },
  {
    bls: 'LNS14000005',
    code: 'BLS.UNRATE.ASIAN',
    name: 'Unemployment rate – Asian (SA)',
    unit: 'percent',
  },
]

// BLS v2 endpoint (POST)
const BLS_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/'

// small helpers
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchBLS(payload: any, tries = 0): Promise<any> {
  const res = await fetch(BLS_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    if ((res.status === 429 || res.status >= 500) && tries < 6) {
      await sleep(400 * 2 ** tries)
      return fetchBLS(payload, tries + 1)
    }
    const txt = await res.text().catch(() => '')
    throw new Error(`BLS HTTP ${res.status}${txt ? ' – ' + txt : ''}`)
  }
  const js = await res.json()
  if (js.status !== 'REQUEST_SUCCEEDED') {
    const msg = JSON.stringify(js.message ?? js)
    throw new Error(`BLS error: ${msg}`)
  }
  return js
}

async function upsertUniversity(unitid: number, name: string) {
  return prisma.university.upsert({
    where: { unitid },
    update: { name },
    create: { unitid, name },
    select: { id: true },
  })
}
async function upsertMetric(code: string, name: string, unit: string) {
  return prisma.metric.upsert({
    where: { code },
    update: { name, unit },
    create: { code, name, unit },
    select: { id: true },
  })
}
async function writePoint(universityId: number, metricId: number, year: number, value: number) {
  await prisma.timeSeries.upsert({
    where: { universityId_metricId_year: { universityId, metricId, year } },
    update: { value },
    create: { universityId, metricId, year, value },
  })
}

// Parse annual rows from BLS response (we ask annualaverage=true)
function* annualRows(seriesObj: any) {
  for (const row of seriesObj.data ?? []) {
    const yr = Number(row.year)
    const val = Number(row.value)
    const period = row.period
    const isAnnual = row.periodName === 'Annual' || period === 'A01' || period === 'M13'
    if (isAnnual && Number.isFinite(yr) && Number.isFinite(val)) {
      yield { year: yr, value: val }
    }
  }
}

async function handleIngest(
  seriesList: { bls: string; code: string; name?: string; unit?: string }[],
  start: number,
  end: number,
) {
  // Ensure the national pseudo-entity exists (UNITID=0)
  const us = await upsertUniversity(0, 'United States (National)')

  // Build payload for BLS v2
  const payload: any = {
    seriesid: seriesList.map((s) => s.bls),
    startyear: String(start),
    endyear: String(end),
    annualaverage: true,
  }
  const K = process.env.BLS_API_KEY
  if (K) payload.registrationkey = K

  const js = await fetchBLS(payload)
  const seriesArray = js?.Results?.series ?? []

  let wrote = 0
  for (const ser of seriesArray) {
    const sid: string = ser.seriesID
    const meta = seriesList.find((s) => s.bls === sid)
    const code = meta?.code ?? `BLS.${sid}`
    const name = meta?.name ?? `BLS ${sid}`
    const unit = meta?.unit ?? 'value'
    const metric = await upsertMetric(code, name, unit)

    for (const row of annualRows(ser)) {
      await writePoint(us.id, metric.id, row.year, row.value)
      wrote++
    }
  }
  return wrote
}

function authorize(req: NextRequest) {
  const expected = process.env.ACTIONS_BEARER || ''
  const auth = req.headers.get('authorization') || ''
  const token = req.nextUrl.searchParams.get('token') || ''
  return (
    expected && ((auth.startsWith('Bearer ') && auth.slice(7) === expected) || token === expected)
  )
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const sp = req.nextUrl.searchParams
    const preset = (sp.get('preset') || 'ALL').toUpperCase()
    const start = Number(sp.get('start') || 2000)
    const end = Number(sp.get('end') || new Date().getFullYear() - 1)
    const series =
      preset === 'ALL'
        ? DEFAULT_SERIES
        : DEFAULT_SERIES.filter((s) => s.code.toUpperCase() === preset || s.bls === preset)
    if (!series.length)
      return NextResponse.json({ error: 'Unknown series/preset' }, { status: 400 })
    const wrote = await handleIngest(series, start, end)
    return NextResponse.json({ ok: true, wrote })
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const start = Number(body.start ?? 2000)
    const end = Number(body.end ?? new Date().getFullYear() - 1)
    const list: string[] | undefined = body.series
    const series =
      list && list.length
        ? list.map((sid: string) => {
            const meta = DEFAULT_SERIES.find((s) => s.bls === sid || s.code === sid) ?? {
              bls: sid,
              code: `BLS.${sid}`,
            }
            return meta
          })
        : DEFAULT_SERIES
    const wrote = await handleIngest(series, start, end)
    return NextResponse.json({ ok: true, wrote })
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 })
  }
}
