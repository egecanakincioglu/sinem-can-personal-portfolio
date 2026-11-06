import type { Metadata } from 'next';
import { Hanken_Grotesk, Newsreader } from 'next/font/google';
import { notFound } from 'next/navigation';
import { dict } from '@/content/dictionary';
import { locales, type Locale } from '@/content/types';
import '../globals.css';

// Newsreader: roman + italic, variable weight with the optical-size axis (opsz 6–72).
// Hanken Grotesk: roman only, variable weight. No italic, no mono.
const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  display: 'swap',
  variable: '--font-newsreader',
});
const hanken = Hanken_Grotesk({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-hanken',
});

export const dynamicParams = false;
export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) return {};
  const l = locale as Locale;
  return {
    title: dict.meta.title[l],
    description: dict.meta.description[l],
    alternates: { languages: { tr: '/tr', en: '/en' } },
  };
}

// Runs before first paint: marks JS availability and plays the hero sequence once per session.
const bootScript = `try{var d=document.documentElement;d.dataset.js="1";if(!sessionStorage.getItem("intro-played")){d.dataset.intro="play";sessionStorage.setItem("intro-played","1")}}catch(e){}`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const l = locale as Locale;

  return (
    <html lang={l} className={`${newsreader.variable} ${hanken.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <a
          href="#main"
          className="fixed left-4 top-4 z-[60] -translate-y-24 bg-kagit px-4 py-2 font-medium outline-1 outline-grafit focus:translate-y-0"
        >
          {dict.skip[l]}
        </a>
        {children}
      </body>
    </html>
  );
}
