import { Suspense } from 'react'
import SchoolProfile from './SchoolProfile'
import { SCHOOLS } from '@/lib/schools'

// Client component is imported directly; Suspense will handle its loading state

export default async function Page({ params }: { params: Promise<{ unitid: string }> }) {
  const { unitid: unitidStr } = await params
  const unitid = Number(unitidStr)
  const school = Object.values(SCHOOLS).find((s) => s.unitid === unitid)
  const schoolName = school?.name ?? `UNITID ${unitid}`

  return (
    <main className="container-bleed py-12">
      <div className="mb-10 flex items-center gap-5">
        {school ? (
          <SchoolEmblem name={school.name} color={school.color} logo={school.logo} />
        ) : null}
        <div>
          <h1 className="mb-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-5xl font-black text-transparent">
            {schoolName}
          </h1>
          {school && <p className="text-gray-400">UNITID {unitid}</p>}
        </div>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="glass-card-hover p-8">
              <div className="chart-skeleton mb-4 h-8 w-64 rounded-lg" />
              <div className="chart-skeleton h-80 rounded-xl" />
            </div>
          </div>
        }
      >
        <SchoolProfile
          unitid={unitid}
          schoolName={schoolName}
          schoolColor={school?.color || '#3b82f6'}
        />
      </Suspense>
    </main>
  )
}

function SchoolEmblem({ name, color, logo }: { name: string; color: string; logo: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')
  // Try logo first; if missing at build time, the image will render broken, so we also render an accessible fallback text badge behind it
  return (
    <div className="relative h-16 w-16">
      <div
        className="absolute inset-0 flex items-center justify-center rounded-xl border border-white/10 text-xl font-bold text-white shadow-lg"
        style={{ background: color }}
        aria-hidden="true"
      >
        {initials}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt={name}
        width={64}
        height={64}
        className="relative z-10 h-16 w-16 rounded-xl border border-white/10 object-contain shadow-lg"
      />
    </div>
  )
}
