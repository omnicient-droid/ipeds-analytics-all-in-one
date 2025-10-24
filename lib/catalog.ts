import { friendlyLabelFromCode } from './labels'
import { UNITID_TO_COUNTY } from './place'
import { BLS_SERIES_MAP } from './bls'

export type CatalogItem = {
  code: string
  label: string
  unit?: string
  category?: string
}

function efRaceUG(): CatalogItem[] {
  const codes = [
    'EF.FALL.UG.TOTAL',
    'EF.FALL.UG.WHITE',
    'EF.FALL.UG.BLACK',
    'EF.FALL.UG.HISP',
    'EF.FALL.UG.ASIAN',
    'EF.FALL.UG.TWOORMORE',
    'EF.FALL.UG.NONRES',
    'EF.FALL.UG.UNKNOWN',
  ]
  return codes.map((code) => ({ code, label: friendlyLabelFromCode(code), category: 'IPEDS' }))
}

function admissions(): CatalogItem[] {
  const codes = [
    'ADM.APPLICANTS_TOTAL',
    'ADM.ADMITTED_TOTAL',
    'ADM.ENROLLED_TOTAL',
    'ADM.ADM_RATE',
    'ADM.YIELD',
  ]
  return codes.map((code) => ({ code, label: friendlyLabelFromCode(code), category: 'IPEDS' }))
}

function outcomes(): CatalogItem[] {
  const codes = ['GR.GR150.TOTAL', 'GR.GR100.TOTAL', 'RET.FTFT', 'RET.PTFT']
  return codes.map((code) => ({ code, label: friendlyLabelFromCode(code), category: 'IPEDS' }))
}

function finance(): CatalogItem[] {
  const codes = [
    'IC.TUITION.IN_STATE',
    'IC.TUITION.OUT_STATE',
    'IC.ROOM_BOARD',
    'SFA.FTFT.PELL_GRANT_RATE',
    'SFA.FTFT.AVG_NET_PRICE',
  ]
  return codes.map((code) => ({ code, label: friendlyLabelFromCode(code), category: 'IPEDS' }))
}

function faculty(): CatalogItem[] {
  const codes = ['DRVHR.FTE_STU_FAC_RATIO', 'DRVHR.INSTR_EXP_PER_FTE', 'DRVEF.UG_TOTAL']
  return codes.map((code) => ({ code, label: friendlyLabelFromCode(code), category: 'IPEDS' }))
}

function facultyRace(): CatalogItem[] {
  const codes = [
    'HR.FACULTY.WHITE',
    'HR.FACULTY.BLACK',
    'HR.FACULTY.HISP',
    'HR.FACULTY.ASIAN',
    'HR.FACULTY.TWOORMORE',
    'HR.FACULTY.NONRES',
    'HR.FACULTY.UNKNOWN',
    'HR.FACULTY.TOTAL',
  ]
  return codes.map((code) => ({ code, label: friendlyLabelFromCode(code), category: 'IPEDS' }))
}

function blsNationalRace(): CatalogItem[] {
  // Use what we already know in BLS_SERIES_MAP
  return Object.entries(BLS_SERIES_MAP).map(([k, v]) => ({
    code: `BLS.${k}`,
    label: v.label,
    unit: v.unit,
    category: 'BLS',
  }))
}

function countyPatternsFromUnitids(): CatalogItem[] {
  // Provide skeleton codes for county life expectancy and unemployment for mapped schools
  const set = new Set<string>()
  for (const fips of Object.values(UNITID_TO_COUNTY)) {
    set.add(`HE.LE.COUNTY.${fips}`)
    set.add(`BLS.UNRATE.COUNTY.${fips}`)
  }
  return Array.from(set).map((code) => ({
    code,
    label: friendlyLabelFromCode(code),
    category: code.startsWith('BLS') ? 'BLS' : 'Health',
  }))
}

export function buildCatalog(): CatalogItem[] {
  return [
    ...efRaceUG(),
    ...admissions(),
    ...outcomes(),
    ...finance(),
    ...faculty(),
    ...facultyRace(),
    ...blsNationalRace(),
    ...countyPatternsFromUnitids(),
  ]
}
