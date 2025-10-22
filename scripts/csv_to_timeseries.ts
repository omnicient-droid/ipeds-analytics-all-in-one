/* eslint-disable no-console */
import fs from 'node:fs'; import path from 'node:path'; import { parse } from 'csv-parse/sync'; import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main(){ const file=process.argv[2]; if(!file){ console.error('Usage: ts-node scripts/csv_to_timeseries.ts <normalized.csv>'); process.exit(1); }
  const buf=fs.readFileSync(path.resolve(file)); const rows:any[]=parse(buf,{columns:true,skip_empty_lines:true});
  const uniMap=new Map<number,number>(); async function getUniversityId(unitid:number){ if(uniMap.has(unitid)) return uniMap.get(unitid)!; const u=await prisma.university.upsert({ where:{ unitid }, update:{}, create:{ unitid, name:`School ${unitid}` }, select:{ id:true } }); uniMap.set(unitid,u.id); return u.id; }
  const metricRows=await prisma.metric.findMany(); const metricMap=new Map<string,number>(); metricRows.forEach(m=>metricMap.set(m.code,m.id));
  let processed=0;
  for(const r of rows){ const unitid=parseInt(r.unitid,10); const year=parseInt(r.year,10); const code=String(r.metric_code); const value=parseFloat(r.value);
    if(!Number.isFinite(unitid)||!Number.isFinite(year)||!Number.isFinite(value)) continue;
    if(!metricMap.has(code)){ const m=await prisma.metric.create({ data:{ code, name: code } }); metricMap.set(code,m.id); }
    const universityId=await getUniversityId(unitid); const metricId=metricMap.get(code)!;
    await prisma.timeSeries.upsert({ where:{ universityId_metricId_year:{ universityId, metricId, year } }, update:{ value }, create:{ universityId, metricId, year, value } });
    processed++; if(processed%1000===0) process.stdout.write(`Processed ${processed}\r`);
  } console.log(`\nDone. ${processed} rows.`); }
main().finally(()=>prisma.$disconnect());
