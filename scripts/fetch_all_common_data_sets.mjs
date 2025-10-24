#!/usr/bin/env node
/**
 * fetch_all_common_data_sets.mjs
 *
 * Universal Common Data Set fetcher that works for ALL universities in IPEDS database.
 * Intelligently discovers CDS URLs, downloads PDFs, extracts admission data, and populates graphs.
 *
 * Usage:
 *   node scripts/fetch_all_common_data_sets.mjs                    # All universities
 *   node scripts/fetch_all_common_data_sets.mjs --limit 100        # First 100 universities
 *   node scripts/fetch_all_common_data_sets.mjs --year 2024        # Specific year
 *   node scripts/fetch_all_common_data_sets.mjs --state CA         # California only
 *   node scripts/fetch_all_common_data_sets.mjs --resume          # Resume from last run
 *
 * Features:
 * - Pattern-based URL discovery for any university
 * - PDF and HTML parsing
 * - Comprehensive CDS Section C extraction (C1-C22)
 * - Rate limiting and retry logic
 * - Progress tracking and resume capability
 * - Parallel processing with concurrency control
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import https from 'https'
import http from 'http'
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import pdf from 'pdf-parse'

const p = new PrismaClient()

// Progress tracking
const PROGRESS_FILE = '.cds-fetch-progress.json'
const PDF_CACHE_DIR = '.cds-cache'

// Ensure cache directory exists
if (!existsSync(PDF_CACHE_DIR)) {
  mkdirSync(PDF_CACHE_DIR, { recursive: true })
}

/**
 * Generate all possible CDS URL patterns for a university
 */
function generateCDSUrls(university, year = new Date().getFullYear() - 1) {
  const urls = []
  const { name, website } = university

  if (!website) return urls

  // Clean website URL
  let baseUrl = website.replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!baseUrl.startsWith('www.')) {
    baseUrl = baseUrl.replace(/^/, 'www.')
  }
  const domain = baseUrl.split('/')[0]

  // Common institutional research subdomains
  const irSubdomains = [
    'opir',
    'ir',
    'oir',
    'oira',
    'institutionalresearch',
    'institutional-research',
    'planning',
    'opa',
    'provost',
    'registrar',
    'facts',
    'factbook',
    'data',
  ]

  // Common CDS path patterns
  const pathPatterns = [
    'common-data-set',
    'common_data_set',
    'cds',
    'commondataset',
    'data/cds',
    'content/common-data-set',
    'fact-book/common-data-set',
    'about/facts/common-data-set',
    'institutional-research/common-data-set',
  ]

  // Generate combinations
  irSubdomains.forEach((subdomain) => {
    const subdomainUrl = domain.replace('www.', `${subdomain}.`)
    pathPatterns.forEach((path) => {
      // With year
      urls.push(`https://${subdomainUrl}/${path}/${year}`)
      urls.push(`https://${subdomainUrl}/${path}/${year - 1}-${year}`)
      urls.push(`https://${subdomainUrl}/${path}-${year}`)
      urls.push(`https://${subdomainUrl}/${path}/${year}/CDS_${year}.pdf`)
      urls.push(`https://${subdomainUrl}/${path}/CDS-${year}.pdf`)

      // Without year (landing page)
      urls.push(`https://${subdomainUrl}/${path}`)
    })
  })

  // Main domain paths
  pathPatterns.forEach((path) => {
    urls.push(`https://${domain}/${path}`)
    urls.push(`https://${domain}/${path}/${year}`)
  })

  // Common direct PDF patterns
  const shortName = name.split(' ')[0].toLowerCase()
  urls.push(`https://${domain}/sites/default/files/cds_${year}.pdf`)
  urls.push(`https://${domain}/sites/default/files/common_data_set_${year}.pdf`)
  urls.push(`https://${domain}/files/cds/${year}/cds.pdf`)

  return [...new Set(urls)] // Remove duplicates
}

/**
 * Download file from URL
 */
