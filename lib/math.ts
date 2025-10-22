export type SeriesPoint = { year: number; value: number };
export function toSorted(series: SeriesPoint[]) { return [...series].sort((a,b)=>a.year-b.year); }
export function logTransform(series: SeriesPoint[]) { return toSorted(series).filter(p=>p.value>0).map(p=>({year:p.year,value:Math.log(p.value)})); }
export function derivative(series: SeriesPoint[], order:1|2=1){ const s=toSorted(series); if(s.length<3) return []; const out:SeriesPoint[]=[];
  for(let i=1;i<s.length-1;i++){ if(order===1){ const dy=(s[i+1].value-s[i-1].value)/(s[i+1].year-s[i-1].year); out.push({year:s[i].year,value:dy}); }
  else { const dy1=(s[i+1].value-s[i].value)/(s[i+1].year-s[i].year); const dy0=(s[i].value-s[i-1].value)/(s[i].year-s[i-1].year); const ddy=(dy1-dy0)/((s[i+1].year-s[i-1].year)/2); out.push({year:s[i].year,value:ddy}); } } return out; }
export function integral(series: SeriesPoint[]){ const s=toSorted(series); if(s.length<2) return []; const out:SeriesPoint[]=[{year:s[0].year,value:0}]; let cum=0;
  for(let i=1;i<s.length;i++){ const dx=s[i].year-s[i-1].year; const area=0.5*(s[i].value+s[i-1].value)*dx; cum+=area; out.push({year:s[i].year,value:cum}); } return out; }
export function olsTrend(series: SeriesPoint[]){ const s=toSorted(series); const n=s.length; if(n<2) return {slope:0,intercept:s[0]?.value??0,r2:0};
  const xs=s.map(p=>p.year), ys=s.map(p=>p.value); const mx=xs.reduce((a,b)=>a+b,0)/n, my=ys.reduce((a,b)=>a+b,0)/n;
  let num=0,den=0; for(let i=0;i<n;i++){ num+=(xs[i]-mx)*(ys[i]-my); den+=(xs[i]-mx)**2; }
  const slope=den===0?0:num/den; const intercept=my-slope*mx;
  const ssTot=ys.reduce((acc,y)=>acc+(y-my)**2,0); const ssRes=ys.reduce((acc,y,i)=>acc+(y-(slope*xs[i]+intercept))**2,0);
  const r2=ssTot===0?1:1-ssRes/ssTot; return {slope,intercept,r2}; }
