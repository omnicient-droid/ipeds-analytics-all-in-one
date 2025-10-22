// scripts/ipeds_ef_ingest_http.mjs
// Usage (single line):
//   VERBOSE=1 UNITID=190150 START=2015 END=2015 node scripts/ipeds_ef_ingest_http.mjs $UNITID $START $END
//
// - Tries EF{YYYY}A.zip first (curl fallback if fetch returns HTML/406)
// - Verifies ZIP magic bytes (no “unzipping HTML”)
// - Accepts ANY CSV that has UNITID; then smart-matches EF headers (EF* and EFY*)
// - Writes Total + race breakdown to Prisma Metric/TimeSeries

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as unzipper from "unzipper";
import { parse } from "csv-parse/sync";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const prisma = new PrismaClient();

// -------- Metrics your UI expects --------
const METRICS = [
  {
    code: "EF.EFYTOTL",
    name: "Total fall enrollment",
    unit: "count",
    key: "total",
  },
  {
    code: "EF.EFYWHITE",
    name: "White fall enrollment",
    unit: "count",
    key: "white",
  },
  {
    code: "EF.EFYBLACK",
    name: "Black or African American fall enrollment",
    unit: "count",
    key: "black",
  },
  {
    code: "EF.EFYHISP",
    name: "Hispanic/Latino fall enrollment",
    unit: "count",
    key: "hisp",
  },
  {
    code: "EF.EFYASIAN",
    name: "Asian fall enrollment",
    unit: "count",
    key: "asian",
  },
  {
    code: "EF.EFYAIAN",
    name: "American Indian/Alaska Native fall enrollment",
    unit: "count",
    key: "aian",
  },
  {
    code: "EF.EFYNHPI",
    name: "Native Hawaiian/Other Pacific Islander fall enrollment",
    unit: "count",
    key: "nhpi",
  },
  {
    code: "EF.EFY2PLUS",
    name: "Two or more races fall enrollment",
    unit: "count",
    key: "two",
  },
  {
    code: "EF.EFYNRAL",
    name: "Nonresident alien fall enrollment",
    unit: "count",
    key: "nonres",
  },
  {
    code: "EF.EFYUNK",
    name: "Race/ethnicity unknown fall enrollment",
    unit: "count",
    key: "unknown",
  },
];

// -------- Header aliases (accept EF* and EFY*) --------
const ALIASES = {
  total: [
    "efytotlt",
    "eftotlt",
    "efytotal",
    "efgrandtotal",
    "efftotlt",
    "eftotal",
  ],
  white: ["efywhitt", "efwhitt", "efywhite", "efwhite", "efywhit", "efywhte"],
  black: ["efybkaat", "efbkaat", "efyblack", "efblack", "efybkaa", "efyblk"],
  hisp: ["efyhisp", "efhispt", "efhisp", "efylatino"],
  asian: ["efyasian", "efasiat", "efasian"],
  aian: ["efyaian", "efaiant", "efai_an", "efyaian_alaskan", "efyaianak"],
  nhpi: ["efynhpi", "efnhpit", "efpacific"],
  two: [
    "efy2mort",
    "ef2mort",
    "eftwomore",
    "eftwoormore",
    "ef2plus",
    "efy2plus",
  ],
  nonres: ["efynralt", "efnralt", "efnonres", "efnonresident", "efnr"],
  unknown: ["efyunknt", "efunknt", "efunknown", "efunk", "efunkn"],
};

// -------- Regex fallbacks --------
const RX = {
  total: [/^efy?.*tot/i, /^ef.*tot/i],
  white: [/^efy?.*whit/i],
  black: [/^efy?.*(black|bkaa)/i],
  hisp: [/^efy?.*(hisp|latino)/i],
  asian: [/^efy?.*asian/i],
  aian: [/^efy?.*(aian|ai[_ ]?an|american.*indian|alaska)/i],
  nhpi: [/^efy?.*(nhpi|pacific)/i],
  two: [/^efy?.*(2m|two|two.?or.?more)/i],
  nonres: [/^efy?.*(nr|nonres|nonresident)/i],
  unknown: [/^efy?.*(unk|unknown)/i],
};

