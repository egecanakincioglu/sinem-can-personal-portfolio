import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Block, NoteContent, NoteRecord } from '@/content/notes/types';

const content = (slug: string, extra: Partial<NoteContent> = {}): NoteContent => ({
  slug,
  title: `Title ${slug}`,
  summary: `Summary ${slug}`,
  blocks: [{ type: 'p', text: 'one two three' }],
  ...extra,
});

function rec(id: string, published: string, extra: Partial<NoteRecord> = {}): NoteRecord {
  return {
    id,
    status: 'published',
    approved: true,
    published,
    tr: content(`${id}-tr`),
    en: content(`${id}-en`),
    ...extra,
  };
}

const records: NoteRecord[] = [
  rec('n1', '2025-01-01', { relatedIds: ['n3'] }),
  rec('n2', '2025-03-01', { en: undefined, tr: content('n2-tr', { category: 'cat' }) }),
  rec('n3', '2024-06-01'),
  rec('n4', '2024-01-01', { en: undefined, tr: content('n4-tr', { category: 'cat' }) }),
  rec('draft', '2025-05-01', { status: 'draft' }),
  rec('unapproved', '2025-06-01', { approved: false }),
  rec('fx-published', '2025-07-01', { fixture: true }),
];
const fixtureNotes: NoteRecord[] = [
  rec('fx-1', '2025-08-01', { fixture: true }),
  rec('fx-draft', '2025-08-02', { fixture: true, status: 'draft' }),
];
const manyFixtureNotes: NoteRecord[] = [rec('many-1', '2025-09-01', { fixture: true })];

async function load(env: 'production' | 'development', list: NoteRecord[] = records) {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', env);
  vi.doMock('@/content/notes/published', () => ({ noteRecords: list }));
  vi.doMock('@/content/fixtures/notes', () => ({ fixtureNotes, manyFixtureNotes }));
  return import('./notes');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('@/content/notes/published');
  vi.doUnmock('@/content/fixtures/notes');
});

describe('note visibility in production', () => {
  it('lists published, approved, non-fixture notes newest first', async () => {
    const m = await load('production');
    expect(m.getPublicNotes('tr').map((n) => n.record.id)).toEqual(['n2', 'n1', 'n3', 'n4']);
  });

  it('hides drafts, unapproved and fixtures even when fixtures are requested', async () => {
    const m = await load('production');
    const ids = m.getPublicNotes('en', { includeFixtures: true, many: true }).map((n) => n.record.id);
    expect(ids).toEqual(['n1', 'n3']);
  });

  it('does not resolve hidden slugs', async () => {
    const m = await load('production');
    for (const id of ['draft', 'unapproved', 'fx-published']) {
      expect(m.findPublicNote(`${id}-tr`, 'tr')).toBeUndefined();
      expect(m.findPublicNote(`${id}-en`, 'en')).toBeUndefined();
    }
  });

  it('resolves a public slug only in its own language', async () => {
    const m = await load('production');
    expect(m.findPublicNote('n1-tr', 'tr')?.record.id).toBe('n1');
    expect(m.findPublicNote('n1-tr', 'en')).toBeUndefined();
    expect(m.findPublicNote('n2-tr', 'tr')?.record.id).toBe('n2');
  });

  it('only builds static params for languages the note has', async () => {
    const m = await load('production');
    const params = m.noteStaticParams();
    expect(params).toContainEqual({ locale: 'tr', entry: 'n2-tr' });
    expect(params.filter((p) => p.entry.startsWith('n2'))).toHaveLength(1);
    expect(params.some((p) => p.entry.startsWith('draft'))).toBe(false);
  });
});

describe('note visibility in development', () => {
  // The fixture module is loaded with require() behind a build-time constant, which Vitest cannot resolve for .ts files.
  it('shows a published, approved record flagged as a fixture, but not drafts or unapproved', async () => {
    const m = await load('development');
    const ids = m.getPublicNotes('en').map((n) => n.record.id);
    expect(ids).toEqual(['fx-published', 'n1', 'n3']);
    expect(ids).not.toContain('draft');
    expect(ids).not.toContain('unapproved');
  });
});

describe('languages and paths', () => {
  it('reports the languages a note exists in', async () => {
    const m = await load('production');
    expect(m.noteLanguages(records[0])).toEqual(['tr', 'en']);
    expect(m.noteLanguages(records[1])).toEqual(['tr']);
  });

  it('gives each language its own path', async () => {
    const m = await load('production');
    expect(m.notePaths(records[0])).toEqual({ tr: '/tr/notlar/n1-tr', en: '/en/notes/n1-en' });
  });

  it('falls back to the archive for the missing language', async () => {
    const m = await load('production');
    expect(m.notePaths(records[1])).toEqual({ tr: '/tr/notlar/n2-tr', en: '/en/notes' });
  });

  it('reports the missing language in the archive item', async () => {
    const m = await load('production');
    const only = m.toItem(m.getPublicNotes('tr').find((n) => n.record.id === 'n2')!);
    expect(only.langs).toEqual(['tr']);
    const both = m.toItem(m.getPublicNotes('tr').find((n) => n.record.id === 'n1')!);
    expect(both.langs).toEqual(['tr', 'en']);
  });
});