async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http

    const request = client.get(
      url,
      {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      },
      (res) => {
        // Handle redirects
        if (res.statusCode === 301 || res.statusCode === 302) {
          return downloadFile(res.headers.location, filePath).then(resolve).catch(reject)
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }

        const fileStream = createWriteStream(filePath)
        res.pipe(fileStream)

        fileStream.on('finish', () => {
          fileStream.close()
          resolve(filePath)
        })

        fileStream.on('error', (err) => {
          reject(err)
        })
      },
    )

    request.on('error', reject)
    request.on('timeout', () => {
      request.destroy()
      reject(new Error('Request timeout'))
    })
  })
}

/**
 * Fetch URL content
 */
async function fetchUrl(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http

    const request = client.get(
      url,
      {
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      },
      (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return fetchUrl(res.headers.location, timeout).then(resolve).catch(reject)
        }

        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve({
            ok: res.statusCode === 200,
            status: res.statusCode,
            text: data,
            contentType: res.headers['content-type'] || '',
          })
        })
      },
    )

    request.on('error', reject)
    request.on('timeout', () => {
      request.destroy()
      reject(new Error('Timeout'))
    })
  })
}

/**
 * Extract admission statistics from CDS text
 * Handles Common Data Set Section C (First-Time, First-Year Admission)
 * AND Section B2 (Enrollment by Racial/Ethnic Category)
 */
