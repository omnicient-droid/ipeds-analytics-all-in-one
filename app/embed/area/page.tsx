export const dynamic = 'force-dynamic'

import EmbedAreaClient from '@/components/EmbedAreaClient'

function parseList(v?: string | null) {
  if (!v) return []
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default async function EmbedArea({
  searchParams,
}: {
  searchParams: Promise<{
    codes?: string
    unitid?: string
    height?: string
  }>
}) {
  const p = await searchParams
  const codes = parseList(p.codes)
  const unitid = Number(p.unitid)
  const height = Math.max(240, Math.min(800, Number(p.height || 380)))

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          {`html,body{margin:0;padding:0;background:transparent} body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell}`}
        </style>
      </head>
      <body>
        <EmbedAreaClient codes={codes} unitid={unitid} height={height} />
      </body>
    </html>
  )
}
