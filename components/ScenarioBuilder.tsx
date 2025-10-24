'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sliders, Play, RotateCcw, TrendingUp, Eye, EyeOff } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import {
  runMonteCarloSimulation,
  buildConfidenceBands,
  type SimulationConfig,
} from '@/lib/montecarlo'
import type { Point } from '@/lib/transform'

interface SchoolSeries {
  schoolId: string
  schoolName: string
  code: string
  label: string
  points: Point[]
  color?: string
}

interface ScenarioBuilderProps {
  series: SchoolSeries[]
  title?: string
}

const CHART_COLORS = [
  { line: '#3b82f6', area: '#3b82f6', name: 'Blue' },
  { line: '#8b5cf6', area: '#8b5cf6', name: 'Purple' },
  { line: '#ec4899', area: '#ec4899', name: 'Pink' },
  { line: '#10b981', area: '#10b981', name: 'Emerald' },
  { line: '#f59e0b', area: '#f59e0b', name: 'Amber' },
  { line: '#06b6d4', area: '#06b6d4', name: 'Cyan' },
  { line: '#f97316', area: '#f97316', name: 'Orange' },
  { line: '#14b8a6', area: '#14b8a6', name: 'Teal' },
]

export default function ScenarioBuilder({
  series,
  title = 'Scenario Modeling',
}: ScenarioBuilderProps) {
  const [selectedMetric, setSelectedMetric] = React.useState(0)
  const [selectedSchools, setSelectedSchools] = React.useState<Set<string>>(new Set())
  const [horizon, setHorizon] = React.useState(5)
  const [iterations, setIterations] = React.useState(1000)
  const [volatility, setVolatility] = React.useState(0.1)
  const [trend, setTrend] = React.useState<SimulationConfig['trend']>('linear')
  const [simulating, setSimulating] = React.useState(false)
  const [results, setResults] = React.useState<
    Map<string, ReturnType<typeof buildConfidenceBands>>
  >(new Map())

  // Group series by school
  const schoolGroups = React.useMemo(() => {
    const groups = new Map<string, { name: string; metrics: typeof series }>()
    series.forEach((s) => {
      const key = s.schoolId || 'default'
      if (!groups.has(key)) {
        groups.set(key, { name: s.schoolName || 'School', metrics: [] })
      }
      groups.get(key)!.metrics.push(s)
    })
    return groups
  }, [series])

  // Get unique metrics across all schools
  const uniqueMetrics = React.useMemo(() => {
    const metrics = new Map<string, string>()
    series.forEach((s) => {
      metrics.set(s.code, s.label)
    })
    return Array.from(metrics.entries())
  }, [series])

  // Initialize with first school selected
  React.useEffect(() => {
    if (schoolGroups.size > 0 && selectedSchools.size === 0) {
      const firstSchool = Array.from(schoolGroups.keys())[0]
      setSelectedSchools(new Set([firstSchool]))
    }
  }, [schoolGroups, selectedSchools.size])

  const toggleSchool = (schoolId: string) => {
    const newSelection = new Set(selectedSchools)
    if (newSelection.has(schoolId)) {
      newSelection.delete(schoolId)
    } else {
      newSelection.add(schoolId)
    }
    setSelectedSchools(newSelection)
  }

  const runSimulation = React.useCallback(() => {
    if (selectedSchools.size === 0) return

    setSimulating(true)
    setTimeout(() => {
      const config: SimulationConfig = { horizon, iterations, volatility, trend }
      const newResults = new Map<string, ReturnType<typeof buildConfidenceBands>>()

      selectedSchools.forEach((schoolId) => {
        const school = schoolGroups.get(schoolId)
        if (school) {
          const metricData = school.metrics.find((m, idx) => 
            selectedMetric < uniqueMetrics.length ? m.code === uniqueMetrics[selectedMetric][0] : idx === 0
          )
          if (metricData && metricData.points.length > 0) {
            const simulation = runMonteCarloSimulation(metricData.points, config)
            const bands = buildConfidenceBands(metricData.points, simulation)
            newResults.set(schoolId, bands)
          }
        }
      })

      setResults(newResults)
      setSimulating(false)
    }, 100)
  }, [selectedSchools, schoolGroups, selectedMetric, uniqueMetrics, horizon, iterations, volatility, trend])

  const reset = () => {
    setResults(new Map())
    setHorizon(5)
    setIterations(1000)
    setVolatility(0.1)
    setTrend('linear')
  }

  const chartData = React.useMemo(() => {
    if (results.size === 0) return []

    // Combine all school data into a single timeline
    const allYears = new Set<number>()
    const dataByYear = new Map<number, any>()

    results.forEach((schoolResult, schoolId) => {
      // Add historical data
      schoolResult.historical.forEach((p) => {
        allYears.add(p.year)
        if (!dataByYear.has(p.year)) {
          dataByYear.set(p.year, { year: p.year })
        }
        dataByYear.get(p.year)![`${schoolId}_actual`] = p.value
      })

      // Add projected data
      schoolResult.meanLine.forEach((p, idx) => {
        allYears.add(p.year)
        if (!dataByYear.has(p.year)) {
          dataByYear.set(p.year, { year: p.year })
        }
        const yearData = dataByYear.get(p.year)!
        yearData[`${schoolId}_mean`] = p.value
        yearData[`${schoolId}_p10`] = schoolResult.p10Band[idx].value
        yearData[`${schoolId}_p25`] = schoolResult.p25Band[idx].value
        yearData[`${schoolId}_p75`] = schoolResult.p75Band[idx].value
        yearData[`${schoolId}_p90`] = schoolResult.p90Band[idx].value
      })
    })

    return Array.from(allYears)
      .sort((a, b) => a - b)
      .map((year) => dataByYear.get(year)!)
  }, [results])

  if (series.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-hover p-6"
      style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
        borderImage: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3)) 1',
      }}
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 p-2">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <h3 className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-xl font-bold text-transparent">
          {title}
        </h3>
      </div>

      {/* School Selector */}
      {schoolGroups.size > 1 && (
        <div className="mb-6">
          <label className="mb-3 block text-sm font-semibold text-gray-300">
            Select Schools to Compare
          </label>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {Array.from(schoolGroups.entries()).map(([schoolId, school], idx) => {
              const isSelected = selectedSchools.has(schoolId)
              const color = CHART_COLORS[idx % CHART_COLORS.length]
              return (
                <motion.button
                  key={schoolId}
                  onClick={() => toggleSchool(schoolId)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                    isSelected
                      ? 'border-current bg-white/5 shadow-lg'
                      : 'border-white/10 bg-black/20 opacity-60 hover:opacity-100'
                  }`}
                  style={{ borderColor: isSelected ? color.line : undefined }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-white"
                    style={{ backgroundColor: color.line }}
                  >
                    {isSelected ? <Eye className="h-5 w-5" /> : <EyeOff className="h-4 w-4 opacity-50" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">{school.name}</div>
                    <div className="text-xs text-gray-400">{school.metrics.length} metrics</div>
                  </div>
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: color.line, opacity: isSelected ? 1 : 0.3 }}
                  />
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Metric Selector */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold text-gray-300">Select Metric</label>
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(+e.target.value)}
          className="w-full rounded-lg border-2 border-white/10 bg-gradient-to-r from-black/60 to-black/40 px-4 py-3 text-sm font-medium text-gray-200 backdrop-blur-sm transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
        >
          {uniqueMetrics.map(([code, label], idx) => (
            <option key={code} value={idx}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Controls Grid */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-blue-500/5 to-transparent p-4">
          <label className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-200">
            <span>Projection Horizon</span>
            <span className="rounded-full bg-blue-500/20 px-3 py-1 text-lg font-bold text-blue-400">
              {horizon} {horizon === 1 ? 'year' : 'years'}
            </span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={horizon}
            onChange={(e) => setHorizon(+e.target.value)}
            className="slider-blue w-full"
            aria-label="Projection horizon in years"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((horizon - 1) / 9) * 100}%, rgba(255,255,255,0.1) ${((horizon - 1) / 9) * 100}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
        </div>

        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-purple-500/5 to-transparent p-4">
          <label className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-200">
            <span>Volatility</span>
            <span className="rounded-full bg-purple-500/20 px-3 py-1 text-lg font-bold text-purple-400">
              {(volatility * 100).toFixed(0)}%
            </span>
          </label>
          <input
            type="range"
            min="0.05"
            max="0.3"
            step="0.05"
            value={volatility}
            onChange={(e) => setVolatility(+e.target.value)}
            className="slider-purple w-full"
            aria-label="Volatility percentage"
            style={{
              background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((volatility - 0.05) / 0.25) * 100}%, rgba(255,255,255,0.1) ${((volatility - 0.05) / 0.25) * 100}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
        </div>

        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-emerald-500/5 to-transparent p-4">
          <label className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-200">
            <span>Iterations</span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-lg font-bold text-emerald-400">
              {iterations.toLocaleString()}
            </span>
          </label>
          <input
            type="range"
            min="100"
            max="5000"
            step="100"
            value={iterations}
            onChange={(e) => setIterations(+e.target.value)}
            className="slider-emerald w-full"
            aria-label="Number of Monte Carlo iterations"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${((iterations - 100) / 4900) * 100}%, rgba(255,255,255,0.1) ${((iterations - 100) / 4900) * 100}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
        </div>

        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-amber-500/5 to-transparent p-4">
          <label className="mb-2 block text-sm font-semibold text-gray-200">Trend Assumption</label>
          <select
            value={trend}
            onChange={(e) => setTrend(e.target.value as SimulationConfig['trend'])}
            className="w-full rounded-lg border-2 border-white/10 bg-gradient-to-r from-black/60 to-black/40 px-4 py-2.5 text-sm font-medium text-gray-200 backdrop-blur-sm transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
          >
            <option value="linear">📈 Linear (Historical Trend)</option>
            <option value="growth">🚀 Growth (+3% annually)</option>
            <option value="decline">📉 Decline (-2% annually)</option>
            <option value="stable">➡️ Stable (No trend)</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <motion.button
          onClick={runSimulation}
          disabled={simulating || selectedSchools.size === 0}
          whileHover={{ scale: simulating ? 1 : 1.02 }}
          whileTap={{ scale: simulating ? 1 : 0.98 }}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
        >
          <Play className="h-5 w-5" />
          {simulating ? 'Running Simulation...' : 'Run Simulation'}
        </motion.button>
        <motion.button
          onClick={reset}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-lg border-2 border-white/20 bg-black/20 px-6 py-3 font-semibold text-gray-300 transition-colors hover:border-white/30 hover:bg-black/30"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </motion.button>
      </div>

      {/* Results Chart */}
      {results.size > 0 && chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="rounded-xl border-2 border-white/10 bg-gradient-to-br from-black/40 via-black/60 to-black/40 p-6 shadow-2xl backdrop-blur-md"
        >
          <ResponsiveContainer width="100%" height={500}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                {Array.from(selectedSchools).map((schoolId, idx) => {
                  const color = CHART_COLORS[idx % CHART_COLORS.length]
                  return (
                    <React.Fragment key={schoolId}>
                      <linearGradient id={`gradient-${schoolId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color.area} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={color.area} stopOpacity={0.05} />
                      </linearGradient>
                      <filter id={`glow-${schoolId}`}>
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </React.Fragment>
                  )
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="year"
                stroke="#9ca3af"
                style={{ fontSize: 13, fontWeight: 600 }}
                tickLine={false}
                tick={{ fill: '#d1d5db' }}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: 13, fontWeight: 600 }}
                tickLine={false}
                tick={{ fill: '#d1d5db' }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.95)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  fontSize: 13,
                  fontWeight: 600,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
                labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: 8 }}
                itemStyle={{ padding: '4px 0' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 13, fontWeight: 600, paddingTop: 20 }}
                iconType="line"
                iconSize={20}
              />

              {/* Render for each selected school */}
              {Array.from(selectedSchools).map((schoolId, idx) => {
                const color = CHART_COLORS[idx % CHART_COLORS.length]
                const schoolName = schoolGroups.get(schoolId)?.name || 'School'
                
                return (
                  <React.Fragment key={schoolId}>
                    {/* Confidence bands */}
                    <Area
                      type="monotone"
                      dataKey={`${schoolId}_p90`}
                      stroke="none"
                      fill={`url(#gradient-${schoolId})`}
                      fillOpacity={0.15}
                      name={`${schoolName} 90th`}
                      connectNulls
                    />
                    <Area
                      type="monotone"
                      dataKey={`${schoolId}_p75`}
                      stroke="none"
                      fill={`url(#gradient-${schoolId})`}
                      fillOpacity={0.25}
                      name={`${schoolName} 75th`}
                      connectNulls
                    />
                    <Area
                      type="monotone"
                      dataKey={`${schoolId}_p25`}
                      stroke="none"
                      fill={`url(#gradient-${schoolId})`}
                      fillOpacity={0.25}
                      name={`${schoolName} 25th`}
                      connectNulls
                    />
                    <Area
                      type="monotone"
                      dataKey={`${schoolId}_p10`}
                      stroke="none"
                      fill={`url(#gradient-${schoolId})`}
                      fillOpacity={0.15}
                      name={`${schoolName} 10th`}
                      connectNulls
                    />
                    
                    {/* Historical actual line */}
                    <Line
                      type="monotone"
                      dataKey={`${schoolId}_actual`}
                      stroke={color.line}
                      strokeWidth={3}
                      dot={{ r: 4, fill: color.line, strokeWidth: 2, stroke: '#fff' }}
                      name={`${schoolName} (Actual)`}
                      filter={`url(#glow-${schoolId})`}
                      connectNulls
                    />
                    
                    {/* Projected mean line */}
                    <Line
                      type="monotone"
                      dataKey={`${schoolId}_mean`}
                      stroke={color.line}
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      dot={{ r: 4, fill: color.line, strokeWidth: 2, stroke: '#fff' }}
                      name={`${schoolName} (Projected)`}
                      filter={`url(#glow-${schoolId})`}
                      connectNulls
                    />
                  </React.Fragment>
                )
              })}

              {/* Vertical line to separate historical from projected */}
              {results.size > 0 && (
                <ReferenceLine
                  x={Array.from(results.values())[0].historical[Array.from(results.values())[0].historical.length - 1]?.year}
                  stroke="rgba(255,255,255,0.3)"
                  strokeDasharray="3 3"
                  strokeWidth={2}
                  label={{
                    value: 'Projection →',
                    position: 'top',
                    fill: '#9ca3af',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                <span className="text-sm font-bold text-blue-400">What-If Analysis</span>
              </div>
              <p className="text-xs leading-relaxed text-gray-300">
                Monte Carlo simulation with {iterations.toLocaleString()} iterations showing probable
                ranges based on {(volatility * 100).toFixed(0)}% volatility and{' '}
                {trend === 'linear' ? 'historical' : trend} trend assumptions.
              </p>
            </div>
            <div className="rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex gap-1">
                  {Array.from(selectedSchools).slice(0, 3).map((schoolId, idx) => (
                    <div
                      key={schoolId}
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length].line }}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-purple-400">Confidence Intervals</span>
              </div>
              <p className="text-xs leading-relaxed text-gray-300">
                Shaded areas represent confidence bands: 50% of simulations fall within the darker
                band (25th-75th percentile), 80% within the lighter band (10th-90th percentile).
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {results.size === 0 && (
        <div className="rounded-xl border-2 border-dashed border-white/20 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 p-12 text-center">
          <TrendingUp className="mx-auto mb-4 h-16 w-16 text-gray-500" />
          <p className="text-lg font-semibold text-gray-300">Ready to project the future?</p>
          <p className="mt-2 text-sm text-gray-400">
            Select schools, adjust parameters, and click "Run Simulation" to see Monte Carlo
            projections with confidence intervals.
          </p>
        </div>
      )}
    </motion.div>
  )
}
