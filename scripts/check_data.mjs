// Check ingested data
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkData() {
  const count = await prisma.timeSeries.count({
    where: {
      metric: {
        code: { startsWith: 'EF.' },
      },
    },
  })
  console.log('Total EF data points:', count)

  const schools = await prisma.university.findMany({
    where: {
      unitid: { in: [190150, 199120, 166027, 110635, 122977, 135726, 134130] },
    },
    select: {
      unitid: true,
      name: true,
      _count: { select: { timeSeries: true } },
    },
    orderBy: { unitid: 'asc' },
  })

  console.log('\nSchools with data:')
  schools.forEach((s) => {
    console.log(`  ${s.unitid} - ${s.name}: ${s._count.timeSeries} data points`)
  })

  // Sample data from Columbia
  const sample = await prisma.timeSeries.findMany({
    where: {
      university: { unitid: 190150 },
      metric: { code: { startsWith: 'EF.FALL.UG' } },
    },
    include: {
      metric: { select: { code: true, name: true } },
    },
    orderBy: [{ metric: { code: 'asc' } }, { year: 'desc' }],
    take: 20,
  })

  console.log('\nSample data from Columbia (recent years):')
  sample.forEach((d) => {
    console.log(`  ${d.year} ${d.metric.code}: ${d.value}`)
  })

  await prisma.$disconnect()
}

checkData().catch(console.error)
