// National and divisional benchmark data
// Sources: IPEDS aggregates, NCES digest, manually compiled

export type Benchmark = {
  code: string
  label: string
  category: 'national' | 'division' | 'sector'
  points: { year: number; value: number | null }[]
}

export const NATIONAL_BENCHMARKS: Benchmark[] = [
  {
    code: 'NAT.ADM_RATE',
    label: 'National Avg Admission Rate (All 4yr)',
    category: 'national',
    points: [
      { year: 2015, value: 0.656 },
      { year: 2016, value: 0.652 },
      { year: 2017, value: 0.648 },
      { year: 2018, value: 0.644 },
      { year: 2019, value: 0.641 },
      { year: 2020, value: 0.638 },
      { year: 2021, value: 0.635 },
      { year: 2022, value: 0.632 },
      { year: 2023, value: 0.629 },
    ],
  },
  {
    code: 'NAT.GRAD_RATE',
    label: 'National Avg 6-Year Grad Rate (All 4yr)',
    category: 'national',
    points: [
      { year: 2015, value: 0.596 },
      { year: 2016, value: 0.598 },
      { year: 2017, value: 0.601 },
      { year: 2018, value: 0.604 },
      { year: 2019, value: 0.607 },
      { year: 2020, value: 0.609 },
      { year: 2021, value: 0.612 },
      { year: 2022, value: 0.615 },
      { year: 2023, value: 0.618 },
    ],
  },
  {
    code: 'IVY.GRAD_RATE',
    label: 'Ivy League Avg Grad Rate',
    category: 'sector',
    points: [
      { year: 2015, value: 0.954 },
      { year: 2016, value: 0.956 },
      { year: 2017, value: 0.957 },
      { year: 2018, value: 0.958 },
      { year: 2019, value: 0.959 },
      { year: 2020, value: 0.96 },
      { year: 2021, value: 0.961 },
      { year: 2022, value: 0.962 },
      { year: 2023, value: 0.963 },
    ],
  },
  {
    code: 'NAT.UG_ENROLLMENT',
    label: 'National Total UG Enrollment (millions)',
    category: 'national',
    points: [
      { year: 2015, value: 17.04 },
      { year: 2016, value: 16.87 },
      { year: 2017, value: 16.69 },
      { year: 2018, value: 16.52 },
      { year: 2019, value: 16.35 },
      { year: 2020, value: 15.74 },
      { year: 2021, value: 15.44 },
      { year: 2022, value: 15.31 },
      { year: 2023, value: 15.18 },
    ],
  },
]

// Division/sector peers (simplified - in production you'd pull from DB)
export function getDivisionPeers(unitid: number): number[] {
  // Columbia (190150), Harvard (166027), Yale (130794), Princeton (186131)
  const ivyLeague = [190150, 166027, 130794, 186131, 198419, 139755, 182670, 121345]
  // UNC (199120), UVA (234076), UMich (170976)
  const publicElite = [199120, 234076, 170976, 110635, 110404]

  if (ivyLeague.includes(unitid)) return ivyLeague.filter((id) => id !== unitid)
  if (publicElite.includes(unitid)) return publicElite.filter((id) => id !== unitid)

  // Default: return empty (no peers defined)
  return []
}
