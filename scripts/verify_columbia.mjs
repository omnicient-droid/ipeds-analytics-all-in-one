// scripts/verify_columbia.mjs
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const uni = await p.university.findFirst({
  where: { unitid: 190150 },
  select: { id: true, unitid: true, name: true },
})
console.log('University:', uni)

const metric = await p.metric.findUnique({
  where: { code: 'SC.ADM.RATE' },
  select: { id: true },
})
if (!metric || !uni) {
  console.log('Missing metric or university')
  process.exit(0)
}
const rows = await p.timeSeries.findMany({
  where: { universityId: uni.id, metricId: metric.id },
  orderBy: { year: 'asc' },
  select: { year: true, value: true },
})
console.log('Admission rate (first 10):', rows.slice(0, 10))
await p.$disconnect()
