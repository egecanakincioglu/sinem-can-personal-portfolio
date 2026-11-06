import { describe, expect, it } from 'vitest';
import { registry } from '../app/admin/registry';
import { fixtureNotes } from '@/content/fixtures/notes';
import type { ProjectRecord } from '@/content/projects/types';
import { collectIssues, GROUP_DRAFT, GROUP_HONESTY, GROUP_VALIDATION, type RecordSource } from './admin-issues';
import { LIMIT_BYTES } from './glb';
import { noteIssues, pairNote, type MockNote } from './note-record';
import { selectPublicSnapshot } from './public-snapshot';

const issues = (values: Record<string, string>) =>
  collectIssues(values, selectPublicSnapshot({ values, projects: [] }, false), registry);

describe('collectIssues', () => {
  it('finds nothing in the untouched state', () => {
    expect(issues({})).toEqual([]);
  });

  it('reports a failing field check as a blocking error with the registry label and path', () => {
    const [issue, ...rest] = issues({ 'hero.isolation.tr': 'x'.repeat(40) });
    expect(rest).toEqual([]);
    expect(issue.severity).toBe('error');
    expect(issue.group).toBe(GROUP_VALIDATION);
    expect(issue.fieldId).toBe('hero.isolation.tr');
    expect(issue.path).toBe('dict.hero.isolation');
    expect(issue.text).toContain('En fazla 24 karakter');
  });

  it('checks contact, force, beam and portrait fields with their own rules', () => {
    const found = issues({
      'ayarlar.contact.email': 'not an address',
      'kuvvetler.F1.magnitude': '9',
      'yaklasim.a0': '4',
      'profil.portrait.zoom': '7',
    });
    expect(found.filter((i) => i.severity === 'error')).toHaveLength(4);
  });

  it('asks for acknowledgement of an edited unapproved draft text, not of an unchanged one', () => {
    const found = issues({ 'hero.lead.tr': 'Yeni bir cümle' });
    expect(found.map((i) => [i.group, i.severity])).toEqual([[GROUP_DRAFT, 'warning']]);
    expect(issues({ 'hero.isolation.tr': 'Yeni etiket' })).toEqual([]);
  });

  it('warns about honesty-lint hits in edited text only', () => {
    const found = issues({ 'hero.lead.en': 'A passionate student' });
    const honesty = found.filter((i) => i.group === GROUP_HONESTY);
    expect(honesty).toHaveLength(1);
    expect(honesty[0].severity).toBe('warning');
    expect(honesty[0].text).toContain('passionate');
    expect(honesty[0].text).toContain('(EN)');
  });
});

describe('collectIssues: required names', () => {
  it('blocks an emptied or over-long first name', () => {
    const [empty, ...rest] = issues({ 'ayarlar.identity.firstName': '  ' });
    expect(rest).toEqual([]);
    expect(empty.severity).toBe('error');
    expect(empty.fieldId).toBe('ayarlar.identity.firstName');
    expect(empty.text).toContain('Bu alan boş bırakılamaz');
    expect(issues({ 'ayarlar.identity.lastName': 'x'.repeat(41) })[0].text).toContain('En fazla 40');
  });

  it('accepts a filled name', () => {
    expect(issues({ 'ayarlar.identity.firstName': 'Sinem' })).toEqual([]);
  });
});

const project = (id: string, over: Partial<ProjectRecord> = {}): ProjectRecord =>
  ({
    id,
    visibility: 'published',
    approved: true,
    slug: { tr: `${id}-tr`, en: `${id}-en` },
    title: { tr: 'Kiriş analizi', en: 'Beam analysis' },
    kind: 'single-part',
    disciplines: ['machine-design'],
    status: 'completed',
    ...over,
  }) as ProjectRecord;

const poster = {
  id: 'poster',
  kind: 'image',
  src: '/media/poster.png',
  width: 800,
  height: 600,
  alt: { tr: 'Parçanın yandan görünüşü', en: 'Side view of the part' },
};
const model = (sizeBytes: number) =>
  ({ preview3d: { id: 'm', approved: false, modelSrc: '/m.glb', poster, sizeBytes } }) as Partial<ProjectRecord>;

const withRecords = (over: Partial<RecordSource>) =>
  collectIssues({}, selectPublicSnapshot({ values: {}, projects: [] }, false), registry, {
    projects: [],
    notes: [],
    assets: [],
    figureIds: [],
    ...over,
  });

describe('collectIssues: record errors', () => {
  it('reports a project error under the record title with a link to its section', () => {
    const [i, ...rest] = withRecords({ projects: [project('p1', { title: { tr: '', en: 'Beam' } })] });
    expect(rest.filter((r) => r.text.includes('Proje'))).toHaveLength(rest.length);
    expect(i.severity).toBe('error');
    expect(i.group).toBe(GROUP_VALIDATION);
    expect(i.text).toMatch(/^Proje “Başlıksız kayıt”: Bu alan boş bırakılamaz\. \(TR\)$/);
    expect(i.text).not.toContain('p1');
    expect(i.href).toBe('/admin/projeler/p1#bolum-kimlik');
  });

  it('reports a 3D model over 15 MB as a blocking error', () => {
    const p = project('p1', model(LIMIT_BYTES + 1));
    const found = withRecords({ projects: [p] }).filter((i) => i.fieldId === 'project.p1.preview3d.sizeBytes');
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('error');
    expect(found[0].text).toContain('15 MB');
    const ok = project('p2', model(LIMIT_BYTES));
    expect(withRecords({ projects: [ok] }).some((i) => i.fieldId.endsWith('sizeBytes'))).toBe(false);
  });

  it('skips the samples, which never leave development', () => {
    const sample = project('s1', { title: { tr: '', en: '' }, fixture: true });
    expect(withRecords({ projects: [sample] })).toEqual([]);
  });

  it('does not check a draft project or a draft note, but does check a published one', () => {
    const blank = { title: { tr: '', en: '' } };
    expect(
      withRecords({ projects: [project('d1', { ...blank, visibility: 'draft' } as Partial<ProjectRecord>)] }),
    ).toEqual([]);
    expect(withRecords({ projects: [project('p1', blank)] }).length).toBeGreaterThan(0);
  });

  it('leaves record warnings out', () => {
    const p = project('p1', { relatedIds: ['a', 'b', 'c'] });
    expect(withRecords({ projects: [p] })).toEqual([]);
  });

  it('reports note errors under the note title and skips sample notes', () => {
    const paired = pairNote(fixtureNotes[0]);
    if (!paired.ok) throw new Error('fixture does not pair');
    const note: MockNote = { ...paired.note, fixture: false, status: 'published' };
    const ctx = { records: [note], figureIds: [], assetIds: [] };
    const expected = noteIssues(note, ctx).filter((i) => i.severity === 'error');
    const found = withRecords({ notes: [note] });
    expect(found).toHaveLength(expected.length);
    for (const i of found) {
      expect(i.href).toBe(`/admin/notlar/${note.id}`);
      expect(i.text.startsWith(`Not “${note.title.tr}”: `)).toBe(true);
    }
    expect(withRecords({ notes: [{ ...note, fixture: true }] })).toEqual([]);
    expect(withRecords({ notes: [{ ...note, status: 'draft' }] })).toEqual([]);
  });
});
