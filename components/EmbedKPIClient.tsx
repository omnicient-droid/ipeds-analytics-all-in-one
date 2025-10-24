'use client'
import * as React from 'react'
import type { APISeries } from '@/lib/series'
import { fetchSeries } from '@/lib/series'
import Sparkline from '@/components/Sparkline'

export default function EmbedKPIClient({
  code,
  unitid,
  label,
  height = 120,
}: {
  code: string
  unitid: number
  label?: string
  height?: number
}) {
  const [series, setSeries] = React.useState<APISeries[] | null>(null)
  const [err, setErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    fetchSeries([code], [unitid], undefined, { retries: 2, timeoutMs: 10000 })
      .then((s) => mounted && setSeries(s))
      .catch((e) => mounted && setErr(e?.message || 'Failed to load'))
    return () => {
      mounted = false
    }
  }, [code, unitid])

  if (err) return <div style={{ padding: 12, color: '#b91c1c' }}>Error: {err}</div>
  if (!series) return <div className="chart-skeleton" style={{ height }} />

  const s = series[0]
  const pts = s?.points?.filter((p) => p.value != null) || []
  const latest = pts.length ? pts[pts.length - 1] : null
  const values = pts.map((p) => Number(p.value))

  return (
    <div style={{ padding: 12, height }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label || s?.label || code}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {latest?.value != null ? Number(latest.value).toLocaleString() : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {latest ? `Year ${latest.year}` : ''}
          </div>
        </div>
        <Sparkline data={values} width={160} height={40} />
      </div>
    </div>
  )
}
