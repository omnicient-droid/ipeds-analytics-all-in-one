import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE = 'https://nces.ed.gov/ipeds/datacenter/data/';

function efCandidates(year: number): string[] {
  const y = String(year);
  return [
    `EF${y}_RV.zip`,
    `EF${y}.zip`,
    `ef${y}_rv.zip`,
    `ef${y}.zip`,
  ].map(f => BASE + f);
}

async function downloadFile(url: string, outPath: string) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; IPEDSFetcher/1.0; +http://localhost)',
      'Accept': '*/*',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  await fs.promises.writeFile(outPath, buf);
}

function spawnTsNode(scriptRelPath: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', scriptRelPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${scriptRelPath} failed: ${code}`)));
  });
}

async function ingestZip(absZipPath: string) {
  await spawnTsNode('scripts/ipeds_ingest_from_zip.ts', [absZipPath, 'EF']);
}

async function buildAggregatesIfPresent() {
  const aggPath = path.join(process.cwd(), 'scripts', 'build_race_aggregates.ts');
  if (fs.existsSync(aggPath)) {
    await spawnTsNode('scripts/build_race_aggregates.ts', []);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { startYear, endYear } = await req.json();
    const start = Number(startYear);
    const end = Number(endYear);
    if (!start || !end || end < start) {
      return NextResponse.json({ error: 'Provide startYear and endYear (e.g., 1980, 2024).' }, { status: 400 });
    }

    const results: { year: number; url?: string; file?: string; status: string }[] = [];

    for (let y = start; y <= end; y++) {
      let ok = false;
      let lastErr: string | undefined;

      for (const url of efCandidates(y)) {
        try {
          const fileName = path.basename(new URL(url).pathname);
          const saveAs = path.join(process.cwd(), 'data', 'ipeds-zips', fileName);
          await downloadFile(url, saveAs);
          await ingestZip(saveAs);
          results.push({ year: y, url, file: fileName, status: 'ok' });
          ok = true;
          break;
        } catch (e: any) {
          lastErr = String(e?.message || e);
        }
      }

      if (!ok) {
        results.push({ year: y, status: `no EF zip found (${lastErr})` });
      }
    }

    await buildAggregatesIfPresent();

    return NextResponse.json({ ok: true, fetched: results });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
