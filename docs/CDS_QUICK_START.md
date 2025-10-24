# Quick Start: Universal CDS Fetcher

## Overview

The Universal Common Data Set Fetcher automatically discovers and extracts admission statistics from **ALL universities in your IPEDS database** - not just pre-configured schools.

## Quick Start

### 1. Test with a Small Batch

Start with a small test to see how it works:

```bash
# Test with first 10 universities
node scripts/fetch_all_common_data_sets.mjs --limit 10
```

**Expected output:**
```
🎓 Universal Common Data Set Fetcher
=====================================
Year: 2024
State filter: All
Limit: 10

Found 10 universities to process

🔍 Searching University of Alabama (100654)...
  Generated 156 potential URLs
  📄 Trying PDF: https://oira.ua.edu/common-data-set/2024/CDS_2024.pdf
  ✅ Found data in PDF!
  💾 Saved 8 metrics to database

...

📊 Summary:
  Universities processed: 10
  Successful extractions: 4 (40.0%)
  Total metrics saved: 32
  Average metrics per success: 8.0
```

### 2. Run for Specific State

Focus on schools in a particular state:

```bash
# All California universities
node scripts/fetch_all_common_data_sets.mjs --state CA

# All New York universities  
node scripts/fetch_all_common_data_sets.mjs --state NY
```

### 3. Full Database Sweep

When ready, process all universities:

```bash
# This may take several hours for thousands of schools
node scripts/fetch_all_common_data_sets.mjs

# If interrupted, resume from where it left off:
node scripts/fetch_all_common_data_sets.mjs --resume
```

## What Gets Extracted

For each university, the script attempts to find and extract:

### Admission Statistics
- **Admission Rate**: Calculated from applicants/admitted
- **Yield Rate**: Calculated from enrolled/admitted
- **Total Applicants**: Number of first-year applicants
- **Total Enrolled**: Number who enrolled

### Test Scores
- **SAT Total**: 25th and 75th percentile
- **SAT EBRW**: Reading & Writing scores
- **SAT Math**: Math scores
- **ACT Composite**: 25th and 75th percentile
- **ACT English/Math**: Component scores

### Other Metrics
- **Average GPA**: Of admitted students
- **Waitlist Statistics**: Offered, accepted, admitted
- **Early Decision/Action**: Application numbers

## How It Works

### 1. URL Discovery
For each university, generates ~150 potential CDS URLs based on:

**Institutional Research Subdomains:**
- opir.university.edu
- ir.university.edu
- oir.university.edu
- provost.university.edu
- registrar.university.edu
- ... and 10+ more variations

**Common Path Patterns:**
- /common-data-set/
- /cds/
- /fact-book/common-data-set/
- /institutional-research/cds/
- ... and 15+ more variations

**Year-Specific:**
- /2024/
- /2023-2024/
- /CDS_2024.pdf
- /CDS-2024.pdf

### 2. Content Parsing

**PDF Documents:**
- Downloads PDF Common Data Sets
- Extracts text using pdf-parse library
- Runs pattern matching on Section C

**HTML Pages:**
- Fetches HTML content
- Searches for embedded PDF links
- Attempts direct extraction from HTML tables

### 3. Data Extraction

Uses intelligent regex patterns to find:
```
"Total applicants: 45,678"  → CDS.APPLICANTS = 45678
"Total admitted: 3,456"     → Calculate admission rate
"SAT Total 25th: 1420"      → CDS.SAT.TOTAL.25 = 1420
"SAT Total 75th: 1560"      → CDS.SAT.TOTAL.75 = 1560
```

### 4. Database Storage

Each metric is saved to `TimeSeries` table:
```sql
INSERT INTO "TimeSeries" 
  (universityId, metricId, year, value)
VALUES 
  ((SELECT id FROM University WHERE unitid=190150),
   (SELECT id FROM Metric WHERE code='CDS.ADM.RATE'),
   2024,
   0.033)
```

## Performance & Success Rates

### Expected Results

**Success Rate:** 40-60%
- Top tier research universities: ~80% (publish CDS reliably)
- Regional state universities: ~50% (varies by state)
- Small private colleges: ~30% (less likely to publish online)
- Community colleges: ~10% (rarely publish CDS)

**Processing Speed:**
- ~10-15 universities per minute
- ~50-80 per hour
- Full database (7,000+ schools): 12-24 hours

**Why some fail:**
1. University doesn't publish CDS online
2. CDS behind login/paywall
3. URL pattern not covered
4. PDF format too complex to parse
5. Website temporarily unavailable

### Cache System

Results are cached in `.cds-cache/` directory:

```
.cds-cache/
  190150_2024.json  ← Extracted metrics for Columbia 2024
  190150_2024.pdf   ← Downloaded PDF
  166027_2024.json  ← Harvard metrics
  166027_2024.pdf   ← Harvard PDF
  ...
```

