'use client'

import * as React from 'react'
import { fetchSeries, type APISeries } from '@/lib/series'
import { LineChartInteractive } from '../../components/Chart'
import TransformControls, { type TransformKind } from '../../components/TransformControls'
import { SCHOOL_LIST } from '@/lib/schools'

const UNITIDS = [190150, 199120, 166027]
const RACE_CODES = [
  'EF.FALL.UG.WHITE',
  'EF.FALL.UG.BLACK',
  'EF.FALL.UG.HISP',
  'EF.FALL.UG.ASIAN',
  'EF.FALL.UG.TWOORMORE',
  'EF.FALL.UG.NONRES',
  'EF.FALL.UG.UNKNOWN',
] as const

export default function RacePanel() {
  const [transform, setTransform] = React.useState<TransformKind>('level')
  const [forecast, setForecast] = React.useState<number>(5)
  const [smooth, setSmooth] = React.useState<boolean>(true)

  const [series, setSeries] = React.useState<APISeries[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)
  const [demoMode, setDemoMode] = React.useState<boolean>(false)

  function buildDemoSeries(): APISeries[] {
    const totals: Record<number, number> = {
      190150: 8800,
      199120: 19800,
      166027: 6750,
    }
    const shares: Record<(typeof RACE_CODES)[number], number> = {
      'EF.FALL.UG.WHITE': 0.35,
      'EF.FALL.UG.BLACK': 0.06,
      'EF.FALL.UG.HISP': 0.17,
      'EF.FALL.UG.ASIAN': 0.14,
      'EF.FALL.UG.TWOORMORE': 0.08,
      'EF.FALL.UG.NONRES': 0.12,
      'EF.FALL.UG.UNKNOWN': 0.08,
    }
    const years = Array.from({ length: 10 }, (_, i) => 2015 + i)
    const out: APISeries[] = []
    for (const u of UNITIDS) {
      for (const code of RACE_CODES) {
        const pts = years.map((y, i) => ({
          year: y,
          value: Math.round(
            totals[u] * shares[code] * (1 + 0.02 * (i - years.length / 2)) + (u % 3) * 50,
          ),
        }))
        out.push({
          code,
          unitid: u,
          label: `${code.split('.').slice(-1)[0]} (demo)`,
          unit: 'headcount',
          points: pts,
          survey: 'EF',
          source: 'Demo',
        })
      }
    }
    return out
  }

  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const s = await fetchSeries(
          [...RACE_CODES],
          UNITIDS,
          {
            from: 2010,
            to: new Date().getFullYear(),
          },
          { retries: 2, timeoutMs: 12000 },
        )
        console.log('Fetched series from API:', s)
        const colored = s.map((r) => {
          const sch = SCHOOL_LIST.find((x) => x.unitid === r.unitid)
          // Keep series labels unique by including both school and race
          const race = r.code.split('.').slice(-1)[0]
          const school = sch?.short ?? String(r.unitid)
          const label = `${school} — ${race}`
          return { ...r, color: sch?.color, label }
        })
        console.log('Colored series:', colored)
        setSeries(colored)
      } catch (e: any) {
        console.error('Error fetching series:', e)
        setError(String(e?.message || e))
        // Auto-load demo data on first error to show working charts immediately
        if (!demoMode) {
          console.log('Auto-loading demo data due to API error')
          const demo = buildDemoSeries()
          setSeries(demo)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [demoMode])

  return (
    <section className="space-y-6">
      <div className="glass-card-hover p-6 chart-fade-in">
        <p className="text-sm text-gray-300">
          Interactive charts • toggle transform, smoothing, and forecasts.
        </p>
      </div>

  <div className="glass-card-hover p-6 chart-fade-in" style={{ animationDelay: '0.1s' }}>
        <TransformControls
          transform={transform}
          setTransform={setTransform}
          forecast={forecast}
          setForecast={setForecast}
          smooth={smooth}
          setSmooth={setSmooth}
        />
      </div>

      {error && (
  <div className="glass-card-hover border-2 border-red-500/50 p-6 text-sm text-red-200 chart-fade-in glow-pulse" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>Error loading data: {error}</div>
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 font-medium hover:from-blue-500 hover:to-blue-400 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                onClick={() => {
                  setDemoMode(false)
                  setLoading(true)
                  setError(null)
                }}
              >
                Retry
              </button>
              <button
                className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-2 font-medium hover:from-purple-500 hover:to-purple-400 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                onClick={() => {
                  setDemoMode(true)
                  setSeries(buildDemoSeries())
                }}
              >
                Use demo data
              </button>
            </div>
          </div>
        </div>
      )}
      {loading ? (
        <div className="glass-card-hover mt-4 p-8 chart-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="chart-skeleton mb-6 h-8 w-56 rounded-lg" />
          <div className="chart-skeleton h-80 rounded-xl" />
        </div>
      ) : series.length === 0 ? (
  <div className="glass-card-hover p-8 text-center text-gray-400 chart-fade-in" style={{ animationDelay: '0.2s' }}>
          No data available. Click &quot;Use demo data&quot; to see a preview.
        </div>
      ) : (
        <div className="glass-card-hover p-8 chart-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="text-sm text-gray-400 mb-6 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            Rendering {series.length} series
          </div>
          <LineChartInteractive
            series={series}
            transform={transform}
            forecast={forecast}
            smooth={smooth}
          />
        </div>
      )}
    </section>
  )
}
