export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// app/layout.tsx
import './globals.css'
import Link from 'next/link'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Statipedia',
  description: 'Wikipedia‑style explorer for IPEDS & College Scorecard metrics',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Flag stripes */}
        <div className="flag-strip flag-strip--red" />
        <div className="flag-strip flag-strip--blue" />

        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              <span className="brand-flag">★</span> Statipedia
            </Link>
            <nav className="top-nav" aria-label="Primary">
              <Link href="/search" className="pill">
                Search
              </Link>
              <Link href="/metrics" className="pill">
                Metrics
              </Link>
              <Link href="/about" className="pill">
                About
              </Link>
            </nav>
          </div>
        </header>

        <main className="container content">{children}</main>

        <footer className="site-footer">
          <div className="container">
            <p>
              Content generated from IPEDS and U.S. Dept. of Education College
              Scorecard.
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
