#!/usr/bin/env node
/**
 * fetch_race_demographics.mjs
 * 
 * Comprehensive race/ethnicity data fetcher for analyzing affirmative action impact.
 * Fetches from multiple sources to build complete picture of demographic changes.
 * 
 * Key Focus: Pre/Post SFFA v. Harvard (2023) demographic shifts
 * 
 * Data Sources:
 * 1. College Scorecard API - Race percentages (UGDS_* fields)
 * 2. IPEDS Fall Enrollment - Detailed race breakdowns
 * 3. Common Data Set Section B2 - Enrolled student demographics
 * 4. University diversity reports - Public commitments
 * 
 * Usage:
 *   node scripts/fetch_race_demographics.mjs                      # All sources, all schools
 *   node scripts/fetch_race_demographics.mjs --source scorecard   # Scorecard only
 *   node scripts/fetch_race_demographics.mjs --year-range 2020-2024  # Focus on SFFA period
 *   node scripts/fetch_race_demographics.mjs --unitid 190150      # Columbia only
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import https from 'https'
import http from 'http'

const p = new PrismaClient()
const KEY = process.env.COLLEGESCORECARD_API_KEY || ''
const SCORECARD_BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools'

/**
 * Race/ethnicity metric definitions
 */
const RACE_METRICS = {
  // College Scorecard demographics (percentages)
  scorecard: [
    { code: 'SC.UGDS.WHITE', field: 'student.demographics.race_ethnicity.white', name: 'White students %', unit: 'ratio' },
    { code: 'SC.UGDS.BLACK', field: 'student.demographics.race_ethnicity.black', name: 'Black students %', unit: 'ratio' },
    { code: 'SC.UGDS.HISPANIC', field: 'student.demographics.race_ethnicity.hispanic', name: 'Hispanic students %', unit: 'ratio' },
    { code: 'SC.UGDS.ASIAN', field: 'student.demographics.race_ethnicity.asian', name: 'Asian students %', unit: 'ratio' },
    { code: 'SC.UGDS.AIAN', field: 'student.demographics.race_ethnicity.aian', name: 'American Indian/Alaska Native %', unit: 'ratio' },
    { code: 'SC.UGDS.NHPI', field: 'student.demographics.race_ethnicity.nhpi', name: 'Native Hawaiian/Pacific Islander %', unit: 'ratio' },
    { code: 'SC.UGDS.2MORE', field: 'student.demographics.race_ethnicity.two_or_more', name: 'Two or more races %', unit: 'ratio' },
    { code: 'SC.UGDS.NRA', field: 'student.demographics.race_ethnicity.non_resident_alien', name: 'Nonresident alien %', unit: 'ratio' },
    { code: 'SC.UGDS.UNKNOWN', field: 'student.demographics.race_ethnicity.unknown', name: 'Unknown race %', unit: 'ratio' },
  ],
  
  // IPEDS Fall Enrollment (counts)
  ipeds: [
    { code: 'IPEDS.EF.WHITE', name: 'White enrollment (IPEDS)', unit: 'count' },
    { code: 'IPEDS.EF.BLACK', name: 'Black enrollment (IPEDS)', unit: 'count' },
    { code: 'IPEDS.EF.HISPANIC', name: 'Hispanic enrollment (IPEDS)', unit: 'count' },
    { code: 'IPEDS.EF.ASIAN', name: 'Asian enrollment (IPEDS)', unit: 'count' },
    { code: 'IPEDS.EF.AIAN', name: 'American Indian/Alaska Native (IPEDS)', unit: 'count' },
    { code: 'IPEDS.EF.NHPI', name: 'Native Hawaiian/Pacific Islander (IPEDS)', unit: 'count' },
    { code: 'IPEDS.EF.2MORE', name: 'Two or more races (IPEDS)', unit: 'count' },
    { code: 'IPEDS.EF.NRA', name: 'Nonresident alien (IPEDS)', unit: 'count' },
    { code: 'IPEDS.EF.UNKNOWN', name: 'Unknown race (IPEDS)', unit: 'count' },
  ],
  
  // Common Data Set Section B2
  cds: [
    { code: 'CDS.B2.WHITE', name: 'White enrollment (CDS)', unit: 'count' },
    { code: 'CDS.B2.BLACK', name: 'Black enrollment (CDS)', unit: 'count' },
    { code: 'CDS.B2.HISPANIC', name: 'Hispanic enrollment (CDS)', unit: 'count' },
    { code: 'CDS.B2.ASIAN', name: 'Asian enrollment (CDS)', unit: 'count' },
    { code: 'CDS.B2.AIAN', name: 'American Indian/Alaska Native (CDS)', unit: 'count' },
    { code: 'CDS.B2.NHPI', name: 'Native Hawaiian/Pacific Islander (CDS)', unit: 'count' },
    { code: 'CDS.B2.2MORE', name: 'Two or more races (CDS)', unit: 'count' },
    { code: 'CDS.B2.NRA', name: 'Nonresident alien (CDS)', unit: 'count' },
    { code: 'CDS.B2.UNKNOWN', name: 'Unknown race (CDS)', unit: 'count' },
  ],
}

