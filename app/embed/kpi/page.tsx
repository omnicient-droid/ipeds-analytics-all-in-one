export const dynamic = 'force-dynamic'

import EmbedKPIClient from '@/components/EmbedKPIClient'

export default async function EmbedKPI({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string
    unitid?: string
    label?: string
    height?: string
  }>
}) {
  const p = await searchParams
  const code = p.code || ''
  const unitid = Number(p.unitid || '0')
  const label = p.label
  const height = Math.max(100, Math.min(300, Number(p.height || 120)))

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          {`html,body{margin:0;padding:0;background:transparent} body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell}`}
        </style>
      </head>
      <body>
        <EmbedKPIClient code={code} unitid={unitid} label={label} height={height} />
      </body>
    </html>
  )
}
