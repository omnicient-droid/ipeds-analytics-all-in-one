// scripts/ingest_ef_race_data.mjs - Ingest racial enrollment data with correct metric codes
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = 'https://educationdata.urban.org/api/v1/college-university/ipeds'

// Correct metric codes that match frontend expectations
const RACE_METRICS = [
  { code: 'EF.FALL.UG.WHITE', label: 'White', aliases: ['efywhitt', 'efywhite', 'white'] },
  {
    code: 'EF.FALL.UG.BLACK',
    label: 'Black or African American',
    aliases: ['efybkaat', 'efyblack', 'black or african american'],
  },
  {
    code: 'EF.FALL.UG.HISP',
    label: 'Hispanic/Latino',
    aliases: ['efyhisp', 'efylatino', 'hispanic/latino'],
  },
  { code: 'EF.FALL.UG.ASIAN', label: 'Asian', aliases: ['efyasian', 'asian'] },
  {
    code: 'EF.FALL.UG.TWOORMORE',
    label: 'Two or more races',
    aliases: ['efy2mort', 'eftwomore', 'eftwoormore', 'two or more races'],
  },
  {
    code: 'EF.FALL.UG.NONRES',
    label: 'Nonresident alien',
    aliases: ['efynralt', 'efnonres', 'efnonresident', 'nonresident alien'],
  },
  {
    code: 'EF.FALL.UG.UNKNOWN',
    label: 'Race/ethnicity unknown',
    aliases: ['efyunknt', 'efunknown', 'efunk', 'unknown'],
  },
  {
    code: 'EF.FALL.UG.TOTAL',
    label: 'Total undergraduate enrollment',
    aliases: ['efytotlt', 'efytotal', 'efgrandtotal'],
  },
]

async function upsertMetric(code, name, unit = 'count') {
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

async function fetchJSON(url, retries = 0) {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) {
    if ((res.status === 429 || res.status >= 500) && retries < 3) {
      await new Promise((r) => setTimeout(r, 1000 * (retries + 1)))
      return fetchJSON(url, retries + 1)
    }
    throw new Error(`HTTP ${res.status}`)
  }
  return res.json()
}

function findValue(row, aliases) {
  for (const key of Object.keys(row)) {
    const lowerKey = key.toLowerCase()
    if (aliases.some((a) => lowerKey.includes(a.toLowerCase()))) {
      const val = Number(row[key])
      if (Number.isFinite(val) && val >= 0) return val
    }
  }
  return null
}

async function ingestYear(unitid, year) {
  // Try multiple URL patterns - Urban API structure varies by year
  const urls = [
    `${BASE}/fall-enrollment/${year}/?unitid=${unitid}&class_level=1&sex=99&race=99`,
    `${BASE}/fall-enrollment-race/${year}/?unitid=${unitid}&class_level=1`,
    `${BASE}/fall-enrollment/?year=${year}&unitid=${unitid}&class_level=1`,
  ]

  let data = null
  for (const url of urls) {
    try {
      const json = await fetchJSON(url)
      const results = json.results || json
      if (Array.isArray(results) && results.length > 0) {
        data = results
        break
      }
    } catch (e) {
      // Try next URL
    }
  }

  if (!data || data.length === 0) {
    return 0
  }

  const instName = data[0].instnm || data[0].institution_name || null
  const uni = await upsertUniversity(unitid, instName)

  // Create metrics
  const metricIds = {}
  for (const m of RACE_METRICS) {
    metricIds[m.code] = (await upsertMetric(m.code, m.label, 'count')).id
  }

  let wrote = 0

  // Try to parse data by race
  for (const row of data) {
    for (const metric of RACE_METRICS) {
      const value = findValue(row, metric.aliases)
      if (value !== null) {
        await writePoint(uni.id, metricIds[metric.code], year, value)
        wrote++
      }
    }
  }

  return wrote
}

async function main() {
  const unitid = Number(process.argv[2])
  const startYear = Number(process.argv[3])
  const endYear = Number(process.argv[4] || startYear)

  if (!unitid || !startYear) {
    console.error('Usage: node ingest_ef_race_data.mjs <UNITID> <START_YEAR> [END_YEAR]')
    process.exit(1)
  }

  console.log(`Ingesting unitid=${unitid}, years ${startYear}-${endYear}`)

  let totalWrote = 0
  for (let year = startYear; year <= endYear; year++) {
    try {
      const wrote = await ingestYear(unitid, year)
      if (wrote > 0) {
        console.log(`[${year}] wrote ${wrote} points`)
        totalWrote += wrote
      } else {
        console.log(`[${year}] no data`)
      }
    } catch (e) {
      console.log(`[${year}] error: ${e.message}`)
    }
  }

  console.log(`\nTotal: ${totalWrote} data points written`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
