import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProjectRecord } from '@/content/projects/types';

const img = (id: string) => ({
  id,
  kind: 'image' as const,
  src: `/${id}.png`,
  alt: { tr: `${id} tr`, en: `${id} en` },
  width: 100,
  height: 50,
});

function rec(id: string, extra: Record<string, unknown> = {}): ProjectRecord {
  return {
    id,
    slug: { tr: `${id}-tr`, en: `${id}-en` },
    title: { tr: `Title ${id} tr`, en: `Title ${id} en` },
    kind: 'single-part',
    disciplines: ['cad-modelling'],
    status: 'completed',
    visibility: 'published',
    approved: true,
    ...extra,
  } as ProjectRecord;
}

const published: ProjectRecord[] = [
  rec('pub-a', { period: { start: '2024-03', precision: 'month' }, tools: ['t1'] }),
  rec('pub-b', { period: { start: '2025-01', precision: 'month' }, kind: 'fabrication', featured: true }),
  rec('pub-c', { period: { start: '2023-01', precision: 'month' }, kind: 'calculation', tools: ['t1'] }),
  rec('unapproved', { approved: false }),
  rec('draft', { visibility: 'draft' }),
  rec('fx-in-published', { fixture: true }),
];
const fixtureProjects: ProjectRecord[] = [rec('fx-1', { fixture: true })];
const manyFixtures: ProjectRecord[] = [rec('many-1', { fixture: true })];

async function load(env: 'production' | 'development', records: ProjectRecord[] = published) {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', env);
  vi.doMock('@/content/projects/published', () => ({ projectRecords: records }));
  vi.doMock('@/content/fixtures/projects', () => ({ fixtureProjects, manyFixtures }));
  return import('./projects');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('@/content/projects/published');
  vi.doUnmock('@/content/fixtures/projects');
});

describe('project visibility in production', () => {
  it('lists only published, approved, non-fixture records', async () => {
    const m = await load('production');
    expect(m.getPublicProjects().map((p) => p.id)).toEqual(['pub-b', 'pub-a', 'pub-c']);
  });

  it('never shows unapproved, draft or fixture records, even when fixtures are requested', async () => {
    const m = await load('production');
    const ids = m.getPublicProjects({ includeFixtures: true, many: true }).map((p) => p.id);
    expect(ids).toEqual(['pub-b', 'pub-a', 'pub-c']);
  });

  it('does not resolve hidden slugs in any language', async () => {
    const m = await load('production');
    for (const id of ['unapproved', 'draft', 'fx-in-published']) {
      expect(m.findPublicProject(`${id}-tr`, 'tr')).toBeUndefined();
      expect(m.findPublicProject(`${id}-en`, 'en')).toBeUndefined();
    }
  });

  it('resolves a public slug only in its own language', async () => {
    const m = await load('production');
    expect(m.findPublicProject('pub-a-tr', 'tr')?.id).toBe('pub-a');
    expect(m.findPublicProject('pub-a-en', 'en')?.id).toBe('pub-a');
    expect(m.findPublicProject('pub-a-en', 'tr')).toBeUndefined();
  });

  it('builds static params for public records in both locales only', async () => {
    const m = await load('production');
    const params = m.projectStaticParams();
    expect(params).toHaveLength(6);
    expect(params).toContainEqual({ locale: 'tr', project: 'pub-a-tr' });
    expect(params).toContainEqual({ locale: 'en', project: 'pub-a-en' });
    expect(params.some((p) => p.project.startsWith('draft'))).toBe(false);
  });
});

describe('project visibility in development', () => {
  // The fixture module is loaded with require() behind a build-time constant, which Vitest cannot resolve for .ts files.
  it('shows a published, approved record flagged as a fixture, but not drafts or unapproved', async () => {
    const m = await load('development');
    const ids = m.getPublicProjects().map((p) => p.id);
    expect(ids).toEqual(['pub-b', 'pub-a', 'pub-c', 'fx-in-published']);
    expect(ids).not.toContain('draft');
    expect(ids).not.toContain('unapproved');
  });
});

describe('toPublicProject', () => {
  it('strips private originals', async () => {
    const m = await load('production');
    const r = rec('priv', {
      privateOriginals: [{ assetId: 'asset-one', format: 'step', label: { tr: 'x', en: 'x' }, access: 'private' }],
    });
    const out = m.toPublicProject(r);
    expect('privateOriginals' in out).toBe(false);
    expect(JSON.stringify(out)).not.toContain('asset-one');
  });

  it('drops an unapproved 3D preview', async () => {
    const m = await load('production');
    const preview3d = { id: 'p', approved: false, poster: img('poster'), modelSrc: '/m.glb' };
    expect(m.toPublicProject(rec('x', { preview3d })).preview3d).toBeUndefined();
  });

  it('keeps an approved 3D preview', async () => {
    const m = await load('production');
    const preview3d = { id: 'p', approved: true, poster: img('poster'), modelSrc: '/m.glb' };
    expect(m.toPublicProject(rec('x', { preview3d })).preview3d).toEqual(preview3d);
  });

  it('leaves a record without a preview untouched', async () => {
    const m = await load('production');
    expect(m.toPublicProject(rec('x')).preview3d).toBeUndefined();
  });
});

