'use client'

import { useMemo, useState, useEffect } from 'react'
import useSWR from 'swr'
import { useSearchParams, useRouter } from 'next/navigation'
import { SCHOOLS, SchoolKey } from '@/lib/schools'
import { applyTransform, type TransformKey } from '@/lib/transforms'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import { RACE_METRICS } from '@/lib/raceMetrics'

const fetcher = (u: string) => fetch(u).then((r) => r.json())

function wide(series: any[], selected: SchoolKey[]) {
  const map: Record<string, Record<number, number>> = {}
  for (const s of series) {
    map[s.unitid] = {}
    for (const p of s.data) map[s.unitid][p.year] = p.value
  }
  const years = new Set<number>()
  series.forEach((s) => s.data.forEach((p: any) => years.add(p.year)))
  const y = [...years].sort((a, b) => a - b)
  const keyToUnitid = (k: SchoolKey) => String(SCHOOLS[k].unitid)
  return y.map((year) => {
    const row: any = { year }
    for (const k of selected) row[`s_${k}`] = map[keyToUnitid(k)]?.[year] ?? null
    return row
  })
}

export default function RacePanel() {
  const router = useRouter()
  const params = useSearchParams()
  const initSchools = (params.get('schools') || 'columbia,unc,harvard')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as SchoolKey[]
  const initCode = params.get('race') || 'EF.EFYBLACK'
  const initTf = (params.get('tf') || 'none') as TransformKey

  const [schools, setSchools] = useState<SchoolKey[]>(Array.from(new Set(initSchools)).slice(0, 3))
  const [code, setCode] = useState(initCode)
  const [tf, setTf] = useState<TransformKey>(initTf)

  useEffect(() => {
    const qs = new URLSearchParams()
    qs.set('schools', schools.join(','))
    qs.set('race', code)
    qs.set('tf', tf)
    router.replace(`/compare?${qs.toString()}`)
  }, [schools, code, tf, router])

  const unitidsCsv = schools.map((k) => SCHOOLS[k].unitid).join(',')
  const { data, error, isLoading } = useSWR<any>(
    `/api/ef?code=${encodeURIComponent(code)}&unitids=${unitidsCsv}`,
    fetcher,
  )

  const chartData = useMemo(() => {
    if (!data) return []
    const transformed = data.series.map((s: any) => ({
      unitid: s.unitid,
      data: applyTransform(s.data, tf),
    }))
    return wide(transformed, schools)
  }, [data, schools, tf])

  return (
    <section className="grid gap-4">
      {/* controls */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <label className="font-semibold" htmlFor="race-select">
          Race:
        </label>
        <select
          id="race-select"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        >
          {RACE_METRICS.map((m) => (
            <option key={m.code} value={m.code}>
              {m.label}
            </option>
          ))}
        </select>
        <label className="font-semibold ml-4" htmlFor="transform-select">
          Transform:
        </label>
        <select
          id="transform-select"
          value={tf}
          onChange={(e) => setTf(e.target.value as TransformKey)}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="none">None</option>
          <option value="yoy_pct">YoY %</option>
          <option value="diff">YoY Δ</option>
          <option value="index100">Index (first=100)</option>
          <option value="cum">Cumulative (∫)</option>
          <option value="log10">log10</option>
        </select>
        <div className="ml-auto text-sm opacity-70">
          {data?.metric?.name} • {data?.metric?.unit}
        </div>
      </div>

      {/* chart */}
      <div className="card p-3">
        <div style={{ width: '100%', height: 440 }}>
          {error && <div className="p-3 text-red-600">Failed to load.</div>}
          {isLoading && <div className="p-3">Loading…</div>}
          {!isLoading && !error && (
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(v: any) => (typeof v === 'number' ? v.toLocaleString() : v)} />
                <Legend />
                {schools.includes('columbia') && (
                  <Line
                    type="monotone"
                    name="Columbia"
                    dataKey="s_columbia"
                    stroke={SCHOOLS.columbia.color}
                    strokeWidth={3}
                  />
                )}
                {schools.includes('unc') && (
                  <Line
                    type="monotone"
                    name="UNC"
                    dataKey="s_unc"
                    stroke={SCHOOLS.unc.color}
                    strokeWidth={3}
                  />
                )}
                {schools.includes('harvard') && (
                  <Line
                    type="monotone"
                    name="Harvard"
                    dataKey="s_harvard"
                    stroke={SCHOOLS.harvard.color}
                    strokeWidth={3}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: switch race + transform; URL updates so you can share. Add more schools as you ingest
        EF.
      </p>
    </section>
  )
}
