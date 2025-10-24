'use client'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'
import Header3D from './Header3D'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/60 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-white/10 dark:bg-neutral-950/80 dark:supports-[backdrop-filter]:bg-neutral-900/60">
      {/* Thin accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[var(--accent)] via-[var(--accent-2)] to-[var(--accent)] opacity-30" />
      <div className="relative">
        {/* Subtle animated background */}
        <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-multiply dark:opacity-60">
          <Header3D />
        </div>
        <div className="relative container mx-auto flex h-14 items-center justify-between px-4">
          <Link
            href="/"
            className="group flex items-center gap-3 text-base font-semibold no-underline"
          >
            <div className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              <span className="sr-only">Statipedia</span>
            </div>
            <span className="text-[var(--fg)]">Statipedia</span>
          </Link>
          <nav className="flex items-center gap-2 md:gap-3">
            {[
              { href: '/compare', label: 'Compare' },
              { href: '/u/190150', label: 'Columbia' },
              { href: '/u/199120', label: 'UNC' },
              { href: '/u/166027', label: 'Harvard' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}
