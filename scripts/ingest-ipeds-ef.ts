import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SCHOOLS } from '../lib/schools';
import { METRICS, RACE_ORDER } from '../lib/metrics';

const OUT_DIR = path.join(process.cwd(), 'data', 'series');
const URBAN_API_BASE = process.env.URBAN_API_BASE || 'https://educationdata.urban.org/api/v1/college-university/ipeds';

// Minimal shape for stored series
type Point = { year: number; value: number };
type Stored = { unitid: number; code: string; label: string; unit: string; points: Point[]; source: string; survey: string };

async function ensureDir(p: string) { await fs.mkdir(p, { recursive: true }); }

async function fetchSeries(unitid: number, code: keyof typeof METRICS): Promise<Point[]> {
  // TODO: Replace with real Urban API request; scaffolding returns empty -> charts will gracefully show "No data"
  // Keep the loop so the file structure is established for front-end integration.
  const from = 2010;
  const to = new Date().getFullYear();
  const points: Point[] = [];
  for (let year = from; year <= to; year++) {
    // Example (fill in later when endpoint params are finalized):
    // const url = `${URBAN_API_BASE}${METRICS[code].urban!.endpoint}?unitid=${unitid}&year=${year}`;
    // const res = await fetch(url);
    // const json = await res.json();
    // const value = json?.[0]?.[METRICS[code].urban!.valueField];
    // if (value != null) points.push({ year, value: Number(value) });
  }
  return points;
}

async function save(unitid: number, code: keyof typeof METRICS, points: Point[]) {
  const def = METRICS[code];
  const stored: Stored = {
    unitid, code,
    label: def.label, unit: def.unit,
    points, source: def.source, survey: def.survey
  };
  const file = path.join(OUT_DIR, `${code}.${unitid}.json`);
  await fs.writeFile(file, JSON.stringify(stored, null, 2));
  console.log(`wrote ${path.relative(process.cwd(), file)} (${points.length} pts)`);
}

export async function ingestEf() {
  await ensureDir(OUT_DIR);
  const unitids = Object.values(SCHOOLS).map(s => s.unitid);
  const efCodes = (['EF.FALL.UG.TOTAL', ...RACE_ORDER]) as (keyof typeof METRICS)[];

  for (const unitid of unitids) {
    for (const code of efCodes) {
      const pts = await fetchSeries(unitid, code);
      await save(unitid, code, pts);
    }
  }
}

if (require.main === module) {
  ingestEf().catch(e => { console.error(e); process.exit(1); });
}
