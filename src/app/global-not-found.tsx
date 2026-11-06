import type { Metadata } from 'next';
import { Hanken_Grotesk, Newsreader } from 'next/font/google';
import { dict } from '@/content/dictionary';
import { ownerName } from '@/content/site';
import './globals.css';

// Rendered for every unmatched URL (unknown slugs, drafts, wrong-language paths). Next passes no route
// params here, so the page is deliberately bilingual.
const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  display: 'swap',
  variable: '--font-newsreader',
});
const hanken = Hanken_Grotesk({ subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--font-hanken' });

export const metadata: Metadata = { title: `404 — ${ownerName}`, robots: { index: false } };

export default function GlobalNotFound() {
  const n = dict.notFound;
  return (
    <html lang="tr" className={`${newsreader.variable} ${hanken.variable}`}>
      <body>
        <main id="main" className="shell flex min-h-dvh flex-col justify-center py-24">
          <p className="t-meta">404</p>
          <h1 className="t-display-l mt-4 max-w-[14ch]">
            <span lang="tr">{n.title.tr}</span>
            <span className="mt-2 block text-kursun" lang="en">
              {n.title.en}
            </span>
          </h1>
          <p className="mt-6 max-w-[40ch] text-kursun">
            <span lang="tr">{n.text.tr}</span>
            <br />
            <span lang="en">{n.text.en}</span>
          </p>
          <nav aria-label={ownerName} className="mt-8 flex flex-wrap gap-x-8">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- renders outside the app router, so a full page load is required */}
            <a href="/tr/projeler" hrefLang="tr" className="ulink inline-flex min-h-11 items-center font-medium">
              Projeler
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- renders outside the app router, so a full page load is required */}
            <a href="/en/projects" hrefLang="en" className="ulink inline-flex min-h-11 items-center font-medium">
              Projects
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- renders outside the app router, so a full page load is required */}
            <a href="/tr" hrefLang="tr" className="ulink inline-flex min-h-11 items-center font-medium">
              Ana sayfa
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- renders outside the app router, so a full page load is required */}
            <a href="/en" hrefLang="en" className="ulink inline-flex min-h-11 items-center font-medium">
              Home
            </a>
          </nav>
        </main>
      </body>
    </html>
  );
}
