import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tag = searchParams.get('tag') || 'metrics'
  const secret = searchParams.get('secret') || ''
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  // Revalidate all routes
  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true, tag })
}
