#!/bin/bash
# Bulk ingest IPEDS racial enrollment data for all schools (2000-2021)
# Note: 2022+ data not yet available in Urban API

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

START=2000
END=2021  # Latest year available in Urban API

echo "========================================"
echo "IPEDS Racial Enrollment Data Bulk Ingest"
echo "========================================"
echo "Schools: ${#SCHOOLS[@]}"
echo "Years: $START-$END"
echo "========================================"
echo ""

for UNITID in "${SCHOOLS[@]}"; do
  echo "Processing unitid: $UNITID"
  node scripts/ingest_ef_race_data.mjs "$UNITID" "$START" "$END"
  echo ""
  sleep 2  # Rate limiting
done

echo "========================================"
echo "✓ Bulk ingest complete!"
echo "========================================"
