#!/usr/bin/env node
// Comprehensive IPEDS data ingest - Admissions, Grad Rates, Financial Aid, Faculty
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = 'https://educationdata.urban.org/api/v1/college-university/ipeds'

// ===== Metrics Definitions =====
const ADMISSIONS_METRICS = [
  {
    code: 'ADM.APPLICANTS_TOTAL',
    name: 'Total applicants',
    unit: 'count',
    fields: ['number_applied'],
  },
  {
    code: 'ADM.ADMITTED_TOTAL',
    name: 'Total admitted',
    unit: 'count',
    fields: ['number_admitted'],
  },
  {
    code: 'ADM.ENROLLED_TOTAL',
    name: 'Total enrolled (freshmen)',
    unit: 'count',
    fields: ['number_enrolled_total'],
  },
  {
    code: 'ADM.SAT_MATH_25',
    name: 'SAT Math 25th percentile',
    unit: 'score',
    fields: ['sat_math_25', 'satmt25'],
  },
  {
    code: 'ADM.SAT_MATH_75',
    name: 'SAT Math 75th percentile',
    unit: 'score',
    fields: ['sat_math_75', 'satmt75'],
  },
  {
    code: 'ADM.SAT_READ_25',
    name: 'SAT Reading 25th percentile',
    unit: 'score',
    fields: ['sat_reading_25', 'satvr25'],
  },
  {
    code: 'ADM.SAT_READ_75',
    name: 'SAT Reading 75th percentile',
    unit: 'score',
    fields: ['sat_reading_75', 'satvr75'],
  },
  {
    code: 'ADM.ACT_COMPOSITE_25',
    name: 'ACT Composite 25th percentile',
    unit: 'score',
    fields: ['act_composite_25', 'actcm25'],
  },
  {
    code: 'ADM.ACT_COMPOSITE_75',
    name: 'ACT Composite 75th percentile',
    unit: 'score',
    fields: ['act_composite_75', 'actcm75'],
  },
]

const GRAD_RATE_METRICS = [
  {
    code: 'GR.GR150.TOTAL',
    name: '6-year graduation rate (150% time)',
    unit: 'percent',
    fields: ['grad_rate_150', 'grrate150'],
  },
  {
    code: 'GR.GR100.TOTAL',
    name: '4-year graduation rate (100% time)',
    unit: 'percent',
    fields: ['grad_rate_100', 'grrate100'],
  },
  {
    code: 'GR.GR150.WHITE',
    name: '6-year grad rate - White',
    unit: 'percent',
    fields: ['grad_rate_150_white'],
  },
  {
    code: 'GR.GR150.BLACK',
    name: '6-year grad rate - Black',
    unit: 'percent',
    fields: ['grad_rate_150_black'],
  },
  {
    code: 'GR.GR150.HISP',
    name: '6-year grad rate - Hispanic',
    unit: 'percent',
    fields: ['grad_rate_150_hisp'],
  },
  {
    code: 'GR.GR150.ASIAN',
    name: '6-year grad rate - Asian',
    unit: 'percent',
    fields: ['grad_rate_150_asian'],
  },
]

const RETENTION_METRICS = [
  {
    code: 'RET.FTFT',
    name: 'Retention rate (full-time first-time)',
    unit: 'percent',
    fields: ['retention_rate_ft', 'ret_pcf'],
  },
  {
    code: 'RET.PTFT',
    name: 'Retention rate (part-time first-time)',
    unit: 'percent',
    fields: ['retention_rate_pt', 'ret_pcp'],
  },
]

const FINANCIAL_AID_METRICS = [
  {
    code: 'SFA.FTFT.PELL_GRANT_RATE',
    name: 'Pell Grant recipients (% of FT first-time)',
    unit: 'percent',
    fields: ['pell_grant_rate', 'uagrntp'],
  },
  {
    code: 'SFA.FTFT.AVG_NET_PRICE',
    name: 'Average net price',
    unit: 'USD',
    fields: ['avg_net_price', 'npist'],
  },
  {
    code: 'SFA.FTFT.AVG_AID_AMOUNT',
    name: 'Average total aid amount',
    unit: 'USD',
    fields: ['avg_aid_amount'],
  },
]

const TUITION_METRICS = [
  {
    code: 'IC.TUITION.IN_STATE',
    name: 'Tuition (in-state)',
    unit: 'USD',
    fields: ['tuition_in_state', 'tuition_02', 'tuition2'],
  },
  {
    code: 'IC.TUITION.OUT_STATE',
    name: 'Tuition (out-of-state)',
    unit: 'USD',
    fields: ['tuition_out_state', 'tuition_03', 'tuition3'],
  },
  { code: 'IC.ROOM_BOARD', name: 'Room and board', unit: 'USD', fields: ['room_board', 'rombrd'] },
  {
    code: 'IC.BOOKS_SUPPLIES',
    name: 'Books and supplies',
    unit: 'USD',
    fields: ['books_supplies', 'boksup'],
  },
]

