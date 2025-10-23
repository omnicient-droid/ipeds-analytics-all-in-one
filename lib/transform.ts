export type Point = { year: number; value: number | null };

const byYear = (a: Point, b: Point) => a.year - b.year;
const clamp = (x: number) => (Number.isFinite(x) ? x : 0);

export function yoy(points: Point[]): Point[] {
  const pts = points.slice().sort(byYear);
  return pts.map((p, i) => {
    if (i === 0 || pts[i - 1].value == null || p.value == null) return { year: p.year, value: null };
    const prev = pts[i - 1].value as number, cur = p.value as number;
    return { year: p.year, value: prev === 0 ? null : ((cur - prev) / prev) * 100 };
  });
}

export function index(points: Point[], baseYear = 2015): Point[] {
  const pts = points.slice().sort(byYear);
  const base = pts.find(p => p.year === baseYear && p.value != null)?.value
            ?? pts.find(p => p.value != null)?.value
            ?? null;
  return pts.map(p => ({ year: p.year, value: p.value == null || base == null ? null : (p.value / base) * 100 }));
}

export function movingAvg(points: Point[], window = 3): Point[] {
  const pts = points.slice().sort(byYear);
  return pts.map((_, i) => {
    const slice = pts.slice(Math.max(0, i - window + 1), i + 1).map(s => s.value).filter(v => v != null) as number[];
    return { year: pts[i].year, value: slice.length ? clamp(slice.reduce((a, b) => a + b, 0) / slice.length) : null };
  });
}

/** Category -> series map → per-year shares (0..1) for stacked 100% charts. */
export function toShares(byCategory: Record<string, Point[]>): Record<string, Point[]> {
  const years = Array.from(new Set(Object.values(byCategory).flatMap(s => s.map(p => p.year)))).sort((a, b) => a - b);
  const out: Record<string, Point[]> = {};
  for (const k of Object.keys(byCategory)) out[k] = [];

  for (const y of years) {
    const vals: Record<string, number | null> = {};
    for (const [k, arr] of Object.entries(byCategory)) {
      vals[k] = arr.find(p => p.year === y)?.value ?? null;
    }
    const sum = Object.values(vals).reduce<number>((acc, v) => acc + (v ?? 0), 0);
    for (const [k, v] of Object.entries(vals)) {
      out[k].push({ year: y, value: sum > 0 && v != null ? v / sum : null });
    }
  }
  return out;
}

export function years(points: Point[]): { min: number; max: number } {
  if (!points.length) return { min: NaN, max: NaN };
  const ys = points.map(p => p.year);
  return { min: Math.min(...ys), max: Math.max(...ys) };
}
