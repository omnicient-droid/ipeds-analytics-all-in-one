'use client'

import dynamic from 'next/dynamic'
import ChartSkeleton from '@/components/ChartSkeleton'

const CompareClient = dynamic(() => import('./Client'), {
  ssr: false,
  loading: () => <ChartSkeleton />,
})
const BenchmarksPanel = dynamic(() => import('./BenchmarksPanel'), {
  ssr: false,
  loading: () => <ChartSkeleton />,
})

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-6">
      <h1 className="mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-3xl font-bold text-transparent">
        Compare Universities
      </h1>
      <CompareClient />
      <div className="border-t border-blue-500/20 pt-10">
        <BenchmarksPanel />
      </div>
    </main>
  )
}
