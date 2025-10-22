'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { SCHOOL_LIST, SCHOOLS, SchoolKey, schoolByKey } from '@/lib/schools';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useSearchParams, useRouter } from 'next/navigation';

const fetcher = (url: string) => fetch(url).then(r => r.json());
const METRICS = [
  { key: 'ug_enrollment', label: 'Enrollment', unit: 'students' },
  { key: 'tuition', label: 'Tuition', unit: 'USD' },
  { key: 'grad_rate', label: 'Grad Rate', unit: '%' },
] as const;

function LogoDot({ cx, cy, logo }: { cx?: number; cy?: number; logo: string }) {
  if (typeof cx !== 'number' || typeof cy !== 'number') return null;
  const size = 16;
  return <image href={logo} x={cx - size/2} y={cy - size/2} width={size} height={size} preserveAspectRatio="xMidYMid slice" />;
}

function LegendWithLogos({ payload = [] as any[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-2">
      {payload.map((entry: any) => {
        const key = String(entry.dataKey || '').replace('s_', '') as SchoolKey;
        const s = (SCHOOLS as any)[key];
        if (!s) return null;
        return (
          <div key={key} className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <img src={s.logo} alt={s.logoAlt} className="h-4 w-4 rounded" />
            <span className="text-sm font-semibold">{s.short}</span>
          </div>
        );
      })}
    </div>
  );
}

function foldToWide(series: any[], selected: SchoolKey[]) {
  const byUnit: Record<string, Record<number, number>> = {};
  for (const s of series) {
    byUnit[s.unitid] = {};
    for (const pt of s.data) byUnit[s.unitid][pt.year] = pt.value;
  }
  const years = new Set<number>();
  series.forEach(s => s.data.forEach((pt: any) => years.add(pt.year)));
  const sortedYears = [...years].sort((a, b) => a - b);
  const keyToUnit: Record<SchoolKey, string> = {
    columbia: String(SCHOOLS.columbia.unitid),
    unc: String(SCHOOLS.unc.unitid),
    harvard: String(SCHOOLS.harvard.unitid),
  };
  return sortedYears.map(year => {
    const row: any = { year };
    for (const k of selected) {
      const unitid = keyToUnit[k];
      row[`s_${k}`] = byUnit[unitid]?.[year] ?? null;
    }
    return row;
  });
}

export default function Client() {
  const router = useRouter();
  const params = useSearchParams();

  const initSchools = (params.get('schools') || 'columbia,unc,harvard')
    .split(',').map(s => s.trim()).filter(Boolean)
    .map(k => schoolByKey(k)?.key).filter(Boolean) as SchoolKey[];
  const initMetric = params.get('metric') || 'ug_enrollment';

  const [selected, setSelected] = useState<SchoolKey[]>(Array.from(new Set(initSchools)).slice(0, 3));
  const [metric, setMetric] = useState<string>(initMetric);

  useEffect(() => {
    const qs = new URLSearchParams();
    qs.set('schools', selected.join(','));
    qs.set('metric', metric);
    router.replace(`/compare?${qs.toString()}`);
  }, [selected, metric, router]);

  const unitidsCsv = selected.map(k => SCHOOLS[k].unitid).join(',');
  const { data, error, isLoading } = useSWR<any>(`/api/metrics/${metric}?unitids=${unitidsCsv}`, fetcher);
  const chartData = useMemo(() => (data ? foldToWide(data.series, selected) : []), [data, selected]);

  function toggleSchool(key: SchoolKey) {
    setSelected(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  }

  function exportCSV() {
    if (!chartData.length) return;
    const lines = [
      ['year', ...selected.map(k => SCHOOLS[k].short)].join(','),
      ...chartData.map(row => [row.year, ...selected.map(k => row[`s_${k}`] ?? '')].join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `statipedia_${metric}_${selected.join('-')}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  return (
    <section className="grid gap-4">
      {/* Controls */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <div className="font-semibold mr-2">Schools (max 3):</div>
        {SCHOOL_LIST.map(s => {
          const active = selected.includes(s.key);
          return (
            <button
              key={s.key}
              onClick={() => toggleSchool(s.key)}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 rounded-full ${active ? 'border-2' : 'border'} px-3 py-1`}
              style={{ borderColor: active ? s.color : undefined }}
              title={s.name}
            >
              <img src={s.logo} alt={s.logoAlt} className="h-4 w-4 rounded" />
              <span className="text-sm font-semibold">{s.short}</span>
              {active && <span className="text-xs opacity-70">✓</span>}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`rounded-md border px-3 py-1.5 text-sm ${metric === m.key ? 'bg-primary text-primary-foreground' : ''}`}
              aria-pressed={metric === m.key}
            >
              {m.label}
            </button>
          ))}
          <button onClick={exportCSV} className="rounded-md border px-3 py-1.5 text-sm">Download CSV</button>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-3">
        <div className="flex items-baseline justify-between px-1 pb-2">
          <h2 className="text-lg font-semibold">
            {METRICS.find(m => m.key === metric)?.label}
          </h2>
          <div className="text-sm text-muted-foreground">
            {data?.metric?.unit ? `Unit: ${data.metric.unit}` : ''}
          </div>
        </div>

        <div style={{ width: '100%', height: 420 }}>
          {error && <div className="text-red-600 p-3">Failed to load data.</div>}
          {isLoading && <div className="p-3">Loading chart…</div>}
          {!isLoading && !error && (
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} interval={0} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v:any) => (typeof v === 'number' ? v.toLocaleString() : v)} labelFormatter={(l:any) => `Year ${l}`} />
                <Legend verticalAlign="top" align="left" content={<LegendWithLogos />} />
                {selected.includes('columbia') && (
                  <Line type="monotone" name="Columbia" dataKey="s_columbia" stroke={SCHOOLS.columbia.color} strokeWidth={3} dot={<LogoDot logo={SCHOOLS.columbia.logo} />} activeDot={{ r: 6 }} />
                )}
                {selected.includes('unc') && (
                  <Line type="monotone" name="UNC" dataKey="s_unc" stroke={SCHOOLS.unc.color} strokeWidth={3} dot={<LogoDot logo={SCHOOLS.unc.logo} />} activeDot={{ r: 6 }} />
                )}
                {selected.includes('harvard') && (
                  <Line type="monotone" name="Harvard" dataKey="s_harvard" stroke={SCHOOLS.harvard.color} strokeWidth={3} dot={<LogoDot logo={SCHOOLS.harvard.logo} />} activeDot={{ r: 6 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Tip: Toggle school chips (max 3). Switch metrics above; the URL updates so you can share it.</p>
    </section>
  );
}
