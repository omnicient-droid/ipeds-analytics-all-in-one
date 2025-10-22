// data/demo/ug_enrollment.ts
// Demo time series for Undergraduate Enrollment (2015–2024).
export type YearPoint = { year: number; value: number }
export type SeriesByUnitid = Record<string, YearPoint[]>

export const years = Array.from({ length: 10 }, (_, i) => 2015 + i)

export const ug_enrollment: SeriesByUnitid = {
  // Columbia (190150)
  '190150': [
    { year: 2015, value: 8320 },
    { year: 2016, value: 8390 },
    { year: 2017, value: 8460 },
    { year: 2018, value: 8580 },
    { year: 2019, value: 8690 },
    { year: 2020, value: 8920 },
    { year: 2021, value: 8780 },
    { year: 2022, value: 8740 },
    { year: 2023, value: 8820 },
    { year: 2024, value: 8860 },
  ],
  // Harvard (166027)
  '166027': [
    { year: 2015, value: 6675 },
    { year: 2016, value: 6700 },
    { year: 2017, value: 6730 },
    { year: 2018, value: 6745 },
    { year: 2019, value: 6770 },
    { year: 2020, value: 6660 },
    { year: 2021, value: 6710 },
    { year: 2022, value: 6735 },
    { year: 2023, value: 6750 },
    { year: 2024, value: 6765 },
  ],
  // UNC (199120)
  '199120': [
    { year: 2015, value: 18650 },
    { year: 2016, value: 18800 },
    { year: 2017, value: 18950 },
    { year: 2018, value: 19100 },
    { year: 2019, value: 19200 },
    { year: 2020, value: 19750 },
    { year: 2021, value: 19450 },
    { year: 2022, value: 19720 },
    { year: 2023, value: 19910 },
    { year: 2024, value: 20040 },
  ],
}
