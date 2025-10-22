import { NextResponse } from 'next/server'; import { prisma } from '@/lib/db'; import fs from 'node:fs/promises'; import path from 'node:path'; import pdfParse from 'pdf-parse'; import { parse as csvParse } from 'csv-parse/sync';
export const runtime='nodejs';
function storageDir(){ return process.env.STORAGE_DIR || path.join(process.cwd(),'uploads'); }
async function ensureDir(p:string){ await fs.mkdir(p,{recursive:true}); }
export async function POST(req:Request){
  const form=await req.formData(); const files=form.getAll('files') as File[]; const unitidRaw=form.get('unitid'); const unitid=unitidRaw?parseInt(String(unitidRaw),10):undefined;
  if(!files?.length) return NextResponse.json({error:'no files'},{status:400});
  const dir=storageDir(); await ensureDir(dir);
  let saved=0;
  for(const file of files){
    const ab=await file.arrayBuffer(); const buf=Buffer.from(ab); const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'); const stamp=Date.now(); const storagePath=path.join(dir,`${stamp}-${safe}`); await fs.writeFile(storagePath,buf);
    let textContent: string | undefined;
    if(file.type==='application/pdf'){ try{ textContent=(await pdfParse(buf)).text.slice(0,250000); }catch{} }
    else if(file.type==='text/csv' || file.name.toLowerCase().endsWith('.csv')){ try{ textContent=JSON.stringify(csvParse(buf,{columns:true,skip_empty_lines:true}).slice(0,10)); }catch{} }
    // await prisma.upload.create({ data:{ universityId: unitid?(await prisma.university.findUnique({where:{unitid}}))?.id:undefined, originalFilename:file.name, mimeType:file.type||'application/octet-stream', size:buf.length, storagePath, textContent } });
    saved++;
  }
  return NextResponse.json({ saved });
}
