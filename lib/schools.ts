export type SchoolKey = 'columbia' | 'unc' | 'harvard';
export type School = { key: SchoolKey; unitid: number; name: string; short: string; color: string; logo: string; logoAlt: string; };

export const SCHOOLS = {
  columbia: { key:'columbia', unitid:190150, name:'Columbia University', short:'Columbia', color:'#1f77b4', logo:'/logos/columbia.png', logoAlt:'Columbia University' },
  unc:      { key:'unc', unitid:199120, name:'UNC Chapel Hill', short:'UNC', color:'#7BAFD4', logo:'/logos/unc.png', logoAlt:'UNC Chapel Hill' },
  harvard:  { key:'harvard', unitid:166027, name:'Harvard University', short:'Harvard', color:'#A41034', logo:'/logos/harvard.png', logoAlt:'Harvard University' },
} as const;

export const SCHOOL_LIST: School[] = Object.values(SCHOOLS) as any;
export function schoolByKey(key?: string|null) { if(!key) return; return (SCHOOLS as any)[key]; }