const BASE = "https://nces.ed.gov/ipeds/datacenter/data";
const VERBOSE =
  process.env.VERBOSE === "1" || process.argv.includes("--verbose");

// ---- Candidate ZIP names (EF{YYYY}A first) ----
function candidateUrls(year) {
  const yy = String(year).slice(-2);
  const YYYY = String(year);
  return [
    `${BASE}/EF${YYYY}A.zip`,
    `${BASE}/EF${YYYY}A_RV.zip`,
    `${BASE}/EF${yy}A.zip`,
    `${BASE}/EF${yy}A_RV.zip`,
    `${BASE}/EF${YYYY}_A.zip`,
    `${BASE}/EF${YYYY}_A_RV.zip`,
    `${BASE}/EF${yy}_A.zip`,
    `${BASE}/EF${yy}_A_RV.zip`,
    `${BASE}/EF${YYYY}A_Data.zip`,
    `${BASE}/EF${yy}A_Data.zip`,
    `${BASE}/EF${YYYY}.zip`,
    `${BASE}/EF${YYYY}_RV.zip`,
    `${BASE}/EF${yy}.zip`,
    `${BASE}/EF${yy}_RV.zip`,
  ];
}

// ---- Download & validate ZIP; curl fallback if fetch gets HTML/406 ----
async function downloadZip(url) {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
        Accept: "*/*",
        Referer: "https://nces.ed.gov/ipeds/datacenter/DataFiles.aspx",
        "Accept-Language": "en-US,en;q=0.9",
        Connection: "keep-alive",
      },
      redirect: "follow",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const isZip =
      buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      buf[2] === 0x03 &&
      buf[3] === 0x04;
    if (!isZip) {
      const preview = buf
        .slice(0, 180)
        .toString("utf8")
        .replace(/\s+/g, " ")
        .slice(0, 180);
      throw new Error(`Not a ZIP (first bytes): ${preview}`);
    }
    return buf;
  } catch (e) {
    if (VERBOSE)
      console.log("  ↳ fetch failed, trying curl:", String(e.message || e));
  }
  const UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
  const args = [
    "-sL",
    "-A",
    UA,
    "-e",
    "https://nces.ed.gov/ipeds/datacenter/DataFiles.aspx",
    "--compressed",
    url,
  ];
  const { stdout } = await execFileP("curl", args, {
    encoding: "buffer",
    maxBuffer: 200 * 1024 * 1024,
  });
  const buf = Buffer.from(stdout);
  const isZip =
    buf.length >= 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    buf[2] === 0x03 &&
    buf[3] === 0x04;
  if (!isZip) {
    const preview = buf
      .slice(0, 180)
      .toString("utf8")
      .replace(/\s+/g, " ")
      .slice(0, 180);
    throw new Error(`Not a ZIP (curl) (first bytes): ${preview}`);
  }
  return buf;
}

// ---- CSV scanning: accept ANY CSV with UNITID; prefer EF-looking names ----
function lowerKeys(o) {
  const r = {};
  for (const [k, v] of Object.entries(o)) r[String(k).toLowerCase().trim()] = v;
  return r;
}
function sortCsvs(files) {
  return files
    .filter((f) => /\.csv$/i.test(f.path))
    .sort(
      (a, b) =>
        (/(^|\/)ef.*\.csv$/i.test(a.path) ? -1 : 1) -
        (/(^|\/)ef.*\.csv$/i.test(b.path) ? -1 : 1)
    );
}
async function unzipFindCsvRow(buffer, unitid) {
  const dir = await unzipper.Open.buffer(buffer);
  const csvs = sortCsvs(dir.files);
  if (VERBOSE)
    console.log(
      "  ↳ csv entries:",
      csvs
        .map((e) => e.path)
        .slice(0, 8)
        .join(" | "),
      csvs.length > 8 ? "…" : ""
    );
  for (const entry of csvs) {
    const content = await entry.buffer();
    const rows = parse(content, { columns: true, skip_empty_lines: true });
    if (!rows.length) continue;
    const sample = lowerKeys(rows[0]);
    if (!("unitid" in sample)) continue;
    for (const r of rows) {
      const row = lowerKeys(r);
      if (Number(row.unitid) === unitid) return { row, source: entry.path };
    }
  }
  return null;
}