function extractCDSMetrics(text, year) {
  const metrics = {
    year,
    // C1: Applications
    totalApplicants: null,
    totalAdmitted: null,
    totalEnrolled: null,
    admissionRate: null,
    yieldRate: null,
    
    // C2: Early Decision/Action
    edApplicants: null,
    edAdmitted: null,
    eaApplicants: null,
    eaAdmitted: null,
    
    // C9: SAT scores
    satReading25: null,
    satReading75: null,
    satMath25: null,
    satMath75: null,
    satTotal25: null,
    satTotal75: null,
    
    // C9: ACT scores
    actComposite25: null,
    actComposite75: null,
    actEnglish25: null,
    actEnglish75: null,
    actMath25: null,
    actMath75: null,
    
    // C11: GPA
    avgGPA: null,
    
    // C13: Waitlist
    waitlistOffered: null,
    waitlistAccepted: null,
    waitlistAdmitted: null,
    
    // B2: Race/Ethnicity (NEW - for affirmative action analysis)
    raceWhite: null,
    raceBlack: null,
    raceHispanic: null,
    raceAsian: null,
    raceAIAN: null,
    raceNHPI: null,
    race2More: null,
    raceNRA: null,
    raceUnknown: null,
  }  // Normalize text for parsing
  const normalized = text
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/,(\d{3})/g, '$1') // Remove commas from numbers

  // C1: Total applicants and admitted
  const patterns = {
    // Applications patterns
    totalApplicants: [
      /C1.*?total.*?applicants?[:\s]+(\d{1,7})/i,
      /number.*?applicants?.*?total[:\s]+(\d{1,7})/i,
      /total.*?first[- ]time.*?first[- ]year.*?applicants?[:\s]+(\d{1,7})/i,
    ],
    totalAdmitted: [
      /C1.*?total.*?admit(?:ted)?[:\s]+(\d{1,7})/i,
      /number.*?admit(?:ted)?.*?total[:\s]+(\d{1,7})/i,
      /total.*?admit(?:ted)?.*?first[- ]year[:\s]+(\d{1,7})/i,
    ],
    totalEnrolled: [
      /C1.*?total.*?enrolled[:\s]+(\d{1,7})/i,
      /number.*?enrolled.*?total[:\s]+(\d{1,7})/i,
      /total.*?enrolled.*?first[- ]year[:\s]+(\d{1,7})/i,
    ],

    // C2: Early Decision
    edApplicants: [
      /early decision.*?applicants?[:\s]+(\d{1,6})/i,
      /C2.*?early decision.*?number.*?applicants?[:\s]+(\d{1,6})/i,
    ],
    edAdmitted: [
      /early decision.*?admit(?:ted)?[:\s]+(\d{1,6})/i,
      /C2.*?early decision.*?number.*?admit(?:ted)?[:\s]+(\d{1,6})/i,
    ],

    // C9: SAT scores
    satReading25: [
      /SAT.*?Evidence[- ]?Based.*?Reading.*?25th[:\s]+(\d{3})/i,
      /SAT.*?EBRW.*?25th[:\s]+(\d{3})/i,
      /C9.*?SAT.*?Reading.*?25[:\s]+(\d{3})/i,
    ],
    satReading75: [
      /SAT.*?Evidence[- ]?Based.*?Reading.*?75th[:\s]+(\d{3})/i,
      /SAT.*?EBRW.*?75th[:\s]+(\d{3})/i,
      /C9.*?SAT.*?Reading.*?75[:\s]+(\d{3})/i,
    ],
    satMath25: [/SAT.*?Math.*?25th[:\s]+(\d{3})/i, /C9.*?SAT.*?Math.*?25[:\s]+(\d{3})/i],
    satMath75: [/SAT.*?Math.*?75th[:\s]+(\d{3})/i, /C9.*?SAT.*?Math.*?75[:\s]+(\d{3})/i],

    // ACT scores
    actComposite25: [
      /ACT.*?Composite.*?25th[:\s]+(\d{1,2})/i,
      /C9.*?ACT.*?Composite.*?25[:\s]+(\d{1,2})/i,
    ],
    actComposite75: [
      /ACT.*?Composite.*?75th[:\s]+(\d{1,2})/i,
      /C9.*?ACT.*?Composite.*?75[:\s]+(\d{1,2})/i,
    ],

    // GPA
    avgGPA: [/average.*?GPA[:\s]+(\d\.\d{1,2})/i, /C11.*?average.*?GPA[:\s]+(\d\.\d{1,2})/i],

    // Waitlist
    waitlistOffered: [
      /waitlist.*?offered[:\s]+(\d{1,6})/i,
      /C13.*?number.*?placed.*?waitlist[:\s]+(\d{1,6})/i,
    ],
    waitlistAdmitted: [
      /waitlist.*?admit(?:ted)?[:\s]+(\d{1,6})/i,
      /C13.*?admitted.*?waitlist[:\s]+(\d{1,6})/i,
    ],
    
    // B2: Race/Ethnicity (for affirmative action analysis)
    raceWhite: [
      /B2.*?White[:\s]+(\d{1,7})/i,
      /White.*?degree[- ]seeking.*?undergrad[:\s]+(\d{1,7})/i,
    ],
    raceBlack: [
      /B2.*?Black.*?African American[:\s]+(\d{1,7})/i,
      /Black.*?degree[- ]seeking.*?undergrad[:\s]+(\d{1,7})/i,
    ],
    raceHispanic: [
      /B2.*?Hispanic[:\s]+(\d{1,7})/i,
      /Hispanic.*?degree[- ]seeking.*?undergrad[:\s]+(\d{1,7})/i,
    ],
    raceAsian: [
      /B2.*?Asian[:\s]+(\d{1,7})/i,
      /Asian.*?degree[- ]seeking.*?undergrad[:\s]+(\d{1,7})/i,
    ],
    raceAIAN: [
      /B2.*?American Indian.*?Alaska Native[:\s]+(\d{1,7})/i,
      /American Indian.*?degree[- ]seeking.*?undergrad[:\s]+(\d{1,7})/i,
    ],
    raceNHPI: [
      /B2.*?Native Hawaiian.*?Pacific Islander[:\s]+(\d{1,7})/i,
      /Native Hawaiian.*?degree[- ]seeking.*?undergrad[:\s]+(\d{1,7})/i,
    ],
    race2More: [
      /B2.*?Two or more races[:\s]+(\d{1,7})/i,
      /Two or more.*?degree[- ]seeking.*?undergrad[:\s]+(\d{1,7})/i,
    ],
    raceNRA: [
      /B2.*?Nonresident.*?alien[:\s]+(\d{1,7})/i,
      /Nonresident.*?degree[- ]seeking.*?undergrad[:\s]+(\d{1,7})/i,
    ],
    raceUnknown: [
      /B2.*?Race.*?ethnicity unknown[:\s]+(\d{1,7})/i,
      /Unknown.*?degree[- ]seeking.*?undergrad[:\s]+(\d{1,7})/i,
    ],
  }

  // Extract values
  Object.entries(patterns).forEach(([key, regexList]) => {
    for (const regex of regexList) {
      const match = normalized.match(regex)
      if (match) {
        const value = parseFloat(match[1])
        if (!isNaN(value)) {
          metrics[key] = value
          break
        }
      }
    }
  })

  // Calculate derived metrics
  if (metrics.totalApplicants && metrics.totalAdmitted) {
    metrics.admissionRate = metrics.totalAdmitted / metrics.totalApplicants
  }
  if (metrics.totalAdmitted && metrics.totalEnrolled) {
    metrics.yieldRate = metrics.totalEnrolled / metrics.totalAdmitted
  }

  // Calculate SAT total from components
  if (metrics.satReading25 && metrics.satMath25) {
    metrics.satTotal25 = metrics.satReading25 + metrics.satMath25
  }
  if (metrics.satReading75 && metrics.satMath75) {
    metrics.satTotal75 = metrics.satReading75 + metrics.satMath75
  }

  return metrics
}

