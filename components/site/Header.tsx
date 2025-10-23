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
        headerRef.current.style.background = scrolled 
          ? 'rgba(10,14,26,0.9)' 
          : 'rgba(10,14,26,0.7)'
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
        <Link href="/" className="group flex items-center gap-3 text-lg font-semibold">
          <div className="relative">
            <div
            ref={logoRef}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 shadow-2xl transition-all duration-200 will-change-transform glow-pulse"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <span className="relative z-10 text-base font-extrabold text-white">S</span>
          </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400 to-purple-600 blur-md opacity-40 -z-10"></div>
          </div>
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent font-bold gradient-animated">
            Statipedia
          </span>
        </Link>
  <nav className="flex items-center gap-3">
          <Link
            href="/compare"
            className="px-4 py-2 text-sm rounded-lg text-gray-300 transition-all duration-200 hover:text-white hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30"
          >
            Compare
          </Link>
          <Link
            href="/u/190150"
            className="px-4 py-2 text-sm rounded-lg text-gray-300 transition-all duration-200 hover:text-white hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30"
          >
            Columbia
          </Link>
          <Link
            href="/u/199120"
            className="px-4 py-2 text-sm rounded-lg text-gray-300 transition-all duration-200 hover:text-white hover:bg-purple-500/10 border border-transparent hover:border-purple-500/30"
          >
            UNC
          </Link>
          <Link
            href="/u/166027"
            className="px-4 py-2 text-sm rounded-lg text-gray-300 transition-all duration-200 hover:text-white hover:bg-purple-500/10 border border-transparent hover:border-purple-500/30"
          >
            Harvard
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