**Benefits:**
- Avoid re-downloading on subsequent runs
- Preserve source documents for verification
- Resume interrupted processes instantly
- Manual review of successful extractions

**Cache invalidation:**
```bash
# Clear cache to force re-fetch
rm -rf .cds-cache/

# Clear specific school
rm .cds-cache/190150_*

# Clear specific year
rm .cds-cache/*_2024.*
```

### Progress Tracking

Progress is saved in `.cds-fetch-progress.json`:

```json
{
  "processed": [100654, 100663, 100690, ...],
  "lastUpdate": "2024-10-24T14:30:00.000Z"
}
```

Use `--resume` flag to continue from interruptions:
```bash
# Process was interrupted after 500 schools
node scripts/fetch_all_common_data_sets.mjs --resume
# Skips first 500, continues from school #501
```

## Viewing Results

### Check what was extracted:

```bash
# See all CDS metrics in database
npx prisma studio
# Navigate to: TimeSeries → Filter by metric code starting with "CDS."
```

### SQL Query:

```sql
SELECT 
  u.name,
  m.code,
  m.name,
  ts.year,
  ts.value
FROM "TimeSeries" ts
JOIN "University" u ON u.id = ts."universityId"
JOIN "Metric" m ON m.id = ts."metricId"
WHERE m.code LIKE 'CDS.%'
  AND ts.year = 2024
ORDER BY u.name, m.code;
```

### Verify specific school:

```bash
# Columbia University (unitid 190150)
node -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const data = await p.timeSeries.findMany({
  where: { 
    university: { unitid: 190150 },
    metric: { code: { startsWith: 'CDS.' } },
    year: 2024
  },
  include: { metric: true }
});
console.table(data.map(d => ({ 
  metric: d.metric.name, 
  value: d.value 
})));
await p.\$disconnect();
"
```

## Troubleshooting

### Low Success Rate

**Problem:** Only 10-20% success rate (expected: 40-60%)

**Solutions:**
1. Check network connectivity
2. Verify database connection
3. Examine cache files for errors
4. Try smaller batch with verbose logging

### Script Hangs

**Problem:** Script stops responding

**Solutions:**
1. Kill process: `Ctrl+C`
2. Resume: `node scripts/fetch_all_common_data_sets.mjs --resume`
3. Check for single problematic URL causing timeout
4. Reduce timeout in script if needed

### No Data for Specific School

**Problem:** Expected school didn't extract data

**Solutions:**

1. **Manual URL discovery:**
   - Google: `"[University Name]" common data set 2024`
   - Check institutional research office website
   - Look for "Facts & Figures" or "About" pages

2. **Add custom URL pattern:**
   Edit `generateCDSUrls()` function in script to add discovered URL

3. **Manual data entry:**
   See DATA_AUTOMATION.md for manual entry instructions

### Database Errors

**Problem:** Prisma errors during save

**Solutions:**
```bash
# Regenerate Prisma client
npx prisma generate

# Check database connection
npx prisma db pull

# Verify schema matches database
npx prisma migrate dev
```

## Advanced Usage

### Custom Year Range

Process multiple years:

```bash
# Process 2023 data
node scripts/fetch_all_common_data_sets.mjs --year 2023

# Process 2022 data  
node scripts/fetch_all_common_data_sets.mjs --year 2022
```

### Combining Filters

```bash
# California schools, 2023, limit 50
node scripts/fetch_all_common_data_sets.mjs --state CA --year 2023 --limit 50

# Resume California run
node scripts/fetch_all_common_data_sets.mjs --state CA --resume
```

### Parallel Processing

For faster processing, run multiple instances with state filters:

```bash
# Terminal 1
node scripts/fetch_all_common_data_sets.mjs --state CA &

# Terminal 2  
node scripts/fetch_all_common_data_sets.mjs --state NY &

# Terminal 3
node scripts/fetch_all_common_data_sets.mjs --state TX &
```

**Note:** Each uses separate cache, so no conflicts

## Next Steps

1. **Test the script**: Start with `--limit 10` to see results
2. **Review extracted data**: Check Prisma Studio or run SQL queries
3. **Expand gradually**: Try state-by-state before full database
4. **Set up automation**: Use cron jobs for regular updates (see DATA_AUTOMATION.md)
5. **Optimize patterns**: Add successful URL patterns you discover manually

## Support

- **Documentation**: See `docs/DATA_AUTOMATION.md` for comprehensive guide
- **Source Code**: `scripts/fetch_all_common_data_sets.mjs`
- **Cache Location**: `.cds-cache/` directory
- **Progress File**: `.cds-fetch-progress.json`
