// lib/schools.ts
export type SchoolKey = 'columbia' | 'unc' | 'harvard'

export type School = {
  key: SchoolKey
  unitid: number
  name: string
  short: string
  color: string
  logo: string // local path under /public/logos or remote URL
  logoAlt: string
}

export const SCHOOLS: Record<SchoolKey, School> = {
  columbia: {
    key: 'columbia',
    unitid: 190150,
    name: 'Columbia University',
    short: 'Columbia',
    color: '#1f77b4', // deep Columbia-ish blue for good contrast
    logo: '/logos/columbia.png',
    logoAlt: 'Columbia University emblem',
  },
  unc: {
    key: 'unc',
    unitid: 199120,
    name: 'UNC Chapel Hill',
    short: 'UNC',
    color: '#7BAFD4', // Tar Heel blue
    logo: '/logos/unc.png',
    logoAlt: 'UNC emblem',
  },
  harvard: {
    key: 'harvard',
    unitid: 166027,
    name: 'Harvard University',
    short: 'Harvard',
    color: '#A41034', // Harvard crimson
    logo: '/logos/harvard.png',
    logoAlt: 'Harvard emblem',
  },
}

export const SCHOOL_LIST: School[] = Object.values(SCHOOLS)

export function schoolByKey(key: string | null | undefined): School | undefined {
  if (!key) return undefined
  return SCHOOLS[key as SchoolKey]
}
