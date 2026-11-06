import type { SiteContent } from '@/content/site-content';
import type { Locale } from '@/content/types';
import type { NoteItem } from '@/lib/notes';
import type { ProjectCard } from '@/lib/projects';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { Approach, Contact, Direction, Forces, Intro, Work, Workshop } from './Sections';

/**
 * The Homepage composition. The public route renders it with the authoritative content (no `content`, real
 * public projects and notes). Development preview renders the very same tree with explicit inputs; the
 * admin live preview (next task) will pass its snapshot here. Nothing passed in is ever persisted or read back.
 */
export function HomePage({
  locale,
  content,
  projects,
  notes,
}: {
  locale: Locale;
  content?: SiteContent;
  projects?: ProjectCard[];
  notes?: NoteItem[];
}) {
  return (
    <>
      <Header
        locale={locale}
        page="home"
        ownerName={content?.ownerName}
        email={content?.contact.email}
        copy={content?.dict}
      />
      <main id="main">
        <Hero locale={locale} content={content} />
        <Intro locale={locale} content={content} />
        <Forces locale={locale} content={content} />
        <Workshop locale={locale} content={content} />
        <Approach locale={locale} content={content} />
        <Work locale={locale} content={content} projects={projects} notes={notes} />
        <Direction locale={locale} content={content} />
        <Contact locale={locale} content={content} />
      </main>
      <Footer locale={locale} content={content} />
    </>
  );
}
