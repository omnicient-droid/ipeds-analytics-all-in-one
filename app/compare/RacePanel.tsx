'use client'

import * as React from 'react'
import { fetchSeries, type APISeries } from '@/lib/series'
import { LineChartInteractive } from '../../components/Chart'
import TransformControls, { type TransformKind } from '../../components/TransformControls'
import { SCHOOL_LIST } from '@/lib/schools'

const UNITIDS = [190150, 199120, 166027]
const RACE_CODES = [
  'EF.FALL.UG.WHITE',
  'EF.FALL.UG.BLACK',
  'EF.FALL.UG.HISP',
  'EF.FALL.UG.ASIAN',
  'EF.FALL.UG.TWOORMORE',
  'EF.FALL.UG.NONRES',
  'EF.FALL.UG.UNKNOWN',
] as const

export default function RacePanel() {
  const [transform, setTransform] = React.useState<TransformKind>('yoy')
  const [forecast, setForecast] = React.useState<number>(5)
  const [smooth, setSmooth] = React.useState<boolean>(true)

  const [series, setSeries] = React.useState<APISeries[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const s = await fetchSeries([...RACE_CODES], UNITIDS, {
          from: 2010,
          to: new Date().getFullYear(),
        })
        const colored = s.map((r) => {
          const sch = SCHOOL_LIST.find((x) => x.unitid === r.unitid)
          return { ...r, color: sch?.color, label: sch?.short ?? String(r.unitid) }
        })
        setSeries(colored)
      } catch (e: any) {
        setError(String(e?.message || e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <section className="space-y-4">
      <p className="text-sm">Interactive charts • toggle transform, smoothing, and forecasts.</p>

      <TransformControls
        transform={transform}
        setTransform={setTransform}
        forecast={forecast}
        setForecast={setForecast}
        smooth={smooth}
        setSmooth={setSmooth}
      />

      {error && <div className="text-red-600 text-sm">Error: {error}</div>}
      {loading ? (
        <div className="mt-4">Loading…</div>
      ) : (
        <LineChartInteractive
          series={series}
          transform={transform}
          forecast={forecast}
          smooth={smooth}
        />
      )}
    </section>
  )
}
