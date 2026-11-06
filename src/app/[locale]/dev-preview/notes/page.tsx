import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { NotesArchive } from '@/components/notes/NotesArchive';
import { Contact } from '@/components/Sections';
import { dict } from '@/content/dictionary';
import { locales, type Locale } from '@/content/types';
import { getPublicNotes } from '@/lib/notes';

// DEVELOPMENT ONLY. Renders the Notes archive populated with sample fixtures so the listing can be
// inspected. The guard is server-side: in any other NODE_ENV this route is a 404 and never renders fixtures.
// ?many=1 adds eight more samples to show the topic filter (it appears from eight notes).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DevNotesPreview({
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
      <Header locale={l} page="notes" />
      <main id="main">
        <p
          role="note"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-grafit bg-kagit px-4 py-2 text-center text-[14px] font-medium"
        >
          {dict.notes.fixtureLabel[l]} · /dev-preview/notes
        </p>
        <NotesArchive locale={l} notes={getPublicNotes(l, { includeFixtures: true, many: many === '1' })} />
        <Contact locale={l} />
      </main>
      <Footer locale={l} page="notes" />
    </>
  );
}
