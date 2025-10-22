// app/api/metrics/ug_enrollment/route.ts
import { NextResponse } from 'next/server'
import { ug_enrollment } from '@/data/demo/ug_enrollment'
import { SCHOOLS } from '@/lib/schools'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const unitidsParam = url.searchParams.get('unitids') || ''
  const unitids = unitidsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // If none provided, default to three demo schools:
  const defaultIds = [SCHOOLS.columbia.unitid, SCHOOLS.unc.unitid, SCHOOLS.harvard.unitid].map(
    String,
  )
  const ids = unitids.length ? unitids : defaultIds

  const series = ids.map((unitid) => ({
    unitid,
    data: ug_enrollment[unitid] || [],
  }))

  return NextResponse.json({
    metric: { key: 'ug_enrollment', label: 'Undergraduate Enrollment', unit: 'students' },
    series,
  })
}
