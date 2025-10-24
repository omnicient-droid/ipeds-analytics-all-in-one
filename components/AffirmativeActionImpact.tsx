'use client'

/**
 * AffirmativeActionImpact.tsx
 * 
 * Visualizes demographic changes in university admissions pre/post
 * Students for Fair Admissions v. Harvard (June 29, 2023)
 * 
 * Shows:
 * - Time-series of racial demographics 2020-2025
 * - Pre-SFFA vs Post-SFFA comparison
 * - Percentage changes by race/ethnicity
 * - Multiple universities side-by-side
 */

import React from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

interface RacialDemographic {
  year: number
  white: number
  black: number
  hispanic: number
  asian: number
  twoOrMore: number
  international: number
}

interface UniversityData {
  unitid: number
  name: string
  demographics: RacialDemographic[]
}

interface AffirmativeActionImpactProps {
  universities: UniversityData[]
}

const SFFA_RULING_DATE = new Date('2023-06-29')
const SFFA_YEAR = 2023

// Race category colors for consistency
const RACE_COLORS = {
  white: '#3b82f6',         // blue
  black: '#8b5cf6',         // purple
  hispanic: '#10b981',      // green
  asian: '#f59e0b',         // amber
  twoOrMore: '#ec4899',     // pink
  international: '#6b7280', // gray
}