describe('related and next', () => {
  it('puts explicit relations first, then same category, max two', async () => {
    const m = await load('production');
    expect(m.relatedNotes(m.findPublicNote('n1-tr', 'tr')!).map((n) => n.record.id)).toEqual(['n3']);
    expect(m.relatedNotes(m.findPublicNote('n2-tr', 'tr')!).map((n) => n.record.id)).toEqual(['n4']);
  });

  it('only relates within the same language and never to hidden notes', async () => {
    const m = await load('production');
    const n1 = m.findPublicNote('n1-en', 'en')!;
    const rel = { ...n1, record: { ...n1.record, relatedIds: ['n2', 'draft', 'unapproved'] } };
    const ids = m.relatedNotes(rel).map((x) => x.record.id);
    for (const hidden of ['n2', 'draft', 'unapproved']) expect(ids).not.toContain(hidden);
  });

  it('relates through a shared tag', async () => {
    const list = [
      rec('t1', '2025-01-01', { tr: content('t1-tr', { category: 'a', tags: ['x'] }) }),
      rec('t2', '2025-02-01', { tr: content('t2-tr', { category: 'b', tags: ['x', 'y'] }) }),
      rec('t3', '2025-03-01', { tr: content('t3-tr', { category: 'c', tags: ['z'] }) }),
    ];
    const m = await load('production', list);
    expect(m.relatedNotes(m.findPublicNote('t1-tr', 'tr')!).map((n) => n.record.id)).toEqual(['t2']);
  });

  it('returns the next older note and wraps', async () => {
    const m = await load('production');
    expect(m.nextNote(m.findPublicNote('n2-tr', 'tr')!)?.record.id).toBe('n1');
    expect(m.nextNote(m.findPublicNote('n4-tr', 'tr')!)?.record.id).toBe('n2');
  });

  it('has no next note when the language has fewer than two', async () => {
    const m = await load('production', [records[0]]);
    expect(m.nextNote(m.getPublicNotes('tr')[0])).toBeUndefined();
  });
});

describe('readingMinutes', () => {
  const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

  it('is at least one minute', async () => {
    const m = await load('production');
    expect(m.readingMinutes(content('a'), 'en')).toBe(1);
  });

  it('uses a slower pace for Turkish than English', async () => {
    const m = await load('production');
    const long = content('a', { blocks: [{ type: 'p', text: words(1900) }] });
    expect(m.readingMinutes(long, 'tr')).toBe(10);
    expect(m.readingMinutes(long, 'en')).toBe(8);
  });

  it('adds time for code, equations, figures and footnotes', async () => {
    const m = await load('production');
    const blocks: Block[] = [
      { type: 'code', code: words(3 * 230) },
      { type: 'math', tex: 'x' },
      { type: 'image', image: { src: '/a.png', alt: 'a', width: 1, height: 1 }, caption: '' },
      { type: 'svg', svg: '', viewBox: '0 0 1 1', alt: 'a', caption: '' },
    ];
    // 230 + 15 + 25 + 25 = 295 words at 230 wpm
    expect(m.readingMinutes(content('a', { blocks }), 'en')).toBe(1);
    const more = content('a', { blocks, footnotes: [{ id: 'f', text: words(400) }] });
    expect(m.readingMinutes(more, 'en')).toBe(3);
  });
});

describe('headingsOf', () => {
  it('lists H2 and H3 only, with ids that do not depend on the language', async () => {
    const m = await load('production');
    const trBlocks: Block[] = [
      { type: 'p', text: 'x' },
      { type: 'h2', id: 'setup', text: 'Kurulum **kalın**' },
      { type: 'h3', id: 'detail', text: 'Ayrıntı' },
      { type: 'h4', id: 'skip', text: 'Atla' },
    ];
    const enBlocks: Block[] = [
      { type: 'h2', id: 'setup', text: 'Setup' },
      { type: 'h3', id: 'detail', text: 'Detail' },
    ];
    const tr = m.headingsOf(content('a', { blocks: trBlocks }));
    const en = m.headingsOf(content('b', { blocks: enBlocks }));
    expect(tr).toEqual([
      { id: 'setup', level: 2, text: 'Kurulum kalın' },
      { id: 'detail', level: 3, text: 'Ayrıntı' },
    ]);
    expect(en.map((h) => h.id)).toEqual(tr.map((h) => h.id));
  });
});

describe('toItem', () => {
  it('builds the archive item with cover defaults and alt override', async () => {
    const m = await load('production');
    const cover = { src: '/c.png', alt: 'record alt', width: 10, height: 5 };
    const r = rec('cv', '2025-01-01', {
      cover,
      featured: true,
      tr: content('cv-tr', { coverAlt: 'own alt', tags: ['t'] }),
    });
    const item = m.toItem({ record: r, locale: 'tr', content: r.tr! });
    expect(item).toMatchObject({ id: 'cv', href: '/tr/notlar/cv-tr', featured: true, tags: ['t'], fixture: false });
    expect(item.cover).toEqual({ ...cover, alt: 'own alt', focalX: 50, focalY: 50 });
  });

  it('works without a cover', async () => {
    const m = await load('production');
    const item = m.toItem(m.getPublicNotes('en')[0]);
    expect(item.cover).toBeUndefined();
    expect(item.tags).toEqual([]);
    expect(item.minutes).toBe(1);
  });
});
