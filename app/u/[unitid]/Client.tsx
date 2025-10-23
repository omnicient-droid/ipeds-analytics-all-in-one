'use client'
import { useEffect, useMemo, useState } from 'react'
import { fetchSeries, APISeries } from '@/lib/series'
import {
  StackedArea100,
  LineChartInteractive,
  ChartControls,
  TransformKind,
} from '@/components/Charts'
import { SCHOOLS } from '@/lib/schools'
import ChartSkeleton from '@/components/ChartSkeleton'
import MascotSplash from '@/components/MascotSplash'
import { fetchLifeByZip, getZipForUnit } from '@/lib/life'

const EF_RACES = [
  'EF.FALL.UG.WHITE',
  'EF.FALL.UG.BLACK',
  'EF.FALL.UG.HISP',
  'EF.FALL.UG.ASIAN',
  'EF.FALL.UG.TWOORMORE',
  'EF.FALL.UG.NONRES',
  'EF.FALL.UG.UNKNOWN',
]
const ADM = ['ADM.ADM_RATE', 'ADM.YIELD']
const GR = ['GR.GR150.TOTAL']

function pretty(code: string) {
  const map: Record<string, string> = {
    'EF.FALL.UG.WHITE': 'White',
    'EF.FALL.UG.BLACK': 'Black',
    'EF.FALL.UG.HISP': 'Hispanic/Latino',
    'EF.FALL.UG.ASIAN': 'Asian',
    'EF.FALL.UG.TWOORMORE': 'Two or More',
    'EF.FALL.UG.NONRES': 'Nonresident',
    'EF.FALL.UG.UNKNOWN': 'Unknown',
    'ADM.ADM_RATE': 'Admission Rate',
    'ADM.YIELD': 'Yield',
    'GR.GR150.TOTAL': 'Grad Rate (150%)',
  }
  return map[code] ?? code
}

function computeInsights(raceSeries: Record<string, APISeries>) {
  const bullets: string[] = []
  try {
    const deltas = Object.entries(raceSeries)
      .map(([k, s]) => {
        const pts = s.points.sort((a, b) => a.year - b.year)
        if (!pts.length) return { k, d: 0 }
        const from = pts[0],
          to = pts[pts.length - 1]
        const d = (to?.value ?? 0) - (from?.value ?? 0)
        return { k, d }
      })
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    const top = deltas[0]
    if (top)
      bullets.push(
        `${pretty(top.k)} changed the most across the available window: ${top.d > 0 ? '+' : ''}${top.d.toFixed(1)} pts.`,
      )
  } catch {}
  return bullets
}

export default function Client({ unitid }: { unitid: number }) {
  const school = Object.values(SCHOOLS).find((s) => s.unitid === unitid)
  const star = (school as any)?.isCommunityCollege ? ' *' : ''

  const [tab, setTab] = useState<'race' | 'adm' | 'out'>('race')
  const [transform, setTransform] = useState<TransformKind>('level')
  const [forecast, setForecast] = useState(3)
  const [smooth, setSmooth] = useState(true)

  const [raceSeries, setRaceSeries] = useState<APISeries[]>([])
  const [admSeries, setAdmSeries] = useState<APISeries[]>([])
  const [grSeries, setGrSeries] = useState<APISeries[]>([])
  const [lifeSeries, setLifeSeries] = useState<APISeries | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const zip = getZipForUnit(unitid)
    Promise.all([
      fetchSeries(EF_RACES, [unitid]),
      fetchSeries(ADM, [unitid]),
      fetchSeries(GR, [unitid]),
      zip ? fetchLifeByZip(zip) : Promise.resolve(null),
    ])
      .then(([race, adm, gr, life]) => {
        setRaceSeries(race)
        setAdmSeries(adm)
        setGrSeries(gr)
        setLifeSeries(life)
      })
      .finally(() => setLoading(false))
  }, [unitid])

  const raceMap = useMemo(
    () => Object.fromEntries(raceSeries.map((s) => [s.code, s.points])),
    [raceSeries],
  )
  const insights = useMemo(
    () => computeInsights(Object.fromEntries(raceSeries.map((s) => [s.code, s]))),
    [raceSeries],
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <MascotSplash unitid={unitid} />
      <header className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {school?.name ?? `UNITID ${unitid}`}
            {star}
          </h1>
          <nav className="flex gap-2 text-sm">
            <button
              onClick={() => setTab('race')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                tab === 'race'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'glass-card-hover'
              }`}
            >
              Race
            </button>
            <button
              onClick={() => setTab('adm')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                tab === 'adm'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'glass-card-hover'
              }`}
            >
              Admissions
            </button>
            <button
              onClick={() => setTab('out')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                tab === 'out'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'glass-card-hover'
              }`}
            >
              Outcomes
            </button>
          </nav>
        </div>
        <p className="text-gray-300 text-sm mt-3">
          Interactive charts • toggle transform, smoothing, and forecasts.
        </p>
      </header>

      {loading ? (
        <div className="space-y-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <>
          {tab === 'race' && (
            <div className="space-y-6">
              <div className="glass-card p-4">
                <ChartControls
                  transform={transform}
                  setTransform={setTransform}
                  forecast={forecast}
                  setForecast={setForecast}
                  smooth={smooth}
                  setSmooth={setSmooth}
                />
              </div>
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-200">
                  Undergraduate Enrollment by Race/Ethnicity
                </h3>
                <StackedArea100 byCategory={raceMap} />
              </div>
              {!!insights.length && (
                <div className="glass-card p-5 border-blue-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-1 w-1 rounded-full bg-blue-400" />
                    <b className="text-blue-300">Insights</b>
                  </div>
                  <ul className="list-disc ml-6 text-gray-300 space-y-1">
                    {insights.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {tab === 'adm' && (
            <div className="space-y-6">
              <div className="glass-card p-4">
                <ChartControls
                  transform={transform}
                  setTransform={setTransform}
                  forecast={forecast}
                  setForecast={setForecast}
                  smooth={smooth}
                  setSmooth={setSmooth}
                />
              </div>
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-200">Admissions Metrics</h3>
                <LineChartInteractive
                  series={admSeries}
                  transform={transform}
                  forecast={forecast}
                  smooth={smooth}
                />
              </div>
              {lifeSeries && (
                <div className="glass-card p-6">
                  <h3 className="mb-4 text-lg font-semibold text-gray-200">
                    Neighborhood Life Expectancy (ZIP) vs Admission Rate
                  </h3>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <LineChartInteractive
                        series={[lifeSeries]}
                        transform="level"
                        forecast={0}
                        smooth={false}
                      />
                    </div>
                    <div>
                      <LineChartInteractive
                        series={admSeries.filter((s) => s.code === 'ADM.ADM_RATE')}
                        transform={transform}
                        forecast={forecast}
                        smooth={smooth}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    Note: Life expectancy by ZIP is a proxy for local health conditions near campus. Use with care; true
                    relationships require careful causal analysis.
                  </p>
                </div>
              )}
            </div>
          )}
          {tab === 'out' && (
            <div className="space-y-6">
              <div className="glass-card p-4">
                <ChartControls
                  transform={transform}
                  setTransform={setTransform}
                  forecast={forecast}
                  setForecast={setForecast}
                  smooth={smooth}
                  setSmooth={setSmooth}
                />
              </div>
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-200">Graduation Outcomes</h3>
                <LineChartInteractive
                  series={grSeries}
                  transform={transform}
                  forecast={forecast}
                  smooth={smooth}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