export default function AffirmativeActionImpact({ universities }: AffirmativeActionImpactProps) {
  const [selectedUniversities, setSelectedUniversities] = React.useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = React.useState<'timeline' | 'comparison'>('timeline')

  // Toggle university selection
  const toggleUniversity = (unitid: number) => {
    const newSelected = new Set(selectedUniversities)
    if (newSelected.has(unitid)) {
      newSelected.delete(unitid)
    } else {
      newSelected.add(unitid)
    }
    setSelectedUniversities(newSelected)
  }

  // Calculate pre/post SFFA averages
  const calculatePrePostChange = (demographics: RacialDemographic[]) => {
    const preData = demographics.filter(d => d.year < SFFA_YEAR)
    const postData = demographics.filter(d => d.year > SFFA_YEAR)

    if (preData.length === 0 || postData.length === 0) return null

    const avgPre = {
      white: preData.reduce((sum, d) => sum + d.white, 0) / preData.length,
      black: preData.reduce((sum, d) => sum + d.black, 0) / preData.length,
      hispanic: preData.reduce((sum, d) => sum + d.hispanic, 0) / preData.length,
      asian: preData.reduce((sum, d) => sum + d.asian, 0) / preData.length,
      twoOrMore: preData.reduce((sum, d) => sum + d.twoOrMore, 0) / preData.length,
      international: preData.reduce((sum, d) => sum + d.international, 0) / preData.length,
    }

    const avgPost = {
      white: postData.reduce((sum, d) => sum + d.white, 0) / postData.length,
      black: postData.reduce((sum, d) => sum + d.black, 0) / postData.length,
      hispanic: postData.reduce((sum, d) => sum + d.hispanic, 0) / postData.length,
      asian: postData.reduce((sum, d) => sum + d.asian, 0) / postData.length,
      twoOrMore: postData.reduce((sum, d) => sum + d.twoOrMore, 0) / postData.length,
      international: postData.reduce((sum, d) => sum + d.international, 0) / postData.length,
    }

    return {
      pre: avgPre,
      post: avgPost,
      change: {
        white: ((avgPost.white - avgPre.white) / avgPre.white) * 100,
        black: ((avgPost.black - avgPre.black) / avgPre.black) * 100,
        hispanic: ((avgPost.hispanic - avgPre.hispanic) / avgPre.hispanic) * 100,
        asian: ((avgPost.asian - avgPre.asian) / avgPre.asian) * 100,
        twoOrMore: ((avgPost.twoOrMore - avgPre.twoOrMore) / avgPre.twoOrMore) * 100,
        international: ((avgPost.international - avgPre.international) / avgPre.international) * 100,
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-8 w-8 text-amber-500 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Affirmative Action Impact Analysis
            </h2>
            <p className="text-gray-300 mb-3">
              Tracking demographic changes following <strong>Students for Fair Admissions v. Harvard</strong> (June 29, 2023)
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="h-px w-8 bg-red-500"></div>
              <span>SFFA Ruling: Supreme Court ruled race-conscious admissions unconstitutional</span>
            </div>
          </div>
        </div>
      </div>

      {/* University Selection */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Select Universities</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {universities.map((uni) => (
            <button
              key={uni.unitid}
              onClick={() => toggleUniversity(uni.unitid)}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                selectedUniversities.has(uni.unitid)
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/10 bg-black/20 hover:border-white/20'
              }`}
            >
              <div className="font-semibold text-white">{uni.name}</div>
              <div className="text-sm text-gray-400">
                {uni.demographics.length} years of data
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedUniversities.size === 0 && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-8 text-center">
          <p className="text-gray-400">Select universities above to view demographic trends</p>
        </div>
      )}

      {selectedUniversities.size > 0 && (
        <>
          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('timeline')}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-blue-500 text-white'
                  : 'bg-black/20 text-gray-400 hover:text-white'
              }`}
            >
              Timeline View
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                viewMode === 'comparison'
                  ? 'bg-blue-500 text-white'
                  : 'bg-black/20 text-gray-400 hover:text-white'
              }`}
            >
              Pre/Post Comparison
            </button>
          </div>

          {/* Timeline View */}
          {viewMode === 'timeline' && (
            <div className="space-y-6">
              {Array.from(selectedUniversities).map((unitid) => {
                const uni = universities.find(u => u.unitid === unitid)
                if (!uni) return null

                return (
                  <div key={unitid} className="rounded-xl border-2 border-white/10 bg-black/40 p-6">
                    <h4 className="text-xl font-bold text-white mb-4">{uni.name}</h4>
                    
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={uni.demographics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="year" 
                          stroke="#9ca3af"
                          tick={{ fill: '#d1d5db' }}
                        />
                        <YAxis 
                          stroke="#9ca3af"
                          tick={{ fill: '#d1d5db' }}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(0,0,0,0.9)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                          }}
                          labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 20 }} />
                        
                        {/* SFFA Ruling Line */}
                        <Line
                          type="monotone"
                          dataKey={() => null}
                          stroke="transparent"
                          dot={false}
                        />
                        
                        <Line type="monotone" dataKey="white" stroke={RACE_COLORS.white} strokeWidth={2} name="White" />
                        <Line type="monotone" dataKey="black" stroke={RACE_COLORS.black} strokeWidth={2} name="Black" />
                        <Line type="monotone" dataKey="hispanic" stroke={RACE_COLORS.hispanic} strokeWidth={2} name="Hispanic" />
                        <Line type="monotone" dataKey="asian" stroke={RACE_COLORS.asian} strokeWidth={2} name="Asian" />
                        <Line type="monotone" dataKey="twoOrMore" stroke={RACE_COLORS.twoOrMore} strokeWidth={2} name="Two or More" />
                        <Line type="monotone" dataKey="international" stroke={RACE_COLORS.international} strokeWidth={2} name="International" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pre/Post Comparison View */}
          {viewMode === 'comparison' && (
            <div className="space-y-6">
              {Array.from(selectedUniversities).map((unitid) => {
                const uni = universities.find(u => u.unitid === unitid)
                if (!uni) return null

                const analysis = calculatePrePostChange(uni.demographics)
                if (!analysis) {
                  return (
                    <div key={unitid} className="rounded-xl border border-white/10 bg-black/20 p-6">
                      <h4 className="text-xl font-bold text-white mb-2">{uni.name}</h4>
                      <p className="text-gray-400">Insufficient data for pre/post comparison</p>
                    </div>
                  )
                }

                const comparisonData = [
                  { category: 'White', preSFFA: analysis.pre.white, postSFFA: analysis.post.white, change: analysis.change.white },
                  { category: 'Black', preSFFA: analysis.pre.black, postSFFA: analysis.post.black, change: analysis.change.black },
                  { category: 'Hispanic', preSFFA: analysis.pre.hispanic, postSFFA: analysis.post.hispanic, change: analysis.change.hispanic },
                  { category: 'Asian', preSFFA: analysis.pre.asian, postSFFA: analysis.post.asian, change: analysis.change.asian },
                  { category: 'Two+', preSFFA: analysis.pre.twoOrMore, postSFFA: analysis.post.twoOrMore, change: analysis.change.twoOrMore },
                  { category: 'Intl', preSFFA: analysis.pre.international, postSFFA: analysis.post.international, change: analysis.change.international },
                ]

                return (
                  <div key={unitid} className="rounded-xl border-2 border-white/10 bg-black/40 p-6">
                    <h4 className="text-xl font-bold text-white mb-4">{uni.name}</h4>
                    
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Bar Chart */}
                      <div>
                        <h5 className="text-sm font-semibold text-gray-300 mb-3">Pre vs Post SFFA Demographics</h5>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={comparisonData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="category" stroke="#9ca3af" tick={{ fill: '#d1d5db' }} />
                            <YAxis stroke="#9ca3af" tick={{ fill: '#d1d5db' }} tickFormatter={(v) => `${v}%`} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(0,0,0,0.9)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                              }}
                            />
                            <Legend />
                            <Bar dataKey="preSFFA" fill="#3b82f6" name="Pre-SFFA (2020-2023)" />
                            <Bar dataKey="postSFFA" fill="#10b981" name="Post-SFFA (2024+)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Change Indicators */}
                      <div>
                        <h5 className="text-sm font-semibold text-gray-300 mb-3">Percentage Change</h5>
                        <div className="space-y-3">
                          {comparisonData.map((item) => {
                            const isIncrease = item.change > 0
                            const isSignificant = Math.abs(item.change) > 5
                            
                            return (
                              <div key={item.category} className="rounded-lg bg-black/20 p-3">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-white">{item.category}</span>
                                  <div className="flex items-center gap-2">
                                    {isIncrease ? (
                                      <TrendingUp className={`h-4 w-4 ${isSignificant ? 'text-green-500' : 'text-gray-400'}`} />
                                    ) : (
                                      <TrendingDown className={`h-4 w-4 ${isSignificant ? 'text-red-500' : 'text-gray-400'}`} />
                                    )}
                                    <span className={`font-bold ${
                                      isIncrease 
                                        ? isSignificant ? 'text-green-500' : 'text-green-400/70'
                                        : isSignificant ? 'text-red-500' : 'text-red-400/70'
                                    }`}>
                                      {isIncrease ? '+' : ''}{item.change.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-1 flex gap-2 text-xs text-gray-400">
                                  <span>{item.preSFFA.toFixed(1)}% → {item.postSFFA.toFixed(1)}%</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
