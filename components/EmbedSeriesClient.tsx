'use client'
import * as React from 'react'
import type { APISeries } from '@/lib/series'
import { fetchSeries } from '@/lib/series'
import { LineChartInteractive, type TransformKind } from '@/components/Charts'

export default function EmbedSeriesClient({
  codes,
  unitids,
  transform = 'level',
  forecast = 0,
  smooth = false,
  height = 360,
}: {
  codes: string[]
  unitids: number[]
  transform?: TransformKind
  forecast?: number
  smooth?: boolean
  height?: number
}) {
  const [series, setSeries] = React.useState<APISeries[] | null>(null)
  const [err, setErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    fetchSeries(codes, unitids, undefined, { retries: 2, timeoutMs: 10000 })
      .then((s) => {
        if (mounted) setSeries(s)
      })
      .catch((e) => mounted && setErr(e?.message || 'Failed to load'))
    return () => {
      mounted = false
    }
  }, [codes.join(','), unitids.join(',')])

  if (err) return <div style={{ padding: 12, color: '#b91c1c' }}>Error: {err}</div>
  if (!series) return <div className="chart-skeleton" style={{ height }} />

  return (
    <div style={{ height }}>
      <LineChartInteractive
        series={series}
        transform={transform}
        forecast={forecast}
        smooth={smooth}
      />
    </div>
  )
}
