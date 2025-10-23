export default function ChartSkeleton() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="h-6 w-48 chart-skeleton rounded" />
      <div className="h-64 chart-skeleton rounded" />
      <div className="flex gap-4 justify-center">
        <div className="h-4 w-20 chart-skeleton rounded" />
        <div className="h-4 w-20 chart-skeleton rounded" />
        <div className="h-4 w-20 chart-skeleton rounded" />
      </div>
    </div>
  )
}
