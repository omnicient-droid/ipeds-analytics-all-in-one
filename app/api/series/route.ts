import { NextRequest, NextResponse } from 'next/server';
import { buildEfSeriesPayload, buildAdmissionsSeriesPayload, buildGradRatesSeriesPayload } from '@/lib/urban';
export const revalidate = 3600;
const list = (v?:string|null)=> v? v.split(',').map(s=>s.trim()).filter(Boolean):[];
export async function GET(req: NextRequest){
  const sp = new URL(req.url).searchParams;
  const codes = list(sp.get('codes'));
  const unitids = list(sp.get('unitids')).map(Number);
  const from = sp.get('from')? +sp.get('from')! : undefined;
  const to   = sp.get('to')  ? +sp.get('to')!   : undefined;
  if(!codes.length || !unitids.length) return NextResponse.json({ok:false,error:'Provide ?codes=…&unitids=…'},{status:400});
  try{
    const ef  = codes.some(c=>c.startsWith('EF.'))  ? await buildEfSeriesPayload(unitids, codes.filter(c=>c.startsWith('EF.')) as any, {from,to}) : [];
    const adm = codes.some(c=>c.startsWith('ADM.')) ? await buildAdmissionsSeriesPayload(unitids, codes.filter(c=>c.startsWith('ADM.')), {from,to}) : [];
    const gr  = codes.some(c=>c.startsWith('GR.'))  ? await buildGradRatesSeriesPayload(unitids, codes.filter(c=>c.startsWith('GR.')), {from,to}) : [];
    return NextResponse.json({ ok:true, series:[...ef, ...adm, ...gr] });
  }catch(e:any){ return NextResponse.json({ok:false,error:String(e?.message||e)},{status:500}); }
}