// ---- Value picker: aliases first, regex fallback ----
function pickNumberSmart(row, aliases, regexes) {
  for (const k of aliases || []) {
    if (row[k] != null && row[k] !== "") {
      const n = Number(row[k]);
      if (Number.isFinite(n)) return n;
    }
  }
  const keys = Object.keys(row);
  for (const rx of regexes || []) {
    const hit = keys.find((k) => rx.test(k));
    if (hit) {
      const n = Number(row[hit]);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

// ---- Prisma helpers ----
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

// ---- Ingest one year ----
async function ingestYear(unitid, year) {
  let lastErr = null;
  for (const url of candidateUrls(year)) {
    try {
      if (VERBOSE) console.log("→ trying", url);
      const zip = await downloadZip(url);
      const found = await unzipFindCsvRow(zip, unitid);
      if (!found) {
        if (VERBOSE)
          console.log("  ↳ zip opened, but no CSV with UNITID found");
        continue;
      }

      const uni = await upsertUniversity(unitid, null);
      const metricIds = {};
      for (const m of METRICS)
        metricIds[m.code] = (await upsertMetric(m.code, m.name, m.unit)).id;

      let wrote = 0;
      const got = {};
      for (const m of METRICS) {
        if (m.key === "total") continue;
        const v = pickNumberSmart(found.row, ALIASES[m.key], RX[m.key]);
        if (v != null) {
          got[m.key] = v;
          await writePoint(uni.id, metricIds[m.code], year, v);
          wrote++;
        }
      }
      let total = pickNumberSmart(found.row, ALIASES.total, RX.total);
      if (total == null) {
        const raceKeys = [
          "white",
          "black",
          "hisp",
          "asian",
          "aian",
          "nhpi",
          "two",
          "nonres",
          "unknown",
        ];
        const sum = raceKeys.reduce((a, k) => a + (Number(got[k]) || 0), 0);
        if (sum > 0) total = sum;
      }
      if (total != null) {
        await writePoint(uni.id, metricIds["EF.EFYTOTL"], year, total);
        wrote++;
      }

      if (wrote === 0) {
        console.log(
          `[${year}] ${unitid}: CSV loaded (${found.source}) but no alias/regex matched. Sample keys:`
        );
        console.log(Object.keys(found.row).slice(0, 30).join(", "));
      } else {
        console.log(`[${year}] wrote ${wrote} from ${found.source} (${url})`);
      }
      return wrote;
    } catch (e) {
      lastErr = e;
      if (VERBOSE) console.log("  ↳ skip reason:", String(e.message || e));
    }
  }
  console.log(
    `[${year}] skipped (no EF CSV found for unitid ${unitid}${
      lastErr ? `; last ${lastErr.message}` : ""
    })`
  );
  return 0;
}

// ---- main ----
async function main() {
  const unitid = Number(process.argv[2]);
  const start = Number(process.argv[3]);
  const end = Number(process.argv[4] ?? start);
  if (!unitid || !start) {
    console.error(
      "Usage: node scripts/ipeds_ef_ingest_http.mjs <UNITID> <startYear> [endYear]"
    );
    process.exit(1);
  }
  console.log(
    `[IPEDS EF via IPEDS ZIP] unitid=${unitid} years=${start}..${end}`
  );
  let total = 0;
  for (let y = start; y <= end; y++) {
    const n = await ingestYear(unitid, y).catch((e) => {
      console.log(`[${y}] skipped (${String(e.message || e)})`);
      return 0;
    });
    total += n;
  }
  console.log(`Done. Total EF points written: ${total}`);
  await prisma.$disconnect();
}
main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
