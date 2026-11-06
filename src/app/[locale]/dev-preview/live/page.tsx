import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/content/types';
import { getPublicNotes, toItem } from '@/lib/notes';
import { getPublicProjects, homeProjectCards } from '@/lib/projects';
import { LiveHome } from './LiveHome';

// DEVELOPMENT ONLY. Iframe target of the Admin live preview. It renders the real public
// Homepage; the Admin editor sends a validated SiteContentOverride by postMessage (see lib/preview-bridge.ts).
// Baseline projects and notes come from the same published + approved accessors as the public route, so no
// fixture, draft or private CAD data can reach this page or its client bundle. Any other NODE_ENV: 404.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function LivePreview({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const sp = await searchParams; // also keeps the route dynamic: never prerendered
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const l = locale as Locale;
  const notes = getPublicNotes(l).slice(0, 3).map(toItem);
  const projects = homeProjectCards(getPublicProjects({ includeFixtures: sp.fx === '1' }), l); // fixtures (published + approved samples): only on explicit ?fx=1, development only
  return (
    <>
      {/* The preview shows the hero in its final state, not the once-per-session entrance. Runs before hydration. */}
      <script dangerouslySetInnerHTML={{ __html: 'try{delete document.documentElement.dataset.intro}catch(e){}' }} />
      <LiveHome locale={l} projects={projects} notes={notes} />
    </>
  );
}
