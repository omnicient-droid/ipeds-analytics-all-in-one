import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const KEY = process.env.COLLEGESCORECARD_API_KEY || ''
const BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools'

// helper to build "2019.admissions...."
const y = (yr:number, ...parts:string[]) => `${yr}.${parts.join('.')}`

const METRICS = [
  { code:'SC.ADM.RATE',  name:'Admission rate (overall)', unit:'ratio',
    paths:(yr:number)=>[y(yr,'admissions','admission_rate','overall')] },
  { code:'SC.SAT.TOTAL25', name:'SAT Total 25th percentile', unit:'score',
    paths:(yr)=>[y(yr,'admissions','sat_scores','25th_percentile','overall')] },
  { code:'SC.SAT.TOTAL75', name:'SAT Total 75th percentile', unit:'score',
    paths:(yr)=>[y(yr,'admissions','sat_scores','75th_percentile','overall')] },
  { code:'SC.ACT.COMP25',  name:'ACT Composite 25th percentile', unit:'score',
    paths:(yr)=>[y(yr,'admissions','act_scores','25th_percentile','cumulative')] },
  { code:'SC.ACT.COMP75',  name:'ACT Composite 75th percentile', unit:'score',
    paths:(yr)=>[y(yr,'admissions','act_scores','75th_percentile','cumulative')] },
]

function firstNonNull(obj:any, paths:string[]): number|null {
  for (const p of paths) {
    const v = p.split('.').reduce((a:any,k)=>a?a[k]:undefined, obj)
    if (v !== null && v !== undefined && v !== '') {
      const n = Number(v); if (!Number.isNaN(n)) return n
    }
  }
  return null
}

async function upsertUniversity(unitid:number, name?:string, city?:string, state?:string) {
  return prisma.university.upsert({
    where: { unitid },
    create: { unitid, name: name ?? null, city: city ?? null, state: state ?? null },
    update: { name: name ?? undefined, city: city ?? undefined, state: state ?? undefined },
    select: { id: true }
  })
}

async function getOrCreateMetric(code:string, name:string, unit:string) {
  const m = await prisma.metric.findUnique({ where:{ code } })
  if (m) return m
  return prisma.metric.create({ data:{ code, name, unit } })
}

async function safeFetch(url:string, tries=0): Promise<Response> {
  const res = await fetch(url)
  if (res.status === 429 && tries < 5) {
    await new Promise(r => setTimeout(r, 500 * 2 ** tries))
    return safeFetch(url, tries+1)
  }
  return res
}

async function ingestYear(year:number) {
  const fields = [
    'id','school.name','school.city','school.state','school.ipeds_id',
    ...new Set(METRICS.flatMap(m => m.paths(year)))
  ].join(',')

  let page = 0, per_page = 100, total = 0
  for (;;) {
    const url = `${BASE}?api_key=${KEY}&fields=${encodeURIComponent(fields)}&per_page=${per_page}&page=${page}`
    if (page % 5 === 0) console.log(`[${year}] page=${page} …`)
    const res = await safeFetch(url)
    if (!res.ok) throw new Error(`Scorecard HTTP ${res.status} (${year}, page ${page})`)
    const js:any = await res.json()
    const rows:any[] = js.results || []
    if (rows.length === 0) break

    for (const row of rows) {
      const unitid = Number(row?.school?.ipeds_id ?? row?.id)
      if (!unitid) continue
      const uni = await upsertUniversity(unitid, row?.school?.name, row?.school?.city, row?.school?.state)
      for (const spec of METRICS) {
        const val = firstNonNull(row, spec.paths(year))
        if (val === null) continue
        const metric = await getOrCreateMetric(spec.code, spec.name, spec.unit)
        await prisma.timeSeries.upsert({
          where: { universityId_metricId_year: { universityId: uni.id, metricId: metric.id, year } },
          update: { value: val },
          create: { universityId: uni.id, metricId: metric.id, year, value: val }
        })
        total++
      }
    }
    page++
    if (rows.length < per_page) break
  }
  console.log(`Scorecard ${year}: inserted/updated ${total} values`)
}

async function main() {
  if (!KEY) { console.error('Missing COLLEGESCORECARD_API_KEY in .env'); process.exit(1) }
  const arg = (process.argv[2] || '').toUpperCase()
  const cur = new Date().getFullYear() - 1
  const start = arg === 'ALL' || arg === '' ? 2000 : Number(process.argv[2])
  const end = process.argv[3] ? Number(process.argv[3]) : (arg === 'ALL' || !process.argv[2] ? cur : start)
  if (!start || !end || end < start) { console.error('Usage: tsx scripts/scorecard_ingest.ts <startYear> [endYear] | ALL'); process.exit(1) }
  console.log(`[ingest] start=${start} end=${end} base=${BASE}`)
  for (let y = start; y <= end; y++) await ingestYear(y)
}

main().catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
