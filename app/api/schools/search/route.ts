import { prisma } from '@/lib/db'; import { NextResponse } from 'next/server';
export async function GET(req:Request){
  const { searchParams } = new URL(req.url); const q=(searchParams.get('q')||'').trim(); let results;
  if(!q) results=await prisma.university.findMany({ take:20, orderBy:{ name:'asc' } });
  else results=await prisma.university.findMany({ where:{ name:{ contains:q, mode:'insensitive' } }, take:50, orderBy:{ name:'asc' } });
  return NextResponse.json({ results });
}
