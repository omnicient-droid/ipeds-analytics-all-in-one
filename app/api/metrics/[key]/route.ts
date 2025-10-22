// app/api/metrics/[key]/route.ts
import { NextResponse } from 'next/server'
import { ug_enrollment } from '@/data/demo/ug_enrollment'
import { tuition } from '@/data/demo/tuition'
import { grad_rate } from '@/data/demo/grad_rate'
import { SCHOOLS } from '@/lib/schools'

export const dynamic = 'force-dynamic'

type YearPoint = { year: number; value: number }
type SeriesByUnitid = Record<string, YearPoint[]>

const DATASETS: Record<string, SeriesByUnitid> = {
  ug_enrollment,
  tuition,
  grad_rate,
}

const META: Record<string, { label: string; unit: string }> = {
  ug_enrollment: { label: 'Undergraduate Enrollment', unit: 'students' },
  tuition: { label: 'Tuition (sticker price)', unit: 'USD' },
  grad_rate: { label: 'Graduation Rate', unit: '%' },
}

export async function GET(req: Request, ctx: { params: { key: string } }) {
  try {
    const metricKey = ctx.params.key
    const dataset = DATASETS[metricKey]
    const meta = META[metricKey]
    if (!dataset || !meta) {
      return NextResponse.json({ error: 'Unknown metric' }, { status: 404 })
    }

    const url = new URL(req.url)
    const unitidsParam = url.searchParams.get('unitids') || ''
    const requested = unitidsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    // Default to the three demo schools if none provided
    const defaults = [
      String(SCHOOLS.columbia.unitid),
      String(SCHOOLS.unc.unitid),
      String(SCHOOLS.harvard.unitid),
    ]
    const unitids = requested.length ? requested : defaults

    const series = unitids.map((unitid) => ({
      unitid,
      data: dataset[unitid] || [],
    }))

    return NextResponse.json({ metric: { key: metricKey, ...meta }, series })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
