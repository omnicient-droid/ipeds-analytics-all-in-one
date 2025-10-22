// app/metrics/page.tsx
import Link from 'next/link'

const CATALOG: { code: string; name: string; unit?: string; desc?: string }[] =
  [
    { code: 'SC.ADM.RATE', name: 'Admission rate (overall)', unit: 'ratio' },
    { code: 'SC.SAT.TOTAL25', name: 'SAT total 25th percentile', unit: 'score' },
    { code: 'SC.SAT.TOTAL75', name: 'SAT total 75th percentile', unit: 'score' },
    // IPEDS EF examples
    { code: 'EF.EFYTOTL', name: 'Total fall enrollment', unit: 'count' },
    { code: 'EF.EFYWHITE', name: 'White fall enrollment', unit: 'count' },
    { code: 'EF.EFYBLACK', name: 'Black fall enrollment', unit: 'count' },
    { code: 'EF.EFYHISP', name: 'Hispanic/Latino fall enrollment', unit: 'count' },
    { code: 'EF.EFYASIAN', name: 'Asian fall enrollment', unit: 'count' },
  ]

export default function MetricsIndex() {
  return (
    <div className="box">
      <div className="box-header">Metrics Catalog</div>
      <div className="box-body">
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {CATALOG.map((m) => (
            <li key={m.code} style={{ padding: '10px 0' }}>
              <Link href={`/m/${encodeURIComponent(m.code)}`}>
                <strong>{m.name}</strong>
              </Link>
              <div style={{ color: '#5b6470', fontSize: 13 }}>
                {m.code} · {m.unit || 'unit'}
                {m.desc ? ` — ${m.desc}` : ''}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
