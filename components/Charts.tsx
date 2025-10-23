'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  Brush,
  AreaChart,
  Area,
} from 'recharts'
import type { APISeries } from '@/lib/series'
import { yoy, index, movingAvg, toShares, type Point } from '@/lib/transform'
import { linForecast } from '@/lib/forecast'
export type TransformKind = 'level' | 'yoy' | 'index'
const PALETTE = [
  '#e45756',
  '#4da6ff',
  '#ffc107',
  '#7cb342',
  '#8e24aa',
  '#00acc1',
  '#ff7043',
  '#78909c',
  '#1565c0',
  '#c62828',
  '#2e7d32',
  '#6d4c41',
]
const useMounted = () => {
  const [m, set] = useState(false)
  useEffect(() => set(true), [])
  return m
}
export function ChartControls(p: {
  transform: TransformKind
  setTransform: (v: TransformKind) => void
  forecast: number
  setForecast: (n: number) => void
  smooth: boolean
  setSmooth: (b: boolean) => void
}) {
  return (
    <div className="flex flex-wrap gap-3 my-3 text-sm">
      <label className="flex items-center gap-2">
        Transform:
        <select
          value={p.transform}
          onChange={(e) => p.setTransform(e.target.value as TransformKind)}
          className="border rounded px-2 py-1"
        >
          <option value="level">Level</option>
          <option value="yoy">YoY %</option>
          <option value="index">Index (2015=100)</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        Forecast:
        <select
          value={p.forecast}
          onChange={(e) => p.setForecast(parseInt(e.target.value))}
          className="border rounded px-2 py-1"
        >
          <option value="0">Off</option>
          <option value="3">3y</option>
          <option value="5">5y</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={p.smooth} onChange={(e) => p.setSmooth(e.target.checked)} />
        Smooth (3-yr)
      </label>
    </div>
  )
}
function applyTransform(points: Point[], kind: TransformKind): Point[] {
  if (kind === 'level') return points
  if (kind === 'yoy') {
    const out: Point[] = []
    for (let i = 0; i < points.length; i++) {
      const c = points[i]
      const prev = points.find((p) => p.year === c.year - 1)
      out.push(
        c.value != null && prev?.value != null && prev.value !== 0
          ? { year: c.year, value: c.value / prev.value - 1 }
          : { year: c.year, value: null },
      )
    }
    return out
  }
  const base = points.find((p) => p.value != null)?.value ?? null
  return points.map((p) => ({
    year: p.year,
    value: base && p.value != null ? (p.value / base) * 100 : null,
  }))
}
function extent(s: { points: Point[] }[]) {
  let min = Infinity,
    max = -Infinity
  for (const a of s)
    for (const p of a.points) {
      if (p.value != null) {
        if (p.value < min) min = p.value
        if (p.value > max) max = p.value
      }
    }
  if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 1 }
  if (min === max) {
    const pad = Math.abs(max) > 1 ? Math.abs(max) * 0.05 : 0.05
    return { min: min - pad, max: max + pad }
  }
  return { min, max }
}
export function LineChartInteractive({
  series,
  transform,
  forecast,
  smooth,
}: {
  series: APISeries[]
  transform: TransformKind
  forecast: number
  smooth: boolean
}) {
  const mounted = useMounted()
  const processed = useMemo(
    () =>
      series.map((s, i) => {
        let pts = s.points.slice().sort((a, b) => a.year - b.year)
        pts = applyTransform(pts, transform)
        if (smooth) pts = movingAvg(pts, 3)
        if (forecast > 0) {
          const proj = linForecast(pts, forecast).map((p) => ({ ...p, value: p.value ?? null }))
          pts = pts.concat(proj)
        }
        const name = s.label || s.code
        return {
          ...s,
          points: pts,
          __name: name,
          __color: s.color || PALETTE[i % PALETTE.length],
        } as APISeries & { __name: string; __color: string }
      }),
    [series, transform, smooth, forecast],
  )
  const years = useMemo(
    () =>
      Array.from(new Set(processed.flatMap((s) => s.points.map((p) => p.year)))).sort(
        (a, b) => a - b,
      ),
    [processed],
  )
  const data = useMemo(
    () =>
      years.map((y) => {
        const row: any = { year: y }
        for (const s of processed) {
          row[s.__name] = s.points.find((p) => p.year === y)?.value ?? null
        }
        return row
      }),
    [years, processed],
  )
  const { min, max } = useMemo(() => extent(processed), [processed])
  const yDomain = transform === 'yoy' ? [min * 1.1, max * 1.1] : ['auto', 'auto']
  const tickFmt =
    transform === 'yoy'
      ? (v: number) => `${(v * 100).toFixed(0)}%`
      : (v: number) => v.toLocaleString()
  if (!mounted) return null
  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis domain={yDomain as any} tickFormatter={tickFmt} />
        <Tooltip
          formatter={(v: any) =>
            typeof v === 'number'
              ? transform === 'yoy'
                ? `${(v * 100).toFixed(2)}%`
                : v.toLocaleString()
              : v
          }
        />
        <Legend />
        {processed.map((s) => (
          <Line
            key={s.__name}
            type="monotone"
            dataKey={s.__name}
            stroke={s.__color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
        <Brush dataKey="year" height={18} />
      </LineChart>
    </ResponsiveContainer>
  )
}
export function StackedArea100({ byCategory }: { byCategory: Record<string, Point[]> }) {
  const mounted = useMounted()
  const shares = useMemo(() => toShares(byCategory), [byCategory])
  const cats = Object.keys(shares)
  const years = Array.from(new Set(Object.values(shares)[0]?.map((p) => p.year) || [])).sort(
    (a, b) => a - b,
  )
  const data = years.map((y) => {
    const row: any = { year: y }
    for (const c of cats) row[c] = shares[c].find((p) => p.year === y)?.value ?? null
    return row
  })
  if (!mounted) return null
  return (
    <ResponsiveContainer width="100%" height={380}>
      <AreaChart
        data={data}
        stackOffset="expand"
        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
        <Tooltip formatter={(v: any) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : v)} />
        <Legend />
        {cats.map((c, i) => (
          <Area
            key={c}
            type="monotone"
            dataKey={c}
            stackId="1"
            stroke={PALETTE[i % PALETTE.length]}
            fill={PALETTE[i % PALETTE.length]}
            strokeWidth={1.5}
            dot={false}
          />
        ))}
        <Brush dataKey="year" height={18} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
