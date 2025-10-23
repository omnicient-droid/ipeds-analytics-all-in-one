import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const metrics = await prisma.metric.findMany({
  select: { code: true, name: true },
  orderBy: { code: 'asc' },
})

const grouped = metrics.reduce((acc, m) => {
  const prefix = m.code.split('.')[0]
  if (!acc[prefix]) acc[prefix] = []
  acc[prefix].push(m)
  return acc
}, {})

console.log('Available metric categories:\n')
Object.entries(grouped).forEach(([prefix, metricList]) => {
  console.log(`${prefix} (${metricList.length} metrics):`)
  metricList.slice(0, 8).forEach((m) => console.log(`  - ${m.code}: ${m.name}`))
  if (metricList.length > 8) console.log(`  ... and ${metricList.length - 8} more`)
  console.log('')
})

await prisma.$disconnect()
