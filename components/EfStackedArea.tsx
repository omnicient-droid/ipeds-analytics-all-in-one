"use client";

import "chart.js/auto";
import { Chart as ChartJS, Filler } from "chart.js";
import { Line } from "react-chartjs-2";
ChartJS.register(Filler);

type Point = { year: number; value: number };
type SeriesMap = Record<string, Point[]>;

// optional display names
const LABELS: Record<string, string> = {
  "EF.EFYTOTL": "Total",
  "EF.EFWHITT": "White",
  "EF.EFBKAAT": "Black",
  "EF.EFHISPT": "Hispanic/Latino",
  "EF.EFASIAT": "Asian",
  "EF.EFAIANT": "AIAN",
  "EF.EFNHPI": "NHPI",
  "EF.EF2MORT": "Two+",
  "EF.EFNRALT": "Nonresident",
  "EF.EFUNKNT": "Unknown",
};

// color palette (adjust to taste)
const COLORS: Record<string, string> = {
  "EF.EFWHITT": "#4f81bd",
  "EF.EFBKAAT": "#c0504d",
  "EF.EFHISPT": "#9bbb59",
  "EF.EFASIAT": "#8064a2",
  "EF.EFAIANT": "#4bacc6",
  "EF.EFNHPI": "#f79646",
  "EF.EF2MORT": "#92a9cf",
  "EF.EFNRALT": "#d99694",
  "EF.EFUNKNT": "#b7d7a8",
};

function byYear(points: Point[]) {
  const m = new Map<number, number>();
  for (const p of points) m.set(p.year, Number(p.value) || 0);
  return m;
}

export default function EfStackedArea({
  series,
  order, // preferred EF code order (top to bottom)
  height = 320,
}: {
  series: SeriesMap;
  order: string[];
  height?: number;
}) {
  // collect all years present in any series
  const years = Array.from(
    new Set(
      Object.values(series)
        .flat()
        .map((p) => p.year)
    )
  ).sort((a, b) => a - b);

  // datasets (skip total; we stack race buckets)
  const codes = order
    .filter((c) => series[c]?.length && c !== "EF.EFYTOTL")
    .concat(
      Object.keys(series)
        .filter((c) => !order.includes(c) && c !== "EF.EFYTOTL")
        .sort()
    );

  const datasets = codes.map((code) => {
    const m = byYear(series[code] || []);
    const color = COLORS[code] || "#999";
    return {
      label: LABELS[code] || code,
      data: years.map((y) => m.get(y) ?? 0),
      fill: true,
      backgroundColor: color + "40", // + alpha
      borderColor: color,
      pointRadius: 0,
      tension: 0.25,
      stack: "ef",
    };
  });

  const data = { labels: years, datasets };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false as const },
    plugins: {
      legend: { position: "bottom" as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const v = Number(ctx.raw) || 0;
            return `${ctx.dataset.label}: ${v.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: { stacked: true, grid: { color: "#eef2f7" } },
      x: { stacked: true, grid: { color: "#f3f5fa" } },
    },
  };

  return (
    <div style={{ height }}>
      <Line data={data as any} options={options as any} />
    </div>
  );
}
