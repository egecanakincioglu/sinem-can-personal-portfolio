import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { NoteArticle, tocOf } from '@/components/notes/NoteArticle';
import { ProjectDetail } from '@/components/projects/ProjectDetail';
import { Contact } from '@/components/Sections';
import { dict } from '@/content/dictionary';
import { ownerName } from '@/content/site';
import { getSiteContent } from '@/content/site-content';
import { locales, type Locale } from '@/content/types';
import { findPublicNote, notePaths, noteStaticParams } from './notes';
import { findPublicProject, projectPaths, projectStaticParams } from './projects';
import { slugs } from './routes';

/* Detail pages share one URL shape: /tr/projeler/[slug] · /en/projects/[slug] · /tr/notlar/[slug] · /en/notes/[slug].
   Only published, approved records in the requested language resolve; drafts, unknown slugs, the other
   language's slug and (in production) development fixtures all return 404. */

/** Static params for the detail segment; `key` is the name of the dynamic segment in the route folder. */
export function detailStaticParams<K extends string>(key: K) {
  return [
    ...projectStaticParams().map(({ locale, project }) => ({ locale, slug: slugs.projects[locale], [key]: project })),
    ...noteStaticParams().map(({ locale, entry }) => ({ locale, slug: slugs.notes[locale], [key]: entry })),
  ] as ({ locale: Locale; slug: string } & Record<K, string>)[];
}

function resolve(locale: string, slug: string, entry: string) {
  if (!locales.includes(locale as Locale)) return null;
  const l = locale as Locale;
  if (slug === slugs.projects[l]) {
    const p = findPublicProject(entry, l);
    return p ? ({ kind: 'project', l, p } as const) : null;
  }
  if (slug === slugs.notes[l]) {
    const n = findPublicNote(entry, l);
    return n ? ({ kind: 'note', l, n } as const) : null;
  }
  return null;
}

export function detailMetadata(locale: string, slug: string, entry: string): Metadata {
  const r = resolve(locale, slug, entry);
  if (!r) return {};

  if (r.kind === 'note') {
    const { l, n } = r;
    const all = notePaths(n.record);
    // Alternates only for languages the note actually exists in.
    const languages = Object.fromEntries((['tr', 'en'] as const).filter((x) => n.record[x]).map((x) => [x, all[x]]));
    return {
      title: `${n.content.title} — ${ownerName}`,
      description: n.content.summary,
      alternates: { canonical: all[l], languages },
      ...(n.record.fixture ? { robots: { index: false, follow: false } } : {}),
    };
  }

  const { l, p } = r;
  const paths = projectPaths(p);
  return {
    title: `${p.title[l]} — ${ownerName}`,
    description: p.subtitle?.[l] ?? dict.projects.metaDescription[l],
    alternates: { canonical: paths[l], languages: paths },
    // Development samples are never indexable (they only exist in development anyway).
    ...(p.fixture ? { robots: { index: false, follow: false } } : {}),
  };
}

export function DetailView({ locale, slug, entry }: { locale: string; slug: string; entry: string }) {
  const r = resolve(locale, slug, entry);
  if (!r) notFound();
  const content = getSiteContent();

  if (r.kind === 'note') {
    const { l, n } = r;
    const paths = notePaths(n.record);
    // The running head follows the H2 being read; ids and order come from the same outline as the table of contents.
    const sections = tocOf(n, l, content.dict)
      .filter((i) => i.level === 2)
      .map((i) => ({ id: i.id, label: i.label }));
    return (
      <>
        <Header locale={l} page="note" paths={paths} sections={sections} />
        <main id="main">
          <NoteArticle
            note={n}
            locale={l}
            dict={content.dict}
            ownerName={content.ownerName}
            email={content.contact.email}
          />
          <Contact locale={l} content={content} />
        </main>
        <Footer locale={l} page="note" paths={paths} content={content} />
      </>
    );
  }

  const { l, p } = r;
  return (
    <>
      <Header locale={l} page="project" paths={projectPaths(p)} />
      <main id="main">
        <ProjectDetail project={p} locale={l} dict={content.dict} />
        <Contact locale={l} content={content} />
      </main>
      <Footer locale={l} page="project" paths={projectPaths(p)} content={content} />
    </>
  );
}
