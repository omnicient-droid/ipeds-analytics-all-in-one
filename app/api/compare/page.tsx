export const dynamic = 'force-dynamic';
import nextDynamic from 'next/dynamic';

const CoreCompare = nextDynamic(() => import('./Client'), { ssr:false })
const RaceCompare = nextDynamic(() => import('./RacePanel'), { ssr:false })

export default function ComparePage() {
  return (
    <main className="grid gap-6">
      <h1 className="text-2xl font-bold">Compare Universities</h1>
      <CoreCompare />
      <RaceCompare />
    </main>
  )
}
