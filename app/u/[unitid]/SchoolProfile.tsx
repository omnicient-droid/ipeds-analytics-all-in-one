'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { LineChartInteractive } from '@/components/Chart'
import { StackedArea100 } from '@/components/Charts'
import { fetchSeries, type APISeries } from '@/lib/series'
import { NATIONAL_BENCHMARKS } from '@/lib/benchmarks'
import { friendlyLabelFromCode } from '@/lib/labels'
import { useToast } from '@/components/ToastProvider'
import type { TransformKind } from '@/components/TransformControls'
import { countyFipsForUnit } from '@/lib/place'

interface SchoolProfileProps {
  unitid: number
  schoolName: string
  schoolColor?: string
}

// All metric codes we can fetch
const ENROLLMENT_CODES = [
  'EF.FALL.UG.WHITE',
  'EF.FALL.UG.BLACK',
  'EF.FALL.UG.HISP',
  'EF.FALL.UG.ASIAN',
  'EF.FALL.UG.TWOORMORE',
  'EF.FALL.UG.NONRES',
  'EF.FALL.UG.UNKNOWN',
  'EF.FALL.UG.TOTAL',
  'EF.FALL.GRAD.TOTAL',
]

const ADMISSIONS_CODES = ['ADM.APPLICANTS_TOTAL', 'ADM.ADMITTED_TOTAL', 'ADM.ENROLLED_TOTAL']

const OUTCOMES_CODES = ['GR.GR150.TOTAL', 'GR.GR100.TOTAL', 'RET.FTFT', 'RET.PTFT']

const FINANCE_CODES = [
  'IC.TUITION.IN_STATE',
  'IC.TUITION.OUT_STATE',
  'IC.ROOM_BOARD',
  'SFA.FTFT.PELL_GRANT_RATE',
  'SFA.FTFT.AVG_NET_PRICE',
]

const FACULTY_CODES = ['DRVHR.FTE_STU_FAC_RATIO', 'DRVEF.UG_TOTAL']

const FACULTY_RACE_CODES = [
  'HR.FACULTY.WHITE',
  'HR.FACULTY.BLACK',
  'HR.FACULTY.HISP',
  'HR.FACULTY.ASIAN',
  'HR.FACULTY.TWOORMORE',
  'HR.FACULTY.NONRES',
  'HR.FACULTY.UNKNOWN',
  'HR.FACULTY.TOTAL',
]

