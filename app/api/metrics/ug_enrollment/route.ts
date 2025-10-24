import { NextRequest, NextResponse } from 'next/server'
import { buildDbSeriesPayload } from '@/lib/urban'
import { SCHOOLS } from '@/lib/schools'

// Compatibility wrapper: proxies to real DB-backed series for UG enrollment
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams
    const unitids = (sp.get('unitids') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => +s)
    const from = sp.get('from') ? +sp.get('from')! : undefined
    const to = sp.get('to') ? +sp.get('to')! : undefined

    const defaults = [SCHOOLS.columbia.unitid, SCHOOLS.unc.unitid, SCHOOLS.harvard.unitid]
    const ids = unitids.length ? unitids : defaults

    // DRVEF.UG_TOTAL is the real code for undergrad enrollment in our DB
    const out = await buildDbSeriesPayload(ids, ['DRVEF.UG_TOTAL'], { from, to })

    // Map to legacy shape
    const series = out.map((s) => ({ unitid: String(s.unitid), data: s.points }))
    return NextResponse.json({
      metric: { key: 'ug_enrollment', label: 'Undergraduate Enrollment', unit: 'students' },
      series,
    })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
