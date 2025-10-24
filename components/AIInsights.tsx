'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Brain } from 'lucide-react'
import type { Insight } from '@/lib/insights'

interface AIInsightsProps {
  insights: Insight[]
  loading?: boolean
  onRefresh?: () => void
}

const categoryIcons = {
  trend: TrendingUp,
  comparison: Brain,
  prediction: Sparkles,
  anomaly: AlertTriangle,
}

const categoryColors = {
  trend: 'from-blue-500 to-cyan-500',
  comparison: 'from-purple-500 to-pink-500',
  prediction: 'from-yellow-500 to-orange-500',
  anomaly: 'from-red-500 to-rose-500',
}

const confidenceColors = {
  high: 'text-green-400',
  medium: 'text-yellow-400',
  low: 'text-gray-400',
}

export default function AIInsights({ insights, loading, onRefresh }: AIInsightsProps) {
  const [expandedId, setExpandedId] = React.useState<number | null>(null)

  if (loading) {
    return (
      <div className="glass-card-hover border-purple-500/30 p-6">
        <div className="mb-4 flex items-center gap-3">
          <Sparkles className="h-5 w-5 animate-pulse text-purple-400" />
          <h3 className="text-lg font-bold text-purple-300">AI Insights</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-white/10 bg-black/20 p-4"
            >
              <div className="mb-2 h-4 w-3/4 rounded bg-white/10" />
              <div className="h-3 w-full rounded bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (insights.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-hover border-purple-500/30 p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-bold text-purple-300">AI-Powered Insights</h3>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="rounded-lg border border-purple-500/30 px-3 py-1 text-xs text-purple-300 transition-colors hover:border-purple-400 hover:bg-purple-500/10"
          >
            Refresh
          </button>
        )}
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {insights.map((insight, idx) => {
            const Icon = categoryIcons[insight.category]
            const isExpanded = expandedId === idx

            return (
              <motion.div
                key={idx}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.1 }}
                className="group cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-black/40 to-black/20 p-4 backdrop-blur-sm transition-all hover:border-white/20 hover:shadow-lg"
                onClick={() => setExpandedId(isExpanded ? null : idx)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 rounded-lg bg-gradient-to-br ${categoryColors[insight.category]} p-2`}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-200 group-hover:text-white">
                        {insight.title}
                      </h4>
                      <span className={`text-xs ${confidenceColors[insight.confidence]}`}>
                        {insight.confidence}
                      </span>
                    </div>
                    <motion.div
                      initial={false}
                      animate={{
                        height: isExpanded ? 'auto' : 0,
                        opacity: isExpanded ? 1 : 0,
                      }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="mt-2 text-sm leading-relaxed text-gray-400">
                        {insight.description}
                      </p>
                      {insight.data && (
                        <div className="mt-3 rounded border border-white/5 bg-black/20 p-3 text-xs text-gray-500">
                          <code>{JSON.stringify(insight.data, null, 2)}</code>
                        </div>
                      )}
                    </motion.div>
                    {!isExpanded && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-400">
                        {insight.description}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
        <Brain className="h-3 w-3" />
        <span>Powered by GPT-4 • Fallback to statistical analysis when API unavailable</span>
      </div>
    </motion.div>
  )
}
