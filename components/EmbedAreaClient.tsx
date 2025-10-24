'use client'
import * as React from 'react'
import type { APISeries } from '@/lib/series'
import { fetchSeries } from '@/lib/series'
import { StackedArea100 } from '@/components/Charts'

export default function EmbedAreaClient({
  codes,
  unitid,
  height = 380,
}: {
  codes: string[]
  unitid: number
  height?: number
}) {
  const [series, setSeries] = React.useState<APISeries[] | null>(null)
  const [err, setErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    fetchSeries(codes, [unitid], undefined, { retries: 2, timeoutMs: 10000 })
      .then((s) => mounted && setSeries(s))
      .catch((e) => mounted && setErr(e?.message || 'Failed to load'))
    return () => {
      mounted = false
    }
  }, [codes.join(','), unitid])

  if (err) return <div style={{ padding: 12, color: '#b91c1c' }}>Error: {err}</div>
  if (!series) return <div className="chart-skeleton" style={{ height }} />

  const byCategory: Record<string, { year: number; value: number | null }[]> = {}
  for (const s of series) {
    byCategory[s.label || s.code] = s.points.map((p) => ({ year: p.year, value: p.value }))
  }

  return (
    <div style={{ height }}>
      <StackedArea100 byCategory={byCategory} />
    </div>
  )
}
