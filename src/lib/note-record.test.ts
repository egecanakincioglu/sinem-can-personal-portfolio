import { describe, expect, it } from 'vitest';
import { fixtureNotes, manyFixtureNotes } from '@/content/fixtures/notes';
import type { NoteRecord } from '@/content/notes/types';
import {
  crossRefIssues,
  linkIssues,
  noteCounts,
  noteIssues,
  noteLangStatus,
  noteListRow,
  pairNote,
  unpairNote,
  type MockNote,
} from './note-record';

const px = (tr: string, en: string) => ({ tr, en });

/** Drops '' and empty lists so that absent and empty compare equal. */
function normalise(v: unknown): unknown {
  if (Array.isArray(v)) return v.length === 0 ? undefined : v.map(normalise);
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v)
        .map(([k, x]) => [k, normalise(x)] as const)
        .filter(([, x]) => x !== undefined),
    );
  return v === '' ? undefined : v;
}

function pairOk(r: NoteRecord): MockNote {
  const p = pairNote(r);
  if (!p.ok) throw new Error(JSON.stringify(p.errors));
  return p.note;
}

const base: NoteRecord = {
  id: 'n1',
  status: 'draft',
  approved: false,
  published: '2026-10-01',
  tr: { slug: 'bir', title: 'Bir', summary: 'Ozet', blocks: [{ type: 'p', text: 'Metin' }] },
  en: { slug: 'one', title: 'One', summary: 'Summary', blocks: [{ type: 'p', text: 'Text' }] },
};
const ctx = (records: MockNote[] = []) => ({ records, figureIds: ['beam'], assetIds: ['/a.png'] });
const noteWith = (patch: Partial<MockNote>): MockNote => ({ ...pairOk(base), ...patch });
const messages = (n: MockNote, c = ctx()) => noteIssues(n, c).map((i) => i.message);

describe('round trip', () => {
  it.each([...fixtureNotes, ...manyFixtureNotes].map((r) => [r.id, r] as const))('%s is lossless', (_id, record) => {
    const note = pairOk(record);
    expect(normalise(unpairNote(note))).toEqual(normalise(record));
  });

  it('keeps the text of a side that is off and drops it from the record', () => {
    const note = { ...pairOk(base), langs: { tr: 'on', en: 'off' } } as MockNote;
    const record = unpairNote(note);
    expect(record.en).toBeUndefined();
    expect(note.title.en).toBe('One');
    expect(record.tr?.title).toBe('Bir');
  });
});

describe('pairNote', () => {
  it('reports block, footnote, reference and revision mismatches', () => {
    const r: NoteRecord = {
      ...base,
      tr: {
        ...base.tr!,
        blocks: [{ type: 'p', text: 'a' }],
        footnotes: [{ id: 'a', text: 'x' }],
        references: [{ id: 'r', text: 'x', url: 'https://a.test' }],
        revisions: [{ rev: 'A', date: '2026-01-01', text: 'x' }],
      },
      en: {
        ...base.en!,
        blocks: [
          { type: 'p', text: 'a' },
          { type: 'p', text: 'b' },
        ],
        footnotes: [{ id: 'b', text: 'x' }],
        references: [{ id: 'r', text: 'x', url: 'https://b.test' }],
        revisions: [],
      },
    };
    const p = pairNote(r);
    expect(p.ok).toBe(false);
    if (p.ok) return;
    const keys = p.errors.map((e) => `${e.part}:${e.code}`);
    expect(keys).toEqual(
      expect.arrayContaining(['blocks:length', 'footnotes:shared', 'references:shared', 'revisions:length']),
    );
  });

  it('fills the missing side with empty text', () => {
    const note = pairOk({ ...base, en: undefined });
    expect(note.langs).toEqual({ tr: 'on', en: 'off' });
    expect(note.title).toEqual(px('Bir', ''));
  });

  it('aligns tags by position', () => {
    const note = pairOk({ ...base, tr: { ...base.tr!, tags: ['a', 'b'] }, en: { ...base.en!, tags: ['c'] } });
    expect(note.tags).toEqual([px('a', 'c'), px('b', '')]);
    expect(unpairNote(note).en?.tags).toEqual(['c']);
  });
});

