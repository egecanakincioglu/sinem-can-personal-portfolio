import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/content/types';
import { getPublicProjects } from '@/lib/projects';
import { LiveProject } from './LiveProject';

// DEVELOPMENT ONLY. Iframe target of the Admin Projeler preview: the real public archive, fed by the same
// validated postMessage protocol as the Homepage preview (lib/preview-bridge.ts). The message carries record ids
// only; they resolve against this server-side pool (published + approved records plus development samples, already
// through toPublicProject), so no private original can reach the page. Any other NODE_ENV: 404.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function LiveProjectPreview({
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
      <LiveProject
        locale={locale as Locale}
        projects={getPublicProjects()}
        pool={getPublicProjects({ includeFixtures: true })}
      />
    </>
  );
}
