import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ProfileLayout } from '@/components/ProfileSections';
import { ProjectsArchive } from '@/components/projects/ProjectsArchive';
import { NotesArchive } from '@/components/notes/NotesArchive';
import { Contact } from '@/components/Sections';
import { dict } from '@/content/dictionary';
import { getSiteContent } from '@/content/site-content';
import { locales, type Locale } from '@/content/types';
import { getPublicNotes } from '@/lib/notes';
import { getPublicProjects } from '@/lib/projects';
import { pagePath, slugs } from '@/lib/routes';

// Three localised top-level pages share this segment: /tr/profil · /en/profile,
// /tr/projeler · /en/projects and /tr/notlar · /en/notes. Any other slug — including a slug in the
// wrong language — is a 404.
export const dynamicParams = false;
export const generateStaticParams = () =>
  locales.flatMap((locale) => [
    { locale, slug: slugs.profile[locale] },
    { locale, slug: slugs.projects[locale] },
    { locale, slug: slugs.notes[locale] },
  ]);

type Params = { params: Promise<{ locale: string; slug: string }> };
type Page = 'profile' | 'projects' | 'notes';

function resolve(locale: string, slug: string): { l: Locale; page: Page } | null {
  if (!locales.includes(locale as Locale)) return null;
  const l = locale as Locale;
  for (const page of ['profile', 'projects', 'notes'] as const) if (slug === slugs[page][l]) return { l, page };
  return null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const r = resolve(locale, slug);
  if (!r) return {};
  const { l, page } = r;
  const copy = dict[page];
  return {
    title: copy.metaTitle[l],
    description: copy.metaDescription[l],
    alternates: {
      canonical: pagePath(page, l),
      languages: { tr: pagePath(page, 'tr'), en: pagePath(page, 'en') },
    },
  };
}

export default async function TopLevelPage({ params }: Params) {
  const { locale, slug } = await params;
  const r = resolve(locale, slug);
  if (!r) notFound();
  const { l, page } = r;
  const content = getSiteContent();

  return (
    <>
      <Header locale={l} page={page} />
      <main id="main">
        {page === 'profile' ? (
          <ProfileLayout locale={l} content={content} />
        ) : page === 'projects' ? (
          <ProjectsArchive locale={l} projects={getPublicProjects()} />
        ) : (
          <NotesArchive locale={l} notes={getPublicNotes(l)} />
        )}
        <Contact locale={l} content={content} />
      </main>
      <Footer locale={l} page={page} content={content} />
    </>
  );
}
