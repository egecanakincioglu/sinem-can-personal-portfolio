import { describe, expect, it } from 'vitest';
import type { ImageMedia, ProjectRecord } from '@/content/projects/types.ts';
import {
  applyFeatured,
  checkSlug,
  foldSlug,
  heroOptions,
  newRecordId,
  parseDecimal,
  projectCompleteness,
  projectIssues,
  toMeasurement,
  toResult,
  type QuantityForm,
} from './project-edit.ts';

const img = (id: string, over: Partial<ImageMedia> = {}): ImageMedia => ({
  id,
  kind: 'image',
  src: `/media/${id}.png`,
  width: 800,
  height: 600,
  alt: { tr: 'Parçanın yandan görünüşü', en: 'Side view of the part' },
  ...over,
});

const rec = (id: string, over: Partial<ProjectRecord> = {}): ProjectRecord =>
  ({
    id,
    visibility: 'draft',
    slug: { tr: `${id}-tr`, en: `${id}-en` },
    title: { tr: 'Başlık', en: 'Title' },
    kind: 'single-part',
    disciplines: ['machine-design'],
    status: 'completed',
    ...over,
  }) as ProjectRecord;

const ctx = (records: ProjectRecord[], assetIds: string[] = []) => ({ records, assetIds: new Set(assetIds) });

describe('newRecordId', () => {
  it('builds prefix-xxxx from the random source', () => {
    expect(newRecordId('proje', [], () => 0)).toBe('proje-0000');
    expect(newRecordId('proje', [], () => 0.999)).toBe('proje-zzzz');
  });

  it('skips taken ids', () => {
    const seq = [0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5];
    let i = 0;
    expect(newRecordId('proje', ['proje-0000'], () => seq[i++ % seq.length])).toBe('proje-iiii');
  });

  it('lengthens the suffix when the short space is exhausted', () => {
    expect(newRecordId('p', ['p-0000'], () => 0)).toBe('p-00000');
  });
});

