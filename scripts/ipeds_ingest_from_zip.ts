/* eslint-disable no-console */
import path from 'node:path';
import fs from 'node:fs';
import { parse as parseCsv } from 'csv-parse/sync';
import AdmZip from 'adm-zip';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type DictRow = Record<string, string>;

function looksLikeDict(headers: string[]) {
  const lc = headers.map(h => h.toLowerCase());
  return lc.includes('varname') || lc.includes('variable') || lc.includes('variable name') || lc.includes('variable_name') || lc.includes('name');
}
function looksLikeData(headers: string[]) {
  const lc = headers.map(h => h.toLowerCase());
  return lc.includes('unitid') || lc.includes('unit id') || lc.includes('unitid ');
}
function parseYearHints(text: string): number | null {
  const matches = text.match(/(19[6-9]\d|20[0-4]\d)/g);
  if (!matches) return null;
  const yr = parseInt(matches[matches.length - 1], 10);
  return Number.isFinite(yr) ? yr : null;
}
function firstNonEmpty<T>(...vals: (T | null | undefined)[]): T | null {
  for (const v of vals) if (v !== undefined && v !== null && String(v).trim() !== '') return v as T;
  return null;
}
function toNumber(x: any): number | null {
  if (x === null || x === undefined) return null;
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  const s = String(x).replace(/[\s,]/g, '');
  if (s === '' || s.toUpperCase() === 'N/A') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function normalizeHeader(h: string) { return h.replace(/[\uFEFF]/g, '').trim(); }

async function getUniversityIdByUnitid(unitid: number, name?: string | null) {
  const existing = await prisma.university.findUnique({ where: { unitid } });
  if (existing) return existing.id;
  const created = await prisma.university.create({ data: { unitid, name: name || `Institution ${unitid}` } });
  return created.id;
}
async function getOrCreateMetric(code: string, name: string, unit?: string | null, description?: string | null) {
  const existing = await prisma.metric.findUnique({ where: { code } });
  if (existing) return existing.id;
  const created = await prisma.metric.create({ data: { code, name, unit: unit || undefined, description: description || undefined } });
  return created.id;
}

async function ingestZip(zipFile: string, opts: { componentHint?: string } = {}) {
  if (!fs.existsSync(zipFile)) throw new Error(`Zip not found: ${zipFile}`);
  const zip = new AdmZip(zipFile);
  const entries = zip.getEntries().filter(e => !e.isDirectory);
  const csvEntries = entries.filter(e => e.entryName.toLowerCase().endsWith('.csv'));
  if (!csvEntries.length) throw new Error('No CSV files in ZIP.');
  const parsedFiles = csvEntries.map(e => {
    const txt = zip.readAsText(e);
    const firstLine = txt.split(/\r?\n/)[0] || '';
    const headers = firstLine.split(',').map(normalizeHeader);
    return { entry: e, headers, text: txt };
  });
  let dataFile = parsedFiles.find(f => looksLikeData(f.headers));
  let dictFile = parsedFiles.find(f => looksLikeDict(f.headers));
  if (!dataFile) dataFile = parsedFiles.sort((a,b)=>b.entry.header.size-a.entry.header.size)[0];
  if (!dictFile) dictFile = parsedFiles.find(f => /varname|variable|label|data type/i.test(f.text.split('\n', 5).join('\n')));
  if (!dataFile) throw new Error('Could not identify a data CSV inside the ZIP.');
  const dataRows = parseCsv(dataFile.text, { columns: true, skip_empty_lines: true }) as Record<string, any>[];
  if (!dataRows.length) throw new Error('Data CSV appears empty.');
  const headers = Object.keys(dataRows[0]).map(normalizeHeader);
  const lcHeaders = headers.map(h => h.toLowerCase());
  const unitidKey = headers.find(h => h.toLowerCase() === 'unitid') || headers.find(h => h.toLowerCase().includes('unitid'));
  if (!unitidKey) throw new Error('No UNITID column found in data CSV.');
  const yearHeaderCandidates = ['year','survyear','acadhryr','acadhryear','fyear','survey_year'];
  let yearKey: string | null = null;
  for (const cand of yearHeaderCandidates) { const idx = lcHeaders.indexOf(cand); if (idx >= 0) { yearKey = headers[idx]; break; } }
  let globalYear = parseYearHints(dataFile.entry.entryName) || parseYearHints(zipFile);
  let dict: DictRow[] = [];
  if (dictFile) dict = parseCsv(dictFile.text, { columns: true, skip_empty_lines: true }) as DictRow[];
  function dictLookupName(varname: string): string | null {
    if (!dict.length) return null;
    const lcKeys = Object.keys(dict[0]).map(k => k.toLowerCase());
    const nameKey = ['varname','variable','variable name','variable_name','name'].find(k => lcKeys.includes(k));
    const labelKey = ['varlabel','label','variable label','variable_label','title','description'].find(k => lcKeys.includes(k));
    if (!nameKey) return null;
    const row = dict.find(r => (r[nameKey] || '').toString().trim().toLowerCase() === varname.toLowerCase());
    if (!row) return null;
    const nm = (labelKey && row[labelKey]) || row[nameKey];
    return nm ? String(nm) : null;
  }
  const comp = opts.componentHint || (dataFile.entry.entryName.split(/[\\/]/).pop() || '').split('_')[0].toUpperCase().replace(/[^A-Z0-9]/g,'') || 'UNK';
  const nameKey = headers.find(h => h.toLowerCase() in { instnm:1, institution_name:1, name:1 });
  const ignored = new Set([unitidKey, nameKey || '', yearKey || '']);
  const numericCandidates = headers.filter(h => !ignored.has(h));
  const numericVars: string[] = [];
  for (const col of numericCandidates) {
    let numericCount = 0, total = 0;
    for (let i=0;i<dataRows.length && i<200;i++) {
      const n = toNumber(dataRows[i][col]);
      if (n !== null) numericCount++; total++;
    }
    if (total>0 && numericCount/total > 0.7) numericVars.push(col);
  }
  const metricIdCache = new Map<string, number>();
  function metricCodeFor(varname: string) { return `${comp}.${varname}`; }
  for (const varname of numericVars) {
    const code = metricCodeFor(varname);
    const label = firstNonEmpty(dictLookupName(varname), varname) as string;
    const id = await getOrCreateMetric(code, label);
    metricIdCache.set(varname, id);
  }
  let inserted = 0;
  for (const row of dataRows) {
    const unitid = toNumber(row[unitidKey]); if (unitid === null) continue;
    const uname = nameKey ? (row[nameKey] ? String(row[nameKey]) : null) : null;
    const universityId = await getUniversityIdByUnitid(unitid, uname);
    let yr: number | null = null;
    if (yearKey) {
      const ytxt = String(row[yearKey] ?? '');
      const m = ytxt.match(/(19\d{2}|20\d{2})/);
      if (m) yr = parseInt(m[1], 10);
    }
    if (!yr) yr = globalYear;
    if (!yr) continue;
    for (const varname of numericVars) {
      const metricId = metricIdCache.get(varname)!;
      const value = toNumber(row[varname]); if (value === null) continue;
      await prisma.timeSeries.upsert({
        where: { universityId_metricId_year: { universityId, metricId, year: yr } },
        update: { value },
        create: { universityId, metricId, year: yr, value },
      });
      inserted++;
    }
  }
  console.log(`Inserted/updated ~${inserted} values.`);
}
async function main(){ const zipPath=process.argv[2]; const componentHint=process.argv[3]; if(!zipPath){ console.error('Usage: npm run ingest:ipeds:zip -- <zip> [COMPONENT_HINT]'); process.exit(1); } await ingestZip(path.resolve(zipPath), { componentHint }); }
main().catch(e=>{ console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());
