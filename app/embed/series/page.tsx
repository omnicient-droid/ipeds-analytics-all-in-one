export const dynamic = 'force-dynamic'

import EmbedSeriesClient from '@/components/EmbedSeriesClient'

function parseList(v?: string | null) {
  if (!v) return []
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default async function EmbedSeries({
  searchParams,
}: {
  searchParams: Promise<{
    codes?: string
    unitids?: string
    transform?: 'level' | 'yoy' | 'index' | 'factor'
    forecast?: string
    smooth?: '1' | 'true' | '0' | 'false'
    height?: string
  }>
}) {
  const p = await searchParams
  const codes = parseList(p.codes)
  const unitids = parseList(p.unitids)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n))
  const transform = (p.transform || 'level') as any
  const forecast = Number(p.forecast || 0)
  const smooth = p.smooth === '1' || p.smooth === 'true'
  const height = Math.max(240, Math.min(800, Number(p.height || 360)))

  // Bare minimum styles for iframe embedding
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          {`html,body{margin:0;padding:0;background:transparent} body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell} a{text-decoration:none}`}
        </style>
      </head>
      <body>
        <div style={{ padding: 0 }}>
          <EmbedSeriesClient
            codes={codes}
            unitids={unitids}
            transform={transform}
            forecast={forecast}
            smooth={smooth}
            height={height}
          />
        </div>
      </body>
    </html>
  )
}
