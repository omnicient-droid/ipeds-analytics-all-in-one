// app/api/insights/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateInsights } from '@/lib/insights'
import { fetchSeries } from '@/lib/series'
import { NATIONAL_BENCHMARKS } from '@/lib/benchmarks'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Allow longer execution for AI calls

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { unitid, schoolName, codes } = body

    if (!unitid || !codes || !Array.isArray(codes)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch series data
    const series = await fetchSeries(
      codes,
      [unitid],
      { from: 2010, to: new Date().getFullYear() },
      { retries: 2, timeoutMs: 15000 },
    )

    if (series.length === 0) {
      return NextResponse.json({ insights: [] })
    }

    // Prepare national benchmarks context
    const benchmarkContext = NATIONAL_BENCHMARKS.map((b) => ({
      code: b.code,
      value: b.points[b.points.length - 1]?.value || 0,
    }))

    // Generate insights
    const insights = await generateInsights(series, {
      schoolName,
      nationalBenchmarks: benchmarkContext,
    })

    return NextResponse.json({ insights })
  } catch (error: any) {
    console.error('[Insights API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate insights' },
      { status: 500 },
    )
  }
}
