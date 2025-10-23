'use client';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
export type SeriesPoint = { year: number; value: number };
export default function TimeSeriesChart({ series, title, unit, showTrend, trend }:{ series:SeriesPoint[], title:string, unit?:string, showTrend?:boolean, trend?:{slope:number;intercept:number;r2:number} }){
  const labels=series.map(p=>p.year.toString()); const dataVals=series.map(p=>p.value);
  const datasets:any[]=[{label:title,data:dataVals}];
  if(showTrend&&trend){ const xs=series.map(p=>p.year); const tv=xs.map(x=>trend.slope*x+trend.intercept); datasets.push({label:`Trend (R²=${trend.r2.toFixed(3)})`,data:tv,borderDash:[6,6],pointRadius:0}); }
  const data={labels,datasets};
  const options={responsive:true,plugins:{legend:{position:'top' as const},title:{display:true,text:unit?`${title} (${unit})`:title},tooltip:{intersect:false,mode:'index' as const}},interaction:{mode:'index' as const,intersect:false},scales:{x:{title:{display:true,text:'Year'}},y:{title:{display:true,text:unit??''}}}};
  return <Line options={options as any} data={data} />;
}
