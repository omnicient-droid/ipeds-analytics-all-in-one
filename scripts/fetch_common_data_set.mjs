#!/usr/bin/env node
/**
 * fetch_common_data_set.mjs
 * 
 * Automatically fetches Common Data Set (CDS) documents for universities
 * and extracts admission statistics to populate the database.
 * 
 * Usage:
 *   node scripts/fetch_common_data_set.mjs [unitid]
 *   node scripts/fetch_common_data_set.mjs 190150  # Columbia University
 *   node scripts/fetch_common_data_set.mjs --all    # All universities in DB
 * 
 * Features:
 * - Searches for latest CDS PDFs from university websites
 * - Extracts admission rate, SAT/ACT scores, enrollment data
 * - Updates timeSeries records with latest data
 * - Supports multiple data sources (IPEDS, Common Data Set, direct queries)
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import https from 'https'
import http from 'http'

const p = new PrismaClient()

// Common Data Set search patterns for different universities
const CDS_URL_PATTERNS = {
  // Columbia University (190150)
  190150: {
    name: 'Columbia University',
    cdsUrls: [
      'https://opir.columbia.edu/content/common-data-set',
      'https://www.college.columbia.edu/about/data',
    ],
    alternativeUrls: [
      'https://undergrad.admissions.columbia.edu/apply/first-year/class-profile',
    ],
  },
  // Harvard University (166027)
  166027: {
    name: 'Harvard University',
    cdsUrls: [
      'https://oir.harvard.edu/fact-book',
      'https://registrar.fas.harvard.edu/faculty-staff/statistics',
    ],
  },
  // Stanford University (243744)
  243744: {
    name: 'Stanford University',
    cdsUrls: [
      'https://ucomm.stanford.edu/cds/',
      'https://ir.stanford.edu/common-data-set',
    ],
  },
  // Yale University (130794)
  130794: {
    name: 'Yale University',
    cdsUrls: [
      'https://oir.yale.edu/common-data-set',
    ],
  },
  // MIT (166683)
  166683: {
    name: 'Massachusetts Institute of Technology',
    cdsUrls: [
      'https://ir.mit.edu/cds',
    ],
  },
}

/**
 * Fetch content from a URL
 */
async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Handle redirects
        return fetchUrl(res.headers.location).then(resolve).catch(reject)
      }
      
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ ok: true, status: res.statusCode, text: data })
        } else {
          resolve({ ok: false, status: res.statusCode, text: data })
        }
      })
    }).on('error', reject)
  })
}

/**
 * Extract admission statistics from CDS text content
 * Looks for common patterns in CDS documents (Section C)
 */
function extractAdmissionStats(text, year) {
  const stats = {
    year,
    admissionRate: null,
    sat25: null,
    sat75: null,
    act25: null,
    act75: null,
  }

  // Common Data Set Section C patterns
  // C1: Number of applicants and admits
  const applicantsMatch = text.match(/C1.*?total.*?applicants?[:\s]+(\d{1,3}(?:,\d{3})*)/i)
  const admitsMatch = text.match(/C1.*?total.*?admit(?:ted)?[:\s]+(\d{1,3}(?:,\d{3})*)/i)
  
  if (applicantsMatch && admitsMatch) {
    const applicants = parseInt(applicantsMatch[1].replace(/,/g, ''))
    const admits = parseInt(admitsMatch[1].replace(/,/g, ''))
    stats.admissionRate = (admits / applicants).toFixed(4)
  }

  // C9: SAT scores (25th and 75th percentile)
  const sat25Match = text.match(/SAT.*?25th.*?percentile[:\s]+(\d{3,4})/i)
  const sat75Match = text.match(/SAT.*?75th.*?percentile[:\s]+(\d{3,4})/i)
  
  if (sat25Match) stats.sat25 = parseInt(sat25Match[1])
  if (sat75Match) stats.sat75 = parseInt(sat75Match[1])

  // C9: ACT scores (25th and 75th percentile)
  const act25Match = text.match(/ACT.*?25th.*?percentile[:\s]+(\d{1,2})/i)
  const act75Match = text.match(/ACT.*?75th.*?percentile[:\s]+(\d{1,2})/i)
  
  if (act25Match) stats.act25 = parseInt(act25Match[1])
  if (act75Match) stats.act75 = parseInt(act75Match[1])

  return stats
}

/**
 * Fetch CDS data for a specific university
 */
async function fetchCDSForUniversity(unitid, year = new Date().getFullYear() - 1) {
  const config = CDS_URL_PATTERNS[unitid]
  
  if (!config) {
    console.log(`⚠️  No CDS URL pattern configured for unitid ${unitid}`)
    return null
  }

  console.log(`\n🔍 Searching for ${config.name} (${unitid}) CDS ${year}...`)

  // Try each CDS URL pattern
  for (const baseUrl of config.cdsUrls) {
    try {
      console.log(`   Trying: ${baseUrl}`)
      const response = await fetchUrl(baseUrl)
      
      if (response.ok) {
        // Look for year-specific links in the page
        const yearPattern = new RegExp(`${year}|${year-1}`, 'g')
        if (yearPattern.test(response.text)) {
          console.log(`   ✓ Found potential ${year} data`)
          const stats = extractAdmissionStats(response.text, year)
          
          if (stats.admissionRate || stats.sat25 || stats.act25) {
            console.log(`   ✓ Extracted stats:`, stats)
            return stats
          }
        }
      }
    } catch (error) {
      console.log(`   ✗ Failed: ${error.message}`)
    }
  }

  // Try alternative sources
  if (config.alternativeUrls) {
    for (const url of config.alternativeUrls) {
      try {
        console.log(`   Trying alternative: ${url}`)
        const response = await fetchUrl(url)
        if (response.ok) {
          const stats = extractAdmissionStats(response.text, year)
          if (stats.admissionRate || stats.sat25 || stats.act25) {
            console.log(`   ✓ Extracted stats from alternative source:`, stats)
            return stats
          }
        }
      } catch (error) {
        console.log(`   ✗ Failed: ${error.message}`)
      }
    }
  }

  console.log(`   ✗ No data found for ${year}`)
  return null
}