const FACULTY_METRICS = [
  {
    code: 'DRVHR.FTE_STU_FAC_RATIO',
    name: 'Student-faculty ratio',
    unit: 'ratio',
    fields: ['student_faculty_ratio', 'stufacr'],
  },
  {
    code: 'DRVHR.INSTR_EXP_PER_FTE',
    name: 'Instructional expenditure per FTE',
    unit: 'USD',
    fields: ['instruction_per_fte'],
  },
]

// Faculty by race/ethnicity (headcounts)
const FACULTY_RACE_CODES = [
  { code: 'HR.FACULTY.WHITE', name: 'Faculty – White', unit: 'headcount' },
  { code: 'HR.FACULTY.BLACK', name: 'Faculty – Black or African American', unit: 'headcount' },
  { code: 'HR.FACULTY.HISP', name: 'Faculty – Hispanic/Latino', unit: 'headcount' },
  { code: 'HR.FACULTY.ASIAN', name: 'Faculty – Asian', unit: 'headcount' },
  { code: 'HR.FACULTY.TWOORMORE', name: 'Faculty – Two or more races', unit: 'headcount' },
  { code: 'HR.FACULTY.NONRES', name: 'Faculty – Nonresident alien', unit: 'headcount' },
  { code: 'HR.FACULTY.UNKNOWN', name: 'Faculty – Race/ethnicity unknown', unit: 'headcount' },
  { code: 'HR.FACULTY.TOTAL', name: 'Faculty – Total', unit: 'headcount' },
]

// ===== Helper Functions =====
async function fetchJSON(url, retries = 0) {
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    if (!res.ok) {
      if ((res.status === 429 || res.status >= 500) && retries < 3) {
        await new Promise((r) => setTimeout(r, 1000 * (retries + 1)))
        return fetchJSON(url, retries + 1)
      }
      throw new Error(`HTTP ${res.status}`)
    }
    return res.json()
  } catch (e) {
    throw e
  }
}

function findValue(row, fieldNames) {
  for (const field of fieldNames) {
    const lowerField = field.toLowerCase()
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === lowerField) {
        const val = Number(row[key])
        if (Number.isFinite(val)) return val
      }
    }
  }
  return null
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

// ===== Ingest Functions =====
async function ingestAdmissions(unitid, year) {
  const urls = [`${BASE}/admissions-enrollment/${year}/?unitid=${unitid}`]

  let data = []
  for (const url of urls) {
    try {
      const json = await fetchJSON(url)
      const results = json.results || json
      if (Array.isArray(results) && results.length > 0) {
        // Filter for sex=99 (total across all genders)
        data = data.concat(results.filter((r) => r.sex === 99 || r.sex === '99' || !r.sex))
      }
    } catch (e) {
      // Continue to next URL
    }
  }

  if (data.length === 0) return 0

  const instName = data[0].instnm || data[0].institution_name || null
  const uni = await upsertUniversity(unitid, instName)

  const metricIds = {}
  for (const m of ADMISSIONS_METRICS) {
    metricIds[m.code] = (await upsertMetric(m.code, m.name, m.unit)).id
  }

  let wrote = 0
  for (const row of data) {
    for (const metric of ADMISSIONS_METRICS) {
      const value = findValue(row, metric.fields)
      if (value !== null) {
        await writePoint(uni.id, metricIds[metric.code], year, value)
        wrote++
      }
    }
  }

  return wrote
}

async function ingestGradRates(unitid, year) {
  const urls = [
    `${BASE}/grad-rates/${year}/?unitid=${unitid}`,
    `${BASE}/grad-rates-200/${year}/?unitid=${unitid}`,
  ]

  let data = []
  for (const url of urls) {
    try {
      const json = await fetchJSON(url)
      const results = json.results || json
      if (Array.isArray(results) && results.length > 0) {
        data = data.concat(results)
      }
    } catch (e) {
      // Continue
    }
  }

  if (data.length === 0) return 0

  const instName = data[0].instnm || null
  const uni = await upsertUniversity(unitid, instName)

  const allMetrics = [...GRAD_RATE_METRICS, ...RETENTION_METRICS]
  const metricIds = {}
  for (const m of allMetrics) {
    metricIds[m.code] = (await upsertMetric(m.code, m.name, m.unit)).id
  }

  let wrote = 0
  for (const row of data) {
    for (const metric of allMetrics) {
      const value = findValue(row, metric.fields)
      if (value !== null) {
        await writePoint(uni.id, metricIds[metric.code], year, value)
        wrote++
      }
    }
  }

  return wrote
}

