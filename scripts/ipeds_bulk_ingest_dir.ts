/* eslint-disable no-console */
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
const root=process.argv[2]; const componentHint=process.argv[3]||'';
if(!root){ console.error('Usage: npm run ingest:ipeds:dir -- <folder-with-zips> [COMPONENT_HINT]'); process.exit(1); }
const files=fs.readdirSync(root).filter(f=>f.toLowerCase().endsWith('.zip'));
async function runOne(zipPath:string){ return new Promise<void>((resolve,reject)=>{ const p=spawn(process.execPath,['-r','ts-node/register/transpile-only',path.join(process.cwd(),'scripts/ipeds_ingest_from_zip.ts'),zipPath,componentHint],{stdio:'inherit'}); p.on('exit',c=>c===0?resolve():reject(new Error(`ingest failed for ${zipPath}`))); }); }
(async()=>{ for(const f of files){ const full=path.join(root,f); console.log(`\n=== Ingesting ${full} ===`); try{ await runOne(full); } catch(e){ console.error(e); } } })();
