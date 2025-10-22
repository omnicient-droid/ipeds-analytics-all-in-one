import { NextRequest } from 'next/server';

// POST body: { series: [{ code, unitid, label, unit, points: [{year,value}] }...] }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  if (!body?.series || !Array.isArray(body.series)) {
    return new Response(JSON.stringify({ ok:false, error:'POST JSON with { series: [...] }' }), { status: 400 });
  }
  const rows: string[] = [];
  rows.push(['code','unitid','label','unit','year','value'].join(','));
  for (const s of body.series) {
    if (!s?.points) continue;
    for (const p of s.points) {
      rows.push([s.code, s.unitid, JSON.stringify(s.label), s.unit, String(p.year), String(p.value)].join(','));
    }
  }
  const csv = rows.join('\n');
  return new Response(csv, {
    headers: {
      'content-type':'text/csv; charset=utf-8',
      'content-disposition':'attachment; filename="series.csv"'
    }
  });
}

// Optional: GET with guidance
export async function GET() {
  return new Response('POST JSON { series: [...] } to this endpoint to receive CSV.', { status: 200 });
}
