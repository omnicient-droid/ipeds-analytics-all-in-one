import * as React from 'react'

export type SparklineProps = {
  data: number[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
  strokeWidth?: number
  rounded?: boolean
  className?: string
}

export default function Sparkline({
  data,
  width = 120,
  height = 32,
  stroke = 'var(--accent)',
  fill = 'transparent',
  strokeWidth = 2,
  rounded = true,
  className,
}: SparklineProps) {
  const w = Math.max(1, width)
  const h = Math.max(1, height)
  if (!data || data.length === 0) {
    return (
      <svg width={w} height={h} className={className} aria-hidden>
        <rect x={0} y={0} width={w} height={h} fill="rgba(0,0,0,0.04)" />
      </svg>
    )
  }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = w / Math.max(1, data.length - 1)

  const points = data.map((v, i) => {
    const x = i * step
    const y = h - ((v - min) / range) * h
    return [x, y]
  })

  const d = points.map((p, i) => (i === 0 ? `M ${p[0]},${p[1]}` : `L ${p[0]},${p[1]}`)).join(' ')

  // Optional area fill
  const area = `${d} L ${points[points.length - 1][0]},${h} L 0,${h} Z`

  return (
    <svg width={w} height={h} className={className} viewBox={`0 0 ${w} ${h}`} role="img">
      {fill !== 'transparent' && <path d={area} fill={fill} opacity={0.25} />}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin={rounded ? 'round' : 'miter'}
        strokeLinecap={rounded ? 'round' : 'butt'}
      />
    </svg>
  )
}
