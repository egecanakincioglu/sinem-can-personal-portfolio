import { describe, expect, it } from 'vitest';
import { fixtureNotes } from '@/content/fixtures/notes';
import type { Block } from '@/content/notes/types';
import {
  isLanguageComplete,
  pairBlocks,
  unpairBlocks,
  validatePairedBlocks,
  type PairedBlock,
  type PairError,
} from './note-blocks';

function freeze<T>(v: T): T {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
}

const px = (tr: string, en: string) => ({ tr, en });
const same = (s: string) => px(s, s);

const full: PairedBlock[] = [
  { type: 'h2', id: 'intro', text: px('Giris', 'Intro') },
  { type: 'h3', id: 'sub', text: px('Alt', 'Sub') },
  { type: 'h4', id: 'minor', text: px('Kucuk', 'Minor') },
  { type: 'h4', text: px('Kimliksiz', 'No id') },
  { type: 'p', text: px('Metin', 'Text') },
  { type: 'ul', items: [px('bir', 'one'), px('iki', 'two')] },
  { type: 'ol', items: [px('a', 'a2')] },
  { type: 'quote', text: px('Soz', 'Quote'), cite: px('Kaynak', 'Source') },
  { type: 'quote', text: px('Soz', 'Quote'), cite: px('', '') },
  { type: 'pullquote', text: px('Vurgu', 'Pull'), cite: px('', '') },
  { type: 'code', code: 'x = 1', lang: 'py', filename: px('a.py', 'b.py') },
  { type: 'code', code: 'y', filename: px('', '') },
  { type: 'math', tex: 'x^2', id: 'eq-1' },
  { type: 'math', tex: 'y' },
  {
    type: 'image',
    id: 'img-1',
    src: '/a.png',
    width: 10,
    height: 20,
    focalX: 0.5,
    focalY: 0.25,
    alt: px('alt tr', 'alt en'),
    caption: px('baslik', 'caption'),
  },
  { type: 'image', src: '/b.png', width: 1, height: 2, alt: px('a', 'b'), caption: px('c', 'd') },
  { type: 'figure', id: 'fig-1', figureId: 'beam', alt: px('a', 'b'), caption: px('c', 'd') },
  { type: 'figure', figureId: 'beam', alt: px('', ''), caption: px('', '') },
  {
    type: 'table',
    id: 'tab-1',
    align: ['l', 'r'],
    caption: px('Tablo', 'Table'),
    head: [px('a', 'a'), px('b', 'b')],
    rows: [[px('1', '1'), px('2', '2')]],
    note: px('not', 'note'),
  },
  { type: 'table', caption: px('T', 'T'), head: [same('a')], rows: [], note: px('', '') },
  { type: 'callout', kind: 'limitation', title: px('Baslik', 'Title'), paragraphs: [px('bir', 'one')] },
  { type: 'callout', kind: 'note', title: px('', ''), paragraphs: [px('x', 'y')] },
];

describe('R1 fixtures round-trip', () => {
  const both = fixtureNotes.filter((n) => n.tr && n.en);
  it('uses at least two bilingual fixture notes', () => expect(both.length).toBeGreaterThanOrEqual(2));
  for (const note of both) {
    it(`restores ${note.id} in each language`, () => {
      const tr = freeze(structuredClone(note.tr!.blocks));
      const en = freeze(structuredClone(note.en!.blocks));
      const result = pairBlocks(tr, en);
      if (!result.ok) throw new Error(JSON.stringify(result.errors));
      expect(unpairBlocks(result.blocks, 'tr')).toEqual(note.tr!.blocks);
      expect(unpairBlocks(result.blocks, 'en')).toEqual(note.en!.blocks);
    });
  }
});

describe('R2 paired round-trip', () => {
  it('rebuilds the paired list from its two languages', () => {
    const p = freeze(structuredClone(full));
    const result = pairBlocks(unpairBlocks(p, 'tr'), unpairBlocks(p, 'en'));
    expect(result).toStrictEqual({ ok: true, blocks: full });
  });
});

