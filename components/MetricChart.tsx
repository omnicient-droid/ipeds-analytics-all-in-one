// components/MetricChart.tsx
'use client'

import { Line } from 'react-chartjs-2'
import 'chart.js/auto'

export type SeriesPoint = { year: number; value: number | null }

export default function MetricChart(props: {
  title: string
  series: SeriesPoint[]
  yLabel?: string
}) {
  const years = props.series.map((p) => p.year)
  const values = props.series.map((p) =>
    p.value === null ? null : Number(p.value)
  )

  return (
    <div className="box" style={{ marginTop: 16 }}>
      <div className="box-header">{props.title}</div>
      <div className="box-body">
        <Line
          data={{
            labels: years,
            datasets: [
              {
                label: props.yLabel || props.title,
                data: values,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: false, grid: { color: '#eef2f7' } },
              x: { grid: { color: '#f3f5fa' } },
            },
            plugins: { legend: { display: false } },
            elements: { point: { radius: 3 } },
          }}
          height={280}
        />
      </div>
    </div>
  )
}
