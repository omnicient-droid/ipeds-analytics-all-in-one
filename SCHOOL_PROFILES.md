# Comprehensive School Profile Pages

## Overview

Each school now has a comprehensive profile page at `/u/[unitid]` that displays ALL available IPEDS data with interactive comparative visualizations.

## Features

### 🎯 Comparative Graphs at Top

- **Admission Rate vs National Average**: See how the school compares to national benchmarks
- **6-Year Graduation Rate**: Compare institutional success rates
- Powered by `NATIONAL_BENCHMARKS` library

### 📊 Complete Data Coverage

**Enrollment Metrics** (9 data points):

- Total undergraduate enrollment
- Total graduate enrollment
- Enrollment by race/ethnicity (White, Black, Hispanic, Asian, Two or More, Non-Resident, Unknown)
- Stacked area charts showing demographic composition over time
- Line charts for trend analysis

**Outcomes Metrics** (5 data points):

- Admission rate
- Yield rate
- 6-year graduation rate
- Retention rate (full-time first-time)
- Retention rate (part-time first-time)

**Financial Metrics** (4 data points):

- In-state tuition & fees
- Out-of-state tuition & fees
- Room & board costs
- Pell Grant recipient rate
- Interactive cost trend visualizations

**Faculty Metrics** (2 data points):

- Student-to-faculty ratio
- Total undergraduate population

### 🎨 Enhanced UI/UX

- Framer Motion animations with staggered delays
- Glass-morphism cards with hover effects
- Color-coded metric categories (blue=outcomes, green=finance, purple=faculty)
- Real-time toast notifications on data load/error
- Skeleton loading states for smooth experience

### 📈 Interactive Visualizations

- **LineChartInteractive**: Trend analysis with forecasting (2-3 years)
- **StackedArea100**: Demographic composition as percentages
- Smooth curves for continuous data (outcomes, finance)
- Sharp lines for discrete data (enrollment headcount)
- Recharts with 800ms animations

### 🔄 Data Fetching Strategy

- Fetches from 2010 to current year
- Parallel fetching of all metric categories (faster load)
- 15-second timeout per request
- 2 retry attempts with exponential backoff
- Graceful fallback for missing data
- Debug logging for API troubleshooting

## Usage

### Visit a School Profile

```
/u/190150  # Columbia University
/u/166027  # Stanford University
/u/215062  # Yale University
```

### Data Freshness

- Uses `runtime = 'edge'` and `revalidate = 0` for real-time data
- No stale cache issues
- Always shows latest IPEDS data available

## Technical Details

### Files Created

- `app/u/[unitid]/SchoolProfile.tsx` - Main profile component (500+ lines)
- `app/u/[unitid]/page.tsx` - Page wrapper with dynamic loading

### Dependencies

- `@/lib/series` - fetchSeries with retry logic
- `@/lib/benchmarks` - NATIONAL_BENCHMARKS data
- `@/components/Chart` - LineChartInteractive
- `@/components/Charts` - StackedArea100
- `@/components/ToastProvider` - Toast notifications
- `framer-motion` - Page animations

### Data Sources

- Urban Institute Education Data API (educationdata.urban.org)
- IPEDS (Integrated Postsecondary Education Data System)
- National benchmarks (manually compiled from NCES)

## Future Enhancements

- [ ] Add more IPEDS endpoints (degrees awarded, endowment, expenditures)
- [ ] Peer institution comparison overlays
- [ ] Export to PDF/CSV
- [ ] Save favorite schools
- [ ] Tabbed interface for data categories
- [ ] Share profile via link

## Debugging

If data doesn't load:

1. Check browser console for `[Urban API]` logs
2. Verify unitid exists in IPEDS database
3. Check Urban API status at educationdata.urban.org
4. Toast notifications will show specific errors

Common issues:

- **500 errors**: Urban API rate limiting or downtime
- **Empty series**: School doesn't report that specific metric
- **Missing years**: IPEDS data gaps (pandemic years, small institutions)
