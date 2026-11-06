import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ProjectsArchive } from '@/components/projects/ProjectsArchive';
import { Contact } from '@/components/Sections';
import { dict } from '@/content/dictionary';
import { locales, type Locale } from '@/content/types';
import { getPublicProjects } from '@/lib/projects';

// DEVELOPMENT ONLY. Renders the archive populated with sample fixtures so the listing composition can be
// inspected. The guard is server-side: in any other NODE_ENV this route is a 404 and never renders fixtures.
// ?many=1 swaps in six samples to show the 6+ filter state.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DevPreview({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ many?: string }>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { locale } = await params;
  const { many } = await searchParams;
  if (!locales.includes(locale as Locale)) notFound();
  const l = locale as Locale;

  return (
    <>
      <Header locale={l} page="projects" />
      <main id="main">
        <p
          role="note"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-grafit bg-kagit px-4 py-2 text-center text-[14px] font-medium text-grafit"
        >
          {dict.projects.fixtureLabel[l]} · /dev-preview
        </p>
        <ProjectsArchive locale={l} projects={getPublicProjects({ includeFixtures: true, many: many === '1' })} />
        <Contact locale={l} />
      </main>
      <Footer locale={l} page="projects" />
    </>
  );
}