async function ingestFinancialAid(unitid, year) {
  const urls = [
    `${BASE}/sfa/${year}/?unitid=${unitid}`,
    `${BASE}/student-financial-aid/${year}/?unitid=${unitid}`,
  ]

  let data = []
  for (const url of urls) {
    try {
      const json = await fetchJSON(url)
      const results = json.results || json
      if (Array.isArray(results) && results.length > 0) {
        data = data.concat(results)
      }
    } catch (e) {
      // Continue
    }
  }

  if (data.length === 0) return 0

  const instName = data[0].instnm || null
  const uni = await upsertUniversity(unitid, instName)

  const metricIds = {}
  for (const m of FINANCIAL_AID_METRICS) {
    metricIds[m.code] = (await upsertMetric(m.code, m.name, m.unit)).id
  }

  let wrote = 0
  for (const row of data) {
    for (const metric of FINANCIAL_AID_METRICS) {
      const value = findValue(row, metric.fields)
      if (value !== null) {
        await writePoint(uni.id, metricIds[metric.code], year, value)
        wrote++
      }
    }
  }

  return wrote
}

async function ingestTuitionCosts(unitid, year) {
  const urls = [
    `${BASE}/institutional-characteristics/${year}/?unitid=${unitid}`,
    `${BASE}/ic/${year}/?unitid=${unitid}`,
  ]

  let data = []
  for (const url of urls) {
    try {
      const json = await fetchJSON(url)
      const results = json.results || json
      if (Array.isArray(results) && results.length > 0) {
        data = data.concat(results)
      }
    } catch (e) {
      // Continue
    }
  }

  if (data.length === 0) return 0

  const instName = data[0].instnm || null
  const uni = await upsertUniversity(unitid, instName)

  const metricIds = {}
  for (const m of TUITION_METRICS) {
    metricIds[m.code] = (await upsertMetric(m.code, m.name, m.unit)).id
  }

  let wrote = 0
  for (const row of data) {
    for (const metric of TUITION_METRICS) {
      const value = findValue(row, metric.fields)
      if (value !== null) {
        await writePoint(uni.id, metricIds[metric.code], year, value)
        wrote++
      }
    }
  }

  return wrote
}

async function ingestFacultyMetrics(unitid, year) {
  const urls = [
    `${BASE}/human-resources/${year}/?unitid=${unitid}`,
    `${BASE}/fall-staff/${year}/?unitid=${unitid}`,
  ]

  let data = []
  for (const url of urls) {
    try {
      const json = await fetchJSON(url)
      const results = json.results || json
      if (Array.isArray(results) && results.length > 0) {
        data = data.concat(results)
      }
    } catch (e) {
      // Continue
    }
  }

  if (data.length === 0) return 0

  const instName = data[0].instnm || null
  const uni = await upsertUniversity(unitid, instName)

  const metricIds = {}
  for (const m of FACULTY_METRICS) {
    metricIds[m.code] = (await upsertMetric(m.code, m.name, m.unit)).id
  }

  let wrote = 0
  for (const row of data) {
    for (const metric of FACULTY_METRICS) {
      const value = findValue(row, metric.fields)
      if (value !== null) {
        await writePoint(uni.id, metricIds[metric.code], year, value)
        wrote++
      }
    }
  }

  return wrote
}

