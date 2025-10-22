import 'dotenv/config';
import { SCHOOLS } from '../lib/schools';
import { METRICS, RACE_ORDER } from '../lib/metrics';

// You can swap in Prisma later. For now, this just outlines the fetch loop.
const URBAN_API_BASE = process.env.URBAN_API_BASE || 'https://educationdata.urban.org/api/v1/college-university/ipeds';

type Point = { year: number; value: number };
type Series = { unitid: number; code: string; points: Point[] };

async function fetchEfUndergrad(unitid: number, metricCode: string): Promise<Point[]> {
  const def = METRICS[metricCode as keyof typeof METRICS];
  const from = 2010;
  const to = new Date().getFullYear();
  const points: Point[] = [];
  for (let year = from; year <= to; year++) {
    // TODO: Call the Urban endpoint with def.urban.endpoint/filters + unitid/year.
    // Example URL (adjust params once you finalize the API syntax):
    // const url = `${URBAN_API_BASE}${def.urban?.endpoint}?unitid=${unitid}&year=${year}`;
    // const res = await fetch(url);
    // const json = await res.json();
    // const value = json?.[0]?.[def.urban!.valueField];
    // if (value != null) points.push({ year, value: Number(value) });
  }
  return points;
}

export async function ingestEf() {
  const unitids = Object.values(SCHOOLS).map(s => s.unitid);
  const efCodes = (['EF.FALL.UG.TOTAL', ...RACE_ORDER] as const);

  const out: Series[] = [];
  for (const unitid of unitids) {
    for (const code of efCodes) {
      const points = await fetchEfUndergrad(unitid, code);
      out.push({ unitid, code, points });
      console.log(`EF scaffold: unitid=${unitid} code=${code} points=${points.length}`);
    }
  }
  // TODO: Upsert into your DB (Observation table) when your Prisma models are ready.
  return out;
}

if (require.main === module) {
  ingestEf().then(() => console.log('EF ingest scaffold complete')).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
