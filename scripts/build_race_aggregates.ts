/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type GroupKey = 'ALL' | 'IVY' | 'CC';

const groups: { unitid: number; name: string; key: GroupKey }[] = [
  { unitid: 9999999, name: 'United States — All Institutions', key: 'ALL' },
  { unitid: 9999998, name: 'Ivy League — All', key: 'IVY' },
  { unitid: 9999997, name: 'Community Colleges — Name contains "Community College"', key: 'CC' },
];

const ivyNamePatterns = [
  /Harvard University/i,
  /Yale University/i,
  /Princeton University/i,
  /Columbia University/i,
  /Cornell University/i,
  /Dartmouth College/i,
  /Brown University/i,
  /University of Pennsylvania/i,
];

function inGroup(name: string, key: GroupKey): boolean {
  switch (key) {
    case 'ALL': return true;
    case 'IVY': return ivyNamePatterns.some((re) => re.test(name));
    case 'CC': return /Community College/i.test(name);
    default: return false;
  }
}

type RaceCat = { code: string; label: string; re: RegExp };
const raceCats: RaceCat[] = [
  { code: 'AIAN',   label: 'American Indian or Alaska Native',                re: /American Indian|Alaska Native/i },
  { code: 'ASIAN',  label: 'Asian',                                          re: /\bAsian\b/i },
  { code: 'BLACK',  label: 'Black or African American',                      re: /Black|African American/i },
  { code: 'HISP',   label: 'Hispanic or Latino',                             re: /Hispanic|Latino/i },
  { code: 'NHPI',   label: 'Native Hawaiian or Other Pacific Islander',      re: /Native Hawaiian|Pacific Islander/i },
  { code: 'WHITE',  label: 'White',                                          re: /\bWhite\b/i },
  { code: 'TWO',    label: 'Two or more races',                              re: /Two or more/i },
  { code: 'NONRES', label: 'Nonresident alien',                              re: /Nonresident alien/i },
  { code: 'UNKNOWN',label: 'Race unknown / Unknown',                         re: /Race unknown|Unknown/i },
];

async function getOrCreateMetric(code: string, name: string, unit?: string | null) {
  const found = await prisma.metric.findUnique({ where: { code } });
  if (found) return found;
  return prisma.metric.create({ data: { code, name, unit: unit ?? undefined } });
}

async function main() {
  const allUniversities = await prisma.university.findMany({ select: { id: true, name: true } });
  if (allUniversities.length === 0) {
    console.error('No universities found. Did you ingest IPEDS EF first?');
    process.exit(1);
  }

  const efMetrics = await prisma.metric.findMany({
    where: { code: { startsWith: 'EF.' } },
    select: { id: true, code: true, name: true },
  });
  if (efMetrics.length === 0) {
    console.error('No EF metrics found. Did you ingest EF (Fall Enrollment) zips?');
    process.exit(1);
  }

  const totalMetric =
    efMetrics.find((m) => /enrol/i.test((m.name ?? '')) && /total/i.test((m.name ?? '')) && !/female|male|women|men/i.test((m.name ?? ''))) ||
    efMetrics.find((m) => m.code === 'EF.EFYTOTL') ||
    efMetrics[0];

  for (const g of groups) {
    const pseudo = await prisma.university.upsert({
      where: { unitid: g.unitid },
      update: { name: g.name },
      create: { unitid: g.unitid, name: g.name },
      select: { id: true },
    });

    const groupUniIds = allUniversities.filter((u) => inGroup((u.name ?? ''), g.key)).map((u) => u.id);
    if (groupUniIds.length === 0) continue;

    const totalByYear = await prisma.timeSeries.groupBy({
      by: ['year'],
      where: { metricId: totalMetric.id, universityId: { in: groupUniIds } },
      _sum: { value: true },
      orderBy: { year: 'asc' },
    });

    for (const row of totalByYear) {
      const val = row._sum.value ?? 0;
      await prisma.timeSeries.upsert({
        where: { universityId_metricId_year: { universityId: pseudo.id, metricId: totalMetric.id, year: row.year } },
        update: { value: val },
        create: { universityId: pseudo.id, metricId: totalMetric.id, year: row.year, value: val },
      });
    }

    const natTotalMetric = await getOrCreateMetric(
      `NAT.EF.TOTAL.ALL.${g.key}`, `${g.name} — Total enrollment (EF)`, 'students'
    );
    for (const row of totalByYear) {
      const val = row._sum.value ?? 0;
      await prisma.timeSeries.upsert({
        where: { universityId_metricId_year: { universityId: pseudo.id, metricId: natTotalMetric.id, year: row.year } },
        update: { value: val },
        create: { universityId: pseudo.id, metricId: natTotalMetric.id, year: row.year, value: val },
      });
    }

    for (const rc of raceCats) {
      const catMetrics = efMetrics.filter(
        (m) => rc.re.test((m.name ?? '')) && /total/i.test((m.name ?? '')) && !/female|male|women|men/i.test((m.name ?? ''))
      );
      if (catMetrics.length === 0) continue;

      const catSums: Record<number, number> = {};
      for (const m of catMetrics) {
        const rows = await prisma.timeSeries.groupBy({
          by: ['year'],
          where: { metricId: m.id, universityId: { in: groupUniIds } },
          _sum: { value: true },
        });
        for (const r of rows) {
          catSums[r.year] = (catSums[r.year] ?? 0) + (Number(r._sum.value) ?? 0);
        }
      }

      const natRaceTotalMetric = await getOrCreateMetric(
        `NAT.EF.TOTAL.${rc.code}.${g.key}`, `${g.name} — Total: ${rc.label} (EF)`, 'students'
      );
      for (const [yearStr, val] of Object.entries(catSums)) {
        const year = parseInt(yearStr, 10);
        await prisma.timeSeries.upsert({
          where: { universityId_metricId_year: { universityId: pseudo.id, metricId: natRaceTotalMetric.id, year } },
          update: { value: val },
          create: { universityId: pseudo.id, metricId: natRaceTotalMetric.id, year, value: val },
        });
      }

      const natRaceShareMetric = await getOrCreateMetric(
        `NAT.EF.SHARE.${rc.code}.${g.key}`, `${g.name} — Share: ${rc.label} (EF)`, 'ratio'
      );
      for (const row of totalByYear) {
        const tot = row._sum.value ?? 0;
        if (!tot || Number(tot ?? 0) <= 0) continue;
        const val = catSums[row.year] ?? 0;
        const share = Number(val ?? 0) / Number(tot ?? 0);
        await prisma.timeSeries.upsert({
          where: { universityId_metricId_year: { universityId: pseudo.id, metricId: natRaceShareMetric.id, year: row.year } },
          update: { value: share },
          create: { universityId: pseudo.id, metricId: natRaceShareMetric.id, year: row.year, value: share },
        });
      }
    }

    console.log(`Aggregates built for: ${g.name}`);
  }
  console.log('Race/ethnicity group & national aggregates complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