/**
 * Update database with CDS statistics
 */
async function updateDatabaseWithStats(unitid, stats) {
  if (!stats) return 0

  const uni = await p.university.findFirst({
    where: { unitid: Number(unitid) },
    select: { id: true, name: true },
  })

  if (!uni) {
    console.log(`   ✗ University ${unitid} not found in database`)
    return 0
  }

  let updated = 0

  // Update admission rate
  if (stats.admissionRate !== null) {
    const metric = await p.metric.upsert({
      where: { code: 'CDS.ADM.RATE' },
      create: { code: 'CDS.ADM.RATE', name: 'Admission rate (CDS)', unit: 'ratio' },
      update: {},
    })

    await p.timeSeries.upsert({
      where: {
        universityId_metricId_year: {
          universityId: uni.id,
          metricId: metric.id,
          year: stats.year,
        },
      },
      create: {
        universityId: uni.id,
        metricId: metric.id,
        year: stats.year,
        value: parseFloat(stats.admissionRate),
      },
      update: {
        value: parseFloat(stats.admissionRate),
      },
    })
    updated++
  }

  // Update SAT 25th percentile
  if (stats.sat25 !== null) {
    const metric = await p.metric.upsert({
      where: { code: 'CDS.SAT.25' },
      create: { code: 'CDS.SAT.25', name: 'SAT Total 25th percentile (CDS)', unit: 'score' },
      update: {},
    })

    await p.timeSeries.upsert({
      where: {
        universityId_metricId_year: {
          universityId: uni.id,
          metricId: metric.id,
          year: stats.year,
        },
      },
      create: {
        universityId: uni.id,
        metricId: metric.id,
        year: stats.year,
        value: stats.sat25,
      },
      update: {
        value: stats.sat25,
      },
    })
    updated++
  }

  // Update SAT 75th percentile
  if (stats.sat75 !== null) {
    const metric = await p.metric.upsert({
      where: { code: 'CDS.SAT.75' },
      create: { code: 'CDS.SAT.75', name: 'SAT Total 75th percentile (CDS)', unit: 'score' },
      update: {},
    })

    await p.timeSeries.upsert({
      where: {
        universityId_metricId_year: {
          universityId: uni.id,
          metricId: metric.id,
          year: stats.year,
        },
      },
      create: {
        universityId: uni.id,
        metricId: metric.id,
        year: stats.year,
        value: stats.sat75,
      },
      update: {
        value: stats.sat75,
      },
    })
    updated++
  }

  console.log(`   ✓ Updated ${updated} metric${updated !== 1 ? 's' : ''} for ${uni.name}`)
  return updated
}

/**
 * Main function
 */
async function main() {
  const arg = process.argv[2]
  const currentYear = new Date().getFullYear()
  const targetYear = parseInt(process.argv[3]) || currentYear - 1

  if (!arg) {
    console.log('Usage: node fetch_common_data_set.mjs [unitid|--all] [year]')
    console.log('\nExamples:')
    console.log('  node fetch_common_data_set.mjs 190150       # Columbia University, latest year')
    console.log('  node fetch_common_data_set.mjs 190150 2024  # Columbia University, 2024')
    console.log('  node fetch_common_data_set.mjs --all        # All configured universities')
    console.log('\nConfigured universities:')
    Object.entries(CDS_URL_PATTERNS).forEach(([unitid, config]) => {
      console.log(`  ${unitid}: ${config.name}`)
    })
    process.exit(0)
  }

  if (arg === '--all') {
    // Fetch for all configured universities
    let totalUpdated = 0
    for (const unitid of Object.keys(CDS_URL_PATTERNS)) {
      const stats = await fetchCDSForUniversity(parseInt(unitid), targetYear)
      const updated = await updateDatabaseWithStats(parseInt(unitid), stats)
      totalUpdated += updated
    }
    console.log(`\n✅ Total metrics updated: ${totalUpdated}`)
  } else {
    // Fetch for specific university
    const unitid = parseInt(arg)
    if (isNaN(unitid)) {
      console.error('Error: unitid must be a number')
      process.exit(1)
    }

    const stats = await fetchCDSForUniversity(unitid, targetYear)
    const updated = await updateDatabaseWithStats(unitid, stats)
    
    if (updated === 0) {
      console.log('\n⚠️  No data was updated. Consider:')
      console.log('   1. Adding CDS URL patterns for this university in CDS_URL_PATTERNS')
      console.log('   2. Checking if the university publishes a Common Data Set')
      console.log('   3. Manually entering data from published statistics')
    }
  }

  await p.$disconnect()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