describe('R3 one language', () => {
  it('pairs tr alone and restores it', () => {
    const tr = freeze(structuredClone(unpairBlocks(full, 'tr')));
    const result = pairBlocks(tr, undefined);
    if (!result.ok) throw new Error('expected ok');
    expect(unpairBlocks(result.blocks, 'tr')).toEqual(tr);
    expect(result.blocks[4]).toEqual({ type: 'p', text: px('Metin', '') });
  });
  it('pairs en alone', () => {
    const en = unpairBlocks(full, 'en');
    const result = pairBlocks(undefined, en);
    if (!result.ok) throw new Error('expected ok');
    expect(unpairBlocks(result.blocks, 'en')).toEqual(en);
  });
  it('pairs two missing sides as empty', () => {
    expect(pairBlocks()).toEqual({ ok: true, blocks: [] });
  });
});

describe('R4 no mutation', () => {
  it('leaves paired input untouched when unpairing and validating', () => {
    const p = freeze(structuredClone(full));
    unpairBlocks(p, 'tr');
    validatePairedBlocks(p, { figureIds: ['beam'], publish: ['tr', 'en'] });
    isLanguageComplete(p, 'en');
    expect(p).toEqual(full);
  });
});

const para = (text: string): Block => ({ type: 'p', text });

function errorsOf(tr: Block[], en: Block[]): PairError[] {
  const r = pairBlocks(freeze(tr), freeze(en));
  if (r.ok) throw new Error('expected errors');
  return r.errors;
}

describe('pairBlocks errors', () => {
  it('reports length', () => {
    expect(errorsOf([para('a'), para('b')], [para('a')])).toEqual([{ index: 1, code: 'length' }]);
  });
  it('reports type', () => {
    expect(errorsOf([para('a')], [{ type: 'ul', items: ['a'] }])).toEqual([{ index: 0, code: 'type' }]);
  });
  it('reports shared fields with the field name', () => {
    const errs = errorsOf([{ type: 'h2', id: 'a', text: 'x' }], [{ type: 'h2', id: 'b', text: 'x' }]);
    expect(errs).toEqual([{ index: 0, code: 'shared', field: 'id' }]);
  });
  it('reports a shared optional field present on one side only', () => {
    const errs = errorsOf([{ type: 'math', tex: 'x', id: 'a' }], [{ type: 'math', tex: 'x' }]);
    expect(errs).toEqual([{ index: 0, code: 'shared', field: 'id' }]);
  });
  it('reports shared image media', () => {
    const img = (width: number): Block => ({
      type: 'image',
      image: { src: '/a', alt: 'a', width, height: 1 },
      caption: 'c',
    });
    expect(errorsOf([img(1)], [img(2)])).toEqual([{ index: 0, code: 'shared', field: 'width' }]);
  });
  it('reports shape for lists, paragraphs, head and rows', () => {
    const errs = errorsOf(
      [
        { type: 'ul', items: ['a'] },
        { type: 'callout', kind: 'note', paragraphs: ['a'] },
        { type: 'table', caption: 'c', head: ['a'], rows: [['1'], ['2']] },
        { type: 'table', caption: 'c', head: ['a'], rows: [['1']] },
      ],
      [
        { type: 'ul', items: ['a', 'b'] },
        { type: 'callout', kind: 'note', paragraphs: [] },
        { type: 'table', caption: 'c', head: ['a', 'b'], rows: [['1']] },
        { type: 'table', caption: 'c', head: ['a'], rows: [['1', '2']] },
      ],
    );
    expect(errs).toEqual([
      { index: 0, code: 'shape', field: 'items' },
      { index: 1, code: 'shape', field: 'paragraphs' },
      { index: 2, code: 'shape', field: 'rows' },
      { index: 2, code: 'shape', field: 'rows[1]' },
      { index: 2, code: 'shape', field: 'head' },
      { index: 3, code: 'shape', field: 'rows[0]' },
    ]);
  });
  it('collects every error instead of stopping at the first', () => {
    const errs = errorsOf(
      [para('a'), { type: 'h2', id: 'a', text: 'x' }, para('c')],
      [
        { type: 'ul', items: [] },
        { type: 'h2', id: 'b', text: 'x' },
      ],
    );
    expect(errs.map((e) => e.code)).toEqual(['length', 'type', 'shared']);
  });
});

const opts = { figureIds: ['beam'], publish: ['tr', 'en'] as ('tr' | 'en')[] };
const issues = (blocks: PairedBlock[], o = opts) => validatePairedBlocks(freeze(blocks), o);
const codes = (blocks: PairedBlock[], o = opts) => issues(blocks, o).map((i) => i.code);

