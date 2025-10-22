'use client';
import { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Brush,
  AreaChart, Area
} from 'recharts';
import type { APISeries } from '@/lib/series';
import { yoy, index, movingAvg, toShares, Point } from '@/lib/transform';
import { linForecast } from '@/lib/forecast';

export type TransformKind = 'level'|'yoy'|'index';

export function ChartControls(props: {
  transform: TransformKind; setTransform: (v:TransformKind)=>void;
  forecast: number; setForecast:(n:number)=>void;
  smooth: boolean; setSmooth:(b:boolean)=>void;
}) {
  const { transform, setTransform, forecast, setForecast, smooth, setSmooth } = props;
  return (
    <div className="flex flex-wrap gap-3 my-3 text-sm">
      <label className="flex items-center gap-2">Transform:
        <select value={transform} onChange={e=>setTransform(e.target.value as TransformKind)} className="border rounded px-2 py-1">
          <option value="level">Level</option>
          <option value="yoy">YoY %</option>
          <option value="index">Index (2015=100)</option>
        </select>
      </label>
      <label className="flex items-center gap-2">Forecast:
        <select value={forecast} onChange={e=>setForecast(parseInt(e.target.value))} className="border rounded px-2 py-1">
          <option value="0">Off</option>
          <option value="2">2y</option>
          <option value="3">3y</option>
          <option value="5">5y</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={smooth} onChange={e=>setSmooth(e.target.checked)}/>
        Smooth (3-yr)
      </label>
    </div>
  );
}

function buildLines(series: APISeries[], transform: TransformKind, forecast: number, smooth:boolean) {
  return series.map(s=>{
    let pts: Point[] = s.points;
    if (transform==='yoy') pts = yoy(pts);
    if (transform==='index') pts = index(pts, 2015);
    if (smooth) pts = movingAvg(pts, 3);

    let proj: Point[] = [];
    if (forecast>0) proj = linForecast(s.points, forecast);

    return { ...s, pts, proj };
  });
}

export function LineChartInteractive(props: { series: APISeries[], transform: TransformKind, forecast: number, smooth:boolean }) {
  const lines = useMemo(()=>buildLines(props.series, props.transform, props.forecast, props.smooth), [props.series, props.transform, props.forecast, props.smooth]);
  const years = Array.from(new Set(lines.flatMap(l=>l.pts.map(p=>p.year).concat(l.proj.map(p=>p.year))))).sort((a,b)=>a-b);
  const data = years.map(y=>{
    const row: any = { year: y };
    for (const l of lines) {
      const v = l.pts.find(p=>p.year===y)?.value ?? null;
      row[l.label || l.code] = v;
      const pv = l.proj.find(p=>p.year===y)?.value;
      if (pv!=null) row[(l.label || l.code)+' (proj)'] = pv;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart data={data} margin={{ top:5, right:25, left:10, bottom:5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis />
        <Tooltip formatter={(v:any, n:any)=>[typeof v==='number'? v.toFixed(2):v, n]} />
        <Legend />
        {Object.keys(data[0]||{}).filter(k=>k!=='year').map((k,i)=>(
          <Line key={k} type="monotone" dataKey={k} strokeWidth={2} dot={false} strokeOpacity={k.endsWith('(proj)')?0.7:1} strokeDasharray={k.endsWith('(proj)')?'6 4':undefined}/>
        ))}
        <Brush dataKey="year" height={18} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StackedArea100(props: { byCategory: Record<string, Point[]> }) {
  const shares = useMemo(()=>toShares(props.byCategory), [props.byCategory]);
  const cats = Object.keys(shares);
  const years = Array.from(new Set(Object.values(shares)[0]?.map(p=>p.year) || [])).sort((a,b)=>a-b);
  const data = years.map(y=>{
    const row: any = { year:y };
    for (const c of cats) row[c] = shares[c].find(p=>p.year===y)?.value ?? null;
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={380}>
      <AreaChart data={data} stackOffset="expand" margin={{ top:5, right:25, left:10, bottom:5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis tickFormatter={(v)=>`${(v*100).toFixed(0)}%`} />
        <Tooltip formatter={(v:any, n:any)=>[typeof v==='number'? (v*100).toFixed(1)+'%':v, n]} />
        <Legend />
        {cats.map((c,i)=>(
          <Area key={c} type="monotone" dataKey={c} stackId="1" strokeWidth={1.5} dot={false}/>
        ))}
        <Brush dataKey="year" height={18} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
