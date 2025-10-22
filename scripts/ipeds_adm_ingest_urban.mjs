// scripts/ipeds_adm_ingest_urban.mjs
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Urban Institute Education Data API (no key required)
const BASE = 'https://educationdata.urban.org/api/v1/college-university/ipeds'

async function safeFetchJSON(url, tries = 0) {
  const res = await fetch(url)
  if (!res.ok) {
    if ((res.status === 429 || res.status >= 500) && tries < 6) {
      await new Promise(r => setTimeout(r, 400 * 2 ** tries))
      return safeFetchJSON(url, tries + 1)
    }
    const t = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} for ${url}${t ? ` — ${t}` : ''}`)
  }
  return res.json()
}

async function upsertMetric(code, name, unit) {
  return prisma.metric.upsert({
    where: { code },
    update: { name, unit },
    create: { code, name, unit },
    select: { id: true },
  })
}
async function upsertUniversity(unitid, name = null) {
  return prisma.university.upsert({
    where: { unitid },
    update: { name: name ?? undefined },
    create: { unitid, name },
    select: { id: true },
  })
}
async function writePoint(universityId, metricId, year, value) {
  await prisma.timeSeries.upsert({
    where: { universityId_metricId_year: { universityId, metricId, year } },
    update: { value },
    create: { universityId, metricId, year, value },
  })
}

async function ingestYear(unitid, year) {
  // IPEDS Admissions (ADM) endpoint on Urban API:
  // /ipeds/adm/{year}?unitid=XXXXXX
  const url = `${BASE}/adm/${year}?unitid=${unitid}`
  const js = await safeFetchJSON(url)

  // Urban API returns { results: [ {...}, ... ] }
  const row = js?.results?.[0]
  if (!row) return 0

  // Common fields in Urban API IPEDS ADM:
  // applcn (applications), admssn (admitted), instnm (name)
  const apps = Number(row.applcn)
  const admits = Number(row.admssn)
  const instName = row.instnm ?? null

  // Ensure the university exists (updates name once we learn it)
  const uni = await upsertUniversity(unitid, instName)

  // Ensure metrics exist
  const mApps = await upsertMetric('ADM.APPLICANTS', 'Applications', 'count')
  const mAdmit = await upsertMetric('ADM.ADMITTED', 'Admitted', 'count')
  const mRate = await upsertMetric('SC.ADM.RATE', 'Admission rate (overall)', 'ratio')

  let wrote = 0
  if (Number.isFinite(apps)) { await writePoint(uni.id, mApps.id, year, apps); wrote++ }
  if (Number.isFinite(admits)) { await writePoint(uni.id, mAdmit.id, year, admits); wrote++ }
  if (Number.isFinite(apps) && apps > 0 && Number.isFinite(admits) && admits >= 0) {
    await writePoint(uni.id, mRate.id, year, admits / apps)
    wrote++
  }
  if (wrote === 0) console.log(`[${year}] ${instName ?? unitid}: no ADM values`)
  return wrote
}

async function main() {
  const unitid = Number(process.argv[2])   // e.g., 190150
  const start  = Number(process.argv[3])   // e.g., 2000
  const end    = Number(process.argv[4] ?? start)
  if (!unitid || !start) {
    console.error('Usage: node scripts/ipeds_adm_ingest_urban.mjs <UNITID> <startYear> [endYear]')
    process.exit(1)
  }
  console.log(`[IPEDS ADM via Urban] unitid=${unitid} years=${start}..${end}`)

  let total = 0
  for (let y = start; y <= end; y++) {
    try {
      const n = await ingestYear(unitid, y)
      if (n > 0) console.log(`[${y}] wrote ${n}`)
      total += n
    } catch (e) {
      console.log(`[${y}] skipped (${e.message})`)
    }
  }
  console.log(`Done. Total points written: ${total}`)
  await prisma.$disconnect()
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
