import { describe, expect, it } from 'vitest';
import { fixtureNotes } from '@/content/fixtures/notes';
import { fixtureProjects } from '@/content/fixtures/projects';
import { getSiteContent, mergeSiteContent, type SiteContent } from '@/content/site-content';
import type { Issue } from './admin-issues';
import { pairNote } from './note-record';
import { buildOverride } from './preview-bridge';
import {
  changesBetween,
  diffContent,
  diffNotes,
  diffRecords,
  excerpt,
  flattenContent,
  publishChecks,
  pushRevision,
  revLetter,
  stamp,
  type Revision,
} from './publish';

const merged = (values: Record<string, string>) => mergeSiteContent(buildOverride(values));
const asContent = (v: unknown) => v as SiteContent;

describe('flattenContent', () => {
  it('keeps a localised pair as one leaf and addresses array items by index', () => {
    const leaves = flattenContent({ a: { tr: 'x', en: 'y' }, list: [{ n: 1 }, { n: 2 }], flag: true });
    expect(leaves.get('a')).toEqual({ tr: 'x', en: 'y' });
    expect(leaves.get('list[1].n')).toEqual({ shared: '2' });
    expect(leaves.get('flag')).toEqual({ shared: 'true' });
  });
});

describe('diffContent', () => {
  it('reports nothing for untouched defaults', () => {
    expect(diffContent(getSiteContent(), merged({}))).toEqual([]);
  });

  it('reports a TR edit as a TR change only', () => {
    const changes = diffContent(getSiteContent(), merged({ 'hero.lead.tr': 'Yeni cümle' }));
    expect(changes).toHaveLength(1);
    expect(changes[0].path).toBe('draft.heroLead');
    expect(changes[0].tr?.after).toBe('Yeni cümle');
    expect(changes[0].en).toBeUndefined();
  });

  it('reports an EN edit as an EN change only', () => {
    const [c] = diffContent(getSiteContent(), merged({ 'hero.lead.en': 'New sentence' }));
    expect(c.en?.after).toBe('New sentence');
    expect(c.tr).toBeUndefined();
  });

  it('reports a language-neutral field as shared', () => {
    const changes = diffContent(getSiteContent(), merged({ 'ayarlar.contact.email': 'ornek@example.com' }));
    expect(changes.length).toBeGreaterThan(0);
    expect(changes.every((c) => !c.tr && !c.en && c.shared)).toBe(true);
    expect(changes.some((c) => c.shared?.after === 'ornek@example.com')).toBe(true);
  });

  it('compares array items by index and reports added items', () => {
    const a = asContent({ list: [{ n: 'one' }] });
    const b = asContent({ list: [{ n: 'uno' }, { n: 'two' }] });
    expect(diffContent(a, b)).toEqual([
      { path: 'list[0].n', shared: { before: 'one', after: 'uno' } },
      { path: 'list[1].n', shared: { before: '', after: 'two' } },
    ]);
  });
});

// The sample records are marked as development-only; the tests need ordinary records.
const plain = <T extends { fixture?: boolean }>(r: T): T => ({ ...r, fixture: undefined });

describe('diffRecords', () => {
  const [first, second] = fixtureProjects.map(plain);

  it('reports an added and a removed record by title, never by id', () => {
    const label = `Proje “${first.title.tr}”`;
    expect(diffRecords([], [first])).toEqual([{ path: `project.${first.id}`, label, record: 'added' }]);
    expect(diffRecords([first], [])).toEqual([{ path: `project.${first.id}`, label, record: 'removed' }]);
  });

  it('falls back to a neutral title for a record without one', () => {
    const blank = { ...first, title: { tr: ' ', en: '' } };
    expect(diffRecords([], [blank])[0].label).toBe('Proje “Başlıksız kayıt”');
  });

  it('never lists a development sample, added, removed or edited', () => {
    const sample = { ...first, fixture: true as const };
    expect(diffRecords([], [sample])).toEqual([]);
    expect(diffRecords([sample], [])).toEqual([]);
    expect(diffRecords([sample], [{ ...sample, title: { tr: 'Başka', en: 'Other' } }])).toEqual([]);
  });

  it('reports only the fields that differ in a kept record', () => {
    const edited = { ...first, title: { tr: 'Başka ad', en: 'Other name' } };
    const changes = diffRecords([first, second], [edited, second]);
    expect(changes).toHaveLength(1);
    expect(changes[0].path).toBe(`project.${first.id}.title`);
    expect(changes[0].title).toBe('Başka ad');
    expect(changes[0].tr).toEqual({ before: first.title.tr, after: 'Başka ad' });
    expect(changes[0].en).toEqual({ before: first.title.en, after: 'Other name' });
  });

  it('reports nothing for equal lists', () => {
    expect(diffRecords(fixtureProjects, fixtureProjects)).toEqual([]);
  });
});

