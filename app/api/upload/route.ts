import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded (form field "file")' }, { status: 400 })
    }

    // In production we do not parse PDFs by default to avoid build/runtime surprises.
    // Flip ENABLE_PDF_PARSE=1 in env if you want to enable it later.
    if (process.env.ENABLE_PDF_PARSE !== '1') {
      return NextResponse.json({ ok: true, note: 'Upload received; PDF parsing disabled in prod.' })
    }

    // Example guarded parsing (disabled unless ENABLE_PDF_PARSE=1)
    // const arrayBuffer = await file.arrayBuffer()
    // const { default: pdfParse } = await import('pdf-parse')
    // const text = (await pdfParse(Buffer.from(arrayBuffer))).text
    // return NextResponse.json({ ok: true, text })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
