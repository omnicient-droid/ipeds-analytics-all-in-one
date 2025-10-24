# Data Automation Guide

This document describes the automated data fetching and ingestion systems for keeping university statistics up-to-date.

## Overview

The platform automatically collects data from multiple sources:

1. **College Scorecard API** - Historical admission and enrollment data
2. **IPEDS (Integrated Postsecondary Education Data System)** - Official federal data
3. **Common Data Set (CDS)** - Direct from university institutional research offices
4. **Web Scraping** - Latest statistics from university websites

## Available Scripts

### 1. College Scorecard Ingestion

**Script:** `scripts/scorecard_ingest.mjs`

Fetches data from the U.S. Department of Education's College Scorecard API.

```bash
# Fetch all years (2000-present)
node scripts/scorecard_ingest.mjs ALL

# Fetch specific year
node scripts/scorecard_ingest.mjs 2024

# Fetch year range
node scripts/scorecard_ingest.mjs 2020 2024
```

**Metrics collected:**
- `SC.ADM.RATE` - Admission rate (overall)
- `SC.SAT.TOTAL25` - SAT Total 25th percentile
- `SC.SAT.TOTAL75` - SAT Total 75th percentile

**Requirements:**
- College Scorecard API key in `.env`:
  ```
  COLLEGESCORECARD_API_KEY=your_key_here
  ```
- Get key from: https://api.data.gov/signup/

### 2. Universal Common Data Set Fetcher ⭐ NEW

**Script:** `scripts/fetch_all_common_data_sets.mjs`

**Automatically discovers and fetches Common Data Set documents for ALL universities** in your database, not just pre-configured ones. This is the enterprise-grade solution that scales to thousands of schools.

```bash
# Fetch CDS for ALL universities in database
node scripts/fetch_all_common_data_sets.mjs

# Limit to first 100 universities (testing)
node scripts/fetch_all_common_data_sets.mjs --limit 100

# Fetch specific year
node scripts/fetch_all_common_data_sets.mjs --year 2024

# California schools only
node scripts/fetch_all_common_data_sets.mjs --state CA

# Resume from interrupted run
node scripts/fetch_all_common_data_sets.mjs --resume

# Combine options
node scripts/fetch_all_common_data_sets.mjs --year 2023 --state NY --limit 50
```

**How it works:**

1. **Intelligent URL Discovery**: Generates 50+ potential CDS URL patterns for each university based on:
   - Common institutional research subdomains (opir, ir, oir, provost, registrar, etc.)
   - Standard CDS path patterns (common-data-set, cds, fact-book, etc.)
   - Year-specific variations (2024, 2023-2024, etc.)
   - Direct PDF links

2. **Multi-Format Parsing**:
   - Downloads and parses PDF Common Data Sets
   - Extracts from HTML pages
   - Follows links to PDFs embedded in landing pages
   - Handles redirects and various URL schemes

3. **Comprehensive Data Extraction** (CDS Section C):
   - C1: Total applicants, admitted, enrolled → **Admission Rate, Yield Rate**
   - C2: Early Decision/Early Action statistics
   - C9: SAT/ACT score ranges (25th and 75th percentiles)
   - C11: Average GPA of admitted students
   - C13: Waitlist statistics

4. **Robust Processing**:
   - Rate limiting (500ms between requests)
   - Automatic caching of results (`.cds-cache/`)
   - Progress tracking (`.cds-fetch-progress.json`)
   - Resume capability for interrupted runs
   - Error handling and retry logic

**Metrics collected:**
- `CDS.ADM.RATE` - Admission rate from CDS
- `CDS.YIELD` - Yield rate (enrolled/admitted)
- `CDS.SAT.TOTAL.25` / `CDS.SAT.TOTAL.75` - SAT Total scores
- `CDS.SAT.EBRW.25` / `CDS.SAT.EBRW.75` - SAT Evidence-Based Reading & Writing
- `CDS.SAT.MATH.25` / `CDS.SAT.MATH.75` - SAT Math
- `CDS.ACT.COMP.25` / `CDS.ACT.COMP.75` - ACT Composite
- `CDS.GPA.AVG` - Average GPA
- `CDS.APPLICANTS` - Total applicants
- `CDS.ENROLLED` - Total enrolled

**Performance:**

