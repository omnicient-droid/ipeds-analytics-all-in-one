// scripts/ipeds_adm_ingest_one.mjs
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

const prisma = new PrismaClient();

function inferYearFromName(name) {
  const m = name.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

function toKeyMap(record) {
  // normalize header keys to lowercase
  const obj = {};
  for (const [k, v] of Object.entries(record)) obj[String(k).toLowerCase()] = v;
  return obj;
}

async function upsertMetric(code, name, unit) {
  return prisma.metric.upsert({
    where: { code },
    update: { name, unit },
    create: { code, name, unit },
    select: { id: true },
  });
}

async function upsertUniversity(unitid, name = null) {
  return prisma.university.upsert({
    where: { unitid },
    update: { name: name ?? undefined },
    create: { unitid, name },
    select: { id: true },
  });
}

async function writePoint(univId, metricId, year, value) {
  await prisma.timeSeries.upsert({
    where: {
      universityId_metricId_year: { universityId: univId, metricId, year },
    },
    update: { value },
    create: { universityId: univId, metricId, year, value },
  });
}

async function ingestDir(unitid, dir) {
  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && /\.csv$/i.test(d.name))
    .map((d) => path.join(dir, d.name))
    .sort();

  if (!files.length) {
    console.log("No CSV files found in", dir);
    return;
  }

  // Ensure the university & metrics exist
  const uni = await upsertUniversity(unitid);
  const admRate = await upsertMetric(
    "SC.ADM.RATE",
    "Admission rate (overall)",
    "ratio"
  );
  const appl = await upsertMetric("ADM.APPLICANTS", "Applications", "count");
  const admit = await upsertMetric("ADM.ADMITTED", "Admitted", "count");

  let wrote = 0;
  for (const file of files) {
    const csv = fs.readFileSync(file);
    const rows = parse(csv, { columns: true, skip_empty_lines: true });
    const yearFromFile = inferYearFromName(path.basename(file));

    for (const rec of rows) {
      const r = toKeyMap(rec);
      const uid = Number(r["unitid"]);
      if (uid !== unitid) continue;

      // IPEDS ADM typical columns: applcn (applications), admssn (admitted)
      // (some files use uppercase/lowercase variants; we normalized keys)
      const applications = r["applcn"] ?? r["applications"];
      const admitted = r["admssn"] ?? r["admitted"];

      const apps = applications == null ? null : Number(applications);
      const admits = admitted == null ? null : Number(admitted);

      // year: prefer a "year" column; else infer from filename
      const y = r["year"] ? Number(r["year"]) : yearFromFile;
      if (!y || Number.isNaN(y)) continue;

      if (Number.isFinite(apps)) await writePoint(uni.id, appl.id, y, apps);
      if (Number.isFinite(admits))
        await writePoint(uni.id, admit.id, y, admits);

      if (
        Number.isFinite(apps) &&
        apps > 0 &&
        Number.isFinite(admits) &&
        admits >= 0
      ) {
        const rate = admits / apps;
        await writePoint(uni.id, admRate.id, y, rate);
        wrote++;
      }
    }
  }

  console.log(
    `Done. Wrote ${wrote} admission-rate points for UNITID=${unitid}`
  );
}

async function main() {
  const unitid = Number(process.argv[2]);
  const dir = process.argv[3];
  if (!unitid || !dir) {
    console.error(
      "Usage: node scripts/ipeds_adm_ingest_one.mjs <UNITID> <DIR_OF_ADM_CSVS>"
    );
    process.exit(1);
  }
  await ingestDir(unitid, dir);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
