import * as React from 'react'
import SearchEngine from './SearchEngine'

export const metadata = {
  title: 'Smart Search - IPEDS Analytics',
  description:
    'Find schools with fuzzy search and intelligent filters. Search by name, location, sector, level, division, or conference.',
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-4xl font-bold text-transparent">
            Smart Search
          </h1>
          <p className="text-gray-400">
            Discover schools with AI-powered fuzzy matching and intelligent filters
          </p>
        </div>

        <SearchEngine />
      </div>
    </div>
  )
}
