export type Point = { year: number; value: number | null }
export type SeriesOut = {
  code: string
  unitid: number
  label: string
  unit: 'headcount' | 'percent' | 'share' | 'USD'
  points: Point[]
  source?: string
  survey?: string
}

const URBAN_BASE = (
  process.env.URBAN_API_BASE || 'https://educationdata.urban.org/api/v1/college-university/ipeds'
).replace(/\/$/, '')

async function getJSON<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json() as Promise<T>
}
function firstNum(obj: any, keys: string[]): number | null {
  for (const k of keys) if (obj[k] != null && isFinite(+obj[k])) return +obj[k]
  return null
}
function firstStr(obj: any, keys: string[]): string | null {
  for (const k of keys) if (obj[k] != null && String(obj[k]).length) return String(obj[k])
  return null
}

const RACE_LABELS: Record<string, string> = {
  'EF.FALL.UG.WHITE': 'White',
  'EF.FALL.UG.BLACK': 'Black or African American',
  'EF.FALL.UG.HISP': 'Hispanic/Latino',
  'EF.FALL.UG.ASIAN': 'Asian',
  'EF.FALL.UG.TWOORMORE': 'Two or more races',
  'EF.FALL.UG.NONRES': 'Nonresident alien',
  'EF.FALL.UG.UNKNOWN': 'Race/ethnicity unknown',
}
type UrbanRow = Record<string, any>

export async function fetchEfRaceSeries(
  unitid: number,
  metricCode: keyof typeof RACE_LABELS,
  fromYear = 2010,
  toYear = new Date().getFullYear(),
) {
  const raceLabel = RACE_LABELS[metricCode]
  // FIX: Urban API rejects range syntax; use comma-separated years
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i).join(',')
  const sumURL = `${URBAN_BASE}/fall-enrollment/summaries?var=enrollment&stat=sum&by=race&unitid=${unitid}&per_page=5000&year=${years}&class_level=Undergraduate`
  try {
    console.log(`[Urban API] Fetching: ${sumURL}`)
    const json = await getJSON<{ results?: UrbanRow[] }>(sumURL)
    const rows = (json as any).results ?? json ?? []
    console.log(`[Urban API] Got ${rows.length} rows for ${metricCode} at unitid ${unitid}`)
    const vals: Record<number, number> = {}
    for (const r of rows) {
      const y = firstNum(r, ['year'])
      const race = firstStr(r, ['race_label', 'race']) || ''
      if (!y || race !== raceLabel) continue
      const v = firstNum(r, ['sum_enrollment', 'enrollment_sum', 'stat', 'value'])
      if (v != null) vals[y] = (vals[y] ?? 0) + v
    }
    const out = Object.keys(vals)
      .map((y) => ({ year: +y, value: vals[+y] }))
      .sort((a, b) => a.year - b.year)
    if (out.length) return out
  } catch {}

  const points: Point[] = []
  for (let year = fromYear; year <= toYear; year++) {
    try {
      const url = `${URBAN_BASE}/fall-enrollment-race/${year}/?unitid=${unitid}&per_page=5000`
      const rows = await getJSON<UrbanRow[]>(url)
      const ug = rows.filter((r) => {
        const lvl = firstStr(r, ['class_level_label', 'class_level'])
        return lvl ? /undergrad/i.test(lvl) : firstNum(r, ['class_level']) === 1
      })
      const want = ug.filter((r) => {
        const lbl = firstStr(r, ['race_label', 'race'])
        return (lbl || '').toLowerCase() === raceLabel.toLowerCase()
      })
      const v = want.reduce((a, r) => a + (firstNum(r, ['enrollment', 'count', 'value']) ?? 0), 0)
      points.push({ year, value: isFinite(v) ? v : null })
    } catch {
      points.push({ year, value: null })
    }
  }
  return points
}

export async function buildEfSeriesPayload(
  unitids: number[],
  codes: (keyof typeof RACE_LABELS | 'EF.FALL.UG.TOTAL')[],
  window?: { from?: number; to?: number },
): Promise<SeriesOut[]> {
  // Import Prisma client dynamically to avoid edge runtime issues
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()

  try {
    const from = window?.from ?? 2010
    const to = window?.to ?? new Date().getFullYear()

    // Map frontend codes to database codes
    const CODE_MAP: Record<string, string> = {
      'EF.FALL.UG.WHITE': 'EF.EFYWHITE',
      'EF.FALL.UG.BLACK': 'EF.EFYBLACK',
      'EF.FALL.UG.HISP': 'EF.EFYHISP',
      'EF.FALL.UG.ASIAN': 'EF.EFYASIAN',
      'EF.FALL.UG.TWOORMORE': 'EF.EFY2PLUS',
      'EF.FALL.UG.NONRES': 'EF.EFYNRAL',
      'EF.FALL.UG.UNKNOWN': 'EF.EFYUNK',
      'EF.FALL.UG.TOTAL': 'EF.EFYTOTL',
    }

    const dbCodes = codes.map((c) => CODE_MAP[c] || c)
    const out: SeriesOut[] = []

    // Get universities
    const universities = await prisma.university.findMany({
      where: { unitid: { in: unitids } },
      select: { id: true, unitid: true, name: true },
    })
    const uniMap = new Map(universities.map((u) => [u.unitid, u]))

    // Get metrics
    const metrics = await prisma.metric.findMany({
      where: { code: { in: dbCodes } },
      select: { id: true, code: true, name: true, unit: true },
    })
    const metricMap = new Map(metrics.map((m) => [m.code, m]))

    for (const unitid of unitids) {
      const uni = uniMap.get(unitid)
      if (!uni) continue

      for (let i = 0; i < codes.length; i++) {
        const frontendCode = codes[i]
        const dbCode = dbCodes[i]
        const metric = metricMap.get(dbCode)
        if (!metric) continue

        const timeSeries = await prisma.timeSeries.findMany({
          where: {
            universityId: uni.id,
            metricId: metric.id,
            year: { gte: from, lte: to },
          },
          orderBy: { year: 'asc' },
          select: { year: true, value: true },
        })

        const points: Point[] = timeSeries.map((ts) => ({
          year: ts.year,
          value: ts.value ? Number(ts.value) : null,
        }))

        out.push({
          code: frontendCode, // Use the frontend code in the response
          unitid,
          label: RACE_LABELS[frontendCode as keyof typeof RACE_LABELS] || metric.name || 'Unknown',
          unit: 'headcount',
          points,
          source: 'IPEDS (database)',
          survey: 'EF',
        })
      }
    }

    return out
  } finally {
    await prisma.$disconnect()
  }
}

