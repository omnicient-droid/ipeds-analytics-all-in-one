#!/bin/bash
# Bulk ingest comprehensive metrics for all schools (2000-2021)

set -e

SCHOOLS=(
  190150  # Columbia University
  199120  # UNC Chapel Hill
  166027  # Harvard University
  110635  # UC Berkeley
  122977  # Santa Monica College
  135726  # University of Miami
  134130  # University of Florida
)

START=2010  # Most metrics start around 2010
END=2021

echo "========================================"
echo "Comprehensive IPEDS Data Bulk Ingest"
echo "========================================"
echo "Schools: ${#SCHOOLS[@]}"
echo "Years: $START-$END"
echo "Categories: Admissions, Grad Rates,"
echo "  Financial Aid, Tuition, Faculty"
echo "========================================"
echo ""

TOTAL=${#SCHOOLS[@]}
CURRENT=0

for UNITID in "${SCHOOLS[@]}"; do
  CURRENT=$((CURRENT + 1))
  echo "[$CURRENT/$TOTAL] Processing unitid: $UNITID"
  echo "----------------------------------------"
  node scripts/ingest_comprehensive.mjs "$UNITID" "$START" "$END" 2>&1 | grep -E "(^\[|points|error|Total)"
  echo ""
  sleep 3  # Rate limiting
done

echo "========================================"
echo "✓ Comprehensive bulk ingest complete!"
echo "========================================"