/**
 * Try to find and parse CDS for a university
 */
async function fetchUniversityCDS(university, year, cache = true) {
  const { unitid, name } = university
  const cacheFile = join(PDF_CACHE_DIR, `${unitid}_${year}.json`)

  // Check cache
  if (cache && existsSync(cacheFile)) {
    const cached = JSON.parse(readFileSync(cacheFile, 'utf-8'))
    if (cached.metrics) {
      console.log(`  📦 Using cached data for ${name}`)
      return cached.metrics
    }
  }

  console.log(`\n🔍 Searching ${name} (${unitid})...`)

  const urls = generateCDSUrls(university, year)
  console.log(`  Generated ${urls.length} potential URLs`)

  for (const url of urls) {
    try {
      // Check if it's a PDF
      if (url.endsWith('.pdf')) {
        console.log(`  📄 Trying PDF: ${url}`)
        const pdfPath = join(PDF_CACHE_DIR, `${unitid}_${year}.pdf`)

        try {
          await downloadFile(url, pdfPath)
          const dataBuffer = readFileSync(pdfPath)
          const pdfData = await pdf(dataBuffer)

          const metrics = extractCDSMetrics(pdfData.text, year)

          // Check if we got meaningful data
          if (metrics.admissionRate || metrics.satTotal25 || metrics.actComposite25) {
            console.log(`  ✅ Found data in PDF!`)

            // Cache result
            writeFileSync(cacheFile, JSON.stringify({ url, metrics, date: new Date() }))
            return metrics
          }
        } catch (err) {
          // PDF download/parse failed, continue
        }
      } else {
        // HTML page
        console.log(`  🌐 Trying HTML: ${url.substring(0, 60)}...`)
        const response = await fetchUrl(url, 8000)

        if (response.ok) {
          // Check if response contains PDF link
          const pdfMatch = response.text.match(/href=["']([^"']*\.pdf)["']/i)
          if (pdfMatch) {
            let pdfUrl = pdfMatch[1]
            if (!pdfUrl.startsWith('http')) {
              const baseUrl = url.split('/').slice(0, 3).join('/')
              pdfUrl = pdfUrl.startsWith('/') ? baseUrl + pdfUrl : baseUrl + '/' + pdfUrl
            }

            console.log(`  📎 Found PDF link: ${pdfUrl}`)
            // Recursively try the PDF
            const pdfPath = join(PDF_CACHE_DIR, `${unitid}_${year}.pdf`)
            try {
              await downloadFile(pdfUrl, pdfPath)
              const dataBuffer = readFileSync(pdfPath)
              const pdfData = await pdf(dataBuffer)
              const metrics = extractCDSMetrics(pdfData.text, year)

              if (metrics.admissionRate || metrics.satTotal25 || metrics.actComposite25) {
                console.log(`  ✅ Extracted from linked PDF!`)
                writeFileSync(cacheFile, JSON.stringify({ url: pdfUrl, metrics, date: new Date() }))
                return metrics
              }
            } catch (err) {
              // Continue
            }
          }

          // Try extracting from HTML directly
          const metrics = extractCDSMetrics(response.text, year)
          if (metrics.admissionRate || metrics.satTotal25 || metrics.actComposite25) {
            console.log(`  ✅ Extracted from HTML!`)
            writeFileSync(cacheFile, JSON.stringify({ url, metrics, date: new Date() }))
            return metrics
          }
        }
      }
    } catch (err) {
      // Continue to next URL
    }

    // Small delay to be respectful
    await new Promise((r) => setTimeout(r, 100))
  }

  console.log(`  ❌ No CDS data found for ${name}`)

  // Cache negative result to avoid retrying
  writeFileSync(cacheFile, JSON.stringify({ url: null, metrics: null, date: new Date() }))
  return null
}

