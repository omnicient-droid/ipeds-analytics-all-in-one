import type { Point } from './transform'

export type APISeries = {
  code: string
  unitid: number
  label: string
  unit: string
  points: Point[]
  color?: string
  survey?: string
  source?: string
}

type FetchOptions = {
  timeoutMs?: number
  retries?: number
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
) {
  const { timeoutMs = 15000, ...rest } = init
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    // @ts-ignore AbortSignal type on RequestInit
    return await fetch(input, { ...rest, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

export async function fetchSeries(
  codes: string[],
  unitids: number[],
  window?: { from?: number; to?: number },
  opts: FetchOptions = {},
): Promise<APISeries[]> {
  const params = new URLSearchParams()
  params.set('codes', codes.join(','))
  params.set('unitids', unitids.join(','))
  if (window?.from) params.set('from', String(window.from))
  if (window?.to) params.set('to', String(window.to))

  const retries = Math.max(0, opts.retries ?? 1)
  let lastErr: any
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(`/api/series?${params.toString()}`, {
        cache: 'no-store',
        timeoutMs: opts.timeoutMs ?? 15000,
      })
      if (!res.ok) throw new Error(`series ${res.status}`)
      const json = await res.json()
      return (json.series ?? json.data ?? []) as APISeries[]
    } catch (e) {
      lastErr = e
      if (attempt === retries) break
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
    }
  }
  throw new Error((lastErr as any)?.message || 'Failed to fetch series')
}