export async function buildAdmissionsSeriesPayload(
  unitids: number[],
  codes: string[],
  window?: { from?: number; to?: number },
) {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const from = window?.from ?? 2010
    const to = window?.to ?? new Date().getFullYear()

    // Fetch universities and metrics in one go
    const [universities, metrics] = await Promise.all([
      prisma.university.findMany({
        where: { unitid: { in: unitids } },
        select: { id: true, unitid: true, name: true },
      }),
      prisma.metric.findMany({
        where: { code: { in: codes } },
        select: { id: true, code: true, name: true, unit: true },
      }),
    ])

    const uniMap = new Map(universities.map((u) => [u.unitid, u]))
    const metricMap = new Map(metrics.map((m) => [m.code, m]))

    const out: SeriesOut[] = []
    for (const unitid of unitids) {
      const uni = uniMap.get(unitid)
      if (!uni) continue

      for (const code of codes) {
        const metric = metricMap.get(code)
        if (!metric) continue
        const rows = await prisma.timeSeries.findMany({
          where: {
            universityId: uni.id,
            metricId: metric.id,
            year: { gte: from, lte: to },
          },
          orderBy: { year: 'asc' },
          select: { year: true, value: true },
        })
        out.push({
          code,
          unitid,
          label: metric.name ?? code,
          unit: (metric.unit as any) || 'count',
          points: rows.map((r) => ({
            year: r.year,
            value: r.value != null ? Number(r.value) : null,
          })),
          source: 'IPEDS (database)',
          survey: 'ADM',
        })
      }
    }

    return out
  } finally {
    await prisma.$disconnect()
  }
}
export async function buildGradRatesSeriesPayload(
  unitids: number[],
  codes: string[],
  window?: { from?: number; to?: number },
) {
  // Basic DB-backed implementation; will return empty if not ingested yet
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const from = window?.from ?? 2010
    const to = window?.to ?? new Date().getFullYear()
    const [universities, metrics] = await Promise.all([
      prisma.university.findMany({
        where: { unitid: { in: unitids } },
        select: { id: true, unitid: true, name: true },
      }),
      prisma.metric.findMany({
        where: { code: { in: codes } },
        select: { id: true, code: true, name: true, unit: true },
      }),
    ])
    const uniMap = new Map(universities.map((u) => [u.unitid, u]))
    const metricMap = new Map(metrics.map((m) => [m.code, m]))
    const out: SeriesOut[] = []
    for (const unitid of unitids) {
      const uni = uniMap.get(unitid)
      if (!uni) continue
      for (const code of codes) {
        const metric = metricMap.get(code)
        if (!metric) continue
        const rows = await prisma.timeSeries.findMany({
          where: { universityId: uni.id, metricId: metric.id, year: { gte: from, lte: to } },
          orderBy: { year: 'asc' },
          select: { year: true, value: true },
        })
        out.push({
          code,
          unitid,
          label: metric.name ?? code,
          unit: (metric.unit as any) || 'percent',
          points: rows.map((r) => ({
            year: r.year,
            value: r.value != null ? Number(r.value) : null,
          })),
          source: 'IPEDS (database)',
          survey: 'GR',
        })
      }
    }
    return out
  } finally {
    await prisma.$disconnect()
  }
}

// Generic DB-backed series builder for any metric codes present in Prisma
export async function buildDbSeriesPayload(
  unitids: number[],
  codes: string[],
  window?: { from?: number; to?: number },
): Promise<SeriesOut[]> {
  if (!codes.length) return []
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const from = window?.from ?? 2010
    const to = window?.to ?? new Date().getFullYear()

    const [universities, metrics] = await Promise.all([
      prisma.university.findMany({
        where: { unitid: { in: unitids } },
        select: { id: true, unitid: true, name: true },
      }),
      prisma.metric.findMany({
        where: { code: { in: codes } },
        select: { id: true, code: true, name: true, unit: true },
      }),
    ])

    const uniMap = new Map(universities.map((u) => [u.unitid, u]))
    const metricMap = new Map(metrics.map((m) => [m.code, m]))

    const out: SeriesOut[] = []
    for (const unitid of unitids) {
      const uni = uniMap.get(unitid)
      if (!uni) continue

      for (const code of codes) {
        const metric = metricMap.get(code)
        if (!metric) continue

        const rows = await prisma.timeSeries.findMany({
          where: { universityId: uni.id, metricId: metric.id, year: { gte: from, lte: to } },
          orderBy: { year: 'asc' },
          select: { year: true, value: true },
        })

        out.push({
          code,
          unitid,
          label: metric.name ?? code,
          unit: (metric.unit as any) || 'count',
          points: rows.map((r) => ({
            year: r.year,
            value: r.value != null ? Number(r.value) : null,
          })),
          source: 'IPEDS (database)',
        })
      }
    }

    return out
  } finally {
    await prisma.$disconnect()
  }
}