describe('changesBetween', () => {
  it('labels note changes with the note title', () => {
    const paired = pairNote(fixtureNotes[0]);
    if (!paired.ok) throw new Error('fixture does not pair');
    const note = plain(paired.note);
    const title = note.title.tr;
    expect(diffNotes([], [note])).toEqual([{ path: `note.${note.id}`, label: `Not “${title}”`, record: 'added' }]);
    expect(diffNotes([note], [])[0].record).toBe('removed');
    expect(diffNotes([], [{ ...note, title: { tr: '', en: 'x' } }])[0].label).toBe('Not “Başlıksız kayıt”');
    expect(diffNotes([], [{ ...note, fixture: true }])).toEqual([]);
    const edited = { ...note, blocks: note.blocks.slice(1), approved: !note.approved };
    const labels = diffNotes([note], [edited]).map((c) => c.label);
    expect(labels).toContain(`Not “${title}” · Onay`);
    expect(labels.some((l) => l?.startsWith(`Not “${title}” · Gövde, blok `))).toBe(true);
    expect(diffNotes([note], [note])).toEqual([]);
  });

  it('joins content and record changes', () => {
    const from = { values: {}, projects: [], notes: [] };
    const to = { values: { 'hero.lead.tr': 'Yeni cümle' }, projects: [plain(fixtureProjects[0])], notes: [] };
    const paths = changesBetween(from, to).map((c) => c.path);
    expect(paths).toContain('draft.heroLead');
    expect(paths).toContain(`project.${fixtureProjects[0].id}`);
  });
});

describe('excerpt', () => {
  it('keeps short text and collapses whitespace', () => {
    expect(excerpt('  a \n b  ')).toBe('a b');
  });
  it('cuts long text to 80 characters with an ellipsis', () => {
    const out = excerpt('x'.repeat(200), 80);
    expect(out).toHaveLength(80);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('revLetter', () => {
  it('counts A, B … Z, AA, AB', () => {
    expect([0, 1, 25, 26, 27, 51, 52].map(revLetter)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA']);
  });
});

describe('pushRevision', () => {
  const rev = (n: number): Revision => ({
    rev: n,
    at: '2026-11-06T10:00',
    changes: [],
    state: { values: {}, projects: [], notes: [] },
  });
  it('puts the newest first and drops the oldest beyond ten', () => {
    let list: Revision[] = [];
    for (let i = 1; i <= 12; i++) list = pushRevision(list, rev(i));
    expect(list).toHaveLength(10);
    expect(list[0].rev).toBe(12);
    expect(list[9].rev).toBe(3);
  });
});

describe('stamp', () => {
  it('formats the local clock as YYYY-MM-DDTHH:MM', () => {
    expect(stamp(new Date(2026, 10, 6, 9, 5))).toBe('2026-11-06T09:05');
  });
});

describe('publishChecks', () => {
  const issue = (severity: Issue['severity'], group: string, fieldId: string): Issue => ({
    group,
    fieldId,
    path: fieldId,
    text: fieldId,
    severity,
  });
  it('blocks on errors and groups warnings for acknowledgement', () => {
    const { blocking, acknowledge } = publishChecks([
      issue('error', 'Doğrulama', 'a'),
      issue('warning', 'G1', 'b'),
      issue('warning', 'G1', 'c'),
      issue('warning', 'G2', 'd'),
    ]);
    expect(blocking.map((i) => i.fieldId)).toEqual(['a']);
    expect(acknowledge.map((g) => [g.group, g.items.length])).toEqual([
      ['G1', 2],
      ['G2', 1],
    ]);
  });
  it('is clear with no issues', () => {
    expect(publishChecks([])).toEqual({ blocking: [], acknowledge: [] });
  });
});
