import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { SchoolProfilePDF } from '@/lib/pdf'
import { fetchSeries } from '@/lib/series'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { unitid, schoolName, codes, logo, sector, level, division, conference } = body

    if (!unitid || !schoolName) {
      return NextResponse.json({ error: 'Missing unitid or schoolName' }, { status: 400 })
    }

    // Fetch metrics if codes provided
    let metrics
    if (codes && codes.length > 0) {
      try {
        const rawSeries = await fetchSeries(unitid, codes)
        metrics = rawSeries.map((s) => ({
          ...s,
          label: s.label || s.code,
        }))
      } catch {
        metrics = []
      }
    }

    // Generate PDF
    const pdfDoc = SchoolProfilePDF({
      school: {
        name: schoolName,
        unitid,
        logo,
        sector,
        level,
        division,
        conference,
      },
      metrics,
      generatedAt: new Date().toLocaleDateString(),
    })

    const buffer = await renderToBuffer(pdfDoc)

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${schoolName.replace(/[^a-z0-9]/gi, '_')}_profile.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
