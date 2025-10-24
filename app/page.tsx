'use client'

import Link from 'next/link'
import Sparkline from '@/components/Sparkline'
import Header3D from '@/components/site/Header3D'

export default function Home() {
  const demoA = [10, 12, 9, 13, 14, 18, 17, 19, 21, 20, 23, 26]
  const demoB = [42, 40, 41, 43, 44, 45, 46, 48, 47, 49, 51, 52]
  const demoC = [8, 8, 9, 10, 12, 11, 13, 15, 16, 17, 16, 18]

  return (
    <main>
      {/* Hero */}
      <section className="container-bleed relative overflow-hidden py-10">
        <div className="pointer-events-none absolute inset-0 opacity-90">
          <Header3D />
        </div>
        <div className="relative grid items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="text-4xl leading-tight font-bold text-[var(--fg)] md:text-5xl">
              University analytics, made clear.
            </h1>
            <p className="mt-3 text-[var(--muted)]">
              Compare enrollment, admissions, and outcomes. Clean trends. Clear context. Start with
              Columbia, UNC, and Harvard—or search any school.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/compare" className="btn-primary">
                Try the comparison tool
              </Link>
              <Link
                href="/u/190150"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm text-neutral-800 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
              >
                View a sample profile
              </Link>
            </div>
          </div>

          <div className="box">
            <div className="box-header">Live preview</div>
            <div className="box-body">
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-[var(--muted)]">Admissions rate</div>
                  <Sparkline data={demoB} width={140} height={40} />
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)]">Undergrad enrollment</div>
                  <Sparkline data={demoA} width={140} height={40} />
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)]">Tuition & fees</div>
                  <Sparkline data={demoC} width={140} height={40} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spotlight */}
      <section className="container-bleed pb-12">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'AI-Powered Insights',
              desc: 'GPT-4 analyzes your data and surfaces trends, anomalies, and predictions.',
              href: '/u/190150',
              badge: 'NEW',
            },
            {
              title: 'What-If Scenarios',
              desc: 'Monte Carlo simulations with confidence intervals for future projections.',
              href: '/compare',
              badge: 'NEW',
            },
            {
              title: 'Compare schools instantly',
              desc: 'Side-by-side admissions, enrollment by race, and more.',
              href: '/compare',
            },
            {
              title: 'Browse the metrics catalog',
              desc: 'See available metrics and queued skeletons.',
              href: '/metrics',
            },
            {
              title: 'Jump to a profile',
              desc: 'Start with Columbia, then try UNC and Harvard.',
              href: '/u/190150',
            },
          ].map((c) => (
            <div key={c.title} className="box">
              <div className="box-header">
                {c.title}
                {c.badge && (
                  <span className="ml-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 text-xs font-bold text-white">
                    {c.badge}
                  </span>
                )}
              </div>
              <div className="box-body">
                <p className="text-sm text-[var(--muted)]">{c.desc}</p>
                <div className="mt-3">
                  <Link href={c.href} className="btn-primary">
                    Open
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="container-bleed py-8 text-xs text-[var(--muted)]">
        © {new Date().getFullYear()} Statipedia • Built with Next.js + Tailwind
      </footer>
    </main>
  )
}