export default function SchoolProfile({
  unitid,
  schoolName,
  schoolColor = '#3b82f6',
}: SchoolProfileProps) {
  const [enrollmentSeries, setEnrollmentSeries] = React.useState<APISeries[]>([])
  const [admissionsSeries, setAdmissionsSeries] = React.useState<APISeries[]>([])
  const [outcomesSeries, setOutcomesSeries] = React.useState<APISeries[]>([])
  const [financeSeries, setFinanceSeries] = React.useState<APISeries[]>([])
  const [facultySeries, setFacultySeries] = React.useState<APISeries[]>([])
  const [facultyRaceSeries, setFacultyRaceSeries] = React.useState<APISeries[]>([])
  const [placeSeries, setPlaceSeries] = React.useState<APISeries[]>([])
  const [loading, setLoading] = React.useState(true)
  const toast = useToast()

  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)

        // Fetch all available data
        const [enrollment, admissions, outcomes, finance, faculty, facultyRace] = await Promise.all(
          [
            fetchSeries(
              ENROLLMENT_CODES,
              [unitid],
              { from: 2000, to: new Date().getFullYear() },
              { retries: 2, timeoutMs: 15000 },
            ),
            fetchSeries(
              ADMISSIONS_CODES,
              [unitid],
              { from: 2000, to: new Date().getFullYear() },
              { retries: 2, timeoutMs: 15000 },
            ),
            fetchSeries(
              OUTCOMES_CODES,
              [unitid],
              { from: 2000, to: new Date().getFullYear() },
              { retries: 2, timeoutMs: 15000 },
            ),
            fetchSeries(
              FINANCE_CODES,
              [unitid],
              { from: 2000, to: new Date().getFullYear() },
              { retries: 2, timeoutMs: 15000 },
            ),
            fetchSeries(
              FACULTY_CODES,
              [unitid],
              { from: 2000, to: new Date().getFullYear() },
              { retries: 2, timeoutMs: 15000 },
            ),
            fetchSeries(
              FACULTY_RACE_CODES,
              [unitid],
              { from: 2000, to: new Date().getFullYear() },
              { retries: 2, timeoutMs: 15000 },
            ),
          ],
        )

        console.log('Enrollment data:', enrollment)
        console.log('Admissions data:', admissions)
        console.log('Outcomes data:', outcomes)
        console.log('Finance data:', finance)
        console.log('Faculty data:', faculty)
        console.log('Faculty race:', facultyRace)

        // Keep server-provided human-friendly labels; just apply color
        const enrollmentColored = enrollment.map((s) => ({ ...s, color: schoolColor }))

        setEnrollmentSeries(enrollmentColored)
        setAdmissionsSeries(admissions)
        setOutcomesSeries(outcomes)
        setFinanceSeries(finance)
        setFacultySeries(faculty)
        setFacultyRaceSeries(facultyRace)

        // Place context (county FIPS mapping → try to fetch HE.LE.COUNTY.{FIPS} and BLS.UNRATE.COUNTY.{FIPS})
        try {
          const fips = countyFipsForUnit(unitid)
          if (fips) {
            const codes = [`HE.LE.COUNTY.${fips}`, `BLS.UNRATE.COUNTY.${fips}`]
            const place = await fetchSeries(
              codes as any,
              [unitid],
              { from: 2000, to: new Date().getFullYear() },
              { retries: 1, timeoutMs: 12000 },
            )
            setPlaceSeries(place)
          } else {
            setPlaceSeries([])
          }
        } catch {
          setPlaceSeries([])
        }

        const totalMetrics =
          enrollment.length +
          admissions.length +
          outcomes.length +
          finance.length +
          faculty.length +
          facultyRace.length
        if (totalMetrics > 0) {
          toast.show(
            'success',
            'Data Loaded',
            `Loaded ${totalMetrics} metrics for ${schoolName}`,
            3000,
          )
        } else {
          toast.show(
            'warning',
            'Limited Data',
            'Some metrics may not be available for this institution.',
            5000,
          )
        }
      } catch (e: any) {
        console.error('Error loading school data:', e)
        toast.show(
          'error',
          'Data Error',
          'Could not load institutional data. Please try again.',
          8000,
        )
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitid])

  // Build comparison series with national benchmarks
  const admissionComparison = React.useMemo(() => {
    const applied = admissionsSeries.find((s) => s.code === 'ADM.APPLICANTS_TOTAL')
    const admitted = admissionsSeries.find((s) => s.code === 'ADM.ADMITTED_TOTAL')
    const natBench = NATIONAL_BENCHMARKS.find((b) => b.code === 'NAT.ADM_RATE')

    if (!applied || !admitted || !natBench) return []

    const rate = {
      code: 'ADM.ADM_RATE',
      unitid,
      label: `${schoolName} Admission Rate`,
      unit: 'percent',
      points: applied.points.map((p) => {
        const admitYear = admitted.points.find((q) => q.year === p.year)
        const v =
          p.value && admitYear?.value ? (admitYear.value as number) / (p.value as number) : null
        return { year: p.year, value: v != null ? v * 100 : null }
      }),
      color: schoolColor,
    }

    const nat = {
      code: 'NAT.ADM_RATE',
      unitid: 0,
      label: 'National Average',
      unit: 'percent',
      points: natBench.points.map((p) => ({ ...p, value: p.value ? p.value * 100 : null })),
      color: '#94a3b8',
    }

    return [rate as any, nat as any]
  }, [admissionsSeries, schoolName, schoolColor, unitid])

  const gradRateComparison = React.useMemo(() => {
    const schoolGrad = outcomesSeries.find((s) => s.code === 'GR.GR150.TOTAL')
    const natBench = NATIONAL_BENCHMARKS.find((b) => b.code === 'NAT.GRAD_RATE')

    if (!schoolGrad || !natBench) return []

    return [
      {
        ...schoolGrad,
        label: `${schoolName} Grad Rate`,
        color: schoolColor,
        points: schoolGrad.points.map((p) => ({ ...p, value: p.value ? p.value * 100 : null })),
      },
      {
        code: 'NAT.GRAD_RATE',
        unitid: 0,
        label: 'National Average',
        unit: 'percent',
        points: natBench.points.map((p) => ({ ...p, value: p.value ? p.value * 100 : null })),
        color: '#94a3b8',
      },
    ]
  }, [outcomesSeries, schoolName, schoolColor])

  const yieldComparison = React.useMemo(() => {
    const admitted = admissionsSeries.find((s) => s.code === 'ADM.ADMITTED_TOTAL')
    const enrolled = admissionsSeries.find((s) => s.code === 'ADM.ENROLLED_TOTAL')
    if (!admitted || !enrolled) return []
    const rate = {
      code: 'ADM.YIELD',
      unitid,
      label: `${schoolName} Yield Rate`,
      unit: 'percent',
      color: schoolColor,
      points: admitted.points.map((p) => {
        const enr = enrolled.points.find((q) => q.year === p.year)
        const v = p.value && enr?.value ? (enr.value as number) / (p.value as number) : null
        return { year: p.year, value: v != null ? v * 100 : null }
      }),
    }
    return [rate as any]
  }, [admissionsSeries, schoolName, schoolColor, unitid])

  // Enrollment by race (stacked shares)
  const enrollmentByRace = React.useMemo(() => {
    if (enrollmentSeries.length === 0) return {}

    const byRace: Record<string, { year: number; value: number | null }[]> = {}

    for (const s of enrollmentSeries) {
      const race = s.code.split('.').slice(-1)[0]
      byRace[race] = s.points
    }

    return byRace
  }, [enrollmentSeries])

  const facultyByRace = React.useMemo(() => {
    if (facultyRaceSeries.length === 0) return {}
    const byRace: Record<string, { year: number; value: number | null }[]> = {}
    for (const s of facultyRaceSeries) {
      const race = s.code.split('.').slice(-1)[0]
      if (race === 'TOTAL') continue
      byRace[race] = s.points
    }
    return byRace
  }, [facultyRaceSeries])

  // Helper: change summary for any series list
  function buildChangeSummary(
    series: APISeries[],
  ): {
    code: string
    label: string
    abs: number | null
    pct: number | null
    factor: number | null
  }[] {
    return series.map((s) => {
      const pts = s.points.filter((p) => p.value != null).sort((a, b) => a.year - b.year)
      if (pts.length < 2)
        return { code: s.code, label: s.label || s.code, abs: null, pct: null, factor: null }
      const first = pts[0].value as number
      const last = pts[pts.length - 1].value as number
      const abs = last - first
      const factor = first !== 0 ? last / first : null
      const pct = first !== 0 ? ((last - first) / first) * 100 : null
      return { code: s.code, label: s.label || s.code, abs, pct, factor }
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-card-hover p-8">
          <div className="chart-skeleton mb-4 h-8 w-64 rounded-lg" />
          <div className="chart-skeleton h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Comparative Charts at Top */}
      {admissionComparison.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-hover p-8"
        >
          <h3 className="mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent">
            Admission Rate vs. National Average
          </h3>
          <LineChartInteractive
            series={admissionComparison}
            transform="level"
            forecast={3}
            smooth={true}
          />
        </motion.div>
      )}

      {yieldComparison.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="glass-card-hover p-8"
        >
          <h3 className="mb-6 bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-2xl font-bold text-transparent">
            Yield Rate (Enrolled ÷ Admitted)
          </h3>
          <LineChartInteractive series={yieldComparison} transform="level" forecast={2} smooth />
        </motion.div>
      )}
      {/* Admissions Funnel */}
      {admissionsSeries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card-hover p-8"
        >
          <h3 className="mb-6 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-2xl font-bold text-transparent">
            Admissions Funnel (Applicants → Admitted → Enrolled)
          </h3>
          <LineChartInteractive
            series={admissionsSeries.map((s) => ({
              ...s,
              label: s.code.includes('APPLICANTS')
                ? 'Applied'
                : s.code.includes('ADMITTED')
                  ? 'Admitted'
                  : 'Enrolled',
              color: s.code.includes('APPLICANTS')
                ? '#60a5fa'
                : s.code.includes('ADMITTED')
                  ? '#34d399'
                  : '#f472b6',
            }))}
            transform="level"
            forecast={2}
            smooth={true}
          />
          {/* Change summary */}
          <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
            <div className="mb-2 font-semibold text-gray-200">Change over the window</div>
            <div className="grid gap-2 md:grid-cols-3">
              {buildChangeSummary(admissionsSeries).map((row) => (
                <div key={row.code} className="flex items-center justify-between gap-3">
                  <span>{row.label}</span>
                  <span className="tabular-nums">
                    {row.abs != null ? row.abs.toLocaleString() : '—'} |{' '}
                    {row.pct != null ? `${row.pct.toFixed(1)}%` : '—'} |{' '}
                    {row.factor != null ? `${row.factor.toFixed(2)}×` : '—'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-1 text-xs text-gray-400">
              Shown as: absolute | percent | factor (last ÷ first).
            </div>
          </div>
        </motion.div>
      )}

      {gradRateComparison.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card-hover p-8"
        >
          <h3 className="mb-6 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-2xl font-bold text-transparent">
            6-Year Graduation Rate vs. National Average
          </h3>
          <LineChartInteractive
            series={gradRateComparison}
            transform="level"
            forecast={3}
            smooth={true}
          />
        </motion.div>
      )}

      {/* Enrollment Demographics */}
      {Object.keys(enrollmentByRace).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card-hover p-8"
        >
          <h3 className="mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-2xl font-bold text-transparent">
            Undergraduate Enrollment by Race/Ethnicity
          </h3>
          <StackedArea100 byCategory={enrollmentByRace} />
        </motion.div>
      )}

      {/* Faculty Demographics */}
      {Object.keys(facultyByRace).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="glass-card-hover p-8"
        >
          <h3 className="mb-6 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent">
            Faculty by Race/Ethnicity
          </h3>
          <StackedArea100 byCategory={facultyByRace} />
        </motion.div>
      )}

      {/* Place Context: County Life Expectancy vs Unemployment (if ingested) */}
      {placeSeries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card-hover p-8"
        >
          <h3 className="mb-6 bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-2xl font-bold text-transparent">
            Place Context: County Life Expectancy and Unemployment
          </h3>
          <LineChartInteractive
            series={placeSeries.map((s) => ({
              ...s,
              label: friendlyLabelFromCode(s.code, s.label),
            }))}
            transform="level"
            forecast={0}
            smooth={true}
          />
          <p className="mt-2 text-xs text-gray-400">
            County-level time series help contextualize institutional patterns with local health and
            labor market conditions. These are descriptive trends and do not imply causality.
          </p>
        </motion.div>
      )}

      {/* Detailed Metrics Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {/* Outcomes */}
        {outcomesSeries.map((s) => {
          const latest = s.points.length > 0 ? s.points[s.points.length - 1] : null
          const displayValue =
            latest?.value != null
              ? s.unit === 'percent'
                ? `${(latest.value * 100).toFixed(1)}%`
                : latest.value.toLocaleString()
              : 'N/A'

          return (
            <div key={s.code} className="glass-card-hover p-6">
              <h4 className="mb-4 text-lg font-semibold text-blue-300">
                {friendlyLabelFromCode(s.code, s.label)}
              </h4>
              <div className="text-3xl font-bold text-white">{displayValue}</div>
              <div className="mt-1 text-xs text-gray-400">
                {latest ? `Latest: ${latest.year}` : 'No data'}
              </div>
            </div>
          )
        })}

        {/* Finance */}
        {financeSeries.map((s) => {
          const latest = s.points.length > 0 ? s.points[s.points.length - 1] : null
          const displayValue =
            latest?.value != null
              ? s.unit === 'dollars'
                ? `$${latest.value.toLocaleString()}`
                : latest.value.toLocaleString()
              : 'N/A'

          return (
            <div key={s.code} className="glass-card-hover border-green-500/20 p-6">
              <h4 className="mb-4 text-lg font-semibold text-green-300">
                {friendlyLabelFromCode(s.code, s.label)}
              </h4>
              <div className="text-3xl font-bold text-white">{displayValue}</div>
              <div className="mt-1 text-xs text-gray-400">
                {latest ? `Latest: ${latest.year}` : 'No data'}
              </div>
            </div>
          )
        })}

        {/* Faculty */}
        {facultySeries.map((s) => {
          const latest = s.points.length > 0 ? s.points[s.points.length - 1] : null
          const displayValue = latest?.value != null ? latest.value.toLocaleString() : 'N/A'

          return (
            <div key={s.code} className="glass-card-hover border-purple-500/20 p-6">
              <h4 className="mb-4 text-lg font-semibold text-purple-300">
                {friendlyLabelFromCode(s.code, s.label)}
              </h4>
              <div className="text-3xl font-bold text-white">{displayValue}</div>
              <div className="mt-1 text-xs text-gray-400">
                {latest ? `Latest: ${latest.year}` : 'No data'}
              </div>
            </div>
          )
        })}
      </motion.div>

      {/* Raw Enrollment Numbers */}
      {enrollmentSeries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card-hover p-8"
        >
          <h3 className="mb-6 text-xl font-bold text-yellow-300">
            Enrollment Trends by Race (Headcount)
          </h3>
          <LineChartInteractive
            series={enrollmentSeries.filter((s) => !s.code.includes('TOTAL'))}
            transform="level"
            forecast={3}
            smooth={false}
          />
          {/* Change summary */}
          <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
            <div className="mb-2 font-semibold text-gray-200">Change over the window</div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {buildChangeSummary(enrollmentSeries.filter((s) => !s.code.includes('TOTAL'))).map(
                (row) => (
                  <div key={row.code} className="flex items-center justify-between gap-3">
                    <span>{row.label}</span>
                    <span className="tabular-nums">
                      {row.abs != null ? row.abs.toLocaleString() : '—'} |{' '}
                      {row.pct != null ? `${row.pct.toFixed(1)}%` : '—'} |{' '}
                      {row.factor != null ? `${row.factor.toFixed(2)}×` : '—'}
                    </span>
                  </div>
                ),
              )}
            </div>
            <div className="mt-1 text-xs text-gray-400">
              Shown as: absolute | percent | factor (last ÷ first).
            </div>
          </div>
        </motion.div>
      )}

      {/* Financial Trends */}
      {financeSeries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card-hover p-8"
        >
          <h3 className="mb-6 text-xl font-bold text-green-300">Cost of Attendance Over Time</h3>
          <LineChartInteractive
            series={financeSeries}
            transform="level"
            forecast={2}
            smooth={true}
          />
        </motion.div>
      )}

      {/* Retention Rates */}
      {outcomesSeries.filter((s) => s.code.includes('RET')).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.47 }}
          className="glass-card-hover p-8"
        >
          <h3 className="mb-6 text-xl font-bold text-cyan-300">Student Retention Rates</h3>
          <LineChartInteractive
            series={outcomesSeries
              .filter((s) => s.code.includes('RET'))
              .map((s) => ({
                ...s,
                points: s.points.map((p) => ({ ...p, value: p.value ? p.value * 100 : null })),
              }))}
            transform="level"
            forecast={2}
            smooth={true}
          />
        </motion.div>
      )}

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card-hover border-blue-500/30 p-6"
      >
        <h4 className="mb-4 font-semibold text-blue-200">📊 Data Summary</h4>
        <div className="grid gap-4 text-sm text-gray-300 md:grid-cols-4">
          <div>
            <div className="text-2xl font-bold text-blue-400">{enrollmentSeries.length}</div>
            <div>Enrollment metrics</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{outcomesSeries.length}</div>
            <div>Outcome metrics</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">{financeSeries.length}</div>
            <div>Financial metrics</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">
              {enrollmentSeries[0]?.points.length || 0}
            </div>
            <div>Years of data</div>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Data source: IPEDS via Urban Institute API. Some metrics may be unavailable for certain
          years or institutions.
        </p>
      </motion.div>
    </div>
  )
}
