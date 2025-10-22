'use client';

import { useEffect, useMemo } from 'react';

export default function PresentPage({ searchParams }: { searchParams: Record<string,string|undefined> }) {
  const schools = (searchParams.schools || 'columbia,unc,harvard,berkeley,smc').replace(/\s+/g,'');
  const url = useMemo(() => `/compare?schools=${encodeURIComponent(schools)}`, [schools]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'p') document.body.classList.toggle('present'); // toggle present mode
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('present'); // start in present mode
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('present'); };
  }, []);

  return (
    <main className="h-screen w-screen m-0 p-0">
      <div data-noprint className="fixed top-2 left-2 z-50 bg-white/90 rounded px-3 py-2 text-sm shadow">
        <b>Presentation Mode</b> — Press <kbd>P</kbd> to toggle UI. Print with <kbd>Cmd/Ctrl+P</kbd>.
      </div>
      <iframe title="Compare" src={url} className="h-full w-full border-0" />
    </main>
  );
}