describe('noteLangStatus', () => {
  it('is Yok for a side that is off', () => {
    expect(noteLangStatus({ ...pairOk(base), langs: { tr: 'on', en: 'off' } }, 'en')).toBe('Yok');
  });
  it('is Tamam when title, summary and blocks are filled', () => {
    expect(noteLangStatus(pairOk(base), 'tr')).toBe('Tamam');
  });
  it('counts empty fields', () => {
    const n = noteWith({ title: px('Bir', ''), blocks: [{ type: 'p', text: px('a', '') }] });
    expect(noteLangStatus(n, 'en')).toBe('Eksik (2 alan)');
    expect(noteLangStatus(n, 'tr')).toBe('Tamam');
  });
});

describe('noteIssues', () => {
  it('has none for a clean note', () => {
    expect(noteIssues(pairOk(base), ctx())).toEqual([]);
  });

  it('reports block issues for the languages that are on only', () => {
    const blocks = [{ type: 'p' as const, text: px('a', '') }];
    expect(noteIssues(noteWith({ blocks }), ctx())).toHaveLength(1);
    expect(noteIssues(noteWith({ blocks, langs: { tr: 'on', en: 'off' } }), ctx())).toEqual([]);
  });

  it('requires heading ids and checks updated >= published', () => {
    const n = noteWith({ blocks: [{ type: 'h2', id: '', text: px('a', 'a') }], updated: '2026-09-01' });
    expect(messages(n)).toEqual(['Başlık kimliği gerekli.', 'Güncelleme tarihi yayın tarihinden önce olamaz.']);
    expect(messages(noteWith({ updated: '2026-10-01' }))).toEqual([]);
  });

  it('limits summary and category', () => {
    const n = noteWith({ summary: px('a'.repeat(241), 'a'.repeat(240)), category: px('b'.repeat(40), 'b'.repeat(41)) });
    const i = noteIssues(n, ctx());
    expect(i.map((x) => `${x.field}:${x.lang}`)).toEqual(['summary:tr', 'category:en']);
  });

  it('requires coverAlt when a cover is set', () => {
    const cover = { src: '/a.png', alt: 'x', width: 1, height: 1 };
    expect(messages(noteWith({ cover }))).toEqual([
      'Kapak için alternatif metin gerekli.',
      'Kapak için alternatif metin gerekli.',
    ]);
    expect(messages(noteWith({ cover, coverAlt: px('a', 'b') }))).toEqual([]);
    expect(messages(noteWith({ cover: { ...cover, src: '/zz.png' }, coverAlt: px('a', 'b') }))).toEqual([
      'Kapak görseli kitaplıkta yok.',
    ]);
  });

  it('allows https reference urls only', () => {
    const refs = (url: string) => [{ id: 'r', text: px('a', 'a'), url }];
    const blocks = [{ type: 'p' as const, text: px('[@r]', '[@r]') }];
    expect(messages(noteWith({ references: refs('https://a.test'), blocks }))).toEqual([]);
    const bad = noteIssues(noteWith({ references: refs('http://a.test'), blocks }), ctx());
    expect(bad.map((i) => i.field)).toEqual(['references[0].url']);
  });

  it('checks footnote and reference ids', () => {
    const n = noteWith({
      footnotes: [
        { id: 'A b', text: px('a', 'a') },
        { id: 'x', text: px('a', 'a') },
        { id: 'x', text: px('a', 'a') },
      ],
    });
    const fields = noteIssues(n, ctx())
      .filter((i) => i.severity === 'error')
      .map((i) => i.field);
    expect(fields).toEqual(['footnotes[0].id', 'footnotes[2].id']);
  });

  it('flags unsupported TeX in math blocks', () => {
    const n = noteWith({ blocks: [{ type: 'math', tex: '\\foo{x' }] });
    expect(messages(n)).toEqual(['Hata: Desteklenmeyen TeX: \\foo', 'Hata: Desteklenmeyen TeX: eşleşmeyen {']);
    expect(messages(noteWith({ blocks: [{ type: 'math', tex: '\\frac{a}{b}' }] }))).toEqual([]);
  });

  it('flags bad links, unknown images, related ids and shared slugs', () => {
    const other = { ...pairOk(base), id: 'n2' };
    const n = noteWith({
      blocks: [
        { type: 'p', text: px('[a](http://x.test)', '[a](/ok)') },
        { type: 'image', src: '/nope.png', width: 1, height: 1, alt: px('a', 'a'), caption: px('c', 'c') },
      ],
      relatedIds: ['n2', 'missing', 'n1'],
    });
    const m = messages(n, ctx([other, n]));
    expect(m).toEqual(
      expect.arrayContaining([
        'Görsel kitaplıkta yok.',
        'İlgili not bulunamadı: missing.',
        'İlgili not bulunamadı: n1.',
        'Hata: Bağlantı https, / veya # ile başlamalı: http://x.test',
        'Bu adres başka bir notta kullanılıyor.',
      ]),
    );
  });

  it('flags an unknown figure id', () => {
    const n = noteWith({ blocks: [{ type: 'figure', figureId: 'zzz', alt: px('', ''), caption: px('', '') }] });
    expect(messages(n)).toEqual(['Kayıtlı olmayan teknik figür.']);
  });
});