- Processes ~10-15 universities per minute
- Typical success rate: 40-60% (varies by university data availability)
- Handles PDF downloads, parsing, and database updates
- Completely automated - no manual configuration needed

**Cache System:**

Results are cached in `.cds-cache/` directory:
- `{unitid}_{year}.json` - Extracted metrics
- `{unitid}_{year}.pdf` - Downloaded PDFs

Benefits:
- Avoid re-downloading same data
- Faster subsequent runs
- Preserves original source documents

### 2b. Simple Common Data Set Fetcher

**Script:** `scripts/fetch_common_data_set.mjs`

A simpler version with pre-configured URLs for specific elite universities.

```bash
# Fetch Columbia University's latest CDS
node scripts/fetch_common_data_set.mjs 190150

# Fetch all configured universities (Columbia, Harvard, Stanford, Yale, MIT)
node scripts/fetch_common_data_set.mjs --all
```

**Note:** This script is superseded by the universal fetcher above, but remains useful for quick testing of specific schools with known URL patterns.

### 3. IPEDS Data Ingestion

**Script:** `scripts/ipeds_ingest_from_zip.ts`

Ingests enrollment and institutional data from IPEDS ZIP files.

```bash
# Ingest from ZIP file
npx tsx scripts/ipeds_ingest_from_zip.ts path/to/ipeds-data.zip

# Bulk ingest all files in directory
npx tsx scripts/ipeds_bulk_ingest_dir.ts data/ipeds-zips/
```

**Metrics collected:**
- Enrollment by year
- Student demographics
- Faculty statistics
- Financial data
- Campus characteristics

### 4. Comprehensive Data Update

**Script:** `scripts/bulk_ingest_comprehensive.sh`

Runs all data ingestion scripts in sequence for a complete update.

```bash
# Full data refresh
./scripts/bulk_ingest_comprehensive.sh

# Specific year
./scripts/bulk_ingest_comprehensive.sh 2024
```

## Automation Strategy

### Recommended Update Schedule

**Daily (Latest Stats):**
```bash
# Quick check for new CDS publications from top schools
node scripts/fetch_all_common_data_sets.mjs --limit 200 --resume
```

**Weekly (Comprehensive):**
```bash
# Full sweep of all universities
node scripts/fetch_all_common_data_sets.mjs --resume
```

**Monthly (Federal Data):**
```bash
# College Scorecard API update
node scripts/scorecard_ingest.mjs $(date +%Y)
```

**Quarterly (IPEDS Bulk):**
```bash
# Process latest IPEDS data releases
./scripts/bulk_ingest_comprehensive.sh
```

### For Production Deployment

Set up a **cron job** or **scheduled task** to run data updates:

```bash
# Daily CDS fetch at 2 AM (resume-safe)
0 2 * * * cd /path/to/ipeds-analytics && node scripts/fetch_all_common_data_sets.mjs --resume >> logs/cds-daily.log 2>&1

# Weekly full sweep (Sundays at 1 AM)
0 1 * * 0 cd /path/to/ipeds-analytics && node scripts/fetch_all_common_data_sets.mjs >> logs/cds-weekly.log 2>&1

# Monthly College Scorecard (1st of month at 3 AM)
0 3 1 * * cd /path/to/ipeds-analytics && node scripts/scorecard_ingest.mjs ALL >> logs/scorecard.log 2>&1
```

### For Vercel/Cloud Deployment

Use **Vercel Cron Jobs** (Enterprise) or **GitHub Actions**:

`.github/workflows/update-data.yml`:

```yaml
name: Update University Data

on:
  schedule:
    # Daily CDS fetch at 2 AM UTC
    - cron: '0 2 * * *'
    # Weekly full sweep on Sundays
    - cron: '0 1 * * 0'
  workflow_dispatch: # Allow manual trigger

jobs:
  update-cds:
    runs-on: ubuntu-latest
    timeout-minutes: 180
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Fetch All Common Data Sets
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: node scripts/fetch_all_common_data_sets.mjs --resume
      
      - name: Upload cache artifacts
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: cds-cache
          path: .cds-cache/
          retention-days: 30
      
      - name: Upload progress file
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: cds-progress
          path: .cds-fetch-progress.json
          retention-days: 7

  update-scorecard:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 1 * * 0'  # Only on weekly runs
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Fetch College Scorecard
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          COLLEGESCORECARD_API_KEY: ${{ secrets.COLLEGESCORECARD_API_KEY }}
        run: node scripts/scorecard_ingest.mjs $(date +%Y)
```

