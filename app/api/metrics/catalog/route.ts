import { NextResponse } from 'next/server'
import { buildCatalog } from '@/lib/catalog'

export const revalidate = 3600

export async function GET() {
  const catalog = buildCatalog()
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    const codes = catalog.map((c) => c.code)
    const present = await prisma.metric.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    })
    const presentSet = new Set(present.map((m) => m.code))
    const enriched = catalog.map((c) => ({ ...c, hasData: presentSet.has(c.code) }))
    await prisma.$disconnect()
    return NextResponse.json({ ok: true, metrics: enriched })
  } catch (e) {
    // If DB lookup fails, still return the catalog skeleton
    return NextResponse.json({ ok: true, metrics: catalog.map((c) => ({ ...c, hasData: false })) })
  }
}
