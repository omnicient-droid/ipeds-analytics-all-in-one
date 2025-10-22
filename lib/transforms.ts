// lib/transforms.ts
export type Pt = { year: number; value: number | null }

const nz = (n: any) => (n === null || n === undefined ? null : Number(n))

export function toDiff(series: Pt[]): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < series.length; i++) {
    const cur = nz(series[i].value)
    const prev = i > 0 ? nz(series[i - 1].value) : null
    out.push({ year: series[i].year, value: cur !== null && prev !== null ? cur - prev : null })
  }
  return out
}

export function toYoYPct(series: Pt[]): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < series.length; i++) {
    const cur = nz(series[i].value)
    const prev = i > 0 ? nz(series[i - 1].value) : null
    const v = cur !== null && prev !== null && prev !== 0 ? ((cur - prev) / prev) * 100 : null
    out.push({ year: series[i].year, value: v })
  }
  return out
}

export function toCum(series: Pt[]): Pt[] {
  let acc = 0
  return series.map((p) => {
    const v = nz(p.value)
    if (v === null) return { year: p.year, value: null }
    acc += v
    return { year: p.year, value: acc }
  })
}

export function toLog10(series: Pt[]): Pt[] {
  return series.map((p) => {
    const v = nz(p.value)
    return { year: p.year, value: v !== null && v > 0 ? Math.log10(v) : null }
  })
}

export function toIndex100(series: Pt[]): Pt[] {
  const first = series.find((p) => nz(p.value) !== null)
  const base = first ? nz(first.value) : null
  return series.map((p) => {
    const v = nz(p.value)
    return { year: p.year, value: v !== null && base ? (v / base) * 100 : null }
  })
}

export type TransformKey = 'none' | 'yoy_pct' | 'diff' | 'cum' | 'log10' | 'index100'
export function applyTransform(series: Pt[], kind: TransformKey): Pt[] {
  switch (kind) {
    case 'yoy_pct':
      return toYoYPct(series)
    case 'diff':
      return toDiff(series)
    case 'cum':
      return toCum(series)
    case 'log10':
      return toLog10(series)
    case 'index100':
      return toIndex100(series)
    default:
      return series
  }
}
