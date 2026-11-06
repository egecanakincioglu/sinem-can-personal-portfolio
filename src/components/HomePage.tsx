import type { SiteContent } from '@/content/site-content';
import type { Locale } from '@/content/types';
import type { NoteItem } from '@/lib/notes';
import type { ProjectCard } from '@/lib/projects';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { Approach, Contact, Direction, Forces, Intro, Work, Workshop } from './Sections';

/**
 * The Homepage composition. Every caller passes the content to render (the public route passes the
 * authoritative content, with real public projects and notes). Development preview and the admin live
 * preview set `preview` and pass edited content; only then is it forwarded to the client components, which
 * otherwise read their bundled copy, so the public payload does not grow. Nothing passed in is ever
 * persisted or read back.
 */
export function HomePage({
  locale,
  content,
  projects,
  notes,
  preview = false,
}: {
  locale: Locale;
  content: SiteContent;
  projects?: ProjectCard[];
  notes?: NoteItem[];
  preview?: boolean;
}) {
  return (
    <>
      <Header
        locale={locale}
        page="home"
        ownerName={preview ? content.ownerName : undefined}
        email={preview ? content.contact.email : undefined}
        copy={preview ? content.dict : undefined}
      />
      <main id="main">
        <Hero locale={locale} content={content} />
        <Intro locale={locale} content={content} />
        <Forces locale={locale} content={content} preview={preview} />
        <Workshop locale={locale} content={content} />
        <Approach locale={locale} content={content} preview={preview} />
        <Work locale={locale} content={content} projects={projects} notes={notes} />
        <Direction locale={locale} content={content} />
        <Contact locale={locale} content={content} />
      </main>
      <Footer locale={locale} content={content} />
    </>
  );
}
