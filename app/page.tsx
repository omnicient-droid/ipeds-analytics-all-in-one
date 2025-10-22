export const dynamic = 'force-dynamic';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="grid gap-8">
      <section className="card p-8">
        <h1 className="text-3xl font-bold">University analytics, made simple.</h1>
        <p className="mt-2 text-muted-foreground">
          Compare enrollment, tuition, and graduation trends. Start with Columbia, UNC, and Harvard.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/compare" className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm font-semibold">
            Try the comparison tool
          </Link>
          <Link href="/u/190150" className="rounded-md border px-4 py-2 text-sm">View a sample profile</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/u/190150" className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <img src="/logos/columbia.png" alt="Columbia" className="h-6 w-6 rounded" />
            <div className="font-semibold">Columbia</div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">Elite private research university in NYC.</div>
        </Link>

        <Link href="/u/199120" className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <img src="/logos/unc.png" alt="UNC" className="h-6 w-6 rounded" />
            <div className="font-semibold">UNC–Chapel Hill</div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">Flagship public university in North Carolina.</div>
        </Link>

        <Link href="/u/166027" className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <img src="/logos/harvard.png" alt="Harvard" className="h-6 w-6 rounded" />
            <div className="font-semibold">Harvard</div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">Historic private research university in Cambridge.</div>
        </Link>
      </section>
    </div>
  );
}
