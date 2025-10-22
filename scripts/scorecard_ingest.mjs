import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const KEY  = process.env.COLLEGESCORECARD_API_KEY || ''
const BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools'
const p = new PrismaClient()

const y = (yr,...parts)=>`${yr}.${parts.join('.')}`
const METRICS = [
  { code:'SC.ADM.RATE',  name:'Admission rate (overall)', unit:'ratio',
    paths:y=>[y,'admissions','admission_rate','overall'] },
  { code:'SC.SAT.TOTAL25', name:'SAT Total 25th percentile', unit:'score',
    paths:y=>[y,'admissions','sat_scores','25th_percentile','overall'] },
  { code:'SC.SAT.TOTAL75', name:'SAT Total 75th percentile', unit:'score',
    paths:y=>[y,'admissions','sat_scores','75th_percentile','overall'] },
]

const path = (year, spec) => spec.paths(year).join('.')
const firstNonNull = (row, paths) => {
  for (const p of paths) {
    const v = p.split('.').reduce((a,k)=>a?a[k]:undefined, row)
    if (v!==null && v!==undefined && v!=='') { const n=Number(v); if(!Number.isNaN(n)) return n }
  }
  return null
}

async function upsertUniversity(unitid, name, city, state) {
  return p.university.upsert({
    where: { unitid:Number(unitid) },
    create:{ unitid:Number(unitid), name:name??null, city:city??null, state:state??null },
    update:{ name: name??undefined, city:city??undefined, state:state??undefined },
    select:{ id:true }
  })
}
async function getOrCreateMetric(code,name,unit) {
  const m = await p.metric.findUnique({ where:{ code } })
  return m ?? p.metric.create({ data:{ code, name, unit } })
}
async function safeFetch(url, tries=0){
  const res = await fetch(url)
  if (res.status===429 && tries<5){ await new Promise(r=>setTimeout(r, 500*2**tries)); return safeFetch(url, tries+1) }
  return res
}

async function ingestYear(year){
  const fields = [
    'id','school.name','school.city','school.state','school.ipeds_id',
    ...new Set(METRICS.map(m => path(year,m)))
  ].join(',')

  let page=0, per_page=100, written=0
  for(;;){
    const url = `${BASE}?api_key=${KEY}&fields=${encodeURIComponent(fields)}&per_page=${per_page}&page=${page}`
    if (page%5===0) console.log(`[${year}] page=${page} …`)
    const res = await safeFetch(url); if(!res.ok) throw new Error(`HTTP ${res.status} @ ${year} p${page}`)
    const js = await res.json(); const rows = js.results||[]; if(rows.length===0) break
    for(const row of rows){
      const unitid = Number(row?.school?.ipeds_id ?? row?.id); if(!unitid) continue
      const uni = await upsertUniversity(unitid, row?.school?.name, row?.school?.city, row?.school?.state)
      for(const spec of METRICS){
        const val = firstNonNull(row, [ path(year,spec) ])
        if (val===null) continue
        const m = await getOrCreateMetric(spec.code, spec.name, spec.unit)
        await p.timeSeries.upsert({
          where:{ universityId_metricId_year: { universityId: uni.id, metricId: m.id, year }},
          update:{ value: val },
          create:{ universityId: uni.id, metricId: m.id, year, value: val },
        })
        written++
      }
    }
    page++; if(rows.length<per_page) break
  }
  console.log(`Scorecard ${year}: inserted/updated ${written} values`)
}

async function main(){
  if(!KEY){ console.error('Missing COLLEGESCORECARD_API_KEY'); process.exit(1) }
  const arg=(process.argv[2]||'').toUpperCase()
  const cur = new Date().getFullYear()-1
  const start = arg==='ALL'||!arg ? 2000 : Number(process.argv[2])
  const end   = process.argv[3] ? Number(process.argv[3]) : (arg==='ALL'||!process.argv[2] ? cur : start)
  console.log(`[ingest] start=${start} end=${end} base=${BASE}`)
  for (let y=start; y<=end; y++) await ingestYear(y)
  await p.$disconnect()
}
main().catch(e=>{ console.error(e); process.exit(1) })