/**
 * Fetch URL content
 */
async function fetchUrl(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    
    const request = client.get(url, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrl(res.headers.location, timeout).then(resolve).catch(reject)
      }

      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        resolve({
          ok: res.statusCode === 200,
          status: res.statusCode,
          text: data,
          json: async () => JSON.parse(data)
        })
      })
    })

    request.on('error', reject)
    request.on('timeout', () => {
      request.destroy()
      reject(new Error('Timeout'))
    })
  })
}

/**
 * Fetch College Scorecard race demographics for a year
 */
async function fetchScorecardRaceDemographics(year) {
  if (!KEY) {
    console.log('⚠️  Missing COLLEGESCORECARD_API_KEY - skipping Scorecard data')
    return []
  }

  console.log(`\n📊 Fetching College Scorecard race data for ${year}...`)
  
  const fields = [
    'id',
    'school.name',
    'school.state',
    ...RACE_METRICS.scorecard.map(m => `${year}.${m.field}`)
  ].join(',')

  const results = []
  let page = 0
  const perPage = 100

  while (true) {
    const url = `${SCORECARD_BASE}?api_key=${KEY}&fields=${encodeURIComponent(fields)}&per_page=${perPage}&page=${page}`
    
    try {
      const response = await fetchUrl(url)
      const data = await response.json()
      
      if (!data.results || data.results.length === 0) break
      
      for (const row of data.results) {
        const unitid = row.id
        if (!unitid) continue
        
        const schoolData = {
          unitid: parseInt(unitid),
          name: row.school?.name,
          state: row.school?.state,
          year,
          demographics: {}
        }
        
        // Extract race percentages
        RACE_METRICS.scorecard.forEach(metric => {
          const value = metric.field.split('.').reduce((obj, key) => obj?.[key], row[year])
          if (value !== null && value !== undefined && !isNaN(value)) {
            schoolData.demographics[metric.code] = parseFloat(value)
          }
        })
        
        if (Object.keys(schoolData.demographics).length > 0) {
          results.push(schoolData)
        }
      }
      
      console.log(`  Page ${page}: ${data.results.length} schools, ${results.length} total`)
      
      if (data.results.length < perPage) break
      page++
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 200))
    } catch (err) {
      console.log(`  ❌ Error on page ${page}: ${err.message}`)
      break
    }
  }
  
  console.log(`✅ Fetched ${results.length} schools with race data for ${year}`)
  return results
}

/**
 * Save race demographics to database
 */
async function saveDemographicsToDb(schoolData) {
  const { unitid, name, year, demographics } = schoolData
  
  // Upsert university
  const uni = await p.university.upsert({
    where: { unitid },
    create: { unitid, name },
    update: { name: name || undefined },
    select: { id: true }
  })
  
  let saved = 0
  
  // Save each demographic metric
  for (const [code, value] of Object.entries(demographics)) {
    const metricDef = [...RACE_METRICS.scorecard, ...RACE_METRICS.ipeds, ...RACE_METRICS.cds]
      .find(m => m.code === code)
    
    if (!metricDef) continue
    
    const metric = await p.metric.upsert({
      where: { code },
      create: { code, name: metricDef.name, unit: metricDef.unit },
      update: {},
    })
    
    await p.timeSeries.upsert({
      where: {
        universityId_metricId_year: {
          universityId: uni.id,
          metricId: metric.id,
          year,
        }
      },
      create: {
        universityId: uni.id,
        metricId: metric.id,
        year,
        value: parseFloat(value),
      },
      update: {
        value: parseFloat(value),
      }
    })
    
    saved++
  }
  
  return saved
}

