export type SchoolKey = 'columbia' | 'unc' | 'harvard' | 'berkeley' | 'smc' | 'miami' | 'florida'

export type School = {
  key: SchoolKey
  unitid: number
  name: string
  short: string
  color: string
  logo: string
  logoAlt: string
  division?: 'D1' | 'D2' | 'D3'
  conference?: string
  sector?: 'Public' | 'Private'
  level?: '2-year' | '4-year'
  isCommunityCollege?: boolean // <-- optional flag
}

export const SCHOOLS: Record<SchoolKey, School> = {
  columbia: {
    key: 'columbia',
    unitid: 190150,
    name: 'Columbia University',
    short: 'Columbia',
    color: '#1f77b4',
    logo: '/logos/columbia.png',
    logoAlt: 'Columbia University',
    division: 'D1',
    conference: 'Ivy League',
    sector: 'Private',
    level: '4-year',
  },
  unc: {
    key: 'unc',
    unitid: 199120,
    name: 'UNC Chapel Hill',
    short: 'UNC',
    color: '#7BAFD4',
    logo: '/logos/unc.png',
    logoAlt: 'UNC Chapel Hill',
    division: 'D1',
    conference: 'ACC',
    sector: 'Public',
    level: '4-year',
  },
  harvard: {
    key: 'harvard',
    unitid: 166027,
    name: 'Harvard University',
    short: 'Harvard',
    color: '#A41034',
    logo: '/logos/harvard.png',
    logoAlt: 'Harvard University',
    division: 'D1',
    conference: 'Ivy League',
    sector: 'Private',
    level: '4-year',
  },
  berkeley: {
    key: 'berkeley',
    unitid: 110635,
    name: 'UC Berkeley',
    short: 'Cal',
    color: '#003262',
    logo: '/logos/berkeley.png',
    logoAlt: 'UC Berkeley',
    division: 'D1',
    conference: 'ACC',
    sector: 'Public',
    level: '4-year',
  },
  smc: {
    key: 'smc',
    unitid: 122977,
    name: 'Santa Monica College',
    short: 'SMC',
    color: '#005BBB',
    logo: '/logos/smc.png',
    logoAlt: 'Santa Monica College',
    sector: 'Public',
    level: '2-year',
    isCommunityCollege: true,
  },
  miami: {
    key: 'miami',
    unitid: 135726,
    name: 'University of Miami',
    short: 'Miami',
    color: '#F47321',
    logo: '/logos/miami.png',
    logoAlt: 'University of Miami',
    division: 'D1',
    conference: 'ACC',
    sector: 'Private',
    level: '4-year',
  },
  florida: {
    key: 'florida',
    unitid: 134130,
    name: 'University of Florida',
    short: 'Florida',
    color: '#0021A5',
    logo: '/logos/florida.png',
    logoAlt: 'University of Florida',
    division: 'D1',
    conference: 'SEC',
    sector: 'Public',
    level: '4-year',
  },
}

export const SCHOOL_LIST: School[] = Object.values(SCHOOLS)
export function schoolByKey(k?: string | null) {
  return k ? (SCHOOLS as any)[k] : undefined
}
