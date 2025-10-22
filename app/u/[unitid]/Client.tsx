'use client';
import { useEffect, useMemo, useState } from 'react';
import { fetchSeries, APISeries } from '@/lib/series';
import { StackedArea100, LineChartInteractive, ChartControls, TransformKind } from '@/components/Charts';
import { SCHOOLS } from '@/lib/schools';

const EF_RACES = ['EF.FALL.UG.WHITE','EF.FALL.UG.BLACK','EF.FALL.UG.HISP','EF.FALL.UG.ASIAN','EF.FALL.UG.TWOORMORE','EF.FALL.UG.NONRES','EF.FALL.UG.UNKNOWN'];
const ADM = ['ADM.ADM_RATE','ADM.YIELD'];
const GR  = ['GR.GR150.TOTAL'];

function computeInsights(raceSeries: Record<string, APISeries>) {
  const span = 10;
  const bullets: string[] = [];
  try{
    const deltas = Object.entries(raceSeries).map(([k,s])=>{
      const pts = s.points.sort((a,b)=>a.year-b.year);
      const endY = pts[pts.length-1]?.year;
      const from = pts.find(p=>p.year===(endY-span)) ?? pts[0];
      const to   = pts[pts.length-1];
      const d = (to?.value??0) - (from?.value??0);
      return { k, d };
    }).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
    const top = deltas[0];
    if (top) bullets.push(`${pretty(top.k)} changed the most over ~decade: ${top.d>0?'+':''}${top.d.toFixed(1)} pts.`);
    const recentDip = Object.entries(raceSeries).map(([k,s])=>{
      const last = s.points.slice(-2);
      const d = (last[1]?.value??0) - (last[0]?.value??0);
      return {k,d};
    }).sort((a,b)=>a.d-b.d)[0];
    if (recentDip) bullets.push(`${pretty(recentDip.k)} had the largest latest YoY move: ${(recentDip.d>0?'+':'')+recentDip.d.toFixed(1)} pts.`);
  } catch {}
  return bullets;
}

function pretty(code: string){
  const map: Record<string,string> = {
    'EF.FALL.UG.WHITE':'White','EF.FALL.UG.BLACK':'Black','EF.FALL.UG.HISP':'Hispanic/Latino',
    'EF.FALL.UG.ASIAN':'Asian','EF.FALL.UG.TWOORMORE':'Two or More','EF.FALL.UG.NONRES':'Nonresident',
    'EF.FALL.UG.UNKNOWN':'Unknown',
    'ADM.ADM_RATE':'Admission Rate','ADM.YIELD':'Yield','GR.GR150.TOTAL':'Grad Rate (150%)',
  };
  return map[code] ?? code;
}

export default function Client({ unitid }: { unitid: number }) {
  const school = Object.values(SCHOOLS).find(s=>s.unitid===unitid);
  const [tab, setTab] = useState<'race'|'adm'|'out'>('race');
  const [transform, setTransform] = useState<TransformKind>('level');
  const [forecast, setForecast] = useState(3);
  const [smooth, setSmooth] = useState(true);

  const [raceSeries, setRaceSeries] = useState<APISeries[]>([]);
  const [admSeries,  setAdmSeries]  = useState<APISeries[]>([]);
  const [grSeries,   setGrSeries]   = useState<APISeries[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    setLoading(true);
    Promise.all([
      fetchSeries(EF_RACES, [unitid]),
      fetchSeries(ADM, [unitid]),
      fetchSeries(GR, [unitid]),
    ]).then(([race,adm,gr])=>{
      setRaceSeries(race); setAdmSeries(adm); setGrSeries(gr);
    }).finally(()=>setLoading(false));
  },[unitid]);

  const raceMap = useMemo(()=>Object.fromEntries(raceSeries.map(s=>[s.code, s.points])), [raceSeries]);
  const insights = useMemo(()=>computeInsights(Object.fromEntries(raceSeries.map(s=>[s.code, s]))), [raceSeries]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {school?.name ?? `UNITID ${unitid}`} {school?.isCommunityCollege ? <span title="Community College">*</span> : null}
        </h1>
        <nav className="flex gap-2 text-sm">
          <button onClick={()=>setTab('race')} className={`px-3 py-1 rounded ${tab==='race'?'bg-black text-white':'bg-gray-100'}`}>Race</button>
          <button onClick={()=>setTab('adm')}  className={`px-3 py-1 rounded ${tab==='adm' ?'bg-black text-white':'bg-gray-100'}`}>Admissions</button>
          <button onClick={()=>setTab('out')}  className={`px-3 py-1 rounded ${tab==='out' ?'bg-black text-white':'bg-gray-100'}`}>Outcomes</button>
        </nav>
      </header>

      <p className="text-gray-600 text-sm mt-1">Interactive charts • toggle transform, smoothing, and forecasts.</p>

      {loading ? <div className="mt-6">Loading…</div> : (
        <>
          {tab==='race' && (
            <>
              <ChartControls transform={transform} setTransform={setTransform} forecast={forecast} setForecast={setForecast} smooth={smooth} setSmooth={setSmooth}/>
              <div className="mt-2"><StackedArea100 byCategory={raceMap} /></div>
              {!!insights.length && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-3 text-sm">
                  <b>Insights</b>
                  <ul className="list-disc ml-6">
                    {insights.map((b,i)=><li key={i}>{b}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
          {tab==='adm' && (
            <>
              <ChartControls transform={transform} setTransform={setTransform} forecast={forecast} setForecast={setForecast} smooth={smooth} setSmooth={setSmooth}/>
              <LineChartInteractive series={admSeries} transform={transform} forecast={forecast} smooth={smooth}/>
            </>
          )}
          {tab==='out' && (
            <>
              <ChartControls transform={transform} setTransform={setTransform} forecast={forecast} setForecast={setForecast} smooth={smooth} setSmooth={setSmooth}/>
              <LineChartInteractive series={grSeries} transform={transform} forecast={forecast} smooth={smooth}/>
            </>
          )}
        </>
      )}
    </div>
  );
}
