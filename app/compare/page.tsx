export const dynamic = 'force-dynamic';
import dynamicImport from 'next/dynamic';
import Link from 'next/link';

const CompareClient = dynamicImport(() => import('./Client'), { ssr: false });

export default function ComparePage() {
  return (
    <main className="grid gap-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Compare Universities</h1>
        <nav><Link href="/" className="text-sm underline">Home</Link></nav>
      </header>
      <CompareClient />
    </main>
  );
}
