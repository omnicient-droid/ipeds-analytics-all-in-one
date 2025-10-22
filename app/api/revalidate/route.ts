import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get('tag') || 'metrics';
  const secret = searchParams.get('secret') || '';
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok:false, error:'Unauthorized' }, { status: 401 });
  }
  revalidateTag(tag);
  return NextResponse.json({ ok:true, tag });
}