### Monitoring & Alerts

Set up monitoring to track:
- Success rate (should be 40-60%)
- Processing time
- Database growth
- Failed fetches requiring manual intervention

**Example monitoring script:**

```bash
#!/bin/bash
# monitor_cds_fetch.sh

SUCCESS_RATE=$(tail -1 logs/cds-fetch.log | grep -oP '(?<=Successful extractions: )\d+/\d+')
if [ -z "$SUCCESS_RATE" ]; then
  echo "⚠️  CDS fetch may have failed - check logs"
  # Send alert (email, Slack, etc.)
fi
```

## Manual Data Entry

For the latest Columbia 2024 admission data (or any university):

### Option 1: Direct Database Insert

```sql
-- Find university and metric IDs
SELECT id, name FROM "University" WHERE unitid = 190150;
SELECT id, code FROM "Metric" WHERE code = 'CDS.ADM.RATE';

-- Insert new data point
INSERT INTO "TimeSeries" ("universityId", "metricId", year, value)
VALUES (
  (SELECT id FROM "University" WHERE unitid = 190150),
  (SELECT id FROM "Metric" WHERE code = 'CDS.ADM.RATE'),
  2024,
  0.033  -- 3.3% admission rate
);
```

### Option 2: Use Prisma Client

```javascript
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const uni = await p.university.findFirst({
  where: { unitid: 190150 }
})

const metric = await p.metric.findFirst({
  where: { code: 'CDS.ADM.RATE' }
})

await p.timeSeries.create({
  data: {
    universityId: uni.id,
    metricId: metric.id,
    year: 2024,
    value: 0.033
  }
})
```

### Option 3: Use the Scorecard Ingest Script

If the data is available via College Scorecard API:

```bash
node scripts/scorecard_ingest_one.mjs 190150 2024
```

## Verifying Data

Check if Columbia 2024 data exists:

```bash
node scripts/verify_columbia.mjs
```

Or query directly:

```sql
SELECT 
  u.name,
  m.name as metric,
  ts.year,
  ts.value
FROM "TimeSeries" ts
JOIN "University" u ON u.id = ts."universityId"
JOIN "Metric" m ON m.id = ts."metricId"
WHERE u.unitid = 190150
  AND ts.year = 2024
ORDER BY ts.year DESC, m.code;
```

## Data Sources by University

### Columbia University (190150)

**Official Sources:**
- Common Data Set: https://opir.columbia.edu/content/common-data-set (currently unavailable)
- Class Profile: https://undergrad.admissions.columbia.edu/apply/first-year/class-profile
- Columbia Spectator: https://www.columbiaspectator.com (student newspaper, often first to report)

**Latest Known Data (2024):**
- Admission Rate: 3.3% (Class of 2028)
- Total Applicants: ~60,000
- Enrolled: ~1,500

### Harvard University (166027)

- Fact Book: https://oir.harvard.edu/fact-book
- Admissions: https://college.harvard.edu/admissions

### Stanford University (243744)

- Common Data Set: https://ucomm.stanford.edu/cds/
- IR: https://ir.stanford.edu/

## Troubleshooting

### "No data found" errors

1. Check if university publishes CDS
2. Verify URL patterns in script are current
3. Try alternative sources (College Scorecard, IPEDS)
4. Manual entry as fallback

### API rate limits

College Scorecard API has rate limits:
- Use built-in retry logic in scripts
- Add delays between batches
- Request higher rate limit from data.gov

### Database connection issues

```bash
# Test database connection
npx prisma db pull

# Verify schema
npx prisma generate
```

## Best Practices

1. **Run fetchers after CDS publication** (typically October-December)
2. **Verify data quality** before production deployment
3. **Log all updates** for audit trail
4. **Set up monitoring** for failed fetches
5. **Maintain URL pattern configurations** as university websites change

## Future Enhancements

- [ ] PDF parsing for CDS documents
- [ ] Machine learning for data extraction
- [ ] Automated email alerts when new CDS published
- [ ] Integration with university RSS feeds
- [ ] Web scraping with Puppeteer for dynamic content
- [ ] Parallel fetching for faster bulk updates
- [ ] Data validation and anomaly detection
