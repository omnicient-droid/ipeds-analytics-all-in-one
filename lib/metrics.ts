export type MetricSpec = {
  code: string;
  name: string;
  unit: "ratio" | "score" | "count" | "usd" | "other";
  description?: string;
};

export const METRICS: MetricSpec[] = [
  // College Scorecard
  {
    code: "SC.ADM.RATE",
    name: "Admission rate (overall)",
    unit: "ratio",
    description: "Share of applicants who are admitted.",
  },
  { code: "SC.SAT.TOTAL25", name: "SAT total 25th percentile", unit: "score" },
  { code: "SC.SAT.TOTAL75", name: "SAT total 75th percentile", unit: "score" },

  // IPEDS Enrollment (EF) — use the codes your EF ingester writes
  { code: "EF.EFYTOTL", name: "Total fall enrollment", unit: "count" },
  { code: "EF.EFYWHITE", name: "White fall enrollment", unit: "count" },
  {
    code: "EF.EFYBLACK",
    name: "Black or African American fall enrollment",
    unit: "count",
  },
  {
    code: "EF.EFYHISP",
    name: "Hispanic/Latino fall enrollment",
    unit: "count",
  },
  { code: "EF.EFYASIAN", name: "Asian fall enrollment", unit: "count" },
  {
    code: "EF.EFYAIAN",
    name: "American Indian/Alaska Native fall enrollment",
    unit: "count",
  },
  {
    code: "EF.EFYNHPI",
    name: "Native Hawaiian/Other Pacific Islander fall enrollment",
    unit: "count",
  },
  {
    code: "EF.EFY2PLUS",
    name: "Two or more races fall enrollment",
    unit: "count",
  },
  {
    code: "EF.EFYNRAL",
    name: "Nonresident alien fall enrollment",
    unit: "count",
  },
  {
    code: "EF.EFYUNK",
    name: "Race/ethnicity unknown fall enrollment",
    unit: "count",
  },
];

export const metricMap = new Map(METRICS.map((m) => [m.code, m]));
