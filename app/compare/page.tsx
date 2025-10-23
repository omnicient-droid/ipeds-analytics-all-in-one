import nextDynamic from 'next/dynamic' // alias to avoid name clash with exported 'dynamic'
export const dynamic = 'force-dynamic'

const CompareClient = nextDynamic(() => import('./Client'), { ssr: false })

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        Compare Universities
      </h1>
      <CompareClient />
    </main>
  )
}
