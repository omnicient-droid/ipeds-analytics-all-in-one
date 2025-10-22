'use client'; import { useEffect, useState } from 'react'; import TimeSeriesChart from '@/components/Chart'; import TransformControls, { TransformKind } from '@/components/TransformControls';
type SeriesPoint={year:number;value:number}; type Metric={code:string;name:string;unit?:string|null};
type ApiResp={ university:{unitid:number;name:string;city?:string|null;state?:string|null}; availableMetrics:Metric[]; series:{metric:Metric;data:SeriesPoint[];trend:{slope:number;intercept:number;r2:number}}[]; };
export default function SchoolDetail({ params }:{ params:{ unitid: string } }){
  const [codes,setCodes]=useState<string[]>(['UG_ENROLL_TOTAL']); const [transform,setTransform]=useState<TransformKind>('none'); const [showTrend,setShowTrend]=useState(true); const [resp,setResp]=useState<ApiResp|null>(null);
  useEffect(()=>{ const p=new URLSearchParams(); if(codes.length) p.set('codes',codes.join(',')); if(transform!=='none') p.set('transform',transform); fetch(`/api/schools/${params.unitid}/metrics?`+p.toString()).then(r=>r.json()).then(setResp); },[params.unitid,codes,transform]);
  const metrics=resp?.availableMetrics??[];
  return (<div><h1>{resp?.university?.name??'School'}</h1><p style={{color:'#666'}}>{resp?.university?.city}{resp?.university?.state?`, ${resp?.university?.state}`:''} (unitid {params.unitid})</p>
    <div style={{margin:'12px 0'}}><label>Metrics:</label>{' '}
      <select multiple value={codes} onChange={e=>{const v=Array.from(e.target.selectedOptions).map(o=>o.value); setCodes(v);}} style={{minWidth:320,padding:6}}>
        {metrics.map(m=><option key={m.code} value={m.code}>{m.name}</option>)}
      </select>
    </div>
    <TransformControls defaultTransform="none" onChange={setTransform} onToggleTrend={setShowTrend} />
    <div style={{marginTop:16,display:'grid',gap:24}}>
      {(resp?.series??[]).map(s=>(<div key={s.metric.code}><TimeSeriesChart series={s.data} title={`${s.metric.name}${transform!=='none'?` — ${transform}`:''}`} unit={s.metric.unit??undefined} showTrend={showTrend} trend={s.trend} /></div>))}
    </div>
  </div>);
}
