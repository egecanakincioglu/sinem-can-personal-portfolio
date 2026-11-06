import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HomePage } from '@/components/HomePage';
import { getSiteContent, mergeSiteContent } from '@/content/site-content';
import { locales, type Locale } from '@/content/types';
import { getPublicProjects, homeProjectCards } from '@/lib/projects';

// DEVELOPMENT ONLY. Harness for the Homepage content-injection contract.
//   ?override=1       render with the sample SiteContentOverride (content/fixtures/home-override.ts)
//   ?a0=0.5           beam default load override (clamped to 0..1 by the component boundary)
//   ?projects=0|1|2|6 render Work with that many development-fixture projects (published + approved only)
// Without parameters it renders exactly what /[locale] renders. Preview data lives only in this request's
// props: nothing here writes to, or changes, the authoritative public content. In any other NODE_ENV: 404.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function HomeHarness({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ override?: string; a0?: string; projects?: string }>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { locale } = await params;
  const q = await searchParams;
  if (!locales.includes(locale as Locale)) notFound();
  const l = locale as Locale;

  let content = getSiteContent();
  if (q.override === '1' || q.a0 !== undefined) {
    // The NODE_ENV condition is a build-time constant: production bundles drop the sample module entirely.
    const sample =
      q.override === '1' && process.env.NODE_ENV === 'development'
        ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import would put the sample data into production bundles
          (require('@/content/fixtures/home-override') as typeof import('@/content/fixtures/home-override'))
            .sampleOverride
        : {};
    content = mergeSiteContent({ ...sample, ...(q.a0 !== undefined ? { beam: { defaultLoad: Number(q.a0) } } : {}) });
  }

  const n = q.projects === undefined ? 0 : Number(q.projects);
  const list = n > 0 ? getPublicProjects({ includeFixtures: true, many: n >= 6 }).slice(0, n) : getPublicProjects();

  return (
    <>
      <p
        role="note"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-grafit bg-kagit px-4 py-1 text-center text-[13px] font-medium text-grafit"
      >
        DEV HARNESS · override={q.override ?? '0'} · a0={content.beam.defaultLoad} · projects={list.length}
      </p>
      <HomePage
        locale={l}
        content={content === getSiteContent() ? undefined : content}
        projects={homeProjectCards(list, l)}
      />
    </>
  );
}
