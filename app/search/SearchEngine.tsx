'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, X, Save, Trash2, Clock } from 'lucide-react'
import Link from 'next/link'
import {
  smartSearch,
  getFilterOptions,
  saveSearchQuery,
  getSavedSearches,
  deleteSavedSearch,
  type SearchFilters,
  type SearchResult,
} from '@/lib/search'

export default function SearchEngine() {
  const [query, setQuery] = React.useState('')
  const [filters, setFilters] = React.useState<SearchFilters>({})
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [showFilters, setShowFilters] = React.useState(false)
  const [showSaved, setShowSaved] = React.useState(false)
  const [savedSearches, setSavedSearches] = React.useState(getSavedSearches())

  const filterOptions = React.useMemo(() => getFilterOptions(), [])

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 0 || Object.keys(filters).some((k) => filters[k as keyof SearchFilters])) {
        const searchResults = smartSearch(query, filters, 50)
        setResults(searchResults)
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, filters])

  const handleSave = () => {
    const name = prompt('Save this search as:')
    if (name) {
      saveSearchQuery(name, query, filters)
      setSavedSearches(getSavedSearches())
    }
  }

  const handleLoadSaved = (name: string) => {
    const saved = savedSearches[name]
    if (saved) {
      setQuery(saved.query)
      setFilters(saved.filters || {})
      setShowSaved(false)
    }
  }

  const handleDeleteSaved = (name: string) => {
    deleteSavedSearch(name)
    setSavedSearches(getSavedSearches())
  }

  const clearFilters = () => {
    setFilters({})
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="mx-auto max-w-4xl">
      {/* Search Bar */}
      <div className="glass-card-hover mb-6 p-4">
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search schools by name, city, or key..."
              className="w-full rounded-lg border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-gray-200 placeholder-gray-500 backdrop-blur-sm focus:border-blue-400 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search query"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 transition-colors ${
              showFilters
                ? 'border-blue-400 bg-blue-500/10 text-blue-300'
                : 'border-white/10 bg-black/20 text-gray-300 hover:border-white/20'
            }`}
          >
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={!query && activeFilterCount === 0}
            aria-label="Save current search"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-gray-300 transition-colors hover:border-white/20 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowSaved(!showSaved)}
            aria-label="View saved searches"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-gray-300 transition-colors hover:border-white/20"
          >
            <Clock className="h-4 w-4" />
          </button>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid gap-3 border-t border-white/10 pt-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">Sector</label>
                  <select
                    value={filters.sector || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, sector: e.target.value || undefined })
                    }
                    className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-200"
                  >
                    <option value="">All</option>
                    {filterOptions.sectors.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">Level</label>
                  <select
                    value={filters.level || ''}
                    onChange={(e) => setFilters({ ...filters, level: e.target.value || undefined })}
                    className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-200"
                  >
                    <option value="">All</option>
                    {filterOptions.levels.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">Division</label>
                  <select
                    value={filters.division || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, division: e.target.value || undefined })
                    }
                    className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-200"
                  >
                    <option value="">All</option>
                    {filterOptions.divisions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Conference
                  </label>
                  <select
                    value={filters.conference || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, conference: e.target.value || undefined })
                    }
                    className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-200"
                  >
                    <option value="">All</option>
                    {filterOptions.conferences.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {activeFilterCount > 0 && (
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="w-full rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition-colors hover:border-red-400 hover:bg-red-500/20"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved Searches Panel */}
        <AnimatePresence>
          {showSaved && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/10 pt-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-300">Saved Searches</h4>
                {Object.keys(savedSearches).length === 0 ? (
                  <p className="text-xs text-gray-500">No saved searches yet.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(savedSearches).map(([name, data]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded border border-white/10 bg-black/20 p-2"
                      >
                        <button
                          onClick={() => handleLoadSaved(name)}
                          className="flex-1 text-left text-sm text-gray-300 hover:text-white"
                        >
                          <div className="font-medium">{name}</div>
                          {data.query && (
                            <div className="text-xs text-gray-500">"{data.query}"</div>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteSaved(name)}
                          aria-label={`Delete saved search: ${name}`}
                          className="ml-2 text-gray-500 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          <div className="mb-3 text-sm text-gray-400">
            {results.length} {results.length === 1 ? 'result' : 'results'}
          </div>
          <AnimatePresence mode="popLayout">
            {results.map((result, idx) => (
              <motion.div
                key={result.school.unitid}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Link
                  href={`/u/${result.school.unitid}`}
                  className="glass-card-hover group flex items-center gap-4 p-4 transition-all hover:border-blue-400/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.school.logo}
                    alt={result.school.logoAlt}
                    className="h-12 w-12 rounded-lg object-contain"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-200 group-hover:text-white">
                      {result.school.name}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      {result.school.sector && (
                        <span className="rounded bg-blue-500/10 px-2 py-0.5 text-blue-300">
                          {result.school.sector}
                        </span>
                      )}
                      {result.school.level && (
                        <span className="rounded bg-green-500/10 px-2 py-0.5 text-green-300">
                          {result.school.level}
                        </span>
                      )}
                      {result.school.division && (
                        <span className="rounded bg-purple-500/10 px-2 py-0.5 text-purple-300">
                          {result.school.division}
                        </span>
                      )}
                      {result.school.conference && (
                        <span className="text-gray-400">{result.school.conference}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {(result.score * 100).toFixed(0)}% match
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {query.length > 0 && results.length === 0 && (
        <div className="glass-card border-yellow-500/30 p-8 text-center">
          <p className="text-gray-400">No schools found matching your search.</p>
          <p className="mt-2 text-sm text-gray-500">Try adjusting your filters or search terms.</p>
        </div>
      )}

      {!query && results.length === 0 && (
        <div className="glass-card border-blue-500/30 p-8 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-blue-400" />
          <p className="text-gray-400">Start typing to search for schools</p>
          <p className="mt-2 text-sm text-gray-500">
            Use filters to narrow by sector, level, division, or conference
          </p>
        </div>
      )}
    </div>
  )
}