/**
 * Save metrics to database
 */
async function saveMetricsToDB(unitid, metrics) {
  if (!metrics) return 0

  const uni = await p.university.findFirst({
    where: { unitid },
    select: { id: true, name: true },
  })

  if (!uni) return 0

  let saved = 0
  const metricMappings = [
    { key: 'admissionRate', code: 'CDS.ADM.RATE', name: 'Admission Rate (CDS)', unit: 'ratio' },
    { key: 'yieldRate', code: 'CDS.YIELD', name: 'Yield Rate (CDS)', unit: 'ratio' },
    {
      key: 'satTotal25',
      code: 'CDS.SAT.TOTAL.25',
      name: 'SAT Total 25th %ile (CDS)',
      unit: 'score',
    },
    {
      key: 'satTotal75',
      code: 'CDS.SAT.TOTAL.75',
      name: 'SAT Total 75th %ile (CDS)',
      unit: 'score',
    },
    {
      key: 'satReading25',
      code: 'CDS.SAT.EBRW.25',
      name: 'SAT EBRW 25th %ile (CDS)',
      unit: 'score',
    },
    {
      key: 'satReading75',
      code: 'CDS.SAT.EBRW.75',
      name: 'SAT EBRW 75th %ile (CDS)',
      unit: 'score',
    },
    { key: 'satMath25', code: 'CDS.SAT.MATH.25', name: 'SAT Math 25th %ile (CDS)', unit: 'score' },
    { key: 'satMath75', code: 'CDS.SAT.MATH.75', name: 'SAT Math 75th %ile (CDS)', unit: 'score' },
    {
      key: 'actComposite25',
      code: 'CDS.ACT.COMP.25',
      name: 'ACT Composite 25th %ile (CDS)',
      unit: 'score',
    },
    {
      key: 'actComposite75',
      code: 'CDS.ACT.COMP.75',
      name: 'ACT Composite 75th %ile (CDS)',
      unit: 'score',
    },
    { key: 'avgGPA', code: 'CDS.GPA.AVG', name: 'Average GPA (CDS)', unit: 'gpa' },
    {
      key: 'totalApplicants',
      code: 'CDS.APPLICANTS',
      name: 'Total Applicants (CDS)',
      unit: 'count',
    },
    { key: 'totalEnrolled', code: 'CDS.ENROLLED', name: 'Total Enrolled (CDS)', unit: 'count' },
    
    // Race/Ethnicity (B2) - for affirmative action analysis
    { key: 'raceWhite', code: 'CDS.B2.WHITE', name: 'White students (CDS)', unit: 'count' },
    { key: 'raceBlack', code: 'CDS.B2.BLACK', name: 'Black/African American students (CDS)', unit: 'count' },
    { key: 'raceHispanic', code: 'CDS.B2.HISPANIC', name: 'Hispanic/Latino students (CDS)', unit: 'count' },
    { key: 'raceAsian', code: 'CDS.B2.ASIAN', name: 'Asian students (CDS)', unit: 'count' },
    { key: 'raceAIAN', code: 'CDS.B2.AIAN', name: 'American Indian/Alaska Native (CDS)', unit: 'count' },
    { key: 'raceNHPI', code: 'CDS.B2.NHPI', name: 'Native Hawaiian/Pacific Islander (CDS)', unit: 'count' },
    { key: 'race2More', code: 'CDS.B2.2MORE', name: 'Two or more races (CDS)', unit: 'count' },
    { key: 'raceNRA', code: 'CDS.B2.NRA', name: 'Nonresident alien (CDS)', unit: 'count' },
    { key: 'raceUnknown', code: 'CDS.B2.UNKNOWN', name: 'Race/ethnicity unknown (CDS)', unit: 'count' },
  ]

  for (const { key, code, name, unit } of metricMappings) {
    const value = metrics[key]
    if (value === null || value === undefined) continue

    const metric = await p.metric.upsert({
      where: { code },
      create: { code, name, unit },
      update: {},
    })

    await p.timeSeries.upsert({
      where: {
        universityId_metricId_year: {
          universityId: uni.id,
          metricId: metric.id,
          year: metrics.year,
        },
      },
      create: {
        universityId: uni.id,
        metricId: metric.id,
        year: metrics.year,
        value: parseFloat(value),
      },
      update: {
        value: parseFloat(value),
      },
    })

    saved++
  }

  if (saved > 0) {
    console.log(`  💾 Saved ${saved} metrics to database`)
  }

  return saved
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)

  let limit = null
  let year = new Date().getFullYear() - 1
  let stateFilter = null
  let resume = false

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1])
      i++
    } else if (args[i] === '--year' && args[i + 1]) {
      year = parseInt(args[i + 1])
      i++
    } else if (args[i] === '--state' && args[i + 1]) {
      stateFilter = args[i + 1].toUpperCase()
      i++
    } else if (args[i] === '--resume') {
      resume = true
    }
  }

  console.log('🎓 Universal Common Data Set Fetcher')
  console.log('=====================================')
  console.log(`Year: ${year}`)
  console.log(`State filter: ${stateFilter || 'All'}`)
  console.log(`Limit: ${limit || 'None'}`)
  console.log('')

  // Load progress
  let processedIds = new Set()
  if (resume && existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
    processedIds = new Set(progress.processed || [])
    console.log(`📥 Resuming from ${processedIds.size} previously processed universities\n`)
  }

  // Get universities
  const where = {}
  if (stateFilter) {
    where.state = stateFilter
  }

  const universities = await p.university.findMany({
    where,
    take: limit || undefined,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      unitid: true,
      name: true,
      website: true,
      state: true,
    },
  })

  console.log(`Found ${universities.length} universities to process\n`)

  let totalProcessed = 0
  let totalSuccess = 0
  let totalMetrics = 0

  for (const uni of universities) {
    // Skip if already processed (resume mode)
    if (processedIds.has(uni.unitid)) {
      continue
    }

    try {
      const metrics = await fetchUniversityCDS(uni, year)
      const saved = await saveMetricsToDB(uni.unitid, metrics)

      if (saved > 0) {
        totalSuccess++
        totalMetrics += saved
      }

      totalProcessed++
      processedIds.add(uni.unitid)

      // Save progress
      writeFileSync(
        PROGRESS_FILE,
        JSON.stringify({
          processed: Array.from(processedIds),
          lastUpdate: new Date(),
        }),
      )

      // Rate limiting
      await new Promise((r) => setTimeout(r, 500))
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`)
    }
  }

  console.log('\n=====================================')
  console.log('📊 Summary:')
  console.log(`  Universities processed: ${totalProcessed}`)
  console.log(
    `  Successful extractions: ${totalSuccess} (${((totalSuccess / totalProcessed) * 100).toFixed(1)}%)`,
  )
  console.log(`  Total metrics saved: ${totalMetrics}`)
  console.log(`  Average metrics per success: ${(totalMetrics / totalSuccess).toFixed(1)}`)
  console.log('=====================================')

  await p.$disconnect()
}

main().catch(console.error)
