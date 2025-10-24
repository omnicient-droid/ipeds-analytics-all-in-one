// AI-powered insights generator using OpenAI
import OpenAI from 'openai'
import type { APISeries } from './series'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface Insight {
  title: string
  description: string
  category: 'trend' | 'comparison' | 'prediction' | 'anomaly'
  confidence: 'high' | 'medium' | 'low'
  data?: Record<string, any>
}

/**
 * Generate AI insights from series data
 * Uses GPT-4 to analyze trends, anomalies, and predictions
 */
export async function generateInsights(
  series: APISeries[],
  context?: {
    schoolName?: string
    peerSchools?: string[]
    nationalBenchmarks?: { code: string; value: number }[]
  },
): Promise<Insight[]> {
  if (series.length === 0) return []

  // Prepare data summary for LLM
  const dataSummary = series
    .map((s) => {
      const points = s.points.filter((p) => p.value != null).sort((a, b) => a.year - b.year)
      if (points.length === 0) return null

      const first = points[0]
      const last = points[points.length - 1]
      const change = last.value! - first.value!
      const pctChange = first.value !== 0 ? (change / first.value!) * 100 : 0

      return {
        metric: s.label || s.code,
        code: s.code,
        firstYear: first.year,
        firstValue: first.value,
        lastYear: last.year,
        lastValue: last.value,
        change,
        pctChange: pctChange.toFixed(1),
        trend: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
        dataPoints: points.length,
      }
    })
    .filter(Boolean)

  if (dataSummary.length === 0) return []

  const prompt = `You are an expert higher education data analyst. Analyze the following institutional metrics and provide 3-5 actionable insights.

School: ${context?.schoolName || 'Institution'}

Data Summary:
${JSON.stringify(dataSummary, null, 2)}

${context?.nationalBenchmarks ? `\nNational Benchmarks:\n${JSON.stringify(context.nationalBenchmarks, null, 2)}` : ''}

Provide insights in JSON array format with this structure:
[
  {
    "title": "Brief insight title (max 60 chars)",
    "description": "Detailed explanation (2-3 sentences max)",
    "category": "trend" | "comparison" | "prediction" | "anomaly",
    "confidence": "high" | "medium" | "low"
  }
]

Focus on:
- Significant trends (>10% change)
- Unusual patterns or inflection points
- Comparisons to national averages if provided
- Future projections based on historical trends
- Actionable recommendations

Return ONLY valid JSON array, no markdown or explanation.`

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are a data analyst specializing in higher education metrics. Provide concise, actionable insights in JSON format.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return []

    // Parse JSON response
    const insights = JSON.parse(content) as Insight[]
    return insights.slice(0, 5) // Max 5 insights
  } catch (error) {
    console.error('[AI Insights] Error:', error)
    // Fallback to rule-based insights
    return generateRuleBasedInsights(series)
  }
}

/**
 * Fallback: Generate insights using statistical rules when AI is unavailable
 */
function generateRuleBasedInsights(series: APISeries[]): Insight[] {
  const insights: Insight[] = []

  for (const s of series) {
    const points = s.points.filter((p) => p.value != null).sort((a, b) => a.year - b.year)
    if (points.length < 3) continue

    const first = points[0].value!
    const last = points[points.length - 1].value!
    const change = last - first
    const pctChange = first !== 0 ? (change / first) * 100 : 0

    // Significant growth
    if (pctChange > 15) {
      insights.push({
        title: `Strong ${s.label || s.code} Growth`,
        description: `${s.label || s.code} increased by ${pctChange.toFixed(1)}% from ${points[0].year} to ${points[points.length - 1].year}, indicating positive momentum.`,
        category: 'trend',
        confidence: 'high',
        data: { change, pctChange },
      })
    }

    // Significant decline
    if (pctChange < -15) {
      insights.push({
        title: `${s.label || s.code} Decline`,
        description: `${s.label || s.code} decreased by ${Math.abs(pctChange).toFixed(1)}% over the period, which may warrant investigation.`,
        category: 'trend',
        confidence: 'high',
        data: { change, pctChange },
      })
    }

    // Detect recent inflection (last 3 years vs previous trend)
    if (points.length >= 6) {
      const recentPoints = points.slice(-3)
      const oldPoints = points.slice(0, -3)

      const recentAvg = recentPoints.reduce((sum, p) => sum + p.value!, 0) / recentPoints.length
      const oldAvg = oldPoints.reduce((sum, p) => sum + p.value!, 0) / oldPoints.length

      const recentChange = ((recentAvg - oldAvg) / oldAvg) * 100

      if (Math.abs(recentChange) > 10) {
        insights.push({
          title: `Recent Shift in ${s.label || s.code}`,
          description: `${s.label || s.code} shows a ${recentChange > 0 ? 'positive' : 'negative'} ${Math.abs(recentChange).toFixed(1)}% shift in the last 3 years compared to historical average.`,
          category: 'anomaly',
          confidence: 'medium',
          data: { recentChange, recentAvg, oldAvg },
        })
      }
    }
  }

  return insights.slice(0, 5)
}

/**
 * Stream insights in real-time (for UI progressive rendering)
 */
export async function* streamInsights(
  series: APISeries[],
  context?: Parameters<typeof generateInsights>[1],
): AsyncGenerator<Insight> {
  // First yield rule-based insights immediately
  const quickInsights = generateRuleBasedInsights(series)
  for (const insight of quickInsights) {
    yield insight
  }

  // Then fetch AI insights asynchronously
  try {
    const aiInsights = await generateInsights(series, context)
    for (const insight of aiInsights) {
      // Only yield if not duplicate of rule-based
      if (!quickInsights.some((q) => q.title === insight.title)) {
        yield insight
      }
    }
  } catch (error) {
    console.error('[Stream Insights] Error:', error)
  }
}
