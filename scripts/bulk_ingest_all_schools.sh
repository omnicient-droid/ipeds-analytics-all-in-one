#!/bin/bash
# Bulk ingest script to load IPEDS enrollment data for all 7 schools from 2000-2024

set -e  # Exit on error

# School unit IDs
SCHOOLS=(
  190150  # Columbia University
  199120  # UNC Chapel Hill
  166027  # Harvard University
  110635  # UC Berkeley
  122977  # Santa Monica College
  135726  # University of Miami
  134130  # University of Florida
)

START_YEAR=2000
END_YEAR=2024

echo "========================================"
echo "IPEDS Enrollment Data Bulk Ingest"
echo "========================================"
echo "Schools: ${#SCHOOLS[@]}"
echo "Year range: $START_YEAR - $END_YEAR"
echo "========================================"
echo ""

TOTAL_SCHOOLS=${#SCHOOLS[@]}
CURRENT=0

for UNITID in "${SCHOOLS[@]}"; do
  CURRENT=$((CURRENT + 1))
  echo "[$CURRENT/$TOTAL_SCHOOLS] Processing unitid: $UNITID"
  echo "----------------------------------------"

  for YEAR in $(seq $START_YEAR $END_YEAR); do
    echo -n "  Year $YEAR... "
    node scripts/ipeds_ef_ingest_urban.mjs "$UNITID" "$YEAR" 2>&1 | grep -E "(inserted|skipped|Error)" || echo "done"
  done

  echo ""
  echo "✓ Completed unitid: $UNITID"
  echo ""
  sleep 1  # Rate limiting - be nice to Urban API
done

echo "========================================"
echo "✓ Bulk ingest complete!"
echo "========================================"
echo ""
echo "Summary:"
echo "  - Processed $TOTAL_SCHOOLS schools"
echo "  - Years: $START_YEAR-$END_YEAR"
echo "  - Total: $((TOTAL_SCHOOLS * (END_YEAR - START_YEAR + 1))) requests"
echo ""
echo "Run this to verify data:"
echo "  npx prisma studio"
echo ""
