'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Sliders, Play, RotateCcw } from 'lucide-react'
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
} from 'recharts'
import {
  runMonteCarloSimulation,
  buildConfidenceBands,
  type SimulationConfig,
} from '@/lib/montecarlo'
import type { Point } from '@/lib/transform'

interface ScenarioBuilderProps {
  series: { code: string; label: string; points: Point[] }[]
  title?: string
}

export default function ScenarioBuilder({ series, title = 'Scenario Modeling' }: ScenarioBuilderProps) {
  const [selectedMetric, setSelectedMetric] = React.useState(0)
  const [horizon, setHorizon] = React.useState(5)
  const [iterations, setIterations] = React.useState(1000)
  const [volatility, setVolatility] = React.useState(0.1)
  const [trend, setTrend] = React.useState<SimulationConfig['trend']>('linear')
  const [simulating, setSimulating] = React.useState(false)
  const [results, setResults] = React.useState<ReturnType<typeof buildConfidenceBands> | null>(null)

  const runSimulation = React.useCallback(() => {
    if (series.length === 0) return

    setSimulating(true)
    setTimeout(() => {
      const config: SimulationConfig = { horizon, iterations, volatility, trend }
      const simulation = runMonteCarloSimulation(series[selectedMetric].points, config)
      const bands = buildConfidenceBands(series[selectedMetric].points, simulation)
      setResults(bands)
      setSimulating(false)
    }, 100) // Small delay for UI responsiveness
  }, [series, selectedMetric, horizon, iterations, volatility, trend])

  const reset = () => {
    setResults(null)
    setHorizon(5)
    setIterations(1000)
    setVolatility(0.1)
    setTrend('linear')
  }

  const chartData = React.useMemo(() => {
    if (!results) return []

    const historicalData = results.historical.map((p) => ({
      year: p.year,
      actual: p.value,
    }))

    const projectedData = results.meanLine.map((p, idx) => ({
      year: p.year,
      mean: p.value,
      p10: results.p10Band[idx].value,
      p25: results.p25Band[idx].value,
      p75: results.p75Band[idx].value,
      p90: results.p90Band[idx].value,
    }))

    return [...historicalData, ...projectedData]
  }, [results])

  if (series.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-hover border-yellow-500/30 p-6"
    >
      <div className="mb-6 flex items-center gap-3">
        <Sliders className="h-5 w-5 text-yellow-400" />
        <h3 className="text-lg font-bold text-yellow-300">{title}</h3>
      </div>

      {/* Metric Selector */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-300">Select Metric</label>
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(+e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-sm text-gray-200 backdrop-blur-sm focus:border-yellow-400 focus:outline-none"
        >
          {series.map((s, idx) => (
            <option key={idx} value={idx}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Controls Grid */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-300">
            <span>Projection Horizon (years)</span>
            <span className="text-yellow-400">{horizon}</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={horizon}
            onChange={(e) => setHorizon(+e.target.value)}
            className="w-full accent-yellow-500"
            aria-label="Projection horizon in years"
          />
        </div>

        <div>
          <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-300">
            <span>Volatility</span>
            <span className="text-yellow-400">{(volatility * 100).toFixed(0)}%</span>
          </label>
          <input
            type="range"
            min="0.05"
            max="0.3"
            step="0.05"
            value={volatility}
            onChange={(e) => setVolatility(+e.target.value)}
            className="w-full accent-yellow-500"
            aria-label="Volatility percentage"
          />
        </div>

        <div>
          <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-300">
            <span>Iterations</span>
            <span className="text-yellow-400">{iterations.toLocaleString()}</span>
          </label>
          <input
            type="range"
            min="100"
            max="5000"
            step="100"
            value={iterations}
            onChange={(e) => setIterations(+e.target.value)}
            className="w-full accent-yellow-500"
            aria-label="Number of Monte Carlo iterations"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Trend Assumption</label>
          <select
            value={trend}
            onChange={(e) => setTrend(e.target.value as SimulationConfig['trend'])}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-sm text-gray-200 backdrop-blur-sm focus:border-yellow-400 focus:outline-none"
          >
            <option value="linear">Linear (Historical Trend)</option>
            <option value="growth">Growth (+3% annually)</option>
            <option value="decline">Decline (-2% annually)</option>
            <option value="stable">Stable (No trend)</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={runSimulation}
          disabled={simulating}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {simulating ? 'Running...' : 'Run Simulation'}
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg border border-white/20 bg-black/20 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-white/30 hover:bg-black/30"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      {/* Results Chart */}
      {results && chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="rounded-lg border border-white/10 bg-black/20 p-4"
        >
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="year"
                stroke="#9ca3af"
                style={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis stroke="#9ca3af" style={{ fontSize: 12 }} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              
              {/* Confidence bands */}
              <Area
                type="monotone"
                dataKey="p90"
                stroke="none"
                fill="url(#confidenceBand)"
                fillOpacity={0.2}
                name="90th percentile"
              />
              <Area
                type="monotone"
                dataKey="p75"
                stroke="none"
                fill="url(#confidenceBand)"
                fillOpacity={0.3}
                name="75th percentile"
              />
              <Area
                type="monotone"
                dataKey="p25"
                stroke="none"
                fill="url(#confidenceBand)"
                fillOpacity={0.3}
                name="25th percentile"
              />
              <Area
                type="monotone"
                dataKey="p10"
                stroke="none"
                fill="url(#confidenceBand)"
                fillOpacity={0.2}
                name="10th percentile"
              />
              
              {/* Historical actual */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Historical"
              />
              
              {/* Projected mean */}
              <Line
                type="monotone"
                dataKey="mean"
                stroke="#fbbf24"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                name="Projected Mean"
              />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="mt-4 grid gap-3 text-xs text-gray-400 md:grid-cols-2">
            <div className="rounded border border-white/5 bg-black/20 p-3">
              <div className="mb-1 font-semibold text-yellow-400">What-If Analysis</div>
              <p>
                Monte Carlo simulation with {iterations.toLocaleString()} iterations. Bands show
                probable ranges based on historical volatility and your trend assumption.
              </p>
            </div>
            <div className="rounded border border-white/5 bg-black/20 p-3">
              <div className="mb-1 font-semibold text-yellow-400">Interpretation</div>
              <p>
                The shaded areas represent confidence intervals. 50% of simulations fall within the
                darker band, 80% within the lighter band.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {!results && (
        <div className="rounded-lg border border-dashed border-white/20 bg-black/10 p-8 text-center text-sm text-gray-400">
          Adjust parameters above and click "Run Simulation" to see Monte Carlo projections with
          confidence intervals.
        </div>
      )}
    </motion.div>
  )
}