/**
 * Extract CDS Section B2 demographics from text
 */
function extractCDSB2Demographics(text, year) {
  const demographics = {}
  
  // Normalize text
  const normalized = text
    .replace(/\s+/g, ' ')
    .replace(/,(\d{3})/g, '$1') // Remove commas from numbers
  
  // B2 patterns for enrolled students by race
  const patterns = {
    'CDS.B2.WHITE': [
      /B2.*?White[:\s]+(\d{1,7})/i,
      /White.*?undergraduates[:\s]+(\d{1,7})/i,
    ],
    'CDS.B2.BLACK': [
      /B2.*?Black.*?African American[:\s]+(\d{1,7})/i,
      /Black.*?undergraduates[:\s]+(\d{1,7})/i,
    ],
    'CDS.B2.HISPANIC': [
      /B2.*?Hispanic[:\s]+(\d{1,7})/i,
      /Hispanic.*?undergraduates[:\s]+(\d{1,7})/i,
    ],
    'CDS.B2.ASIAN': [
      /B2.*?Asian[:\s]+(\d{1,7})/i,
      /Asian.*?undergraduates[:\s]+(\d{1,7})/i,
    ],
    'CDS.B2.AIAN': [
      /B2.*?American Indian.*?Alaska Native[:\s]+(\d{1,7})/i,
      /American Indian.*?undergraduates[:\s]+(\d{1,7})/i,
    ],
    'CDS.B2.NHPI': [
      /B2.*?Native Hawaiian.*?Pacific Islander[:\s]+(\d{1,7})/i,
      /Native Hawaiian.*?undergraduates[:\s]+(\d{1,7})/i,
    ],
    'CDS.B2.2MORE': [
      /B2.*?Two or more races[:\s]+(\d{1,7})/i,
      /Two or more.*?undergraduates[:\s]+(\d{1,7})/i,
    ],
    'CDS.B2.NRA': [
      /B2.*?Nonresident.*?alien[:\s]+(\d{1,7})/i,
      /Nonresident.*?undergraduates[:\s]+(\d{1,7})/i,
    ],
    'CDS.B2.UNKNOWN': [
      /B2.*?Race.*?ethnicity unknown[:\s]+(\d{1,7})/i,
      /Unknown.*?undergraduates[:\s]+(\d{1,7})/i,
    ],
  }
  
  Object.entries(patterns).forEach(([code, regexList]) => {
    for (const regex of regexList) {
      const match = normalized.match(regex)
      if (match) {
        const value = parseInt(match[1])
        if (!isNaN(value) && value >= 0) {
          demographics[code] = value
          break
        }
      }
    }
  })
  
  return demographics
}

/**
 * Fetch race demographics from CDS for universities
 */
async function fetchCDSRaceDemographics(universities, year) {
  console.log(`\n📚 Fetching CDS Section B2 race data for ${year}...`)
  
  let found = 0
  // This would use the CDS fetcher we built earlier
  // For now, placeholder - would integrate with fetch_all_common_data_sets.mjs
  console.log(`  ℹ️  CDS B2 extraction will be added to universal CDS fetcher`)
  
  return found
}

/**
 * Generate affirmative action impact report
 */
