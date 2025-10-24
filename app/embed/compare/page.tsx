export const dynamic = 'force-dynamic'

import EmbedSeriesClient from '@/components/EmbedSeriesClient'

function parseList(v?: string | null) {
  if (!v) return []
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default async function EmbedCompare({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string
    unitids?: string
    transform?: 'level' | 'yoy' | 'index' | 'factor'
    forecast?: string
    smooth?: '1' | 'true' | '0' | 'false'
    height?: string
  }>
}) {
  const p = await searchParams
  const codes = p.code ? [p.code] : []
  const unitids = parseList(p.unitids)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n))
  const transform = (p.transform || 'level') as any
  const forecast = Number(p.forecast || 0)
  const smooth = p.smooth === '1' || p.smooth === 'true'
  const height = Math.max(240, Math.min(800, Number(p.height || 360)))

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          {`html,body{margin:0;padding:0;background:transparent} body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell}`}
        </style>
      </head>
      <body>
        <EmbedSeriesClient
          codes={codes}
          unitids={unitids}
          transform={transform}
          forecast={forecast}
          smooth={smooth}
          height={height}
        />
      </body>
    </html>
  )
}
