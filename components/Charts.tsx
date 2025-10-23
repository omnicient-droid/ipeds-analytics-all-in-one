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
  ReferenceLine,
} from 'recharts'
import type { APISeries } from '@/lib/series'
import { yoy, index, movingAvg, toShares, type Point } from '@/lib/transform'
import { toDiff, toCum } from '@/lib/transforms'
import { linForecast } from '@/lib/forecast'
import ChartSkeleton from './ChartSkeleton'

export type TransformKind = 'level' | 'yoy' | 'index' | 'factor'
const PALETTE = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
  '#a855f7', // violet
  '#22c55e', // lime
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
    <div className="my-4 flex flex-wrap gap-4 text-sm">
      <label className="flex items-center gap-2 font-medium text-gray-300">
        <span className="text-blue-400">Transform:</span>
        <select
          value={p.transform}
          onChange={(e) => p.setTransform(e.target.value as TransformKind)}
          className="cursor-pointer rounded-lg border border-blue-500/30 bg-gray-800/90 px-3 py-2 text-gray-200 shadow-md transition-all duration-200 hover:border-blue-500/50 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
        >
          <option value="level">Level</option>
          <option value="yoy">YoY %</option>
          <option value="index">Index (2015=100)</option>
          <option value="factor">Factor (base=1)</option>
        </select>
      </label>
      <label className="flex items-center gap-2 font-medium text-gray-300">
        <span className="text-purple-400">Forecast:</span>
        <select
          value={p.forecast}
          onChange={(e) => p.setForecast(parseInt(e.target.value))}
          className="cursor-pointer rounded-lg border border-purple-500/30 bg-gray-800/90 px-3 py-2 text-gray-200 shadow-md transition-all duration-200 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
        >
          <option value="0">Off</option>
          <option value="3">3y</option>
          <option value="5">5y</option>
        </select>
      </label>
      <label className="flex cursor-pointer items-center gap-2 font-medium text-gray-300 transition-colors duration-200 hover:text-white">
        <input
          type="checkbox"
          checked={p.smooth}
          onChange={(e) => p.setSmooth(e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded border-green-500/30 bg-gray-800 text-green-500 focus:ring-2 focus:ring-green-500/50"
        />
        <span className="text-green-400">Smooth (3-yr)</span>
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
  if (kind === 'index') {
    const base = points.find((p) => p.value != null)?.value ?? null
    return points.map((p) => ({
      year: p.year,
      value: base && p.value != null ? (p.value / base) * 100 : null,
    }))
  }
  // factor: ratio to first non-null value (base=1 at start)
  const base = points.find((p) => p.value != null)?.value ?? null
  return points.map((p) => ({
    year: p.year,
    value: base && p.value != null ? p.value / base : null,
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
  // Overlay toggles (local). Derivative (Δ), Acceleration (Δ²), Integral (Σ), Growth (Δlog).
  const [showDiff, setShowDiff] = useState(false)
  const [showAccel, setShowAccel] = useState(false)
  const [showCum, setShowCum] = useState(false)
  const [showGrowth, setShowGrowth] = useState(false)
  const mounted = useMounted()
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null)
  const [activeYear, setActiveYear] = useState<number | null>(null)
  const processed = useMemo(() => {
    console.log('LineChartInteractive received series:', series)
    const result = series.map((s, i) => {
      console.log(`Processing series ${i}:`, {
        code: s.code,
        unitid: s.unitid,
        pointsCount: s.points?.length,
      })
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
    })
    console.log('Processed series:', result)
    return result
  }, [series, transform, smooth, forecast])
  const years = useMemo(
    () =>
      Array.from(new Set(processed.flatMap((s) => s.points.map((p) => p.year)))).sort(
        (a, b) => a - b,
      ),
    [processed],
  )
  const data = useMemo(() => {
    const result = years.map((y) => {
      const row: any = { year: y }
      for (const s of processed) {
        row[s.__name] = s.points.find((p) => p.year === y)?.value ?? null
      }
      return row
    })
    console.log('Chart data for Recharts:', result)
    return result
  }, [years, processed])
  const { min, max } = useMemo(() => extent(processed), [processed])
  const yDomain = transform === 'yoy' ? [min * 1.1, max * 1.1] : ['auto', 'auto']
  const tickFmt =
    transform === 'yoy'
      ? (v: number) => `${(v * 100).toFixed(0)}%`
      : (v: number) => v.toLocaleString()

  if (!mounted) return <ChartSkeleton />

  // Custom tooltip that shows all series at a year, or a single series when a line is hovered
  const CustomTooltip = ({ active, label, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null
    const rows = (
      hoveredSeries ? payload.filter((p: any) => p.name === hoveredSeries) : payload
    ).filter((p: any) => p.value != null)
    if (rows.length === 0) return null
    return (
      <div className="rounded-md border border-white/10 bg-gray-900/90 px-3 py-2 text-xs shadow-lg backdrop-blur">
        <div className="mb-1 font-medium text-gray-200">Year {label}</div>
        <div className="grid grid-cols-1 gap-1">
          {rows
            .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
            .map((p: any) => (
              <div key={p.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-gray-300">{p.name}</span>
                </div>
                <div className="text-gray-100 tabular-nums">
                  {typeof p.value === 'number'
                    ? transform === 'yoy'
                      ? `${(p.value * 100).toFixed(2)}%`
                      : p.value.toLocaleString()
                    : '—'}
                </div>
              </div>
            ))}
        </div>
      </div>
    )
  }

  // Custom active dot with small value label
  const ActiveDot = (props: any) => {
    const { cx, cy, stroke, value } = props
    if (value == null) return null
    const display =
      transform === 'yoy' ? `${(value * 100).toFixed(1)}%` : `${Number(value).toLocaleString()}`
    return (
      <g>
        <circle cx={cx} cy={cy} r={4} fill={stroke} stroke="none" />
        <rect
          x={cx + 6}
          y={cy - 10}
          rx={3}
          ry={3}
          width={Math.max(22, display.length * 6)}
          height={16}
          fill="rgba(17,24,39,0.9)"
          stroke="rgba(255,255,255,0.12)"
        />
        <text x={cx + 8} y={cy + 2} fontSize={10} fill="#e5e7eb">
          {display}
        </text>
      </g>
    )
  }

  return (
    <div className="chart-fade-in">
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2 text-xs text-gray-300">
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={showDiff}
            onChange={(e) => setShowDiff(e.target.checked)}
          />
          Δ (Derivative)
        </label>
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={showAccel}
            onChange={(e) => setShowAccel(e.target.checked)}
          />
          Δ² (Acceleration)
        </label>
        <label className="inline-flex items-center gap-1">
          <input type="checkbox" checked={showCum} onChange={(e) => setShowCum(e.target.checked)} />
          Σ (Integral)
        </label>
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={showGrowth}
            onChange={(e) => setShowGrowth(e.target.checked)}
          />
          Growth (Δlog)
        </label>
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 28, left: 10, bottom: 8 }}
          onMouseMove={(e: any) => setActiveYear(e?.activeLabel ?? null)}
          onMouseLeave={() => {
            setActiveYear(null)
            setHoveredSeries(null)
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.15)" />
          <XAxis
            dataKey="year"
            tick={{ fill: '#cbd5e1' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(59, 130, 246, 0.2)' }}
          />
          <YAxis
            domain={yDomain as any}
            tickFormatter={tickFmt}
            tick={{ fill: '#cbd5e1' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(59, 130, 246, 0.2)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#e5e7eb' }} />
          {activeYear != null ? (
            <ReferenceLine
              x={activeYear}
              stroke="rgba(148, 163, 184, 0.35)"
              strokeDasharray="4 3"
              ifOverflow="extendDomain"
            />
          ) : null}
          {processed.map((s) => (
            <Line
              key={s.__name}
              type="monotone"
              dataKey={s.__name}
              stroke={s.__color}
              strokeWidth={2.25}
              dot={false}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-in-out"
              strokeOpacity={0.95}
              activeDot={<ActiveDot />}
              onMouseOver={() => setHoveredSeries(s.__name)}
              onMouseLeave={() => setHoveredSeries(null)}
            />
          ))}

          {/* Overlay lines computed from LEVEL data to provide consistent interpretation */}
          {processed.map((s, i) => {
            // Reconstruct level series from original series (before transform forecasting). We have only transformed points here.
            // Approximate by using the original points from input series.
            const levelPts = series[i]?.points?.slice().sort((a, b) => a.year - b.year) || []
            const diff = showDiff ? toDiff(levelPts as any) : null
            const accel = showAccel && diff ? toDiff(diff as any) : null
            const cum = showCum ? toCum(levelPts as any) : null
            const growth = showGrowth
              ? toDiff(
                  levelPts.map((p) => ({
                    year: p.year,
                    value: p.value && p.value > 0 ? Math.log(p.value as number) : null,
                  })) as any,
                )
              : null
            const mkColor = (hex: string) => hex + 'AA'
            return (
              <g key={s.__name + ':overlays'}>
                {showDiff && (
                  <Line
                    type="monotone"
                    dataKey={`${s.__name} Δ`}
                    data={years.map((y) => ({
                      year: y,
                      [`${s.__name} Δ`]: diff?.find((p) => p.year === y)?.value ?? null,
                    }))}
                    stroke={mkColor(s.__color)}
                    strokeDasharray="4 3"
                    dot={false}
                    strokeWidth={1.5}
                  />
                )}
                {showAccel && (
                  <Line
                    type="monotone"
                    dataKey={`${s.__name} Δ²`}
                    data={years.map((y) => ({
                      year: y,
                      [`${s.__name} Δ²`]: accel?.find((p) => p.year === y)?.value ?? null,
                    }))}
                    stroke={mkColor(s.__color)}
                    strokeDasharray="2 3"
                    dot={false}
                    strokeWidth={1.2}
                  />
                )}
                {showCum && (
                  <Line
                    type="monotone"
                    dataKey={`${s.__name} Σ`}
                    data={years.map((y) => ({
                      year: y,
                      [`${s.__name} Σ`]: cum?.find((p) => p.year === y)?.value ?? null,
                    }))}
                    stroke={mkColor(s.__color)}
                    strokeDasharray="6 4"
                    dot={false}
                    strokeWidth={1.2}
                  />
                )}
                {showGrowth && (
                  <Line
                    type="monotone"
                    dataKey={`${s.__name} Δlog`}
                    data={years.map((y) => ({
                      year: y,
                      [`${s.__name} Δlog`]: growth?.find((p) => p.year === y)?.value ?? null,
                    }))}
                    stroke={mkColor(s.__color)}
                    strokeDasharray="1 3"
                    dot={false}
                    strokeWidth={1.2}
                  />
                )}
              </g>
            )
          })}
          <Brush dataKey="year" height={18} />
        </LineChart>
      </ResponsiveContainer>
    </div>
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

  if (!mounted) return <ChartSkeleton />

  return (
    <div className="chart-fade-in">
      <ResponsiveContainer width="100%" height={380}>
        <AreaChart
          data={data}
          stackOffset="expand"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
          <Tooltip
            formatter={(v: any) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : v)}
          />
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
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-in-out"
            />
          ))}
          <Brush dataKey="year" height={18} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
