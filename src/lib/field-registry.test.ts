import { describe, expect, it } from 'vitest';
import { checkCoverage, entryFor, publicLeaves, summarize, type RegistryEntry } from './field-registry';

const entry = (path: string, over: Partial<RegistryEntry> = {}): RegistryEntry => ({
  id: over.id ?? path,
  path,
  page: 'Ana sayfa',
  section: 'Hero',
  screen: 'ana-sayfa',
  status: 'ready',
  locale: 'shared',
  type: 'text',
  ...over,
});

describe('publicLeaves', () => {
  it('treats a localised pair as one leaf and merges array elements', () => {
    const leaves = publicLeaves({
      title: { tr: 'a', en: 'b', approved: false },
      items: [{ name: { tr: 'a', en: 'b' } }, { name: { tr: 'c', en: 'd' }, extra: 1 }],
      tags: ['x'],
      none: null,
      empty: [],
      nested: { on: true },
    });
    expect(leaves).toEqual(['empty[]', 'items[].extra', 'items[].name', 'nested.on', 'none', 'tags[]', 'title']);
  });
});

describe('checkCoverage', () => {
  const leaves = ['a.one', 'a.two', 'b'];

  it('reports a leaf with no entry as uncovered', () => {
    expect(checkCoverage([entry('a.*')], leaves).uncovered).toEqual(['b']);
    expect(checkCoverage([entry('a.*'), entry('b')], leaves).uncovered).toEqual([]);
  });

  it('reports an entry with no public field as stale', () => {
    const gone = entry('c');
    expect(checkCoverage([entry('a.*'), entry('b'), gone], leaves).stale).toEqual([gone]);
  });

  it('lets the most specific entry win and flags a group it fully replaces as stale', () => {
    const group = entry('a.*', { status: 'planned' });
    const one = entry('a.one');
    const two = entry('a.two');
    const cov = checkCoverage([group, one, two, entry('b')], leaves);
    expect(cov.owner.get('a.one')).toBe(one);
    expect(cov.stale).toEqual([group]);
    expect(checkCoverage([group, one, entry('b')], leaves).owner.get('a.two')).toBe(group);
  });

  it('flags duplicate ids and paths', () => {
    const cov = checkCoverage([entry('a.*'), entry('a.*', { id: 'other' }), entry('b', { id: 'a.*' })], leaves);
    expect(cov.duplicates).toEqual(['path:a.*', 'id:a.*']);
  });
});

describe('summarize', () => {
  it('counts fields, not entries', () => {
    const s = summarize([entry('a.*', { status: 'planned' }), entry('b')], ['a.one', 'a.two', 'b']);
    expect(s).toMatchObject({ total: 3, ready: 1, planned: 2 });
    expect(s.rows.map((r) => r.fields)).toEqual([2, 1]);
  });
});

describe('entryFor', () => {
  it('prefers the exact entry over a group and reads array indices as []', () => {
    const group = entry('a.*', { id: 'group' });
    const exact = entry('a.one', { id: 'exact' });
    const list = entry('items[].name', { id: 'list' });
    expect(entryFor([group, exact], 'a.one')).toBe(exact);
    expect(entryFor([group, exact], 'a.two')).toBe(group);
    expect(entryFor([list], 'items[3].name')).toBe(list);
    expect(entryFor([group], 'b')).toBeUndefined();
  });
});
