import { prisma } from '@/lib/db'; import { NextResponse } from 'next/server'; import { derivative, integral, logTransform, olsTrend } from '@/lib/math';
export async function GET(req:Request,{ params }:{ params:{ unitid:string } }){
  const { searchParams } = new URL(req.url);
  const codesParam = searchParams.get('codes');
  const transform = (searchParams.get('transform') || 'none') as 'none'|'log'|'d1'|'d2'|'integral';
  const unitid = parseInt(params.unitid,10);

  const university = await prisma.university.findUnique({ where:{ unitid }, select:{ id:true, unitid:true, name:true, city:true, state:true } });
  if(!university) return NextResponse.json({ error:'not found' }, { status:404 });

  const availableMetrics = await prisma.metric.findMany({ orderBy:{ name:'asc' } });
  const codes = codesParam ? codesParam.split(',').map(s=>s.trim()).filter(Boolean) : (availableMetrics.length?[availableMetrics[0].code]:[]);
  const metrics = await prisma.metric.findMany({ where:{ code:{ in: codes } } });

  const series = await Promise.all(metrics.map(async (m)=>{
    const rows = await prisma.timeSeries.findMany({ where:{ universityId: university.id, metricId: m.id }, orderBy:{ year:'asc' }, select:{ year:true, value:true } });
    let data = rows.map(r=>({ year:r.year, value:r.value }));
    switch(transform){ case 'log': data = logTransform(data); break; case 'd1': data = derivative(data,1); break; case 'd2': data = derivative(data,2); break; case 'integral': data = integral(data); break; }
    const trend = olsTrend(data); return { metric:{ code:m.code, name:m.name, unit:m.unit }, data, trend };
  }));
  return NextResponse.json({ university, availableMetrics: availableMetrics.map(m=>({ code:m.code, name:m.name, unit:m.unit })), series });
}
