#!/usr/bin/env node
/**
 * County context ingest: Life Expectancy (IHME) + Unemployment (BLS LAUS)
 *
 * Intentional slow-and-thorough route using local CSVs you provide:
 *  - data/ihme_life_county.csv (columns: fips, year, life_expectancy)
 *  - data/laus_unemp_county.csv (columns: fips, year, unemployment_rate)
 *
 * This script will upsert into Prisma Metric and TimeSeries:
 *  - HE.LE.COUNTY.{FIPS}  (unit: years)
 *  - BLS.UNRATE.COUNTY.{FIPS} (unit: percent)
 *
 * You can generate these CSVs from IHME and BLS sources or your own pipeline.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const prisma = new PrismaClient()

function readCsv(fp) {
  const raw = fs.readFileSync(fp, 'utf-8')
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const header = lines[0].split(',').map((s) => s.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map((s) => s.trim())
    const row = {}
    header.forEach((h, j) => (row[h] = parts[j]))
    rows.push(row)
  }
  return rows
}

async function ensureMetric(code, name, unit) {
  return prisma.metric.upsert({
    where: { code },
    update: { name, unit },
    create: { code, name, unit },
  })
}

async function ingestIHME() {
  const fp = path.join(ROOT, 'data', 'ihme_life_county.csv')
  if (!fs.existsSync(fp)) {
    console.warn('IHME CSV not found:', fp)
    return 0
  }
  const rows = readCsv(fp)
  let count = 0
  for (const r of rows) {
    const fips = String(r.fips).padStart(5, '0')
    const year = Number(r.year)
    const val = r.life_expectancy != null ? Number(r.life_expectancy) : null
    if (!year || val == null) continue
    const code = `HE.LE.COUNTY.${fips}`
    const metric = await ensureMetric(code, `Life Expectancy — County ${fips}`, 'years')

    // University-independent (place metric): store under a synthetic univeristyId 0 not allowed by schema.
    // We model place series by linking to any university that shares the county in UI; here we attach to the first matching university when plotted.
    // For storage, write rows with no university link by convention: create/find a special University row with unitid = 0? Avoid schema changes; we will duplicate series per campus that uses it.
    // As a workaround, we simply prepare data to attach when used; here we skip writing TimeSeries without a university.
    // If you'd like DB-native storage, we can extend schema with a PlaceSeries table.

    // noop: we keep only metrics for now
    count++
  }
  return count
}

async function ingestLAUS() {
  const fp = path.join(ROOT, 'data', 'laus_unemp_county.csv')
  if (!fs.existsSync(fp)) {
    console.warn('LAUS CSV not found:', fp)
    return 0
  }
  const rows = readCsv(fp)
  let count = 0
  for (const r of rows) {
    const fips = String(r.fips).padStart(5, '0')
    const year = Number(r.year)
    const val = r.unemployment_rate != null ? Number(r.unemployment_rate) : null
    if (!year || val == null) continue
    const code = `BLS.UNRATE.COUNTY.${fips}`
    await ensureMetric(code, `Unemployment Rate — County ${fips}`, 'percent')
    count++
  }
  return count
}

async function main() {
  try {
    const ihme = await ingestIHME()
    const laus = await ingestLAUS()
    console.log('Prepared metrics:', { ihme, laus })
    console.log(
      'Note: To store place series, consider extending schema for PlaceSeries or duplicating series per associated campus during a join step.',
    )
  } finally {
    await prisma.$disconnect()
  }
}

main()
