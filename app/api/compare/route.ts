import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const unitids = (sp.get('unitids') || '')
    .split(',')
    .map(s => Number(s.trim()))
    .filter(Boolean);
  const codes = (sp.get('codes') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const from = sp.get('from') ? Number(sp.get('from')) : undefined;
  const to   = sp.get('to')   ? Number(sp.get('to'))   : undefined;

  if (!unitids.length || !codes.length) {
    return NextResponse.json({ error: 'unitids and codes required' }, { status: 400 });
  }

  const unis = await prisma.university.findMany({
    where: { unitid: { in: unitids } },
    select: { id: true, unitid: true, name: true },
  });
  const metrics = await prisma.metric.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true, name: true, unit: true },
  });

  const mapUniById = new Map(unis.map(u => [u.id, u]));
  const mapMetricById = new Map(metrics.map(m => [m.id, m]));

  const where: any = { universityId: { in: unis.map(u => u.id) }, metricId: { in: metrics.map(m => m.id) } };
  if (from !== undefined || to !== undefined) {
    where.year = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }

  const rows = await prisma.timeSeries.findMany({
    where,
    orderBy: [{ metricId: 'asc' }, { universityId: 'asc' }, { year: 'asc' }],
    select: { universityId: true, metricId: true, year: true, value: true },
  });

  // Coerce Decimal|null -> number
  const flat = rows.map(r => ({
    unitid: mapUniById.get(r.universityId)?.unitid ?? 0,
    code: mapMetricById.get(r.metricId)?.code ?? '',
    year: r.year,
    value: Number(r.value ?? 0),
  }));

  // Structure: { [code]: { [unitid]: [{year,value}...] } }
  const out: Record<string, Record<number, { year: number; value: number }[]>> = {};
  for (const r of flat) {
    if (!out[r.code]) out[r.code] = {};
    (out[r.code][r.unitid] ||= []).push({ year: r.year, value: r.value });
  }

  return NextResponse.json({ universities: unis, metrics, data: out });
}
