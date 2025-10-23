'use client'

import Link from 'next/link'
import * as React from 'react'

export default function Home() {
  const cardRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      const rx = (y - 0.5) * -10 // rotateX
      const ry = (x - 0.5) * 10 // rotateY
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`
    }
    const onLeave = () => {
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)'
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b132b] via-[#1c2541] to-[#2b2d42] text-white">
      {/* Hero */}
      <section className="container-bleed pt-8 pb-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="text-4xl leading-tight font-extrabold md:text-5xl">
              University analytics, <span className="text-[#ef233c]">made clear.</span>
            </h1>
            <p className="mt-4 text-white/80">
              Compare enrollment, admissions, and outcomes. Clean trends. Clear context. Start with
              Columbia, UNC, and Harvard—or search any school.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/compare"
                className="rounded-xl bg-[#ef233c] px-5 py-3 shadow-md transition hover:bg-[#d90429]"
              >
                Try the comparison tool
              </Link>
              <Link
                href="/u/190150"
                className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 transition hover:bg-white/10"
              >
                View a sample profile
              </Link>
            </div>
          </div>

          <div className="relative">
            {/* Accent glows */}
            <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-[#ef233c]/30 blur-2xl" />
            <div className="absolute -right-10 -bottom-10 h-24 w-24 rounded-full bg-[#2b2d42]/50 blur-2xl" />

            {/* 3D tilt card */}
            <div
              ref={cardRef}
              className="relative rounded-2xl border border-white/10 bg-white/[.06] p-5 shadow-xl transition-transform duration-150 will-change-transform"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="mb-3 text-sm text-white/80">Preview</div>
              <div
                className="h-44 rounded-lg bg-gradient-to-br from-[#ef233c]/35 via-[#edf2f4]/12 to-[#2b2d42]/35"
                style={{ transform: 'translateZ(30px)' }}
              />
              <p className="mt-3 text-xs text-white/70" style={{ transform: 'translateZ(15px)' }}>
                Live data via IPEDS (Urban Institute). YoY transforms, forecasting, and clear
                legends by school.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container-bleed py-8 text-xs text-white/55">
        © {new Date().getFullYear()} Statipedia • Built with Next.js + Tailwind
      </footer>
    </main>
  )
}
