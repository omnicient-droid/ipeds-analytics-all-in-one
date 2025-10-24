// app/metrics/page.tsx
import Link from 'next/link'

type CatalogItem = {
  code: string
  label: string
  unit?: string
  category?: string
  hasData?: boolean
}

async function fetchCatalog(): Promise<CatalogItem[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/metrics/catalog`, {
    // Works in server components; falls back to relative in local
    cache: 'no-store',
  })
  const json = await res.json()
  return json.metrics || []
}

export default async function MetricsIndex() {
  const items = await fetchCatalog()
  const byCategory: Record<string, CatalogItem[]> = {}
  for (const it of items) {
    const k = it.category || 'Other'
    ;(byCategory[k] ||= []).push(it)
  }
  return (
    <div className="box">
      <div className="box-header">Metrics Catalog</div>
      <div className="box-body">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(byCategory).map(([cat, list]) => (
            <div key={cat} className="rounded-xl border border-[var(--border)]">
              <div className="border-b border-[var(--border)] px-4 py-3 font-semibold">{cat}</div>
              <ul className="p-2">
                {list.map((m) => (
                  <li key={m.code} className="px-2 py-2">
                    <Link href={`/m/${encodeURIComponent(m.code)}`}>
                      <strong>{m.label}</strong>
                    </Link>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>
                      {m.code} · {m.unit || 'unit'} · {m.hasData ? 'available' : 'skeleton'}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