// Faculty by race using fall-staff and human-resources datasets
async function ingestFacultyRace(unitid, year) {
  const urls = [
    `${BASE}/fall-staff/${year}/?unitid=${unitid}&per_page=5000`,
    `${BASE}/human-resources/${year}/?unitid=${unitid}&per_page=5000`,
  ]

  let data = []
  for (const url of urls) {
    try {
      const json = await fetchJSON(url)
      const results = json.results || json
      if (Array.isArray(results) && results.length > 0) {
        data = data.concat(results)
      }
    } catch (e) {
      // Continue
    }
  }

  if (data.length === 0) return 0

  const instName = data[0].instnm || data[0].institution_name || null
  const uni = await upsertUniversity(unitid, instName)

  // Upsert metric codes for faculty race
  const metricIds = {}
  for (const m of FACULTY_RACE_CODES) {
    metricIds[m.code] = (await upsertMetric(m.code, m.name, m.unit)).id
  }

  // Normalize helper
  const normalizeRace = (label) => {
    const s = String(label || '').toLowerCase()
    if (!s) return null
    if (s.includes('white')) return 'WHITE'
    if (s.includes('black')) return 'BLACK'
    if (s.includes('hisp')) return 'HISP'
    if (s.includes('asian')) return 'ASIAN'
    if (s.includes('two') && s.includes('race')) return 'TWOORMORE'
    if (s.includes('nonresident')) return 'NONRES'
    if (s.includes('unknown')) return 'UNKNOWN'
    // some datasets use 'two or more races' vs 'two or more'
    if (s.includes('two or more')) return 'TWOORMORE'
    return null
  }

  const isInstructional = (row) => {
    const strFields = Object.keys(row).filter((k) => typeof row[k] === 'string')
    for (const k of strFields) {
      const v = String(row[k]).toLowerCase()
      if (v.includes('instructional') || v === 'faculty' || v.includes('academic')) return true
    }
    return false
  }

  const numericFrom = (row) => {
    const preferred = ['headcount', 'count', 'employees', 'number', 'value']
    for (const key of preferred) {
      for (const k of Object.keys(row)) {
        if (k.toLowerCase() === key) {
          const n = Number(row[k])
          if (Number.isFinite(n)) return n
        }
      }
    }
    // fallback: first finite number-like property
    for (const k of Object.keys(row)) {
      const n = Number(row[k])
      if (Number.isFinite(n)) return n
    }
    return null
  }

  // Aggregate counts by race
  const byRace = { WHITE: 0, BLACK: 0, HISP: 0, ASIAN: 0, TWOORMORE: 0, NONRES: 0, UNKNOWN: 0 }
  for (const row of data) {
    if (!isInstructional(row)) continue
    const raceLabel = row.race_label || row.race || row.race_ethnicity_label || row.race_ethnicity
    const key = normalizeRace(raceLabel)
    if (!key) continue
    const val = numericFrom(row)
    if (val != null) byRace[key] += val
  }

  const total = Object.values(byRace).reduce((a, b) => a + b, 0)

  // Write points
  const codeFor = (k) => `HR.FACULTY.${k}`
  let wrote = 0
  for (const [k, v] of Object.entries(byRace)) {
    const metricId = metricIds[codeFor(k)]
    if (metricId) {
      await writePoint(uni.id, metricId, year, v)
      wrote++
    }
  }
  if (metricIds['HR.FACULTY.TOTAL']) {
    await writePoint(uni.id, metricIds['HR.FACULTY.TOTAL'], year, total)
    wrote++
  }

  return wrote
}

// ===== Main =====
async function main() {
  const unitid = Number(process.argv[2])
  const startYear = Number(process.argv[3])
  const endYear = Number(process.argv[4] || startYear)

  if (!unitid || !startYear) {
    console.error('Usage: node ingest_comprehensive.mjs <UNITID> <START_YEAR> [END_YEAR]')
    process.exit(1)
  }

  console.log(`Comprehensive ingest for unitid=${unitid}, years ${startYear}-${endYear}`)
  console.log('Categories: Admissions, Grad Rates, Financial Aid, Tuition, Faculty\n')

  let totalWrote = 0

  for (let year = startYear; year <= endYear; year++) {
    console.log(`[${year}]`)
    let yearTotal = 0

    try {
      const adm = await ingestAdmissions(unitid, year)
      if (adm > 0) {
        console.log(`  Admissions: ${adm} points`)
        yearTotal += adm
      }
    } catch (e) {
      console.log(`  Admissions: error - ${e.message}`)
    }

    try {
      const gr = await ingestGradRates(unitid, year)
      if (gr > 0) {
        console.log(`  Grad Rates: ${gr} points`)
        yearTotal += gr
      }
    } catch (e) {
      console.log(`  Grad Rates: error - ${e.message}`)
    }

    try {
      const sfa = await ingestFinancialAid(unitid, year)
      if (sfa > 0) {
        console.log(`  Financial Aid: ${sfa} points`)
        yearTotal += sfa
      }
    } catch (e) {
      console.log(`  Financial Aid: error - ${e.message}`)
    }

    try {
      const ic = await ingestTuitionCosts(unitid, year)
      if (ic > 0) {
        console.log(`  Tuition/Costs: ${ic} points`)
        yearTotal += ic
      }
    } catch (e) {
      console.log(`  Tuition/Costs: error - ${e.message}`)
    }

    try {
      const fac = await ingestFacultyMetrics(unitid, year)
      if (fac > 0) {
        console.log(`  Faculty: ${fac} points`)
        yearTotal += fac
      }
    } catch (e) {
      console.log(`  Faculty: error - ${e.message}`)
    }

    try {
      const fr = await ingestFacultyRace(unitid, year)
      if (fr > 0) {
        console.log(`  Faculty Race: ${fr} points`)
        yearTotal += fr
      }
    } catch (e) {
      console.log(`  Faculty Race: error - ${e.message}`)
    }

    if (yearTotal === 0) {
      console.log(`  No data found`)
    } else {
      console.log(`  Year total: ${yearTotal} points`)
    }

    totalWrote += yearTotal
    console.log('')
  }

  console.log(`\n✓ Total: ${totalWrote} data points written`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('Fatal error:', e)
  await prisma.$disconnect()
  process.exit(1)
})
