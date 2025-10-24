// Monte Carlo simulation for enrollment/admissions projections
import type { Point } from './transform'

export interface SimulationConfig {
  horizon: number // Years to project
  iterations: number // Monte Carlo samples
  volatility: number // Standard deviation multiplier (0.1 = 10% SD)
  trend: 'linear' | 'growth' | 'decline' | 'stable'
}

export interface SimulationResult {
  year: number
  mean: number
  p10: number // 10th percentile
  p25: number
  p50: number // Median
  p75: number
  p90: number // 90th percentile
}

/**
 * Run Monte Carlo simulation for future projections
 * Uses historical volatility and user-defined growth assumptions
 */
export function runMonteCarloSimulation(
  historicalData: Point[],
  config: SimulationConfig,
): SimulationResult[] {
  const clean = historicalData.filter((p) => p.value != null).slice(-10)
  if (clean.length < 3) return []

  // Calculate historical stats
  const values = clean.map((p) => p.value as number)
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  const stdDev = Math.sqrt(variance)

  // Determine trend parameters
  const lastValue = values[values.length - 1]
  let trendRate = 0

  switch (config.trend) {
    case 'linear': {
      // OLS regression
      const xs = clean.map((_, i) => i)
      const ys = values
      const n = xs.length
      const mx = xs.reduce((a, b) => a + b, 0) / n
      const my = ys.reduce((a, b) => a + b, 0) / n
      let num = 0
      let den = 0
      for (let i = 0; i < n; i++) {
        num += (xs[i] - mx) * (ys[i] - my)
        den += (xs[i] - mx) ** 2
      }
      const slope = den === 0 ? 0 : num / den
      trendRate = slope / lastValue // Convert to rate
      break
    }
    case 'growth':
      trendRate = 0.03 // 3% annual growth
      break
    case 'decline':
      trendRate = -0.02 // 2% annual decline
      break
    case 'stable':
      trendRate = 0
      break
  }

  // Run Monte Carlo
  const lastYear = clean[clean.length - 1].year
  const results: SimulationResult[] = []

  for (let futureYear = 1; futureYear <= config.horizon; futureYear++) {
    const samples: number[] = []

    for (let iter = 0; iter < config.iterations; iter++) {
      let value = lastValue

      // Simulate year-by-year with random shocks
      for (let step = 1; step <= futureYear; step++) {
        // Trend component
        const trendComponent = value * trendRate

        // Random shock (normal distribution)
        const shock = randomNormal(0, stdDev * config.volatility)

        value = Math.max(0, value + trendComponent + shock)
      }

      samples.push(value)
    }

    // Sort and compute percentiles
    samples.sort((a, b) => a - b)
    const p10 = samples[Math.floor(samples.length * 0.1)]
    const p25 = samples[Math.floor(samples.length * 0.25)]
    const p50 = samples[Math.floor(samples.length * 0.5)]
    const p75 = samples[Math.floor(samples.length * 0.75)]
    const p90 = samples[Math.floor(samples.length * 0.9)]
    const meanSample = samples.reduce((sum, v) => sum + v, 0) / samples.length

    results.push({
      year: lastYear + futureYear,
      mean: meanSample,
      p10,
      p25,
      p50,
      p75,
      p90,
    })
  }

  return results
}

/**
 * Box-Muller transform for normal distribution
 */
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stdDev
}

/**
 * Calculate confidence bands for chart visualization
 */
export function buildConfidenceBands(
  historical: Point[],
  simulation: SimulationResult[],
): {
  historical: Point[]
  meanLine: Point[]
  p25Band: Point[]
  p75Band: Point[]
  p10Band: Point[]
  p90Band: Point[]
} {
  return {
    historical,
    meanLine: simulation.map((s) => ({ year: s.year, value: s.mean })),
    p25Band: simulation.map((s) => ({ year: s.year, value: s.p25 })),
    p75Band: simulation.map((s) => ({ year: s.year, value: s.p75 })),
    p10Band: simulation.map((s) => ({ year: s.year, value: s.p10 })),
    p90Band: simulation.map((s) => ({ year: s.year, value: s.p90 })),
  }
}
