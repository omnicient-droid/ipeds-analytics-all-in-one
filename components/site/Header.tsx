'use client'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'
import { useRef } from 'react'

export default function Header() {
  const logoRef = useRef<HTMLDivElement>(null)
  const onMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const el = logoRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rx = (y - 0.5) * -12
    const ry = (x - 0.5) * 12
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`
  }
  const onLeave = () => {
    const el = logoRef.current
    if (!el) return
    el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)'
  }
  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-xl"
      style={{
        background: 'rgba(10, 14, 26, 0.7)',
        borderColor: 'rgba(59, 130, 246, 0.2)',
        boxShadow: '0 4px 24px 0 rgba(31, 38, 135, 0.2)',
      }}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-3 text-lg font-semibold">
          <div
            ref={logoRef}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg transition-transform duration-150 will-change-transform"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Statipedia
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/compare"
            className="text-sm text-gray-300 transition-colors duration-200 hover:text-blue-400"
          >
            Compare
          </Link>
          <Link
            href="/u/190150"
            className="text-sm text-gray-300 transition-colors duration-200 hover:text-blue-400"
          >
            Columbia
          </Link>
          <Link
            href="/u/199120"
            className="text-sm text-gray-300 transition-colors duration-200 hover:text-blue-400"
          >
            UNC
          </Link>
          <Link
            href="/u/166027"
            className="text-sm text-gray-300 transition-colors duration-200 hover:text-blue-400"
          >
            Harvard
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
