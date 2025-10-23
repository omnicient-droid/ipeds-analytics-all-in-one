'use client'

import * as React from 'react'
import { fetchSeries, type APISeries } from '@/lib/series'
import { LineChartInteractive } from '../../components/Chart'
import { StackedArea100 } from '../../components/Charts'
import TransformControls, { type TransformKind } from '../../components/TransformControls'
import { SCHOOL_LIST } from '@/lib/schools'
import { useToast } from '../../components/ToastProvider'

const UNITIDS = [190150, 199120, 166027, 110635, 122977, 135726, 134130] // Columbia, UNC, Harvard, Berkeley, SMC, Miami, Florida
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
  const [mode, setMode] = React.useState<'lines' | 'shares'>('lines')

  const [series, setSeries] = React.useState<APISeries[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)

  const toast = useToast()

  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const s = await fetchSeries(
          [...RACE_CODES],
          UNITIDS,
          {
            from: 2000,
            to: new Date().getFullYear(),
          },
          { retries: 2, timeoutMs: 12000 },
        )
        console.log('Fetched series from API:', s)
        const RACE_FRIENDLY: Record<string, string> = {
          WHITE: 'White',
          BLACK: 'Black or African American',
          HISP: 'Hispanic/Latino',
          ASIAN: 'Asian',
          TWOORMORE: 'Two or more races',
          NONRES: 'Nonresident alien',
          UNKNOWN: 'Unknown',
        }
        const colored = s.map((r) => {
          const sch = SCHOOL_LIST.find((x) => x.unitid === r.unitid)
          // Keep series labels unique by including both school and race
          const raceCode = r.code.split('.').slice(-1)[0]
          const race = RACE_FRIENDLY[raceCode] || raceCode
          const school = sch?.short ?? String(r.unitid)
          const label = `${school} — ${race}`
          return { ...r, color: sch?.color, label }
        })
        console.log('Colored series:', colored)
        setSeries(colored)
        if (colored.length > 0) {
          toast.show(
            'success',
            'Data Loaded',
            `Successfully loaded ${colored.length} series from IPEDS.`,
            3000,
          )
        }
      } catch (e: any) {
        console.error('Error fetching series:', e)
        setError(String(e?.message || e))
        toast.show('error', 'API Error', 'Could not load data. Please try again later.', 10000)
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="space-y-6">
      <div className="glass-card-hover chart-fade-in p-6">
        <p className="text-sm text-gray-300">
          Interactive charts • toggle transform, smoothing, and forecasts.
        </p>
      </div>

      <div className="glass-card-hover chart-fade-in p-6" style={{ animationDelay: '0.1s' }}>
        <div className="mb-2 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2 font-medium text-gray-300">
            <span className="text-pink-400">Mode:</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'lines' | 'shares')}
              className="cursor-pointer rounded-lg border border-pink-500/30 bg-gray-800/90 px-3 py-2 text-gray-200 shadow-md transition-all duration-200 hover:border-pink-500/50 focus:ring-2 focus:ring-pink-500/50 focus:outline-none"
            >
              <option value="lines">Lines</option>
              <option value="shares">Shares (100%)</option>
            </select>
          </label>
        </div>
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
        <div
          className="glass-card-hover chart-fade-in glow-pulse border-2 border-red-500/50 p-6 text-sm text-red-200"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center justify-between">
            <div>Error loading data: {error}</div>
            <button
              className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 font-medium shadow-lg transition-all duration-200 hover:scale-105 hover:from-blue-500 hover:to-blue-400 hover:shadow-xl"
              onClick={() => {
                setLoading(true)
                setError(null)
                window.location.reload()
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="glass-card-hover chart-fade-in mt-4 p-8" style={{ animationDelay: '0.2s' }}>
          <div className="chart-skeleton mb-6 h-8 w-56 rounded-lg" />
          <div className="chart-skeleton h-80 rounded-xl" />
        </div>
      ) : series.length === 0 ? (
        <div
          className="glass-card-hover chart-fade-in p-8 text-center text-gray-400"
          style={{ animationDelay: '0.2s' }}
        >
          No data available. Please upload IPEDS data or check back later.
        </div>
      ) : (
        <div className="glass-card-hover chart-fade-in p-8" style={{ animationDelay: '0.2s' }}>
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
            {mode === 'lines' ? (
              <>Rendering {series.length} series</>
            ) : (
              <>Stacked 100% shares by race (summed across schools)</>
            )}
          </div>
          {mode === 'lines' ? (
            <LineChartInteractive
              series={series}
              transform={transform}
              forecast={forecast}
              smooth={smooth}
            />
          ) : (
            <SharesChart series={series} />
          )}
        </div>
      )}
    </section>
  )
}

function SharesChart({ series }: { series: APISeries[] }) {
  // Build a byCategory map keyed by race label using summed values across schools per year
  const byCategory = React.useMemo(() => {
    const map: Record<string, { [year: number]: number }> = {}
    for (const s of series) {
      const race = s.code.split('.').slice(-1)[0]
      if (!map[race]) map[race] = {}
      for (const p of s.points) {
        const y = p.year
        const v = p.value ?? 0
        map[race][y] = (map[race][y] ?? 0) + v
      }
    }
    const out: Record<string, { year: number; value: number | null }[]> = {}
    for (const [race, yearMap] of Object.entries(map)) {
      const years = Object.keys(yearMap)
        .map(Number)
        .sort((a, b) => a - b)
      out[race] = years.map((y) => ({ year: y, value: yearMap[y] }))
    }
    return out
  }, [series])

  return <StackedArea100 byCategory={byCategory} />
}
