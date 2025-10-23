import nextDynamic from 'next/dynamic' // alias to avoid name clash with exported 'dynamic'
export const dynamic = 'force-dynamic'

const CompareClient = nextDynamic(() => import('./Client'), { ssr: false })

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Compare Universities</h1>
      <CompareClient />
    </main>
  )
}
