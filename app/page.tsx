export const dynamic = 'force-dynamic';
// app/page.tsx
import Link from 'next/link'

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <h1>America’s hub for college admission & enrollment trends</h1>
        <p>
          Explore IPEDS race/ethnicity enrollment and U.S. College Scorecard
          metrics in a clean, Wikipedia‑style interface—now in a red‑white‑blue
          suit.
        </p>
        <form action="/search" method="get" className="inline" role="search">
          <input
            type="search"
            name="q"
            placeholder="Search by school name, city, state, or UNITID…"
            aria-label="Search for a school"
          />
          <button className="primary" type="submit">
            Search
          </button>
        </form>
      </section>

      <div style={{ height: 16 }} />

      <div className="box">
        <div className="box-header">Get started</div>
        <div className="box-body">
          <ul>
            <li>
              🔎 <Link href="/search">Find a school</Link> and open its page for
              charts.
            </li>
            <li>
              📈 <Link href="/metrics">Browse metrics</Link> for leaderboards by
              latest year.
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}
