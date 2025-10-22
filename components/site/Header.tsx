import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header className="border-b sticky top-0 z-40 bg-background/80 backdrop-blur">
      <div className="container-bleed flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-block h-6 w-6 rounded bg-primary" />
          <span>Statipedia</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/compare" className="text-sm hover:underline">Compare</Link>
          <Link href="/u/190150" className="text-sm hover:underline">Columbia</Link>
          <Link href="/u/199120" className="text-sm hover:underline">UNC</Link>
          <Link href="/u/166027" className="text-sm hover:underline">Harvard</Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
