'use client'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'
import { useRef, useEffect } from 'react'

export default function Header() {
  const logoRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        const scrolled = window.scrollY > 50
        headerRef.current.style.background = scrolled ? 'rgba(10,14,26,0.9)' : 'rgba(10,14,26,0.7)'
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const onMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const el = logoRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rx = (y - 0.5) * -18
    const ry = (x - 0.5) * 18
    el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px) scale(1.08)`
  }
  const onLeave = () => {
    const el = logoRef.current
    if (!el) return
    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)'
  }
  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b backdrop-blur-xl transition-all duration-300"
      style={{
        background: 'rgba(10, 14, 26, 0.7)',
        borderColor: 'rgba(59, 130, 246, 0.25)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.3)',
      }}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-3 text-lg font-semibold no-underline">
          <div className="relative">
            <div
              ref={logoRef}
              onMouseMove={onMove}
              onMouseLeave={onLeave}
              className="glow-pulse relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 shadow-2xl transition-all duration-200 will-change-transform"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <span className="sr-only">Statipedia</span>
            </div>
            <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-600 opacity-40 blur-md"></div>
          </div>
          <span className="gradient-animated bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text font-bold text-transparent">
            Statipedia
          </span>
        </Link>
        <nav className="flex items-center gap-6 md:gap-8">
          <Link
            href="/compare"
            className="rounded-lg border border-transparent px-4 py-2 text-sm text-gray-300 no-underline transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-white"
          >
            Compare
          </Link>
          <Link
            href="/u/190150"
            className="rounded-lg border border-transparent px-4 py-2 text-sm text-gray-300 no-underline transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-white"
          >
            Columbia
          </Link>
          <Link
            href="/u/199120"
            className="rounded-lg border border-transparent px-4 py-2 text-sm text-gray-300 no-underline transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-white"
          >
            UNC
          </Link>
          <Link
            href="/u/166027"
            className="rounded-lg border border-transparent px-4 py-2 text-sm text-gray-300 no-underline transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-white"
          >
            Harvard
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
