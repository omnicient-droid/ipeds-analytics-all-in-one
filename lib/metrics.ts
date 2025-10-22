export type MetricCode =
  | 'EF.FALL.UG.TOTAL'
  | 'EF.FALL.UG.WHITE'
  | 'EF.FALL.UG.BLACK'
  | 'EF.FALL.UG.HISP'
  | 'EF.FALL.UG.ASIAN'
  | 'EF.FALL.UG.TWOORMORE'
  | 'EF.FALL.UG.NONRES'
  | 'EF.FALL.UG.UNKNOWN'
  | 'ADM.ADM_RATE'
  | 'ADM.YIELD'
  | 'GR.GR150.TOTAL';

export type MetricDef = {
  code: MetricCode;
  label: string;
  unit: 'headcount'|'percent'|'share'|'USD';
  source: 'IPEDS';
  survey: 'EF'|'E12'|'ADM'|'GR';
  category: 'enrollment'|'admissions'|'outcomes'|'prices';
  urban?: {
    endpoint: string;            // placeholder; wire to Urban API later
    filters?: Record<string, any>;
    valueField: string;
  };
};

export const METRICS: Record<MetricCode, MetricDef> = {
  'EF.FALL.UG.TOTAL':    { code:'EF.FALL.UG.TOTAL',    label:'Undergrad Fall Enrollment (Total)', unit:'headcount', source:'IPEDS', survey:'EF', category:'enrollment', urban:{ endpoint:'/ipeds/fall-enrollment', filters:{ level:'undergrad' }, valueField:'headcount' } },
  'EF.FALL.UG.WHITE':    { code:'EF.FALL.UG.WHITE',    label:'Undergrad Fall – White',            unit:'headcount', source:'IPEDS', survey:'EF', category:'enrollment', urban:{ endpoint:'/ipeds/fall-enrollment', filters:{ level:'undergrad', race:'White' }, valueField:'headcount' } },
  'EF.FALL.UG.BLACK':    { code:'EF.FALL.UG.BLACK',    label:'Undergrad Fall – Black',            unit:'headcount', source:'IPEDS', survey:'EF', category:'enrollment', urban:{ endpoint:'/ipeds/fall-enrollment', filters:{ level:'undergrad', race:'Black or African American' }, valueField:'headcount' } },
  'EF.FALL.UG.HISP':     { code:'EF.FALL.UG.HISP',     label:'Undergrad Fall – Hispanic/Latino',  unit:'headcount', source:'IPEDS', survey:'EF', category:'enrollment', urban:{ endpoint:'/ipeds/fall-enrollment', filters:{ level:'undergrad', race:'Hispanic/Latino' }, valueField:'headcount' } },
  'EF.FALL.UG.ASIAN':    { code:'EF.FALL.UG.ASIAN',    label:'Undergrad Fall – Asian',            unit:'headcount', source:'IPEDS', survey:'EF', category:'enrollment', urban:{ endpoint:'/ipeds/fall-enrollment', filters:{ level:'undergrad', race:'Asian' }, valueField:'headcount' } },
  'EF.FALL.UG.TWOORMORE':{ code:'EF.FALL.UG.TWOORMORE',label:'Undergrad Fall – Two or More',      unit:'headcount', source:'IPEDS', survey:'EF', category:'enrollment', urban:{ endpoint:'/ipeds/fall-enrollment', filters:{ level:'undergrad', race:'Two or more races' }, valueField:'headcount' } },
  'EF.FALL.UG.NONRES':   { code:'EF.FALL.UG.NONRES',   label:'Undergrad Fall – Nonresident Alien',unit:'headcount', source:'IPEDS', survey:'EF', category:'enrollment', urban:{ endpoint:'/ipeds/fall-enrollment', filters:{ level:'undergrad', race:'Nonresident alien' }, valueField:'headcount' } },
  'EF.FALL.UG.UNKNOWN':  { code:'EF.FALL.UG.UNKNOWN',  label:'Undergrad Fall – Unknown',           unit:'headcount', source:'IPEDS', survey:'EF', category:'enrollment', urban:{ endpoint:'/ipeds/fall-enrollment', filters:{ level:'undergrad', race:'Race/ethnicity unknown' }, valueField:'headcount' } },
  'ADM.ADM_RATE':        { code:'ADM.ADM_RATE',        label:'Admission Rate',                     unit:'percent',   source:'IPEDS', survey:'ADM', category:'admissions', urban:{ endpoint:'/ipeds/admissions', valueField:'admission_rate' } },
  'ADM.YIELD':           { code:'ADM.YIELD',           label:'Yield Rate',                         unit:'percent',   source:'IPEDS', survey:'ADM', category:'admissions', urban:{ endpoint:'/ipeds/admissions', valueField:'yield_rate' } },
  'GR.GR150.TOTAL':      { code:'GR.GR150.TOTAL',      label:'Grad Rate (150% time, total)',       unit:'percent',   source:'IPEDS', survey:'GR',  category:'outcomes',   urban:{ endpoint:'/ipeds/graduation-rates', valueField:'gr150_total' } },
};

export const RACE_ORDER: MetricCode[] = [
  'EF.FALL.UG.WHITE',
  'EF.FALL.UG.BLACK',
  'EF.FALL.UG.HISP',
  'EF.FALL.UG.ASIAN',
  'EF.FALL.UG.TWOORMORE',
  'EF.FALL.UG.NONRES',
  'EF.FALL.UG.UNKNOWN'
];
