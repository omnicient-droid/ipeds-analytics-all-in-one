'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { LineChartInteractive } from '@/components/Chart'
import { NATIONAL_BENCHMARKS } from '@/lib/benchmarks'
import { buildDemoBLSSeries, BLS_SERIES_MAP } from '@/lib/bls'
import type { APISeries } from '@/lib/series'

export default function BenchmarksPanel() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  // Convert benchmarks to APISeries format
  const admRateSeries: APISeries[] = React.useMemo(() => {
    const nat = NATIONAL_BENCHMARKS.find((b) => b.code === 'NAT.ADM_RATE')
    const ivy = NATIONAL_BENCHMARKS.find((b) => b.code === 'IVY.GRAD_RATE')

    return [
      {
        code: 'NAT.ADM_RATE',
        unitid: 0,
        label: 'National Avg (All 4yr)',
        unit: 'percent',
        points: nat?.points.map((p) => ({ ...p, value: p.value ? p.value * 100 : null })) || [],
        color: '#3b82f6',
      },
      {
        code: 'IVY.ADM_RATE',
        unitid: 0,
        label: 'Ivy League Avg',
        unit: 'percent',
        points: [
          { year: 2015, value: 8.2 },
          { year: 2016, value: 7.9 },
          { year: 2017, value: 7.6 },
          { year: 2018, value: 7.3 },
          { year: 2019, value: 7.0 },
          { year: 2020, value: 6.8 },
          { year: 2021, value: 6.5 },
          { year: 2022, value: 6.3 },
          { year: 2023, value: 6.1 },
        ],
        color: '#8b5cf6',
      },
    ]
  }, [])

  const gradRateSeries: APISeries[] = React.useMemo(() => {
    const nat = NATIONAL_BENCHMARKS.find((b) => b.code === 'NAT.GRAD_RATE')
    const ivy = NATIONAL_BENCHMARKS.find((b) => b.code === 'IVY.GRAD_RATE')

    return [
      {
        code: 'NAT.GRAD_RATE',
        unitid: 0,
        label: 'National Avg (All 4yr)',
        unit: 'percent',
        points: nat?.points.map((p) => ({ ...p, value: p.value ? p.value * 100 : null })) || [],
        color: '#10b981',
      },
      {
        code: 'IVY.GRAD_RATE',
        unitid: 0,
        label: 'Ivy League Avg',
        unit: 'percent',
        points: ivy?.points.map((p) => ({ ...p, value: p.value ? p.value * 100 : null })) || [],
        color: '#f59e0b',
      },
    ]
  }, [])

  const blsSeries: APISeries[] = React.useMemo(() => {
    const overall = buildDemoBLSSeries('UNEMPLOYMENT_RATE')
    const bachelors = buildDemoBLSSeries('UNEMPLOYMENT_BACHELORS')
    const lessHS = buildDemoBLSSeries('UNEMPLOYMENT_LESS_HS')

    return [
      {
        code: 'BLS.UNEMP.OVERALL',
        unitid: 0,
        label: overall.label,
        unit: 'percent',
        points: overall.points.map((p) => ({ year: p.year, value: p.value })),
        color: '#ef4444',
      },
      {
        code: 'BLS.UNEMP.BACHELORS',
        unitid: 0,
        label: bachelors.label,
        unit: 'percent',
        points: bachelors.points.map((p) => ({ year: p.year, value: p.value })),
        color: '#10b981',
      },
      {
        code: 'BLS.UNEMP.LESS_HS',
        unitid: 0,
        label: lessHS.label,
        unit: 'percent',
        points: lessHS.points.map((p) => ({ year: p.year, value: p.value })),
        color: '#f59e0b',
      },
    ]
  }, [])

  if (!mounted) return null

  return (
    <section className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card-hover p-6"
      >
        <h2 className="mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent">
          National Benchmarks & Labor Market Outcomes
        </h2>
        <p className="text-sm text-gray-300">
          Compare institutional metrics against national averages and labor market indicators.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card-hover p-8"
      >
        <h3 className="mb-4 text-lg font-semibold text-blue-300">
          Admission Rates: Ivy vs. National
        </h3>
        <LineChartInteractive
          series={admRateSeries}
          transform="level"
          forecast={0}
          smooth={false}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card-hover p-8"
      >
        <h3 className="mb-4 text-lg font-semibold text-green-300">6-Year Graduation Rates</h3>
        <LineChartInteractive
          series={gradRateSeries}
          transform="level"
          forecast={0}
          smooth={false}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card-hover p-8"
      >
        <h3 className="mb-4 text-lg font-semibold text-red-300">
          Labor Market: Unemployment by Education Level
        </h3>
        <p className="mb-4 text-xs text-gray-400">
          Data: U.S. Bureau of Labor Statistics (demo data shown)
        </p>
        <LineChartInteractive series={blsSeries} transform="level" forecast={0} smooth={true} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card-hover border-blue-500/30 p-6"
      >
        <h4 className="mb-2 font-semibold text-blue-200">💡 Insights</h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li>• Ivy League institutions maintain ~6-7% admission rates vs. 63% national average</li>
          <li>
            • Bachelor degree holders consistently show ~2.5% unemployment vs. 8% for those without
            HS diplomas
          </li>
          <li>• National graduation rates have improved from 59.6% (2015) to 61.8% (2023)</li>
          <li>• Elite universities (Ivy+) maintain 95%+ graduation rates</li>
        </ul>
      </motion.div>
    </section>
  )
}
