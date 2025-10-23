// BLS (Bureau of Labor Statistics) API integration
// https://www.bls.gov/developers/api_signature_v2.htm

export type BLSSeries = {
  seriesID: string
  label: string
  unit: string
  points: { year: number; period: string; value: number | null }[]
}

const BLS_BASE = 'https://api.bls.gov/publicAPI/v2/timeseries/data/'

// Series IDs for labor market indicators
export const BLS_SERIES_MAP: Record<string, { id: string; label: string; unit: string }> = {
  UNEMPLOYMENT_RATE: {
    id: 'LNS14000000',
    label: 'Unemployment Rate (Overall)',
    unit: 'percent',
  },
  UNEMPLOYMENT_BACHELORS: {
    id: 'LNS14027662',
    label: 'Unemployment Rate (Bachelor degree or higher)',
    unit: 'percent',
  },
  UNEMPLOYMENT_LESS_HS: {
    id: 'LNS14027659',
    label: 'Unemployment Rate (Less than HS diploma)',
    unit: 'percent',
  },
  MEDIAN_EARNINGS_BACHELORS: {
    id: 'LEU0254530800',
    label: 'Median Weekly Earnings (Bachelor degree)',
    unit: 'USD',
  },
}

export async function fetchBLSSeries(
  seriesId: string,
  startYear: number,
  endYear: number,
): Promise<BLSSeries | null> {
  try {
    const payload = {
      seriesid: [seriesId],
      startyear: String(startYear),
      endyear: String(endYear),
      registrationkey: process.env.BLS_API_KEY || '',
    }

    const res = await fetch(BLS_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      next: { revalidate: 86400 }, // 24h cache
    })

    if (!res.ok) {
      console.warn(`[BLS API] ${res.status} ${res.statusText}`)
      return null
    }

    const json = await res.json()
    if (json.status !== 'REQUEST_SUCCEEDED') {
      console.warn(`[BLS API] ${json.status}: ${json.message?.[0] || 'Unknown error'}`)
      return null
    }

    const series = json.Results?.series?.[0]
    if (!series) return null

    const points = (series.data || []).map((d: any) => ({
      year: parseInt(d.year),
      period: d.period,
      value: d.value ? parseFloat(d.value) : null,
    }))

    const info = Object.values(BLS_SERIES_MAP).find((s) => s.id === seriesId)
    return {
      seriesID: seriesId,
      label: info?.label || seriesId,
      unit: info?.unit || '',
      points,
    }
  } catch (e) {
    console.error('[BLS API] Error:', e)
    return null
  }
}

// Demo data fallback for BLS series
export function buildDemoBLSSeries(
  key: keyof typeof BLS_SERIES_MAP,
  fromYear = 2015,
  toYear = 2023,
): BLSSeries {
  const info = BLS_SERIES_MAP[key]
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i)

  const baseValues: Record<string, number> = {
    UNEMPLOYMENT_RATE: 5.2,
    UNEMPLOYMENT_BACHELORS: 2.5,
    UNEMPLOYMENT_LESS_HS: 8.1,
    MEDIAN_EARNINGS_BACHELORS: 1375,
  }

  const trends: Record<string, number> = {
    UNEMPLOYMENT_RATE: -0.15,
    UNEMPLOYMENT_BACHELORS: -0.08,
    UNEMPLOYMENT_LESS_HS: -0.2,
    MEDIAN_EARNINGS_BACHELORS: 25,
  }

  const base = baseValues[key] ?? 0
  const trend = trends[key] ?? 0

  const points = years.map((year, i) => ({
    year,
    period: 'M13', // Annual average
    value: base + trend * i + (Math.random() - 0.5) * 0.3,
  }))

  return {
    seriesID: info.id,
    label: info.label,
    unit: info.unit,
    points,
  }
}
