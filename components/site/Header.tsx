import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header
      className="border-b sticky top-0 z-40 backdrop-blur-xl"
      style={{
        background: 'rgba(10, 14, 26, 0.7)',
        borderColor: 'rgba(59, 130, 246, 0.2)',
        boxShadow: '0 4px 24px 0 rgba(31, 38, 135, 0.2)',
      }}
    >
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3 font-semibold text-lg group">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-all duration-300">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Statipedia
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/compare"
            className="text-sm text-gray-300 hover:text-blue-400 transition-colors duration-200"
          >
            Compare
          </Link>
          <Link
            href="/u/190150"
            className="text-sm text-gray-300 hover:text-blue-400 transition-colors duration-200"
          >
            Columbia
          </Link>
          <Link
            href="/u/199120"
            className="text-sm text-gray-300 hover:text-blue-400 transition-colors duration-200"
          >
            UNC
          </Link>
          <Link
            href="/u/166027"
            className="text-sm text-gray-300 hover:text-blue-400 transition-colors duration-200"
          >
            Harvard
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