describe('validatePairedBlocks', () => {
  it('accepts the complete example', () => {
    expect(codes(full.filter((b) => b.type !== 'pullquote'))).toEqual([]);
  });
  it('flags a heading without an id', () => {
    expect(issues([{ type: 'h2', id: '', text: same('a') }])).toEqual([
      { index: 0, field: 'id', severity: 'error', code: 'heading-id-missing' },
    ]);
  });
  it('flags a bad id format', () => {
    expect(codes([{ type: 'math', tex: 'x', id: 'Bad_Id' }])).toEqual(['id-format']);
  });
  it('flags a duplicate id on the later block across block types', () => {
    const r = issues([
      { type: 'h3', id: 'same', text: same('a') },
      { type: 'math', tex: 'x', id: 'same' },
    ]);
    expect(r).toEqual([{ index: 1, field: 'id', severity: 'error', code: 'id-duplicate' }]);
  });
  it('flags an unknown figure', () => {
    const r = issues([{ type: 'figure', figureId: 'nope', alt: same(''), caption: same('') }]);
    expect(r).toEqual([{ index: 0, field: 'figureId', severity: 'error', code: 'figure-unknown' }]);
  });
  it('flags a missing image alt only in published languages', () => {
    const img: PairedBlock = {
      type: 'image',
      src: '/a',
      width: 1,
      height: 1,
      alt: px('tr alt', ''),
      caption: same('c'),
    };
    expect(issues([img])).toEqual([{ index: 0, field: 'alt', lang: 'en', severity: 'error', code: 'image-alt' }]);
    expect(issues([img], { ...opts, publish: ['tr'] })).toEqual([]);
  });
  it('flags table limits', () => {
    const wide = Array.from({ length: 9 }, () => same('h'));
    const tall = Array.from({ length: 31 }, () => [same('1')]);
    expect(codes([{ type: 'table', caption: same('c'), head: wide, rows: [], note: same('') }])).toEqual([
      'table-limits',
    ]);
    expect(codes([{ type: 'table', caption: same('c'), head: [same('h')], rows: tall, note: same('') }])).toEqual([
      'table-limits',
    ]);
  });
  it('flags a ragged table row', () => {
    const r = issues([
      { type: 'table', caption: same('c'), head: [same('a'), same('b')], rows: [[same('1')]], note: same('') },
    ]);
    expect(r).toEqual([{ index: 0, field: 'rows[0]', severity: 'error', code: 'table-ragged' }]);
  });
  it('warns about a pull quote', () => {
    expect(issues([{ type: 'pullquote', text: same('a'), cite: same('') }])).toEqual([
      { index: 0, field: 'type', severity: 'warning', code: 'pullquote' },
    ]);
  });
  it('flags empty required text per published language with the field', () => {
    const r = issues([
      { type: 'ul', items: [px('a', ''), same('b')] },
      { type: 'p', text: px('', 'x') },
    ]);
    expect(r).toEqual([
      { index: 0, field: 'items[0]', lang: 'en', severity: 'error', code: 'empty' },
      { index: 1, field: 'text', lang: 'tr', severity: 'error', code: 'empty' },
    ]);
  });
  it('skips languages that are not published', () => {
    expect(issues([{ type: 'p', text: px('a', '') }], { ...opts, publish: ['tr'] })).toEqual([]);
  });
});

describe('isLanguageComplete', () => {
  it('is true when every required text is filled', () => {
    expect(isLanguageComplete(full, 'tr')).toBe(true);
    expect(isLanguageComplete(full, 'en')).toBe(true);
  });
  it('is false when a required text is empty', () => {
    expect(isLanguageComplete([{ type: 'p', text: px('a', '') }], 'en')).toBe(false);
  });
  it('treats optional text as not required', () => {
    expect(isLanguageComplete([{ type: 'quote', text: same('a'), cite: px('', '') }], 'en')).toBe(true);
  });
  it('requires image alt and table head cells', () => {
    const img: PairedBlock = { type: 'image', src: '/a', width: 1, height: 1, alt: px('a', ''), caption: same('c') };
    expect(isLanguageComplete([img], 'en')).toBe(false);
    const tab: PairedBlock = { type: 'table', caption: same('c'), head: [px('a', '')], rows: [], note: same('') };
    expect(isLanguageComplete([tab], 'en')).toBe(false);
  });
});
