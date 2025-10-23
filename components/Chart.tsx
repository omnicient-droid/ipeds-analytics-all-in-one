'use client'

import * as React from 'react'
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
} from 'recharts'
import ChartSkeleton from './ChartSkeleton'

export type SeriesPoint = { year: number; value: number | null }

type Trend = { slope: number; intercept: number; r2: number }

export default function TimeSeriesChart(props: {
  title: string
  series: SeriesPoint[]
  unit?: string
  showTrend?: boolean
  trend?: Trend
}) {
  const { title, series, unit, showTrend, trend } = props
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const data = React.useMemo(() => {
    return (series || [])
      .slice()
      .sort((a, b) => a.year - b.year)
      .map((p) => ({ year: p.year, value: p.value == null ? null : Number(p.value) }))
  }, [series])

  const trendData = React.useMemo(() => {
    if (!showTrend || !trend) return [] as { year: number; y: number }[]
    const { slope, intercept } = trend
    return data.map((d) => ({ year: d.year, y: slope * d.year + intercept }))
  }, [showTrend, trend, data])

  const tickFmt = React.useCallback((v: number) => (unit ? `${v}` : v.toLocaleString()), [unit])

  const tooltipFmt = React.useCallback(
    (v: any) => (typeof v === 'number' ? (unit ? `${v}` : v.toLocaleString()) : v),
    [unit],
  )

  if (!mounted) {
    return (
      <div className="glass-card p-6" style={{ marginTop: 16 }}>
        <div className="text-lg font-semibold mb-4">{title}</div>
        <ChartSkeleton />
      </div>
    )
  }

  return (
    <div className="glass-card p-6 chart-fade-in" style={{ marginTop: 16 }}>
      <div className="text-lg font-semibold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        {title}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis tickFormatter={tickFmt as any} />
          <Tooltip formatter={tooltipFmt as any} />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-in-out"
          />
          {showTrend && trendData.length ? (
            <Line
              type="monotone"
              dataKey="y"
              data={trendData}
              stroke="#8b5cf6"
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-in-out"
            />
          ) : null}
          <Brush dataKey="year" height={18} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Keep the named export for new code */
export { LineChartInteractive } from './Charts'
