import { NextResponse } from 'next/server'
import { ug_enrollment } from '@/data/demo/ug_enrollment'
import { SCHOOLS } from '@/lib/schools'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const unitidsParam = url.searchParams.get('unitids') || ''
  const ids = unitidsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const defaults = [SCHOOLS.columbia.unitid, SCHOOLS.unc.unitid, SCHOOLS.harvard.unitid].map(String)
  const useIds = ids.length ? ids : defaults

  const series = useIds.map((unitid) => ({ unitid, data: ug_enrollment[unitid] || [] }))

  return NextResponse.json({
    metric: { key: 'ug_enrollment', label: 'Undergraduate Enrollment', unit: 'students' },
    series,
  })
}
