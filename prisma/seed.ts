import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const years = Array.from({ length: 12 }, (_, i) => 2013 + i);
async function main() {
  const u1 = await prisma.university.upsert({ where:{ unitid:110635 }, update:{}, create:{ unitid:110635, name:'University of California-Berkeley', city:'Berkeley', state:'CA' } });
  const u2 = await prisma.university.upsert({ where:{ unitid:170976 }, update:{}, create:{ unitid:170976, name:'Harvard University', city:'Cambridge', state:'MA' } });
  const m1 = await prisma.metric.upsert({ where:{ code:'UG_ENROLL_TOTAL' }, update:{}, create:{ code:'UG_ENROLL_TOTAL', name:'Undergraduate enrollment (total)', unit:'students' } });
  const m2 = await prisma.metric.upsert({ where:{ code:'UG_ENROLL_FEMALE' }, update:{}, create:{ code:'UG_ENROLL_FEMALE', name:'Undergraduate enrollment (female)', unit:'students' } });
  function gen(base:number, drift:number){ return years.map((_,i)=>(base+drift*i)*(0.97+Math.random()*0.06)); }
  const u1Enroll=gen(31000,400), u1Female=gen(16000,250), u2Enroll=gen(7200,90), u2Female=gen(3600,45);
  const ops:any[]=[]; years.forEach((year,i)=>{
    ops.push(
      prisma.timeSeries.upsert({ where:{ universityId_metricId_year:{ universityId:u1.id, metricId:m1.id, year } }, update:{ value:u1Enroll[i] }, create:{ universityId:u1.id, metricId:m1.id, year, value:u1Enroll[i] } }),
      prisma.timeSeries.upsert({ where:{ universityId_metricId_year:{ universityId:u1.id, metricId:m2.id, year } }, update:{ value:u1Female[i] }, create:{ universityId:u1.id, metricId:m2.id, year, value:u1Female[i] } }),
      prisma.timeSeries.upsert({ where:{ universityId_metricId_year:{ universityId:u2.id, metricId:m1.id, year } }, update:{ value:u2Enroll[i] }, create:{ universityId:u2.id, metricId:m1.id, year, value:u2Enroll[i] } }),
      prisma.timeSeries.upsert({ where:{ universityId_metricId_year:{ universityId:u2.id, metricId:m2.id, year } }, update:{ value:u2Female[i] }, create:{ universityId:u2.id, metricId:m2.id, year, value:u2Female[i] } }),
    );
  });
  await Promise.all(ops);
  console.log('Seed complete.');
}
main().finally(()=>prisma.$disconnect());
