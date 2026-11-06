import { noteRecords } from '@/content/notes/published';
import type { Block, NoteContent, NoteRecord } from '@/content/notes/types';
import { locales, type Locale } from '@/content/types';
import { blockStrings, plain } from './inline';
import { notePath, pagePath, type AltPaths } from './routes';

/* ------------------------------------------------------------------------------------------------
   The one access layer for note data. Server-side only.
   Public = published AND approved AND has content in the requested language. Fixtures only exist in
   development; the require() below sits behind a build-time constant so production bundles drop it.
   ------------------------------------------------------------------------------------------------ */

const DEV = process.env.NODE_ENV === 'development';

type FixtureModule = typeof import('@/content/fixtures/notes');
const fixtureModule = (): FixtureModule | null =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import would put the sample data into production bundles
  process.env.NODE_ENV === 'development' ? (require('../content/fixtures/notes') as FixtureModule) : null;

const isPublic = (n: NoteRecord) => n.status === 'published' && n.approved === true && (!n.fixture || DEV);

function universe(includeFixtures: boolean, many = false): NoteRecord[] {
  const fx = includeFixtures && DEV ? (fixtureModule()?.fixtureNotes ?? []) : [];
  const extra = many && DEV ? (fixtureModule()?.manyFixtureNotes ?? []) : [];
  return [...noteRecords, ...fx, ...extra].filter(isPublic);
}

const byRecency = (a: NoteRecord, b: NoteRecord) => b.published.localeCompare(a.published);

/** A note in one language. The record is only reachable in the languages it has content for. */
export type PublicNote = { record: NoteRecord; locale: Locale; content: NoteContent };

const inLocale = (list: NoteRecord[], locale: Locale): PublicNote[] =>
  list.flatMap((record) => (record[locale] ? [{ record, locale, content: record[locale] as NoteContent }] : []));

/** Public archive for one language. `includeFixtures` / `many` are honoured only in development. */
export function getPublicNotes(locale: Locale, opts: { includeFixtures?: boolean; many?: boolean } = {}): PublicNote[] {
  return inLocale(universe(!!opts.includeFixtures, !!opts.many).sort(byRecency), locale);
}

/** Slug lookup in ONE language: unknown, draft, unapproved or other-language slugs all return undefined (→ 404). */
export function findPublicNote(slug: string, locale: Locale): PublicNote | undefined {
  return inLocale(universe(true), locale).find((n) => n.content.slug === slug);
}

export function noteStaticParams() {
  return locales.flatMap((locale) => inLocale(universe(true), locale).map((n) => ({ locale, entry: n.content.slug })));
}

/** Equivalent URL in each language. A language the note does not exist in falls back to the archive. */
export function notePaths(record: NoteRecord): AltPaths {
  const p = (l: Locale) => (record[l] ? notePath(record[l]!.slug, l) : pagePath('notes', l));
  return { tr: p('tr'), en: p('en') };
}

/** Languages the note exists in, for the archive's language status. */
export const noteLanguages = (record: NoteRecord): Locale[] => locales.filter((l) => !!record[l]);

/** Up to two: explicit relations first, then a shared category or tag. */
export function relatedNotes(n: PublicNote): PublicNote[] {
  const pool = inLocale(universe(!!n.record.fixture), n.locale).filter((x) => x.record.id !== n.record.id);
  const explicit = (n.record.relatedIds ?? []).flatMap((id) => pool.filter((x) => x.record.id === id));
  const tags = n.content.tags ?? [];
  const similar = pool.filter(
    (x) =>
      !explicit.includes(x) &&
      (x.content.category === n.content.category || x.content.tags?.some((t) => tags.includes(t))),
  );
  return [...explicit, ...similar].slice(0, 2);
}

/** The next older note in archive order (wrapping), for the "Next note" link. */
export function nextNote(n: PublicNote): PublicNote | undefined {
  const list = inLocale(universe(!!n.record.fixture).sort(byRecency), n.locale);
  if (list.length < 2) return undefined;
  const i = list.findIndex((x) => x.record.id === n.record.id);
  return list[(i + 1) % list.length];
}

/* ---------- derived values ---------- */

const WPM: Record<Locale, number> = { tr: 190, en: 230 };

/** Reading time from the actual content: prose at a reading pace, code skimmed, figures and equations get a beat. */
export function readingMinutes(content: NoteContent, locale: Locale): number {
  let words = 0;
  const count = (s: string) => (plain(s).trim().match(/\S+/g) ?? []).length;
  for (const b of content.blocks) {
    for (const s of blockStrings(b)) words += count(s);
    words += extraWords(b);
  }
  for (const f of content.footnotes ?? []) words += count(f.text);
  return Math.max(1, Math.round(words / WPM[locale]));
}

function extraWords(b: Block): number {
  switch (b.type) {
    case 'code':
      return Math.round(b.code.split(/\s+/).filter(Boolean).length / 3);
    case 'math':
      return 15;
    case 'image':
    case 'svg':
      return 25;
    default:
      return 0;
  }
}

export type Heading = { id: string; level: 2 | 3; text: string };

/** H2/H3 outline for the table of contents and the running head. */
export function headingsOf(content: NoteContent): Heading[] {
  return content.blocks.flatMap((b) =>
    b.type === 'h2' || b.type === 'h3'
      ? [{ id: b.id, level: (b.type === 'h2' ? 2 : 3) as 2 | 3, text: plain(b.text) }]
      : [],
  );
}

/* ---------- archive view model: resolved to one locale, serialisable, safe for client components ---------- */

export type NoteItem = {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  summary: string;
  category?: string;
  tags: string[];
  date: string;
  minutes: number;
  langs: Locale[];
  featured: boolean;
  fixture: boolean;
  cover?: { src: string; alt: string; width: number; height: number; focalX: number; focalY: number };
};

export function toItem(n: PublicNote): NoteItem {
  const { record, content, locale } = n;
  return {
    id: record.id,
    href: notePath(content.slug, locale),
    title: content.title,
    subtitle: content.subtitle,
    summary: content.summary,
    category: content.category,
    tags: content.tags ?? [],
    date: record.published,
    minutes: readingMinutes(content, locale),
    langs: noteLanguages(record),
    featured: !!record.featured,
    fixture: !!record.fixture,
    cover: record.cover
      ? {
          src: record.cover.src,
          alt: content.coverAlt ?? record.cover.alt,
          width: record.cover.width,
          height: record.cover.height,
          focalX: record.cover.focalX ?? 50,
          focalY: record.cover.focalY ?? 50,
        }
      : undefined,
  };
}
