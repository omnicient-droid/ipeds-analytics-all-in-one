'use client'

import React from 'react'
import AffirmativeActionImpact from '@/components/AffirmativeActionImpact'
import { Scale, TrendingDown, AlertTriangle } from 'lucide-react'

export default function AffirmativeActionPage() {
  const [universities, setUniversities] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/race-demographics?yearStart=2020&yearEnd=2025')
        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }
        const data = await response.json()
        setUniversities(data.universities)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-8">
            <div className="h-32 rounded-xl bg-white/10"></div>
            <div className="h-96 rounded-xl bg-white/10"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl border-2 border-red-500/30 bg-red-500/10 p-8">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <h2 className="text-xl font-bold text-white">Error Loading Data</h2>
                <p className="text-gray-300">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Page Header */}
        <div className="rounded-2xl border-2 border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-8 backdrop-blur-md">
          <div className="flex items-start gap-6">
            <div className="rounded-xl bg-blue-500/20 p-4">
              <Scale className="h-12 w-12 text-blue-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-3">
                Affirmative Action Impact Analysis
              </h1>
              <p className="text-lg text-gray-300 mb-4">
                Tracking demographic changes in university admissions following the Supreme Court's ruling in{' '}
                <strong className="text-white">Students for Fair Admissions v. Harvard & UNC</strong> (June 29, 2023)
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-300">Pre-SFFA: 2020-2023</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span className="text-gray-300">Post-SFFA: 2024-2025</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-gray-300">Declining representation</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Context Section */}
        <div className="rounded-xl border border-white/10 bg-black/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Case Background</h2>
          <div className="space-y-3 text-gray-300">
            <p>
              On <strong>June 29, 2023</strong>, the U.S. Supreme Court ruled 6-3 that race-conscious admissions 
              policies at Harvard and UNC violated the Equal Protection Clause of the 14th Amendment.
            </p>
            <p>
              This decision effectively ended affirmative action in college admissions, prohibiting universities 
              from considering race as a factor in admissions decisions.
            </p>
            <p className="font-semibold text-white">
              This analysis tracks how racial demographics have shifted in the admissions cycles following this landmark ruling.
            </p>
          </div>
        </div>

        {/* Main Visualization Component */}
        {universities.length > 0 ? (
          <AffirmativeActionImpact universities={universities} />
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/20 p-12 text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Data Available</h3>
            <p className="text-gray-400 mb-6">
              Race demographic data hasn't been ingested yet. Run the data fetching scripts to populate the database.
            </p>
            <div className="rounded-lg bg-black/40 p-4 text-left">
              <p className="text-sm text-gray-300 font-mono mb-2">Run these commands to fetch data:</p>
              <code className="block text-xs text-green-400 mb-1">
                # Fetch College Scorecard race demographics (2020-2025)
              </code>
              <code className="block text-xs text-blue-400 mb-1">
                node scripts/fetch_race_demographics.mjs --year-range 2020-2025
              </code>
              <code className="block text-xs text-green-400 mb-1 mt-3">
                # Fetch Common Data Set Section B2 demographics
              </code>
              <code className="block text-xs text-blue-400">
                node scripts/fetch_all_common_data_sets.mjs --limit 50
              </code>
            </div>
          </div>
        )}

        {/* Data Sources Footer */}
        <div className="rounded-lg border border-white/10 bg-black/20 p-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Data Sources</h3>
          <div className="grid gap-3 md:grid-cols-3 text-xs">
            <div>
              <div className="font-semibold text-white mb-1">College Scorecard</div>
              <div className="text-gray-400">U.S. Department of Education demographic percentages</div>
            </div>
            <div>
              <div className="font-semibold text-white mb-1">Common Data Set</div>
              <div className="text-gray-400">University-published Section B2 enrollment by race</div>
            </div>
            <div>
              <div className="font-semibold text-white mb-1">IPEDS</div>
              <div className="text-gray-400">Fall Enrollment survey racial/ethnic breakdowns</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
