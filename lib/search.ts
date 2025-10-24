// Smart search engine with fuzzy matching and filters
import Fuse from 'fuse.js'
import { SCHOOLS, type School, SCHOOL_LIST } from './schools'

export interface SearchFilters {
  state?: string
  sector?: string // Public, Private, For-Profit
  level?: string // 4-year, 2-year
  size?: 'small' | 'medium' | 'large' | 'very-large' // Based on enrollment
  division?: string // D1, D2, D3, etc.
  conference?: string
}

export interface SearchResult {
  school: School
  score: number
  matches?: string[]
}

/**
 * Fuzzy search across school names, cities, and aliases
 */
export function fuzzySearch(query: string, limit = 20): SearchResult[] {
  if (!query || query.trim().length === 0) return []

  const fuse = new Fuse(SCHOOL_LIST, {
    keys: [
      { name: 'name', weight: 2 },
      { name: 'city', weight: 0.5 },
      { name: 'state', weight: 0.3 },
      { name: 'key', weight: 0.5 },
    ],
    threshold: 0.4, // 0 = perfect match, 1 = match anything
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
  })

  const results = fuse.search(query, { limit })
  return results.map((r) => ({
    school: r.item,
    score: 1 - (r.score || 0), // Invert so higher = better
    matches: r.matches?.map((m) => m.key).filter((k): k is string => k !== undefined) || [],
  }))
}

/**
 * Advanced filtering with multiple criteria
 */
export function filterSchools(filters: SearchFilters): School[] {
  let results = [...SCHOOL_LIST]

  // Note: School type doesn't have 'state' field yet, filter by sector/level/division for now
  if (filters.sector) {
    results = results.filter((s) => s.sector === filters.sector)
  }

  if (filters.level) {
    results = results.filter((s) => s.level === filters.level)
  }

  if (filters.division) {
    results = results.filter((s) => s.division === filters.division)
  }

  if (filters.conference) {
    results = results.filter((s) => s.conference === filters.conference)
  }

  if (filters.size) {
    // Placeholder: would need enrollment data from DB
    // Small: <2000, Medium: 2000-10000, Large: 10000-30000, Very Large: >30000
  }

  return results
}

/**
 * Combined search: fuzzy + filters
 */
export function smartSearch(
  query: string,
  filters?: SearchFilters,
  limit = 20,
): SearchResult[] {
  let results: SearchResult[]

  if (query && query.trim().length > 0) {
    // Start with fuzzy search
    results = fuzzySearch(query, 100) // Get more candidates
  } else {
    // No query, just filter all schools
    results = SCHOOL_LIST.map((s) => ({ school: s, score: 1, matches: [] }))
  }

  // Apply filters
  if (filters) {
    const filtered = new Set(filterSchools(filters).map((s) => s.unitid))
    results = results.filter((r) => filtered.has(r.school.unitid))
  }

  return results.slice(0, limit)
}

/**
 * Get unique values for filter options
 */
export function getFilterOptions(): {
  states: string[]
  sectors: string[]
  levels: string[]
  divisions: string[]
  conferences: string[]
} {
  const states: string[] = [] // Placeholder: would extract from full school data
  const sectors = [...new Set(SCHOOL_LIST.map((s) => s.sector).filter(Boolean))].sort() as string[]
  const levels = [...new Set(SCHOOL_LIST.map((s) => s.level).filter(Boolean))].sort() as string[]
  const divisions = [...new Set(SCHOOL_LIST.map((s) => s.division).filter(Boolean))].sort() as string[]
  const conferences = [...new Set(SCHOOL_LIST.map((s) => s.conference).filter(Boolean))].sort() as string[]

  return { states, sectors, levels, divisions, conferences }
}

/**
 * Save search query to localStorage
 */
export function saveSearchQuery(name: string, query: string, filters?: SearchFilters) {
  if (typeof window === 'undefined') return

  const saved = getSavedSearches()
  saved[name] = { query, filters, savedAt: new Date().toISOString() }
  localStorage.setItem('saved-searches', JSON.stringify(saved))
}

/**
 * Get saved searches
 */
export function getSavedSearches(): Record<
  string,
  { query: string; filters?: SearchFilters; savedAt: string }
> {
  if (typeof window === 'undefined') return {}

  try {
    const saved = localStorage.getItem('saved-searches')
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

/**
 * Delete saved search
 */
export function deleteSavedSearch(name: string) {
  if (typeof window === 'undefined') return

  const saved = getSavedSearches()
  delete saved[name]
  localStorage.setItem('saved-searches', JSON.stringify(saved))
}
