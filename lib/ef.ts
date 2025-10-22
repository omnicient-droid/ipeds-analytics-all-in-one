// lib/ef.ts
import { prisma } from "./db";

export type Pt = { year: number; value: number };
export type SeriesMap = Record<string, Pt[]>;

/** Convert Prisma Decimal | number | string | null -> number (safe 0 fallback) */
function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  // Prisma Decimal has toNumber()
  const any = v as any;
  if (any && typeof any.toNumber === "function") {
    const n = any.toNumber();
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Pull all EF.* series for a UNITID as clean numbers. */
export async function getEfSeriesByUnitId(unitid: number): Promise<{
  university: { id: number; unitid: number; name: string | null } | null;
  series: SeriesMap;
}> {
  const uni = await prisma.university.findFirst({
    where: { unitid },
    select: { id: true, unitid: true, name: true },
  });
  if (!uni) return { university: null, series: {} };

  const efMetrics = await prisma.metric.findMany({
    where: { code: { startsWith: "EF." } },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
  });

  const byId = new Map(efMetrics.map((m) => [m.id, m.code]));

  const rows = efMetrics.length
    ? await prisma.timeSeries.findMany({
        where: {
          universityId: uni.id,
          metricId: { in: efMetrics.map((m) => m.id) },
        },
        orderBy: [{ metricId: "asc" }, { year: "asc" }],
        select: { metricId: true, year: true, value: true },
      })
    : [];

  const series: SeriesMap = {};
  for (const r of rows) {
    const code = byId.get(r.metricId);
    if (!code) continue;
    (series[code] ||= []).push({ year: r.year, value: toNum(r.value) });
  }

  return { university: uni, series };
}

/** Your preferred display order (we’ll append any other EF.* codes after these) */
export const EF_DISPLAY_ORDER = [
  "EF.EFYTOTL",
  "EF.EFWHITT",
  "EF.EFBKAAT",
  "EF.EFHISPT",
  "EF.EFASIAT",
  "EF.EFAIANT",
  "EF.EFNHPI",
  "EF.EF2MORT",
  "EF.EFNRALT",
  "EF.EFUNKNT",
];
