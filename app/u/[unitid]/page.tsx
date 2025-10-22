export const dynamic = 'force-dynamic';
// app/u/[unitid]/page.tsx
import { notFound } from 'next/navigation'
import { getEfSeriesByUnitId, EF_DISPLAY_ORDER } from '../../../lib/ef'

// number formatter
const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString() : '—')

// Canonical labels + regex fallbacks (works with legacy variant codes)
function labelFor(code: string): string {
  const LABELS: [RegExp, string][] = [
    [/EF\.EFY?TOT(L|LT)$/i, 'Total'],
    [/EF\.EFW?HITT?$/i, 'White'],
    [/EF\.EFBKAAT?$/i, 'Black'],
    [/EF\.EFHISP(T)?$/i, 'Hispanic/Latino'],
    [/EF\.EFASIA(T)?$/i, 'Asian'],
    [/EF\.EFAIAN(T)?$/i, 'AIAN'],
    [/EF\.EFNHPI(T)?$/i, 'NHPI'],
    [/EF\.EF(2MOR(T)?|2PLUS)$/i, 'Two+'],
    [/EF\.EFNRAL(T)?$/i, 'Nonresident'],
    [/EF\.EFUNK(NT)?$/i, 'Unknown'],
  ]
  const hit = LABELS.find(([rx]) => rx.test(code))
  return hit ? hit[1] : code
}

export default async function SchoolPage({
  params,
}: {
  params: { unitid: string }
}) {
  const unitid = Number(params.unitid)
  if (!Number.isFinite(unitid)) notFound()

  // pulls all EF.* series as clean numbers
  const { university, series } = await getEfSeriesByUnitId(unitid)
  if (!university) notFound()

  const codes = Object.keys(series)

  // Try to find an explicit Total; otherwise we’ll compute per-row
  const totalCode =
    codes.find((c) => /EF\.EFY?TOT(L|LT)$/i.test(c)) ?? 'EF.EFYTOTL'
  const totalPts = series[totalCode] ?? []

  // Union of all years (prefer total’s years)
  const years =
    totalPts.length > 0
      ? totalPts.map((p) => p.year)
      : Array.from(
          new Set(
            Object.values(series)
              .flat()
              .map((p) => p.year)
          )
        ).sort((a, b) => a - b)

  const totalByYear = new Map<number, number>()
  if (totalPts.length > 0) {
    for (const p of totalPts) totalByYear.set(p.year, p.value)
  } else {
    const buckets = codes.filter((c) => !/EF\.EFY?TOT(L|LT)$/i.test(c))
    for (const y of years) {
      const sum = buckets.reduce((acc, c) => {
        const v = series[c]?.find((p) => p.year === y)?.value ?? 0
        return acc + (Number.isFinite(v) ? v : 0)
      }, 0)
      totalByYear.set(y, sum)
    }
  }

  // Order series: preferred (minus total), then leftovers by label
  const preferredOrdered = EF_DISPLAY_ORDER.filter(
    (c) => c !== totalCode && series[c]?.length
  )
  const leftovers = codes
    .filter((c) => c !== totalCode && !preferredOrdered.includes(c))
    .sort((a, b) => labelFor(a).localeCompare(labelFor(b)))

  const orderedCodes = [totalCode, ...preferredOrdered, ...leftovers]

  const firstYear = years[0]
  const lastYear = years[years.length - 1]

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold mb-1">
        {university.name ?? `UNITID ${university.unitid}`}
      </h1>
      <p className="text-sm text-neutral-600 mb-5">
        Fall enrollment by race/ethnicity {firstYear ?? ''}
        {firstYear && lastYear && firstYear !== lastYear ? `–${lastYear}` : ''}
      </p>

      {/* Table (counts + share) */}
      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2 text-left">Year</th>
              <th className="px-3 py-2 text-right">{labelFor(totalCode)}</th>
              {orderedCodes
                .filter((c) => c !== totalCode)
                .map((code) => (
                  <th key={code} className="px-3 py-2 text-right">
                    {labelFor(code)}
                  </th>
                ))}
              {orderedCodes
                .filter((c) => c !== totalCode)
                .map((code) => (
                  <th key={code + '%'} className="px-3 py-2 text-right">
                    {labelFor(code)} %
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {years.map((year) => {
              const total = totalByYear.get(year) ?? 0
              return (
                <tr key={year} className="odd:bg-white even:bg-neutral-50">
                  <td className="px-3 py-1.5">{year}</td>
                  <td className="px-3 py-1.5 text-right">{fmt(total)}</td>
                  {orderedCodes
                    .filter((c) => c !== totalCode)
                    .map((code) => {
                      const v =
                        series[code]?.find((p) => p.year === year)?.value ?? 0
                      return (
                        <td
                          key={code + year}
                          className="px-3 py-1.5 text-right"
                        >
                          {v ? fmt(v) : '—'}
                        </td>
                      )
                    })}
                  {orderedCodes
                    .filter((c) => c !== totalCode)
                    .map((code) => {
                      const v =
                        series[code]?.find((p) => p.year === year)?.value ?? 0
                      const pct =
                        total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '—'
                      return (
                        <td
                          key={code + '%' + year}
                          className="px-3 py-1.5 text-right"
                        >
                          {pct}
                        </td>
                      )
                    })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-500 mt-3">
        Totals prefer EF.EFYTOTL when present; otherwise they’re the sum of the
        shown buckets for that year.
      </p>
    </main>
  )
}
