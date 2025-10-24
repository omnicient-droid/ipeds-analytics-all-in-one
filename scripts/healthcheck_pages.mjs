#!/usr/bin/env node
/**
 * Healthcheck pages and APIs on a local Next.js server.
 * Assumes you've already run: npm run start -- -p 3050
 */

const BASE = process.env.HEALTHCHECK_BASE || 'http://localhost:3050'

async function fetchCatalog() {
  try {
    const res = await fetch(BASE + '/api/metrics/catalog', { method: 'GET' })
    if (!res.ok) return []
    const json = await res.json()
    return json.metrics || []
  } catch {
    return []
  }
}

async function buildPaths() {
  const staticPaths = [
    '/',
    '/about',
    '/compare',
    '/methodology',
    '/metrics',
    '/present',
    '/schools',
    '/search',
    '/upload',
    '/u/190150',
    '/schools/190150',
  ]
  const cat = await fetchCatalog()
  const sampleCodes = cat.slice(0, 15).map((c) => c.code) // sample first 15
  const metricPages = sampleCodes.map((c) => `/m/${encodeURIComponent(c)}`)
  const apiSeries = `/api/series?codes=${encodeURIComponent('EF.FALL.UG.WHITE,EF.FALL.UG.BLACK')}&unitids=190150&from=2000&to=${new Date().getFullYear()}`
  return [...staticPaths, ...metricPages, apiSeries]
}

async function check(path) {
  const url = BASE + path
  try {
    const res = await fetch(url, { method: 'GET' })
    return { path, status: res.status }
  } catch (e) {
    return { path, status: 0, error: String(e?.message || e) }
  }
}

async function main() {
  const paths = await buildPaths()
  const results = []
  for (const p of paths) {
    const r = await check(p)
    results.push(r)
  }
  const bad = results.filter((r) => r.status === 0 || r.status < 200 || r.status >= 400)
  results.forEach((r) =>
    console.log(
      `${r.status.toString().padStart(3, ' ')}  ${r.path}${r.error ? '  ' + r.error : ''}`,
    ),
  )
  if (bad.length) {
    console.error(`\n${bad.length} routes returned non-2xx status.`)
    process.exitCode = 1
  } else {
    console.log('\nAll health checks passed (2xx).')
  }
}

main()