describe('crossRefIssues', () => {
  const fn = [{ id: 'a', text: px('x', 'x') }];
  const refs = [{ id: 'r', text: px('x', 'x') }];

  it('is quiet when everything resolves', () => {
    const n = noteWith({
      footnotes: fn,
      references: refs,
      blocks: [
        { type: 'math', tex: 'x', id: 'eq1' },
        { type: 'p', text: px('a[^a] [@r] [[eq1]]', 'a[^a] [@r] [[eq1]]') },
      ],
    });
    expect(crossRefIssues(n, 'tr')).toEqual([]);
  });

  it('errors on undefined ids once each and on unresolved labels', () => {
    const n = noteWith({
      blocks: [
        { type: 'h2', id: 'sec', text: px('a', 'a') },
        { type: 'p', text: px('[^a] [^a] [@r] [[sec]] **[[nope]]**', '') },
      ],
    });
    expect(crossRefIssues(n, 'tr').map((i) => i.message)).toEqual([
      'Hata: [^a] tanımlı değil.',
      'Hata: [@r] tanımlı değil.',
      'Hata: [[sec]] tanımlı değil.',
      'Hata: [[nope]] tanımlı değil.',
    ]);
    expect(crossRefIssues(n, 'en')).toEqual([]);
  });

  it('warns about definitions that are never used', () => {
    const n = noteWith({ footnotes: fn, references: refs });
    const i = crossRefIssues(n, 'en');
    expect(i.map((x) => [x.severity, x.field])).toEqual([
      ['warning', 'footnotes[0]'],
      ['warning', 'references[0]'],
    ]);
  });
});

describe('linkIssues', () => {
  it.each([
    ['[a](https://x.test)', []],
    ['[a](/notlar)', []],
    ['[a](#sec)', []],
    ['[a](http://x.test)', ['http://x.test']],
    ['[a](//x.test)', ['//x.test']],
    ['[a](mailto:b@c.test)', ['mailto:b@c.test']],
    ['**[a](ftp://x.test)**', ['ftp://x.test']],
    ['plain `[a](ftp://x.test)` text', []],
  ])('%s', (text, expected) => {
    expect(linkIssues(text)).toEqual(expected);
  });
});

describe('list helpers', () => {
  it('builds a row from the preferred language or the one that exists', () => {
    const both = pairOk(base);
    expect(noteListRow(both, 'en')).toMatchObject({ title: 'One', langChip: 'TR · EN', missing: [] });
    const onlyTr = pairOk({ ...base, en: undefined });
    expect(noteListRow(onlyTr, 'en')).toMatchObject({ title: 'Bir', langChip: 'Yalnızca TR', missing: ['en'] });
    expect(noteListRow(onlyTr).minutes).toBe(1);
    const none = { ...onlyTr, langs: { tr: 'off', en: 'off' } } as MockNote;
    expect(noteListRow(none)).toMatchObject({ langChip: '', minutes: 0 });
  });

  it('counts', () => {
    const a = pairOk(base);
    const b = { ...a, status: 'published' as const, approved: true, featured: true };
    expect(noteCounts([a, b])).toEqual({ total: 2, published: 1, drafts: 1, approved: 1, featured: 1 });
    expect(noteCounts([])).toEqual({ total: 0, published: 0, drafts: 0, approved: 0, featured: 0 });
  });
});
