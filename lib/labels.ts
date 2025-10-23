// Human-friendly labels: expand abbreviations and never show raw codes in UI.

const CODE_LABELS: Record<string, string> = {
  // Enrollment (EF)
  'EF.FALL.UG.TOTAL': 'Undergraduate Fall Enrollment — Total',
  'EF.FALL.GRAD.TOTAL': 'Graduate Fall Enrollment — Total',
  'EF.FALL.UG.WHITE': 'Undergraduate — White',
  'EF.FALL.UG.BLACK': 'Undergraduate — Black or African American',
  'EF.FALL.UG.HISP': 'Undergraduate — Hispanic/Latino',
  'EF.FALL.UG.ASIAN': 'Undergraduate — Asian',
  'EF.FALL.UG.TWOORMORE': 'Undergraduate — Two or More Races',
  'EF.FALL.UG.NONRES': 'Undergraduate — Nonresident Alien',
  'EF.FALL.UG.UNKNOWN': 'Undergraduate — Race/Ethnicity Unknown',

  // Admissions (ADM)
  'ADM.APPLICANTS_TOTAL': 'Applicants (Total)',
  'ADM.ADMITTED_TOTAL': 'Admitted (Total)',
  'ADM.ENROLLED_TOTAL': 'Enrolled (Total)',
  'ADM.ADM_RATE': 'Admission Rate',
  'ADM.YIELD': 'Yield Rate (Enrolled ÷ Admitted)',

  // Outcomes (GR, RET)
  'GR.GR150.TOTAL': 'Graduation Rate (150% of time, total cohort)',
  'GR.GR100.TOTAL': 'Graduation Rate (100% of time, total cohort)',
  'RET.FTFT': 'First-Time, Full-Time Retention Rate',
  'RET.PTFT': 'Part-Time Retention Rate',

  // Finance (IC, SFA)
  'IC.TUITION.IN_STATE': 'Tuition and Fees (In-State)',
  'IC.TUITION.OUT_STATE': 'Tuition and Fees (Out-of-State)',
  'IC.ROOM_BOARD': 'Room and Board',
  'SFA.FTFT.PELL_GRANT_RATE': 'Pell Grant Receipt Rate (First-time, Full-time)',
  'SFA.FTFT.AVG_NET_PRICE': 'Average Net Price (First-time, Full-time)',

  // Faculty / Resources (DRVHR, HR)
  'DRVHR.FTE_STU_FAC_RATIO': 'Student-to-Faculty Ratio (FTE)',
  'DRVHR.INSTR_EXP_PER_FTE': 'Instructional Expenditures per FTE Student',
  'DRVEF.UG_TOTAL': 'Undergraduate Enrollment (Derived)',

  // Faculty by race
  'HR.FACULTY.WHITE': 'Faculty — White',
  'HR.FACULTY.BLACK': 'Faculty — Black or African American',
  'HR.FACULTY.HISP': 'Faculty — Hispanic/Latino',
  'HR.FACULTY.ASIAN': 'Faculty — Asian',
  'HR.FACULTY.TWOORMORE': 'Faculty — Two or More Races',
  'HR.FACULTY.NONRES': 'Faculty — Nonresident Alien',
  'HR.FACULTY.UNKNOWN': 'Faculty — Race/Ethnicity Unknown',
  'HR.FACULTY.TOTAL': 'Faculty — Total',
}

export function friendlyLabelFromCode(code: string, serverLabel?: string | null): string {
  if (serverLabel && !looksLikeCode(serverLabel)) return serverLabel
  if (CODE_LABELS[code]) return CODE_LABELS[code]
  // Heuristic fallbacks
  if (code.startsWith('EF.')) return 'Enrollment'
  if (code.startsWith('ADM.')) return 'Admissions'
  if (code.startsWith('GR.')) return 'Graduation Rate'
  if (code.startsWith('RET.')) return 'Retention Rate'
  if (code.startsWith('SFA.')) return 'Student Financial Aid'
  if (code.startsWith('IC.')) return 'Costs and Tuition'
  if (code.startsWith('DRVHR.')) return 'Faculty & Resources'
  if (code.startsWith('HR.')) return 'Faculty'
  return 'Metric'
}

function looksLikeCode(s: string): boolean {
  // strings with dots and uppercase chunks are likely internal codes
  return /[A-Z]{2,}\./.test(s) || /\.[A-Z0-9_]+/.test(s)
}
