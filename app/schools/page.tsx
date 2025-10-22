'use client'; import { useEffect, useState } from 'react'; import Link from 'next/link';
type School={id:number;unitid:number;name:string;city?:string|null;state?:string|null};
export default function SchoolsPage(){
  const [q,setQ]=useState(''); const [results,setResults]=useState<School[]>([]);
  useEffect(()=>{ const t=setTimeout(async ()=>{ const p=new URLSearchParams(); if(q) p.set('q',q); const res=await fetch('/api/schools/search?'+p.toString()); const data=await res.json(); setResults(data.results); },300); return ()=>clearTimeout(t); },[q]);
  return (<div><h1>Find a school</h1><input type="text" placeholder="Search by name..." value={q} onChange={e=>setQ(e.target.value)} style={{padding:8,width:'100%',maxWidth:500}}/>
  <ul>{results.map(s=>(<li key={s.id} style={{marginTop:8}}><Link href={`/schools/${s.unitid}`}>{s.name}{s.city?` — ${s.city}, ${s.state??''}`:''}</Link></li>))}</ul></div>);
}
