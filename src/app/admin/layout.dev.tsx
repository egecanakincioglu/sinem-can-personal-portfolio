import type { Metadata } from 'next';
import { Hanken_Grotesk, Newsreader } from 'next/font/google';
import { assertDevOnly } from './guard';
import { SimBanner } from './ui/feedback';
import './admin.css';

const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  display: 'swap',
  variable: '--font-newsreader',
});
const hanken = Hanken_Grotesk({ subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--font-hanken' });

// Resolved even when the layout answers 404, so outside development it must carry no Admin strings.
export function generateMetadata(): Metadata {
  if (process.env.NODE_ENV !== 'development') return {};
  return {
    title: 'ANTET — Prototip yönetim alanı',
    robots: { index: false, follow: false, nocache: true },
  };
}

// Separate root layout (the public root is app/[locale]/layout.tsx).
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  assertDevOnly();
  return (
    <html lang="tr" className={`${newsreader.variable} ${hanken.variable}`}>
      <body className="admin-root">
        <SimBanner />
        {children}
      </body>
    </html>
  );
}
