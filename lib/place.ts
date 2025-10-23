// Minimal mapping from UNITID to county FIPS (SSCCC). Expand as needed.
export const UNITID_TO_COUNTY: Record<number, string> = {
  190150: '36061', // Columbia → New York County, NY
  199120: '37063', // UNC Chapel Hill → Durham/Orange split; pick Durham (37063) or Orange (37135); using 37063 here
  166027: '25017', // Harvard → Middlesex County, MA
  110635: '06001', // UC Berkeley → Alameda County, CA
  122977: '06037', // Santa Monica College → Los Angeles County, CA
  135726: '12086', // Univ. of Miami → Miami-Dade County, FL
  134130: '12001', // Univ. of Florida → Alachua County, FL
}

export function countyFipsForUnit(unitid: number): string | undefined {
  return UNITID_TO_COUNTY[unitid]
}
