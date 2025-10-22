export const dynamic = 'force-dynamic';
// app/m/[code]/page.tsx
import { prisma } from '@/lib/db'
import Link from 'next/link'

export default async function MetricPage({
  params,
}: {
  params: { code: string }
}) {
  const code = decodeURIComponent(params.code)

  // get the metric id/name/unit by code
  const metric = await prisma.metric.findUnique({
    where: { code },
    select: { id: true, code: true, name: true, unit: true },
  })

  if (!metric) {
    return (
      <div className="box">
        <div className="box-header">Unknown metric</div>
        <div className="box-body">No data has been ingested for {code}.</div>
      </div>
    )
  }

  // find the latest year with data for this metric
  const latest = await prisma.timeSeries.aggregate({
    where: { metricId: metric.id },
    _max: { year: true },
  })
  const latestYear = latest._max.year

  // PRISMA-ONLY (no raw SQL) — respects @map("universityid"/"metricid")
  let rows: { unitid: number; name: string | null; value: number | null }[] = []
  if (latestYear) {
    const data = await prisma.timeSeries.findMany({
      where: {
        metricId: metric.id,
        year: latestYear,
        value: { not: null },
      },
      orderBy: { value: 'desc' },
      take: 25,
      select: {
        value: true,
        university: { select: { unitid: true, name: true } },
      },
    })
    rows = data.map((d) => ({
      unitid: d.university.unitid,
      name: d.university.name,
      value: d.value as number | null,
    }))
  }

  return (
    <div className="box">
      <div className="box-header">{metric.name ?? metric.code}</div>
      <div className="box-body">
        <p>
          <code>{metric.code}</code> · unit: <em>{metric.unit || 'n/a'}</em>{' '}
          {latestYear ? (
            <> · latest year: <strong>{latestYear}</strong></>
          ) : (
            <>· no year found</>
          )}
        </p>

        {rows.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Institution</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.unitid}>
                  <td>#{i + 1}</td>
                  <td>
                    <Link href={`/u/${r.unitid}`}>{r.name ?? '(Unnamed)'}</Link>
                  </td>
                  <td>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No rows for the latest year.</p>
        )}
      </div>
    </div>
  )
}
