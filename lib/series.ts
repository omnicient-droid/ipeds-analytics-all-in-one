import type { Point } from './transform';

export type APISeries = {
  code: string; unitid: number; label: string; unit: string;
  points: Point[]; color?: string; survey?: string; source?: string;
};

export async function fetchSeries(codes: string[], unitids: number[], window?: {from?:number; to?:number;}): Promise<APISeries[]>{
  const params = new URLSearchParams();
  params.set('codes', codes.join(','));
  params.set('unitids', unitids.join(','));
  if (window?.from) params.set('from', String(window.from));
  if (window?.to) params.set('to', String(window.to));
  const res = await fetch(`/api/series?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`series ${res.status}`);
  const json = await res.json();
  return (json.series ?? json.data ?? []) as APISeries[];
}
