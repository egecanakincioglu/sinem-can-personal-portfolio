import { describe, expect, it } from 'vitest';
import { fixtureProjects } from '@/content/fixtures/projects';
import type { ProjectRecord } from '@/content/projects/types';
import { getSiteContent } from '@/content/site-content';
import { listRow, projectCounts, resolveProjects, selectPublicSnapshot, workLayout } from './public-snapshot';

const rec = (id: string, extra: Record<string, unknown> = {}): ProjectRecord =>
  ({
    id,
    slug: { tr: `${id}-tr`, en: `${id}-en` },
    title: { tr: `Başlık ${id}`, en: `Title ${id}` },
    kind: 'single-part',
    disciplines: ['cad-modelling'],
    status: 'completed',
    visibility: 'published',
    approved: true,
    ...extra,
  }) as ProjectRecord;

describe('selectPublicSnapshot', () => {
  it('is the authoritative content with no edits and no records', () => {
    const s = selectPublicSnapshot({ values: {}, projects: [] }, true);
    expect(s.content).toEqual(getSiteContent());
    expect(s.publicProjects).toEqual([]);
    expect(s.publicIds).toEqual([]);
  });

  it('shows published and approved fixtures only in development', () => {
    const state = { values: {}, projects: fixtureProjects };
    expect(selectPublicSnapshot(state, true).publicIds).toEqual(
      fixtureProjects.filter((p) => p.visibility === 'published' && p.approved).map((p) => p.id),
    );
    expect(selectPublicSnapshot(state, false).publicIds).toEqual([]);
  });

  it('never lists a draft or an unapproved record', () => {
    const state = {
      values: {},
      projects: [rec('d', { visibility: 'draft', approved: undefined }), rec('u', { approved: false }), rec('ok')],
    };
    expect(selectPublicSnapshot(state, false).publicIds).toEqual(['ok']);
  });

  it('strips private originals and unapproved 3D previews', () => {
    const withCad = rec('cad', {
      privateOriginals: [{ assetId: 'opaque', format: 'step', label: { tr: 'a', en: 'a' }, access: 'private' }],
      preview3d: {
        id: 'p',
        approved: false,
        modelSrc: '/m.glb',
        poster: { id: 'x', kind: 'image', src: '/x.png', alt: { tr: 'a', en: 'a' }, width: 1, height: 1 },
      },
    });
    const [p] = selectPublicSnapshot({ values: {}, projects: [withCad] }, false).publicProjects;
    expect(p).not.toHaveProperty('privateOriginals');
    expect(p.preview3d).toBeUndefined();
    expect(JSON.stringify(selectPublicSnapshot({ values: {}, projects: [withCad] }, false))).not.toContain('opaque');
  });

  it('applies the edited values to the content', () => {
    const base = getSiteContent();
    const s = selectPublicSnapshot({ values: { 'ayarlar.identity.firstName': 'Deneme' }, projects: [] }, false);
    expect(s.content.ownerName).not.toBe(base.ownerName);
  });
});

describe('workLayout', () => {
  it.each([
    [0, 0, 'tek boş çerçeve'],
    [0, 2, 'boş durum · 2 not'],
    [1, 0, 'öne çıkan · not yok'],
    [2, 0, 'öne çıkan + 1 satır + Tüm projeler · not yok'],
    [5, 7, 'öne çıkan + 2 satır + Tüm projeler · 3 not'],
    [6, 1, 'öne çıkan + 2 satır + Tüm projeler · 1 not'],
  ])('%i projects, %i notes -> %s', (p, n, want) => {
    expect(workLayout(p, n)).toBe(want);
  });
});

describe('projectCounts', () => {
  it('counts records, published and drafts', () => {
    const list = [rec('a'), rec('b', { visibility: 'draft', approved: undefined }), rec('c', { visibility: 'draft' })];
    expect(projectCounts(list)).toBe('3 kayıt · 1 yayında · 2 taslak');
    expect(projectCounts([])).toBe('0 kayıt · 0 yayında · 0 taslak');
  });
});

describe('listRow', () => {
  it('gives the chips of a published, approved sample', () => {
    const r = listRow(rec('a', { fixture: true, tools: ['T1'], period: { start: '2024-03', precision: 'month' } }));
    expect(r).toMatchObject({
      id: 'a',
      title: 'Başlık a',
      kind: 'Tekil parça',
      tools: ['T1'],
      year: '2024',
      chips: ['live', 'approved', 'sample'],
      missing: [],
    });
  });

  it('marks a draft without approval chips', () => {
    expect(listRow(rec('d', { visibility: 'draft', approved: undefined })).chips).toEqual(['draft']);
  });

  it('marks a published record that is not approved as live only', () => {
    expect(listRow(rec('u', { approved: false })).chips).toEqual(['live']);
  });

  it('marks the languages whose title or slug is empty', () => {
    expect(listRow(rec('m', { title: { tr: 'Başlık', en: ' ' } })).missing).toEqual(['en']);
    expect(listRow(rec('s', { slug: { tr: '', en: 'x' } })).missing).toEqual(['tr']);
  });

  it('falls back to the English title and has no year or tools when absent', () => {
    const r = listRow(rec('e', { title: { tr: '', en: 'Only EN' } }));
    expect(r.title).toBe('Only EN');
    expect(r.year).toBeUndefined();
    expect(r.tools).toEqual([]);
  });
});

describe('resolveProjects', () => {
  const pool = [rec('a'), rec('b'), rec('c')];
  it('keeps pool order and drops unknown ids', () => {
    expect(resolveProjects(pool, ['c', 'zzz', 'a']).map((p) => p.id)).toEqual(['a', 'c']);
  });
  it('is empty for an empty list', () => {
    expect(resolveProjects(pool, [])).toEqual([]);
  });
});
