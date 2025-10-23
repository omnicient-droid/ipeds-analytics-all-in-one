import { NextRequest, NextResponse } from 'next/server'
import {
  buildEfSeriesPayload,
  buildAdmissionsSeriesPayload,
  buildGradRatesSeriesPayload,
} from '@/lib/urban'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 3600

const list = (v?: string | null) =>
  v
    ? v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const unitids = list(sp.get('unitids')).map(Number)
  let codes = list(sp.get('codes'))
  const from = sp.get('from') ? +sp.get('from')! : undefined
  const to = sp.get('to') ? +sp.get('to')! : undefined

  if (!unitids.length) {
    return NextResponse.json({ ok: false, error: 'unitids required' }, { status: 400 })
  }

  // Sensible defaults if codes omitted
  if (!codes.length) {
    codes = [
      'EF.FALL.UG.WHITE',
      'EF.FALL.UG.BLACK',
      'EF.FALL.UG.HISP',
      'EF.FALL.UG.ASIAN',
      'EF.FALL.UG.TWOORMORE',
      'EF.FALL.UG.NONRES',
      'EF.FALL.UG.UNKNOWN',
      'EF.FALL.UG.TOTAL',
      'ADM.ADM_RATE',
      'ADM.YIELD',
      'GR.GR150.TOTAL',
    ]
  }

  const ef = codes.filter((c) => c.startsWith('EF.'))
  const adm = codes.filter((c) => c.startsWith('ADM.'))
  const gr = codes.filter((c) => c.startsWith('GR.'))

  try {
    const [a, b, c] = await Promise.all([
      ef.length ? buildEfSeriesPayload(unitids, ef as any, { from, to }) : Promise.resolve([]),
      adm.length ? buildAdmissionsSeriesPayload(unitids, adm, { from, to }) : Promise.resolve([]),
      gr.length ? buildGradRatesSeriesPayload(unitids, gr, { from, to }) : Promise.resolve([]),
    ])
    return NextResponse.json({ ok: true, series: [...a, ...b, ...c] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
