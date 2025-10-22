// app/compare/Client.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { SCHOOL_LIST, SCHOOLS, SchoolKey, schoolByKey } from '@/lib/schools'
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
import { useSearchParams, useRouter } from 'next/navigation'

type ApiSeries = { unitid: string; data: { year: number; value: number }[] }
type ApiPayload = { metric: { key: string; label: string; unit: string }; series: ApiSeries[] }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function LogoDot({ cx, cy, logo }: { cx?: number; cy?: number; logo: string }) {
  if (typeof cx !== 'number' || typeof cy !== 'number') return null
  const size = 16
  return (
    <image
      href={logo}
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid slice"
    />
  )
}

function LegendWithLogos(props: any) {
  const { payload = [] } = props
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '8px 4px',
      }}
    >
      {payload.map((entry: any) => {
        const schoolKey: SchoolKey | undefined = entry.dataKey?.replace('s_', '') as SchoolKey
        const s = schoolKey ? SCHOOLS[schoolKey] : undefined
        if (!s) return null
        return (
          <div
            key={entry.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              border: '1px solid #eee',
              borderRadius: 999,
            }}
          >
            <img
              src={s.logo}
              alt={s.logoAlt}
              width={18}
              height={18}
              style={{ borderRadius: 4, objectFit: 'cover' }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{s.short}</span>
          </div>
        )
      })}
    </div>
  )
}

function foldToWide(series: ApiSeries[], selectedKeys: SchoolKey[]) {
  const byUnit: Record<string, { [year: number]: number }> = {}
  for (const s of series) {
    byUnit[s.unitid] = {}
    for (const pt of s.data) byUnit[s.unitid][pt.year] = pt.value
  }
  const years = new Set<number>()
  series.forEach((s) => s.data.forEach((pt) => years.add(pt.year)))
  const sortedYears = [...years].sort((a, b) => a - b)

  const keyToUnit: Record<SchoolKey, string> = {
    columbia: String(SCHOOLS.columbia.unitid),
    unc: String(SCHOOLS.unc.unitid),
    harvard: String(SCHOOLS.harvard.unitid),
  }

  return sortedYears.map((year) => {
    const row: any = { year }
    for (const key of selectedKeys) {
      const unitid = keyToUnit[key]
      row[`s_${key}`] = byUnit[unitid]?.[year] ?? null
    }
    return row
  })
}

export default function Client() {
  const router = useRouter()
  const params = useSearchParams()

  const initSchools = (params.get('schools') || 'columbia,unc,harvard')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((k) => schoolByKey(k)?.key)
    .filter(Boolean) as SchoolKey[]

  const [selected, setSelected] = useState<SchoolKey[]>(
    Array.from(new Set(initSchools)).slice(0, 3),
  )
  const [metric] = useState<string>('ug_enrollment')

  useEffect(() => {
    const qs = new URLSearchParams()
    qs.set('schools', selected.join(','))
    qs.set('metric', metric)
    router.replace(`/compare?${qs.toString()}`)
  }, [selected, metric, router])

  const unitidsCsv = selected.map((k) => SCHOOLS[k].unitid).join(',')
  const { data, error, isLoading } = useSWR<ApiPayload>(
    `/api/metrics/${metric}?unitids=${unitidsCsv}`,
    fetcher,
  )

  const chartData = useMemo(() => (data ? foldToWide(data.series, selected) : []), [data, selected])

  function toggleSchool(key: SchoolKey) {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length >= 3) return prev
      return [...prev, key]
    })
  }

  function exportCSV() {
    if (!chartData.length) return
    const lines = [
      ['year', ...selected.map((k) => SCHOOLS[k].short)].join(','),
      ...chartData.map((row) => {
        const parts = [row.year]
        for (const k of selected) parts.push(row[`s_${k}`] ?? '')
        return parts.join(',')
      }),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statipedia_${metric}_${selected.join('-')}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          padding: 12,
          border: '1px solid #eee',
          borderRadius: 12,
          background: '#fafafa',
        }}
      >
        <div style={{ fontWeight: 700, marginRight: 6 }}>Schools:</div>
        {SCHOOL_LIST.map((s) => {
          const active = selected.includes(s.key)
          return (
            <button
              key={s.key}
              onClick={() => toggleSchool(s.key)}
              aria-pressed={active}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 999,
                border: active ? `2px solid ${s.color}` : '1px solid #e5e5e5',
                background: '#fff',
                cursor: 'pointer',
              }}
              title={s.name}
            >
              <img
                src={s.logo}
                alt={s.logoAlt}
                width={18}
                height={18}
                style={{ borderRadius: 4, objectFit: 'cover' }}
              />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{s.short}</span>
              {active && <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 4 }}>✓</span>}
            </button>
          )
        })}
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={exportCSV}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #e5e5e5',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Download CSV
          </button>
        </div>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 8,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Undergraduate Enrollment</h2>
          <div style={{ fontSize: 13, opacity: 0.7 }}>2015–2024 • students</div>
        </div>

        <div style={{ width: '100%', height: 420 }}>
          {error && <div style={{ color: 'crimson' }}>Failed to load data.</div>}
          {isLoading && <div style={{ padding: 20 }}>Loading chart…</div>}
          {!isLoading && !error && (
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} interval={0} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: any) =>
                    typeof value === 'number' ? value.toLocaleString() : value
                  }
                  labelFormatter={(label: any) => `Year ${label}`}
                />
                <Legend verticalAlign="top" align="left" content={<LegendWithLogos />} />
                {selected.includes('columbia') && (
                  <Line
                    type="monotone"
                    name="Columbia"
                    dataKey="s_columbia"
                    stroke={SCHOOLS.columbia.color}
                    strokeWidth={3}
                    dot={<LogoDot logo={SCHOOLS.columbia.logo} />}
                    activeDot={{ r: 6 }}
                  />
                )}
                {selected.includes('unc') && (
                  <Line
                    type="monotone"
                    name="UNC"
                    dataKey="s_unc"
                    stroke={SCHOOLS.unc.color}
                    strokeWidth={3}
                    dot={<LogoDot logo={SCHOOLS.unc.logo} />}
                    activeDot={{ r: 6 }}
                  />
                )}
                {selected.includes('harvard') && (
                  <Line
                    type="monotone"
                    name="Harvard"
                    dataKey="s_harvard"
                    stroke={SCHOOLS.harvard.color}
                    strokeWidth={3}
                    dot={<LogoDot logo={SCHOOLS.harvard.logo} />}
                    activeDot={{ r: 6 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#555' }}>
        Tip: Toggle school chips (max 3). The URL updates so you can share your selection.
      </div>
    </section>
  )
}
