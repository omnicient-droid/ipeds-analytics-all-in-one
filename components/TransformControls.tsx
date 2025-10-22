'use client';
import { useState } from 'react';
export type TransformKind='none'|'log'|'d1'|'d2'|'integral';
export default function TransformControls({onChange,defaultTransform='none',onToggleTrend}:{onChange:(t:TransformKind)=>void;defaultTransform?:TransformKind;onToggleTrend?:(b:boolean)=>void;}){
  const [t,setT]=useState<TransformKind>(defaultTransform); const [trend,setTrend]=useState(true);
  return (<div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
    <label>Transform:</label>
    <select value={t} onChange={e=>{const v=e.target.value as TransformKind; setT(v); onChange(v);}}>
      <option value="none">None</option><option value="log">Log</option><option value="d1">1st derivative</option><option value="d2">2nd derivative</option><option value="integral">Integral</option>
    </select>
    <label style={{marginLeft:16}}><input type="checkbox" checked={trend} onChange={e=>{setTrend(e.target.checked); onToggleTrend?.(e.target.checked);}}/> Show trend line</label>
  </div>);
}
