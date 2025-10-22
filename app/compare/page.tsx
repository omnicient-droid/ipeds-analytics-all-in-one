// app/compare/page.tsx
export const dynamic = 'force-dynamic'

import dynamicImport from 'next/dynamic'
import Link from 'next/link'

const CompareClient = dynamicImport(() => import('./Client'), { ssr: false })

export default function ComparePage() {
  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Compare Universities</h1>
        <nav>
          <Link href="/" style={{ textDecoration: 'underline' }}>
            Home
          </Link>
        </nav>
      </header>
      <CompareClient />
    </main>
  )
}
