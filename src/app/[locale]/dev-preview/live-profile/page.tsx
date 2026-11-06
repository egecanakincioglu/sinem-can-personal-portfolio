import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/content/types';
import { LiveHome } from '../live/LiveHome';

// DEVELOPMENT ONLY. Iframe target of the Admin Profil / Site ayarları preview: the real public Profile page,
// fed by the same validated postMessage protocol as the Homepage preview (lib/preview-bridge.ts). Any other NODE_ENV: 404.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function LiveProfilePreview({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();
  await searchParams; // keeps the route dynamic: never prerendered
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: 'try{delete document.documentElement.dataset.intro}catch(e){}' }} />
      <LiveHome locale={locale as Locale} projects={[]} notes={[]} page="profile" />
    </>
  );
}
