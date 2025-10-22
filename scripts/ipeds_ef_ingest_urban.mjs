// scripts/ipeds_ef_ingest_urban.mjs
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Urban Education Data API (no key required)
const BASE = 'https://educationdata.urban.org/api/v1/college-university/ipeds'

// ---------- HTTP ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function fetchJSON(url, tries = 0) {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) {
    if ((res.status === 429 || res.status >= 500) && tries < 6) {
      await sleep(400 * 2 ** tries)
      return fetchJSON(url, tries + 1)
    }
    const text = await res.text().catch(() => '')
    const e = new Error(`HTTP ${res.status}${text ? ' – ' + text : ''}`)
    e.status = res.status
    throw e
  }
  return res.json()
}

// ---------- Prisma ----------
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

// ---------- EF mapping ----------
const EF_ALIASES = {
  total:   ['efytotlt', 'efytotal', 'efgrandtotal'],
  white:   ['efywhitt', 'efywhite'],
  black:   ['efybkaat', 'efyblack'],
  hisp:    ['efyhisp',  'efylatino'],
  asian:   ['efyasian'],
  aian:    ['efyaian',  'efyaian_alaskan'],
  nhpi:    ['efynhpi',  'efynhpit', 'efpacific'],
  two:     ['efy2mort', 'eftwomore', 'eftwoormore'],
  nonres:  ['efynralt', 'efnonres',  'efnonresident'],
  unknown: ['efyunknt', 'efunknown', 'efunk'],
}

const METRIC_SPECS = [
  { code: 'EF.EFYTOTL',  name: 'Total fall enrollment',                     unit: 'count', key: 'total'   },
  { code: 'EF.EFYWHITE', name: 'White fall enrollment',                     unit: 'count', key: 'white'   },
  { code: 'EF.EFYBLACK', name: 'Black or African American fall enrollment', unit: 'count', key: 'black'   },
  { code: 'EF.EFYHISP',  name: 'Hispanic/Latino fall enrollment',           unit: 'count', key: 'hisp'    },
  { code: 'EF.EFYASIAN', name: 'Asian fall enrollment',                     unit: 'count', key: 'asian'   },
  { code: 'EF.EFYAIAN',  name: 'American Indian/Alaska Native fall enrollment', unit: 'count', key: 'aian' },
  { code: 'EF.EFYNHPI',  name: 'Native Hawaiian/Other Pacific Islander fall enrollment', unit: 'count', key: 'nhpi' },
  { code: 'EF.EFY2PLUS', name: 'Two or more races fall enrollment',         unit: 'count', key: 'two'     },
  { code: 'EF.EFYNRAL',  name: 'Nonresident alien fall enrollment',         unit: 'count', key: 'nonres'  },
  { code: 'EF.EFYUNK',   name: 'Race/ethnicity unknown fall enrollment',    unit: 'count', key: 'unknown' },
]

function pickNumber(row, aliasList) {
  for (const k of aliasList) {
    if (row[k] != null && row[k] !== '') {
      const n = Number(row[k])
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

let printedKeys = false

async function ingestYear(unitid, year) {
  // Headcount (not FTE). Ask for “All” buckets + combined reporting unit.
  // If a year doesn’t return, fall back to level_of_study=99.
  const qs1 = `unitid=${unitid}&race=99&sex=99&attendance_status=99&level_of_study=1`
  const qs2 = `unitid=${unitid}&race=99&sex=99&attendance_status=99&level_of_study=99`

  const urls = [
    `${BASE}/fall-enrollment/${year}/?${qs1}`,
    `${BASE}/fall-enrollment/?year=${year}&${qs1}`,
    `${BASE}/fall-enrollment/${year}/?${qs2}`,
    `${BASE}/fall-enrollment/?year=${year}&${qs2}`,
  ]

  let js = null
  let lastErr = null
  for (const url of urls) {
    try {
      js = await fetchJSON(url)
      if (js?.results?.length) break
    } catch (e) {
      lastErr = e
    }
  }
  if (!js || !js.results || !js.results.length) {
    console.log(`[${year}] skipped (${lastErr ? lastErr.message : 'no results'})`)
    return 0
  }

  const row = js.results[0]
  if (!printedKeys) {
    printedKeys = true
    console.log('EF keys sample:', Object.keys(row).slice(0, 40).join(', '))
  }

  const instName = row.instnm ?? null
  const uni = await upsertUniversity(unitid, instName)

  // ensure metrics exist
  const metricIds = {}
  for (const m of METRIC_SPECS) {
    metricIds[m.code] = (await upsertMetric(m.code, m.name, m.unit)).id
  }

  // write values using alias list
  let wrote = 0
  for (const m of METRIC_SPECS) {
    const val = pickNumber(row, EF_ALIASES[m.key] || [])
    if (val != null) { await writePoint(uni.id, metricIds[m.code], year, val); wrote++ }
  }

  if (!wrote) console.log(`[${year}] ${instName ?? unitid}: no EF counts matched alias list`)
  return wrote
}


async function main() {
  const unitid = Number(process.argv[2])           // e.g., 190150
  const start  = Number(process.argv[3])           // e.g., 2008
  const end    = Number(process.argv[4] ?? start)
  if (!unitid || !start) {
    console.error('Usage: node scripts/ipeds_ef_ingest_urban.mjs <UNITID> <startYear> [endYear]')
    process.exit(1)
  }
  console.log(`[IPEDS EF via Urban] unitid=${unitid} years=${start}..${end}`)

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
  console.log(`Done. Total EF points written: ${total}`)
  await prisma.$disconnect()
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
