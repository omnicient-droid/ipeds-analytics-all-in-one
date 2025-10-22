export type Point = { year: number; value: number | null };
export type SeriesOut = {
  code: string; unitid: number; label: string;
  unit: 'headcount' | 'percent' | 'share' | 'USD';
  points: Point[]; source?: string; survey?: string;
};

const URBAN_BASE = (process.env.URBAN_API_BASE || 'https://educationdata.urban.org/api/v1/college-university/ipeds').replace(/\/$/,'');

async function getJSON<T=any>(url:string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json() as Promise<T>;
}
function firstNum(obj:any, keys:string[]): number|null { for (const k of keys) if (obj[k]!=null && isFinite(+obj[k])) return +obj[k]; return null; }
function firstStr(obj:any, keys:string[]): string|null { for (const k of keys) if (obj[k]!=null && String(obj[k]).length) return String(obj[k]); return null; }

const RACE_LABELS: Record<string, string> = {
  'EF.FALL.UG.WHITE':'White',
  'EF.FALL.UG.BLACK':'Black or African American',
  'EF.FALL.UG.HISP':'Hispanic/Latino',
  'EF.FALL.UG.ASIAN':'Asian',
  'EF.FALL.UG.TWOORMORE':'Two or more races',
  'EF.FALL.UG.NONRES':'Nonresident alien',
  'EF.FALL.UG.UNKNOWN':'Race/ethnicity unknown',
};
type UrbanRow = Record<string,any>;

export async function fetchEfRaceSeries(unitid:number, metricCode: keyof typeof RACE_LABELS, fromYear=2010, toYear=new Date().getFullYear()){
  const raceLabel = RACE_LABELS[metricCode];
  const sumURL = `${URBAN_BASE}/fall-enrollment/summaries?var=enrollment&stat=sum&by=race&unitid=${unitid}&per_page=5000&year=${fromYear}:${toYear}&class_level=Undergraduate`;
  try {
    const json = await getJSON<{results?:UrbanRow[]}>(sumURL);
    const rows = (json as any).results ?? json ?? [];
    const vals: Record<number,number> = {};
    for (const r of rows) {
      const y = firstNum(r,['year']);
      const race = firstStr(r,['race_label','race']) || '';
      if (!y || race !== raceLabel) continue;
      const v = firstNum(r,['sum_enrollment','enrollment_sum','stat','value']);
      if (v!=null) vals[y]=(vals[y]??0)+v;
    }
    const out = Object.keys(vals).map(y=>({year:+y, value: vals[+y]})).sort((a,b)=>a.year-b.year);
    if (out.length) return out;
  } catch {}

  const points: Point[] = [];
  for (let year=fromYear; year<=toYear; year++){
    try {
      const url = `${URBAN_BASE}/fall-enrollment-race/${year}/?unitid=${unitid}&per_page=5000`;
      const rows = await getJSON<UrbanRow[]>(url);
      const ug = rows.filter(r=>{
        const lvl = firstStr(r,['class_level_label','class_level']);
        return lvl ? /undergrad/i.test(lvl) : firstNum(r,['class_level'])===1;
      });
      const want = ug.filter(r=>{
        const lbl = firstStr(r,['race_label','race']);
        return (lbl||'').toLowerCase()===raceLabel.toLowerCase();
      });
      const v = want.reduce((a,r)=> a + (firstNum(r,['enrollment','count','value']) ?? 0), 0);
      points.push({ year, value: isFinite(v)? v : null });
    } catch { points.push({year, value: null}); }
  }
  return points;
}

export async function buildEfSeriesPayload(unitids:number[], codes:(keyof typeof RACE_LABELS|'EF.FALL.UG.TOTAL')[], window?:{from?:number;to?:number}): Promise<SeriesOut[]>{
  const from = window?.from ?? 2010, to = window?.to ?? new Date().getFullYear();
  const out: SeriesOut[] = [];
  const raceCodes = Object.keys(RACE_LABELS) as (keyof typeof RACE_LABELS)[];
  for (const unitid of unitids) {
    const cache: Partial<Record<keyof typeof RACE_LABELS, Point[]>> = {};
    for (const rc of raceCodes) cache[rc] = await fetchEfRaceSeries(unitid, rc, from, to);
    for (const code of codes) {
      if (code==='EF.FALL.UG.TOTAL'){
        const years = Array.from(new Set(raceCodes.flatMap(rc=> cache[rc]!.map(p=>p.year)))).sort((a,b)=>a-b);
        const points = years.map(y=>({ year:y, value: raceCodes.reduce((s,rc)=> s + ((cache[rc]!.find(p=>p.year===y)?.value ?? 0) || 0), 0) }));
        out.push({ code, unitid, label:'Undergrad Fall Enrollment (Total)', unit:'headcount', points, source:'IPEDS via Urban Institute', survey:'EF' });
      } else {
        out.push({ code, unitid, label:`Undergrad Fall – ${RACE_LABELS[code]}`, unit:'headcount', points: cache[code]!, source:'IPEDS via Urban Institute', survey:'EF' });
      }
    }
  }
  return out;
}

export async function buildAdmissionsSeriesPayload(_u:number[], _c:string[], _w?:{from?:number;to?:number}){ return []; }
export async function buildGradRatesSeriesPayload(_u:number[], _c:string[], _w?:{from?:number;to?:number}){ return []; }