describe('foldSlug', () => {
  it('folds Turkish letters, lower-cases and joins with dashes', () => {
    expect(foldSlug('Çelik İskelet Şaft Öğütücü Ğ Uzun ı')).toBe('celik-iskelet-saft-ogutucu-g-uzun-i');
  });

  it('collapses separators, trims dashes and strips other accents', () => {
    expect(foldSlug('  --Café & Co.!! 3D  ')).toBe('cafe-co-3d');
  });

  it('caps at 80 characters without a trailing dash', () => {
    const slug = foldSlug(`${'a'.repeat(79)} bbb`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(foldSlug('!!!')).toBe('');
  });
});

describe('checkSlug', () => {
  const records = [rec('a'), rec('b')];

  it('accepts a free, well-formed slug', () => {
    expect(checkSlug('yeni-ad', 'tr', 'a', records)).toBeUndefined();
  });

  it('allows the record to keep its own slug (allow)', () => {
    expect(checkSlug('a-tr', 'tr', 'a', records)).toBeUndefined();
  });

  it('rejects a slug used by another record in the same locale (deny)', () => {
    expect(checkSlug('b-tr', 'tr', 'a', records)).toMatch(/başka bir kayıtta/);
  });

  it('allows the same text in the other locale', () => {
    expect(checkSlug('b-tr', 'en', 'a', records)).toBeUndefined();
  });

  it('rejects empty, malformed, reserved and over-long slugs', () => {
    expect(checkSlug(' ', 'tr', 'a', records)).toMatch(/boş/);
    expect(checkSlug('Büyük', 'tr', 'a', records)).toMatch(/küçük harf/);
    expect(checkSlug('a--b', 'tr', 'a', records)).toMatch(/küçük harf/);
    expect(checkSlug('new', 'tr', 'a', records)).toMatch(/ayrılmış/);
    expect(checkSlug('admin', 'en', 'a', records)).toMatch(/ayrılmış/);
    expect(checkSlug('a'.repeat(81), 'tr', 'a', records)).toMatch(/80/);
  });
});

describe('applyFeatured', () => {
  const list = [{ id: 'a', featured: true }, { id: 'b' }, { id: 'c', featured: true }];

  it('keeps at most one featured item', () => {
    const out = applyFeatured(list, 'b');
    expect(out.filter((x) => x.featured).map((x) => x.id)).toEqual(['b']);
    expect(out.find((x) => x.id === 'a')).not.toHaveProperty('featured');
  });

  it('clears all with null and does not mutate the input', () => {
    expect(applyFeatured(list, null).some((x) => x.featured)).toBe(false);
    expect(list[0].featured).toBe(true);
  });
});

describe('parseDecimal', () => {
  it('accepts comma and point decimals', () => {
    expect(parseDecimal('12,5')).toBe(12.5);
    expect(parseDecimal(' -0.25 ')).toBe(-0.25);
  });

  it('rejects text, exponents and empty input', () => {
    expect(parseDecimal('1e3')).toBeUndefined();
    expect(parseDecimal('abc')).toBeUndefined();
    expect(parseDecimal(undefined)).toBeUndefined();
  });
});

describe('toMeasurement and toResult', () => {
  const form: QuantityForm = {
    label: { tr: 'Çap', en: 'Diameter' },
    value: '12,5',
    digits: '1',
    unit: ' mm ',
    verified: true,
  };

  it('builds a verified measurement', () => {
    expect(toMeasurement(form)).toEqual({
      ok: true,
      value: { label: form.label, value: 12.5, digits: 1, unit: 'mm', verified: true },
    });
  });

  it('refuses an unverified measurement and result (deny)', () => {
    expect(toMeasurement({ ...form, verified: false })).toEqual({
      ok: false,
      error: 'Hata: Doğrulanmamış değer yayımlanamaz.',
    });
    expect(toResult({ ...form, verified: false }).ok).toBe(false);
  });

  it('rejects an invalid number or digit count', () => {
    expect(toMeasurement({ ...form, value: 'x' })).toMatchObject({ ok: false, error: expect.stringMatching(/sayı/) });
    expect(toMeasurement({ ...form, digits: '9' })).toMatchObject({ ok: false });
    expect(toMeasurement({ ...form, digits: 'a' })).toMatchObject({ ok: false });
  });

  it('keeps the note of a measurement', () => {
    const note = { tr: 'n', en: 'n' };
    expect(toMeasurement({ ...form, note })).toMatchObject({ ok: true, value: { note } });
  });

  it('builds a result with symbol and note, omitting empty parts', () => {
    const note = { tr: 'n', en: 'n' };
    expect(toResult({ ...form, symbol: ' σ ', note, digits: '', unit: '' })).toEqual({
      ok: true,
      value: { symbol: 'σ', label: form.label, value: 12.5, note, verified: true },
    });
  });
});

describe('heroOptions', () => {
  it('disables the image variants without a cover, with the reason', () => {
    const opts = heroOptions({});
    expect(opts.map((o) => [o.value, o.disabled])).toEqual([
      ['render', true],
      ['figure', true],
      ['text', false],
    ]);
    expect(opts[0].reason).toBe('kapak görseli gerekli');
    expect(opts[2].reason).toBeUndefined();
  });

  it('enables everything with a cover', () => {
    expect(heroOptions({ cover: img('c') }).every((o) => !o.disabled && !o.reason)).toBe(true);
  });
});

describe('projectCompleteness', () => {
  it('reports both languages complete', () => {
    expect(projectCompleteness(rec('a'))).toBe('İki dil tamam');
  });

  it('counts blank fields per language', () => {
    const p = rec('a', {
      title: { tr: 'Başlık', en: '' },
      objective: [{ tr: 'Metin', en: ' ' }],
      slug: { tr: 'a', en: '' },
    });
    expect(projectCompleteness(p)).toBe('Eksik: EN çevirisi (3 alan)');
    expect(projectCompleteness(rec('a', { title: { tr: '', en: '' } }))).toBe(
      'Eksik: TR çevirisi (1 alan), EN çevirisi (1 alan)',
    );
  });

  it('reaches nested copy in calculations, decisions, media and revisions', () => {
    const blank = { tr: 'x', en: '' };
    const p = rec('a', {
      subtitle: blank,
      materials: [blank],
      measurements: [{ label: blank, note: blank, value: 1, verified: true }],
      calculations: [
        {
          id: 'c',
          title: blank,
          given: [{ label: blank, value: 1 }],
          required: [blank],
          assumptions: [blank],
          method: [blank],
          result: { label: blank, note: blank, value: 1, verified: true },
        },
      ],
      decisions: [
        {
          id: 'd',
          title: blank,
          criteria: [blank],
          alternatives: [{ name: blank, evidence: [blank, undefined] }],
          rationale: blank,
        },
      ],
      cover: img('c', { alt: blank, caption: blank }),
      preview3d: { id: 'm', approved: true, poster: img('p', { alt: blank }), modelSrc: '/m.glb', caption: blank },
      revisions: [{ rev: 'A', note: blank, reasoning: blank }],
      privateOriginals: [{ assetId: 'o', format: 'step', label: blank, access: 'private' }],
    });
    expect(projectCompleteness(p)).toBe('Eksik: EN çevirisi (23 alan)');
  });
});

describe('projectIssues', () => {
  const find = (issues: ReturnType<typeof projectIssues>, field: string) => issues.filter((i) => i.field === field);

  it('has no issues for a complete record', () => {
    const p = rec('a', { cover: img('c') });
    expect(projectIssues(p, ctx([p], ['a/c']))).toEqual([]);
  });

  it('requires titles and slugs in both languages', () => {
    const p = rec('a', { title: { tr: '', en: ' ' }, slug: { tr: '', en: 'new' } });
    const issues = projectIssues(p, ctx([p]));
    expect(find(issues, 'title').map((i) => i.lang)).toEqual(['tr', 'en']);
    expect(find(issues, 'slug').map((i) => i.lang)).toEqual(['tr', 'en']);
    expect(issues.every((i) => i.severity === 'error')).toBe(true);
  });

  it('flags a slug taken by another record', () => {
    const a = rec('a');
    const b = rec('b', { slug: { tr: 'a-tr', en: 'b-en' } });
    expect(find(projectIssues(b, ctx([a, b])), 'slug')).toHaveLength(1);
    const c = rec('c');
    expect(find(projectIssues(c, ctx([a, b, c])), 'slug')).toHaveLength(0);
  });

  it('needs a discipline, at most 12 tools and a valid period', () => {
    const tools = Array.from({ length: 13 }, (_, i) => `t${i}`);
    const p = rec('a', {
      disciplines: [],
      tools,
      period: { start: '2026-05', end: '2026-03', precision: 'month' },
    });
    const issues = projectIssues(p, ctx([p]));
    expect(find(issues, 'disciplines')).toHaveLength(1);
    expect(find(issues, 'tools')).toHaveLength(1);
    expect(find(issues, 'period')).toHaveLength(1);
    const ok = rec('a', {
      tools: tools.slice(0, 12),
      period: { start: '2026-03', end: '2026-03', precision: 'month' },
    });
    expect(projectIssues(ok, ctx([ok]))).toEqual([]);
  });

  it('compares mixed-precision periods on their common prefix', () => {
    const p = rec('a', { period: { start: '2026-03', end: '2026', precision: 'month' } });
    expect(find(projectIssues(p, ctx([p])), 'period')).toHaveLength(0);
  });

  it('warns about decisions with fewer than two alternatives', () => {
    const p = rec('a', {
      decisions: [
        { id: 'd1', title: { tr: 'a', en: 'a' }, alternatives: [{ name: { tr: 'a', en: 'a' } }] },
        {
          id: 'd2',
          title: { tr: 'a', en: 'a' },
          alternatives: [{ name: { tr: 'a', en: 'a' } }, { name: { tr: 'b', en: 'b' } }],
        },
      ],
    });
    expect(projectIssues(p, ctx([p]))).toEqual([
      expect.objectContaining({ field: 'decisions.0', severity: 'warning', section: 'govde' }),
    ]);
  });

  it('warns about more than two related ids and about itself', () => {
    const p = rec('a', { relatedIds: ['b', 'c', 'd'] });
    expect(find(projectIssues(p, ctx([p])), 'relatedIds')[0].severity).toBe('warning');
    const self = rec('a', { relatedIds: ['a'] });
    expect(find(projectIssues(self, ctx([self])), 'relatedIds')[0].message).toMatch(/kendisiyle/);
    const fine = rec('a', { relatedIds: ['b', 'c'] });
    expect(find(projectIssues(fine, ctx([fine])), 'relatedIds')).toHaveLength(0);
  });

  it('checks alt text of the cover, figures and 3D poster in both languages', () => {
    const p = rec('a', {
      cover: img('c', { alt: { tr: '', en: 'Side view of the part' } }),
      figures: [
        img('f1', { alt: { tr: 'kısa', en: 'Side view of the part' } }),
        img('f2', { src: '/m/plate-001.png', alt: { tr: 'Parçanın yandan görünüşü', en: 'plate-001' } }),
        img('f3', { src: '/m/plate-002.png', alt: { tr: 'Parçanın yandan görünüşü', en: 'PLATE-002.png' } }),
      ],
      preview3d: { id: 'm', approved: true, poster: img('p', { alt: { tr: '', en: '' } }), modelSrc: '/m.glb' },
    });
    const issues = projectIssues(p, ctx([p], ['a/c', 'a/f1', 'a/f2', 'a/f3', 'a/p']));
    expect(find(issues, 'cover').map((i) => i.lang)).toEqual(['tr']);
    expect(find(issues, 'figures.0').map((i) => i.message)).toEqual(['Hata: Açıklama (alt) en az 8 karakter olmalı.']);
    expect(find(issues, 'figures.1')[0].message).toMatch(/dosya adı/);
    expect(find(issues, 'figures.2')[0].message).toMatch(/dosya adı/);
    expect(find(issues, 'preview3d.poster')).toHaveLength(2);
    expect(find(issues, 'preview3d.poster')[0].section).toBe('model');
  });

  it('flags an image that is not in the library', () => {
    const p = rec('a', { cover: img('c') });
    expect(find(projectIssues(p, ctx([p], [])), 'cover')).toEqual([
      expect.objectContaining({ section: 'gorsel', message: 'Hata: Görsel kitaplıkta bulunamadı.' }),
    ]);
  });

  it('blocks publishing on a half-translated record', () => {
    const p = rec('a', { objective: [{ tr: 'Metin', en: '' }] });
    expect(projectIssues(p, ctx([p]))).toEqual([
      { section: 'yayin', field: 'langs', lang: 'en', severity: 'error', message: 'Eksik: EN çevirisi (1 alan).' },
    ]);
  });
});
