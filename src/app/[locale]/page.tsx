import type { Metadata } from 'next';
import { HomePage } from '@/components/HomePage';
import type { Locale } from '@/content/types';
import { getPublicNotes, toItem } from '@/lib/notes';
import { getPublicProjects, homeProjectCards } from '@/lib/projects';

// The layout supplies title, description and hreflang; the home page adds its own canonical.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: { canonical: `/${locale}`, languages: { tr: '/tr', en: '/en' } } };
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = (await params) as { locale: Locale };
  const notes = getPublicNotes(locale).slice(0, 3).map(toItem);
  // Published AND approved records only (no fixtures, no drafts): the same visibility rule as the archive.
  const projects = homeProjectCards(getPublicProjects(), locale);
  return <HomePage locale={locale} projects={projects} notes={notes} />;
}
