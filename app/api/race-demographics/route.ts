// app/api/race-demographics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * GET /api/race-demographics
 * 
 * Fetch racial/ethnic demographic data for universities
 * Used for affirmative action impact analysis
 * 
 * Query params:
 * - unitids: comma-separated list of university unitids (optional, defaults to top schools)
 * - yearStart: start year (default: 2020)
 * - yearEnd: end year (default: current year)
 * - source: data source filter (scorecard, cds, ipeds, all) (default: all)
 */

const DEFAULT_UNIVERSITIES = [
  190150, // Columbia
  166027, // Harvard
  243744, // Stanford
  130794, // Yale
  166683, // MIT
  215062, // UNC Chapel Hill
  110635, // UC Berkeley
  164988, // Princeton
  198419, // Brown
  186131, // Duke
]

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const unitidsParam = searchParams.get('unitids')
    const unitids = unitidsParam 
      ? unitidsParam.split(',').map(Number)
      : DEFAULT_UNIVERSITIES
    
    const yearStart = parseInt(searchParams.get('yearStart') || '2020')
    const yearEnd = parseInt(searchParams.get('yearEnd') || new Date().getFullYear().toString())
    const source = searchParams.get('source') || 'all'

    // Build metric code filter based on source
    let metricCodeFilter: any = {}
    if (source === 'scorecard') {
      metricCodeFilter = { startsWith: 'SC.UGDS.' }
    } else if (source === 'cds') {
      metricCodeFilter = { startsWith: 'CDS.B2.' }
    } else if (source === 'ipeds') {
      metricCodeFilter = { startsWith: 'IPEDS.EF.' }
    } else {
      // All sources - use OR
      metricCodeFilter = {
        OR: [
          { startsWith: 'SC.UGDS.' },
          { startsWith: 'CDS.B2.' },
          { startsWith: 'IPEDS.EF.' },
        ]
      }
    }

    // Fetch universities
    const universities = await prisma.university.findMany({
      where: { unitid: { in: unitids } },
      select: {
        id: true,
        unitid: true,
        name: true,
        state: true,
      },
    })

    if (universities.length === 0) {
      return NextResponse.json({ error: 'No universities found' }, { status: 404 })
    }

    // Fetch race demographics time series for these universities
    const timeSeries = await prisma.timeSeries.findMany({
      where: {
        universityId: { in: universities.map(u => u.id) },
        year: { gte: yearStart, lte: yearEnd },
        metric: { code: metricCodeFilter },
      },
      include: {
        metric: {
          select: { code: true, name: true, unit: true }
        },
        university: {
          select: { unitid: true }
        }
      },
      orderBy: [
        { universityId: 'asc' },
        { year: 'asc' },
        { metric: { code: 'asc' } },
      ],
    })

    // Transform data by university
    const result = universities.map(uni => {
      const uniData = timeSeries.filter(ts => ts.university.unitid === uni.unitid)
      
      // Group by year
      const yearMap = new Map<number, any>()
      
      uniData.forEach(point => {
        if (!yearMap.has(point.year)) {
          yearMap.set(point.year, {
            year: point.year,
            white: 0,
            black: 0,
            hispanic: 0,
            asian: 0,
            twoOrMore: 0,
            international: 0,
            aian: 0,
            nhpi: 0,
            unknown: 0,
          })
        }
        
        const yearData = yearMap.get(point.year)!
        const code = point.metric.code
        
        // Map metric codes to demographic categories
        if (code.includes('WHITE')) yearData.white = point.value
        else if (code.includes('BLACK')) yearData.black = point.value
        else if (code.includes('HISP')) yearData.hispanic = point.value
        else if (code.includes('ASIAN')) yearData.asian = point.value
        else if (code.includes('2MORE') || code.includes('TWOORMORE')) yearData.twoOrMore = point.value
        else if (code.includes('NRA') || code.includes('NONRES')) yearData.international = point.value
        else if (code.includes('AIAN')) yearData.aian = point.value
        else if (code.includes('NHPI')) yearData.nhpi = point.value
        else if (code.includes('UNKNOWN') || code.includes('UNK')) yearData.unknown = point.value
      })
      
      return {
        unitid: uni.unitid,
        name: uni.name,
        state: uni.state,
        demographics: Array.from(yearMap.values()).sort((a, b) => a.year - b.year),
      }
    })

    // Filter out universities with no demographic data
    const filteredResult = result.filter(uni => uni.demographics.length > 0)

    return NextResponse.json({
      universities: filteredResult,
      metadata: {
        yearStart,
        yearEnd,
        source,
        count: filteredResult.length,
        sffaRulingDate: '2023-06-29',
      }
    })

  } catch (error) {
    console.error('Error fetching race demographics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch race demographics' },
      { status: 500 }
    )
  }
}
