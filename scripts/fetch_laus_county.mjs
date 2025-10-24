#!/usr/bin/env node
/**
 * Fetch BLS LAUS county unemployment rate series and write CSV.
 *
 * Usage: node scripts/fetch_laus_county.mjs [--start 2010] [--end 2025]
 * Env: BLS_API_KEY optional
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Try to import unitid->FIPS map if present
let UNITID_TO_COUNTY = {}
try {
  const mod = await import(path.resolve(__dirname, '../lib/place.ts'))
  UNITID_TO_COUNTY = mod.UNITID_TO_COUNTY || {}
} catch {}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { start: 2010, end: new Date().getFullYear() }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start') out.start = Number(args[++i])
    if (args[i] === '--end') out.end = Number(args[++i])
  }
  return out
}

function seriesIdForCountyFips(fips) {
  // LAUS county unemployment rate series id: LAUCNSSCCC000000003
  // Example: San Diego CA (06073) => LAUCN060730000000003
  const s = String(fips).padStart(5, '0')
  const state = s.slice(0, 2)
  const county = s.slice(2)
  return `LAUCN${state}${county}000000003`
}

async function fetchSeries(seriesId, startYear, endYear) {
  const url = 'https://api.bls.gov/publicAPI/v2/timeseries/data/' + seriesId
  const body = {
    seriesid: [seriesId],
    startyear: String(startYear),
    endyear: String(endYear),
  }
  const key = process.env.BLS_API_KEY
  if (key) body.registrationKey = key
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`BLS ${res.status}`)
  const json = await res.json()
  const data = json.Results?.series?.[0]?.data || []
  return data.map((d) => ({
    year: Number(d.year),
    period: d.period, // M01..M13
    value: Number(d.value),
  }))
}

async function main() {
  const { start, end } = parseArgs()
  const fipsSet = new Set(Object.values(UNITID_TO_COUNTY || {}))
  if (fipsSet.size === 0) {
    console.warn(
      'No UNITID_TO_COUNTY mapping found; provide county FIPS manually in script if needed.',
    )
  }
  const fipsList = Array.from(fipsSet)
  const rows = []
  for (const fips of fipsList) {
    const sid = seriesIdForCountyFips(fips)
    try {
      const data = await fetchSeries(sid, start, end)
      for (const r of data) rows.push({ fips, year: r.year, period: r.period, value: r.value })
      console.log('Fetched', fips, data.length, 'rows')
      // polite pacing
      await new Promise((r) => setTimeout(r, 250))
    } catch (e) {
      console.error('Failed for', fips, e?.message || e)
    }
  }
  const outPath = path.resolve(__dirname, '../data/laus_unemp_county.csv')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  const header = 'fips,year,period,value\n'
  const csv =
    header + rows.map((r) => `${r.fips},${r.year},${r.period},${r.value}`).join('\n') + '\n'
  fs.writeFileSync(outPath, csv)
  console.log('Wrote', outPath, rows.length, 'rows')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
