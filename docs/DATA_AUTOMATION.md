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

### 2. Common Data Set Fetcher

**Script:** `scripts/fetch_common_data_set.mjs`

Automatically searches for and extracts data from Common Data Set documents published by universities.

```bash
# Fetch Columbia University's latest CDS
node scripts/fetch_common_data_set.mjs 190150

# Fetch specific year
node scripts/fetch_common_data_set.mjs 190150 2024

# Fetch all configured universities
node scripts/fetch_common_data_set.mjs --all
```

**Configured Universities:**
- 190150: Columbia University
- 166027: Harvard University
- 243744: Stanford University
- 130794: Yale University
- 166683: MIT

**Metrics collected:**
- `CDS.ADM.RATE` - Admission rate from CDS
- `CDS.SAT.25` - SAT 25th percentile from CDS
- `CDS.SAT.75` - SAT 75th percentile from CDS
- `CDS.ACT.25` - ACT 25th percentile from CDS
- `CDS.ACT.75` - ACT 75th percentile from CDS

**Adding new universities:**

Edit `CDS_URL_PATTERNS` in `scripts/fetch_common_data_set.mjs`:

```javascript
const CDS_URL_PATTERNS = {
  123456: {  // UNITID from IPEDS
    name: 'Your University',
    cdsUrls: [
      'https://ir.university.edu/common-data-set',
      'https://www.university.edu/institutional-research/cds',
    ],
    alternativeUrls: [
      'https://admissions.university.edu/class-profile',
    ],
  },
}
```

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

### For Production Deployment

Set up a **cron job** or **scheduled task** to run data updates:

```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/ipeds-analytics && node scripts/fetch_common_data_set.mjs --all >> logs/cds-fetch.log 2>&1

# Run College Scorecard weekly (Sundays at 3 AM)
0 3 * * 0 cd /path/to/ipeds-analytics && node scripts/scorecard_ingest.mjs ALL >> logs/scorecard.log 2>&1
```

### For Vercel/Cloud Deployment

Use **Vercel Cron Jobs** (Enterprise) or **GitHub Actions**:

`.github/workflows/update-data.yml`:

```yaml
name: Update University Data

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  update-cds:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Fetch Common Data Sets
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: node scripts/fetch_common_data_set.mjs --all
      
      - name: Fetch College Scorecard
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          COLLEGESCORECARD_API_KEY: ${{ secrets.COLLEGESCORECARD_API_KEY }}
        run: node scripts/scorecard_ingest.mjs $(date +%Y)
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
