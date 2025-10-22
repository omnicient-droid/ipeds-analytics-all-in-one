import type { Point } from './transform';

export function linForecast(points: Point[], horizon = 3): Point[] {
  const clean = points.filter(p=>p.value!=null).slice(-8);
  if (clean.length < 4) return [];
  const xs = clean.map((_,i)=>i+1);
  const ys = clean.map(p=>p.value as number);
  const n = xs.length;
  const sx = xs.reduce((a,b)=>a+b,0), sy = ys.reduce((a,b)=>a+b,0);
  const sxx = xs.reduce((a,b)=>a+b*b,0), sxy = xs.reduce((a,b,i)=>a+b*ys[i],0);
  const denom = n*sxx - sx*sx; if (!denom) return [];
  const m = (n*sxy - sx*sy)/denom, b = (sy - m*sx)/n;

  const lastYear = points.map(p=>p.year).sort((a,b)=>a-b).slice(-1)[0] ?? (new Date().getFullYear());
  const proj: Point[] = [];
  for (let i=1;i<=horizon;i++){
    const x = n + i;
    const v = Math.max(0, m*x + b);
    proj.push({ year: lastYear + i, value: v });
  }
  return proj;
}
