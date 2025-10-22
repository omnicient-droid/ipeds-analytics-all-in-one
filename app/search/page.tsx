// app/search/page.tsx
import { prisma } from '@/lib/db'
import Link from 'next/link'

async function runSearch(q: string) {
  if (!q) return []
  const num = Number(q)
  return prisma.university.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { state: { equals: q.toUpperCase() } },
        ...(Number.isFinite(num) ? [{ unitid: num }] : []),
      ],
    },
    orderBy: [{ name: 'asc' }],
    take: 50,
    select: { id: true, unitid: true, name: true, city: true, state: true },
  })
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const q = (searchParams.q || '').trim()
  const results = await runSearch(q)

  return (
    <div className="box">
      <div className="box-header">Search</div>
      <div className="box-body">
        <form action="/search" method="get" className="inline" role="search">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name, city, state, or UNITID…"
          />
          <button className="primary" type="submit">
            Search
          </button>
        </form>

        {q && (
          <>
            <p style={{ marginTop: 12, color: '#5b6470' }}>
              Found {results.length} result(s).
            </p>
            <table role="table" aria-label="Search results">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>State</th>
                  <th>UNITID</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/u/${r.unitid}`}>
                        {r.name || '(Unnamed)'}
                      </Link>
                    </td>
                    <td>{r.city}</td>
                    <td>{r.state}</td>
                    <td>{r.unitid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
