// app/api/metrics/[key]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { buildDbSeriesPayload } from '@/lib/urban'
import { SCHOOLS } from '@/lib/schools'

export const dynamic = 'force-dynamic'

const KEY_TO_CODE: Record<string, { code: string; label: string; unit: string }> = {
  ug_enrollment: { code: 'DRVEF.UG_TOTAL', label: 'Undergraduate Enrollment', unit: 'students' },
  tuition: { code: 'IC.TUITION.IN_STATE', label: 'Tuition and Fees (In-State)', unit: 'USD' },
  grad_rate: { code: 'GR.GR150.TOTAL', label: 'Graduation Rate (150%)', unit: '%' },
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  try {
    const params = await ctx.params
    const def = KEY_TO_CODE[params.key]
    if (!def) return NextResponse.json({ error: 'Unknown metric key' }, { status: 404 })

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

    const out = await buildDbSeriesPayload(ids, [def.code], { from, to })
    const series = out.map((s) => ({ unitid: String(s.unitid), data: s.points }))
    return NextResponse.json({
      metric: { key: params.key, label: def.label, unit: def.unit },
      series,
    })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
