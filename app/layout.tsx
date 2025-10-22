export const dynamic = 'force-dynamic';

import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ThemeProvider from '@/components/site/ThemeProvider';
import Header from '@/components/site/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Statipedia — University Analytics',
  description: 'Compare enrollment, tuition, and outcomes for U.S. universities.',
  metadataBase: new URL('https://your-domain.vercel.app'),
  openGraph: {
    title: 'Statipedia',
    description: 'Interactive university analytics.',
    url: 'https://your-domain.vercel.app',
    siteName: 'Statipedia',
    type: 'website'
  },
  icons: [{ rel: 'icon', url: '/favicon.svg' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <Header />
          <main className="container-bleed py-6">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