describe('related, next and paths', () => {
  it('puts explicit relations first, then same kind or shared tool, max two', async () => {
    const m = await load('production');
    const a = m.findPublicProject('pub-a-en', 'en')!;
    expect(m.relatedProjects({ ...a, relatedIds: ['pub-b'] }).map((p) => p.id)).toEqual(['pub-b', 'pub-c']);
    expect(m.relatedProjects(a).map((p) => p.id)).toEqual(['pub-c']);
  });

  it('never relates to hidden records', async () => {
    const m = await load('production');
    const a = { ...m.findPublicProject('pub-a-en', 'en')!, relatedIds: ['draft', 'unapproved'] };
    const ids = m.relatedProjects(a).map((p) => p.id);
    expect(ids).not.toContain('draft');
    expect(ids).not.toContain('unapproved');
  });

  it('returns the next record in archive order and wraps', async () => {
    const m = await load('production');
    const [first, , last] = m.getPublicProjects();
    expect(m.nextProject(first)?.id).toBe('pub-a');
    expect(m.nextProject(last)?.id).toBe('pub-b');
  });

  it('has no next record when fewer than two are public', async () => {
    const m = await load('production', [published[0]]);
    expect(m.nextProject(m.getPublicProjects()[0])).toBeUndefined();
  });

  it('gives the equivalent path per language', async () => {
    const m = await load('production');
    expect(m.projectPaths(m.getPublicProjects()[0])).toEqual({
      tr: '/tr/projeler/pub-b-tr',
      en: '/en/projects/pub-b-en',
    });
  });
});

describe('injected records', () => {
  const injected = [
    rec('inj-a', { period: { start: '2022-01', precision: 'month' } }),
    rec('inj-d', { visibility: 'draft' }),
  ];

  it('uses the given records instead of the published source, still filtered', async () => {
    const m = await load('production');
    expect(m.getPublicProjects({}, injected).map((p) => p.id)).toEqual(['inj-a']);
    expect(m.findPublicProject('inj-a-en', 'en', injected)?.id).toBe('inj-a');
    expect(m.findPublicProject('inj-d-en', 'en', injected)).toBeUndefined();
    expect(m.findPublicProject('pub-a-en', 'en', injected)).toBeUndefined();
    expect(m.projectStaticParams(injected)).toEqual([
      { locale: 'tr', project: 'inj-a-tr' },
      { locale: 'en', project: 'inj-a-en' },
    ]);
  });

  it('relates and chains within the given records', async () => {
    const two = [...injected, rec('inj-b', { period: { start: '2021-01', precision: 'month' } })];
    const m = await load('production');
    const [a, b] = m.getPublicProjects({}, two);
    expect(m.relatedProjects(a, two).map((p) => p.id)).toEqual(['inj-b']);
    expect(m.nextProject(a, two)?.id).toBe('inj-b');
    expect(m.nextProject(b, two)?.id).toBe('inj-a');
  });
});

describe('view models', () => {
  it('builds a localised card', async () => {
    const m = await load('production');
    const p = m.findPublicProject('pub-a-en', 'en')!;
    const card = m.toCard({ ...p, cover: img('cv') }, 'tr');
    expect(card.href).toBe('/tr/projeler/pub-a-tr');
    expect(card.title).toBe('Title pub-a tr');
    expect(card.year).toBe('2024');
    expect(card.tools).toEqual(['t1']);
    expect(card.cover).toMatchObject({ alt: 'cv tr', focalX: 50, focalY: 50 });
    expect(card.fixture).toBe(false);
    expect(card.kindLabel).toBeTruthy();
  });

  it('builds a card without optional parts', async () => {
    const m = await load('production');
    const card = m.toCard(m.toPublicProject(rec('bare')), 'en');
    expect(card.cover).toBeUndefined();
    expect(card.year).toBeUndefined();
    expect(card.tools).toEqual([]);
  });

  it('honours focal points on card images', async () => {
    const m = await load('production');
    expect(m.toCardImage({ ...img('f'), focalX: 10, focalY: 90 }, 'en')).toMatchObject({ focalX: 10, focalY: 90 });
  });

  it('puts the featured card first on the home list', async () => {
    const m = await load('production');
    const list = m.getPublicProjects();
    expect(m.homeProjectCards(list, 'en').map((c) => c.id)).toEqual(['pub-b', 'pub-a', 'pub-c']);
    expect(m.homeProjectCards([...list].reverse(), 'en')[0].id).toBe('pub-b');
  });

  it('falls back to the first record when none is featured and handles empty', async () => {
    const m = await load('production');
    const list = m.getPublicProjects().map((p) => ({ ...p, featured: false }));
    expect(m.homeProjectCards(list, 'en')[0].id).toBe(list[0].id);
    expect(m.homeProjectCards([], 'en')).toEqual([]);
  });
});
