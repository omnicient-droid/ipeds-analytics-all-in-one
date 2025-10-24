'use client'

import * as React from 'react'
import { Download } from 'lucide-react'

interface ExportPDFButtonProps {
  unitid: number
  schoolName: string
  codes?: string[]
  logo?: string
  sector?: string
  level?: string
  division?: string
  conference?: string
  className?: string
}

export default function ExportPDFButton({
  unitid,
  schoolName,
  codes,
  logo,
  sector,
  level,
  division,
  conference,
  className = '',
}: ExportPDFButtonProps) {
  const [loading, setLoading] = React.useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitid,
          schoolName,
          codes,
          logo,
          sector,
          level,
          division,
          conference,
        }),
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${schoolName.replace(/[^a-z0-9]/gi, '_')}_profile.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export PDF. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={`flex items-center gap-2 rounded-lg border border-white/10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-2 text-sm font-medium text-white transition-all hover:from-purple-500/30 hover:to-pink-500/30 disabled:opacity-50 ${className}`}
    >
      <Download className="h-4 w-4" />
      {loading ? 'Exporting...' : 'Export PDF'}
    </button>
  )
}
