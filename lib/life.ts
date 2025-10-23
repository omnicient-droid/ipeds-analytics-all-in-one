import type { APISeries } from './series'
import zipMap from '@/data/zip-by-unitid.json'

export type LifeSeries = APISeries

// Optionally configurable external API. If not provided, we return a demo series
// approximating USALEEP window (2010–2015) as a flat line for visualization only.
const LIFE_API_BASE = process.env.NEXT_PUBLIC_LIFE_API_BASE || ''

export function getZipForUnit(unitid: number): string | undefined {
  const z = (zipMap as Record<string, string>)[String(unitid)]
  return z
}

export async function fetchLifeByZip(zip: string): Promise<LifeSeries | null> {
  // If an external API is configured, try it (GET {base}/life?zip=XXXXX)
  if (LIFE_API_BASE) {
    try {
      const url = `${LIFE_API_BASE.replace(/\/$/, '')}/life?zip=${encodeURIComponent(zip)}`
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        // Expecting shape: { label: string, unit?: string, points: {year:number, value:number}[] }
        const label = json.label || `Life Expectancy (ZIP ${zip})`
        const unit = json.unit || 'years'
        const points = Array.isArray(json.points) ? json.points : []
        return {
          code: 'HE.LE.ZIP',
          unitid: 0,
          label,
          unit,
          points,
          source: 'External',
        }
      }
    } catch (e) {
      // fall through to demo
      console.warn('[life] external API failed; using demo fallback')
    }
  }

  // Demo fallback: flat series 2010–2015 with a plausible metro value
  const base = estimateZipBaseline(zip)
  const points = Array.from({ length: 6 }).map((_, i) => ({ year: 2010 + i, value: base }))
  const label = `Life Expectancy (ZIP ${zip})`
  return { code: 'HE.LE.ZIP', unitid: 0, label, unit: 'years', points, source: 'Demo' }
}

function estimateZipBaseline(zip: string): number {
  // Very naive heuristic by the first digit region to keep visuals reasonable
  const d = zip[0]
  switch (d) {
    case '0':
    case '1':
      return 82
    case '2':
    case '3':
      return 80
    case '4':
    case '5':
      return 79.5
    case '6':
      return 79
    case '7':
      return 78.5
    case '8':
      return 78
    case '9':
      return 79
    default:
      return 79.5
  }
}
