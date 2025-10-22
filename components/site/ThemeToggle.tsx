'use client';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
export default function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />} {isDark ? 'Light' : 'Dark'}
    </button>
  );
}