async function generateAffirmativeActionReport() {
  console.log('\n' + '='.repeat(80))
  console.log('📊 AFFIRMATIVE ACTION IMPACT ANALYSIS')
  console.log('Students for Fair Admissions v. Harvard (2023)')
  console.log('='.repeat(80))
  
  // Key years for analysis
  const preSFFA = [2020, 2021, 2022, 2023] // Pre-ruling years
  const postSFFA = [2024, 2025] // Post-ruling years
  
  // Top universities to analyze
  const targetSchools = [
    { unitid: 190150, name: 'Columbia University' },
    { unitid: 166027, name: 'Harvard University' },
    { unitid: 243744, name: 'Stanford University' },
    { unitid: 130794, name: 'Yale University' },
    { unitid: 166683, name: 'MIT' },
    { unitid: 215062, name: 'University of North Carolina at Chapel Hill' },
  ]
  
  for (const school of targetSchools) {
    console.log(`\n📍 ${school.name}`)
    console.log('-'.repeat(40))
    
    const uni = await p.university.findFirst({
      where: { unitid: school.unitid },
      select: { id: true }
    })
    
    if (!uni) {
      console.log('  ⚠️  Not found in database')
      continue
    }
    
    // Fetch race metrics
    const raceData = await p.timeSeries.findMany({
      where: {
        universityId: uni.id,
        metric: {
          code: { startsWith: 'SC.UGDS.' }
        },
        year: { in: [...preSFFA, ...postSFFA] }
      },
      include: { metric: true },
      orderBy: [{ year: 'asc' }, { metric: { code: 'asc' } }]
    })
    
    if (raceData.length === 0) {
      console.log('  ⚠️  No race data available')
      continue
    }
    
    // Calculate pre/post averages
    const byMetric = {}
    raceData.forEach(point => {
      const code = point.metric.code
      if (!byMetric[code]) byMetric[code] = { pre: [], post: [] }
      
      if (preSFFA.includes(point.year)) {
        byMetric[code].pre.push(point.value)
      } else if (postSFFA.includes(point.year)) {
        byMetric[code].post.push(point.value)
      }
    })
    
    // Display changes
    Object.entries(byMetric).forEach(([code, data]) => {
      const metric = RACE_METRICS.scorecard.find(m => m.code === code)
      if (!metric) return
      
      const preAvg = data.pre.length > 0 
        ? data.pre.reduce((a, b) => a + b, 0) / data.pre.length 
        : null
      const postAvg = data.post.length > 0
        ? data.post.reduce((a, b) => a + b, 0) / data.post.length
        : null
      
      if (preAvg !== null && postAvg !== null) {
        const change = ((postAvg - preAvg) / preAvg) * 100
        const arrow = change > 0 ? '↗' : change < 0 ? '↘' : '→'
        console.log(`  ${arrow} ${metric.name}: ${(preAvg*100).toFixed(1)}% → ${(postAvg*100).toFixed(1)}% (${change > 0 ? '+' : ''}${change.toFixed(1)}%)`)
      }
    })
  }
  
  console.log('\n' + '='.repeat(80))
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)
  
  let source = 'all' // scorecard, ipeds, cds, all
  let yearRange = [2020, 2021, 2022, 2023, 2024, 2025] // Focus on SFFA period
  let unitid = null
  let report = false
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      source = args[i + 1]
      i++
    } else if (args[i] === '--year-range' && args[i + 1]) {
      const [start, end] = args[i + 1].split('-').map(Number)
      yearRange = []
      for (let y = start; y <= end; y++) yearRange.push(y)
      i++
    } else if (args[i] === '--unitid' && args[i + 1]) {
      unitid = parseInt(args[i + 1])
      i++
    } else if (args[i] === '--report') {
      report = true
    }
  }
  
  console.log('🎓 Race Demographics Fetcher')
  console.log('Focus: Affirmative Action Impact Analysis')
  console.log('=' .repeat(80))
  console.log(`Source: ${source}`)
  console.log(`Years: ${yearRange.join(', ')}`)
  console.log(`Target: ${unitid ? `School ${unitid}` : 'All schools'}`)
  console.log('')
  
  let totalSaved = 0
  
  // Fetch College Scorecard race demographics
  if (source === 'all' || source === 'scorecard') {
    for (const year of yearRange) {
      const schools = await fetchScorecardRaceDemographics(year)
      
      for (const school of schools) {
        if (unitid && school.unitid !== unitid) continue
        
        const saved = await saveDemographicsToDb(school)
        totalSaved += saved
      }
      
      // Rate limiting between years
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  
  // Generate report if requested
  if (report) {
    await generateAffirmativeActionReport()
  }
  
  console.log('\n' + '='.repeat(80))
  console.log(`✅ Total demographics saved: ${totalSaved}`)
  console.log('='.repeat(80))
  
  await p.$disconnect()
}

main().catch(console.error)
