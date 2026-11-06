import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { fixtureProjects } from '@/content/fixtures/projects';
import type { ProjectRecord } from '@/content/projects/types';
import { AdminProvider, useAdmin } from './store';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

type Api = ReturnType<typeof useAdmin>;

function mount(stored?: Record<string, unknown>) {
  if (stored) sessionStorage.setItem('antet-admin', JSON.stringify({ schema: 1, ...stored }));
  const ref: { current: Api | null } = { current: null };
  function Grab() {
    ref.current = useAdmin();
    return null;
  }
  render(
    <AdminProvider>
      <Grab />
    </AdminProvider>,
  );
  return { api: () => ref.current! };
}

const ids = (api: Api) => api.state.projects.map((p) => p.id);
const byId = (api: Api, id: string) => api.state.projects.find((p) => p.id === id) as ProjectRecord;

describe('project actions', () => {
  it('creates a draft with only the chosen title and kind and returns a fresh id', () => {
    const { api } = mount();
    let a = '';
    let b = '';
    act(() => {
      a = api().createProject({ title: '  Mil  ', kind: 'fabrication' });
    });
    act(() => {
      b = api().createProject({ title: 'Dişli', kind: 'single-part' });
    });
    expect(a).toMatch(/^proje-[a-z0-9]{4,}$/);
    expect(b).not.toBe(a);
    expect(byId(api(), a)).toEqual({
      id: a,
      slug: { tr: 'mil', en: '' },
      title: { tr: 'Mil', en: '' },
      kind: 'fabrication',
      disciplines: [],
      status: 'in-progress',
      visibility: 'draft',
    });
    expect(api().state.dirty).toBe(true);
  });

  it('patches the named project only, and removes a field set to undefined', () => {
    const { api } = mount({ projects: fixtureProjects, seeded: true });
    act(() => api().patchProject('fixture-a', { title: { tr: 'Yeni', en: 'New' }, subtitle: undefined }));
    expect(byId(api(), 'fixture-a').title.tr).toBe('Yeni');
    expect('subtitle' in byId(api(), 'fixture-a')).toBe(false);
    expect(byId(api(), 'fixture-b').title.tr).toBe(fixtureProjects.find((p) => p.id === 'fixture-b')!.title.tr);
  });

  it('keeps the approval only while the record is published', () => {
    const { api } = mount({ projects: fixtureProjects, seeded: true });
    expect((byId(api(), 'fixture-a') as { approved?: boolean }).approved).toBe(true);
    act(() => api().patchProject('fixture-a', { visibility: 'draft' }));
    expect('approved' in byId(api(), 'fixture-a')).toBe(false);
    act(() => api().patchProject('fixture-a', { visibility: 'published', approved: false }));
    expect((byId(api(), 'fixture-a') as { approved?: boolean }).approved).toBe(false);
  });

  it('removes a project and drops references to it', () => {
    const { api } = mount({ projects: fixtureProjects, seeded: true });
    act(() => api().patchProject('fixture-b', { relatedIds: ['fixture-a'] }));
    act(() => api().removeProject('fixture-a'));
    expect(ids(api())).not.toContain('fixture-a');
    expect('relatedIds' in byId(api(), 'fixture-b')).toBe(false);
  });

  it('keeps one featured project at a time and can clear it', () => {
    const { api } = mount({ projects: fixtureProjects, seeded: true });
    expect(
      api()
        .state.projects.filter((p) => p.featured)
        .map((p) => p.id),
    ).toEqual(['fixture-a']);
    act(() => api().setFeatured('fixture-b'));
    expect(
      api()
        .state.projects.filter((p) => p.featured)
        .map((p) => p.id),
    ).toEqual(['fixture-b']);
    act(() => api().setFeatured(null));
    expect(api().state.projects.some((p) => p.featured)).toBe(false);
  });
});

describe('save and discard cover projects', () => {
  it('discard returns to the last saved projects, including removing a created one', () => {
    const { api } = mount({ projects: fixtureProjects, seeded: true });
    let id = '';
    act(() => {
      id = api().createProject({ title: 'Geçici', kind: 'calculation' });
    });
    act(() => api().patchProject('fixture-a', { title: { tr: 'Değişti', en: 'Changed' } }));
    act(() => api().discard());
    expect(ids(api())).not.toContain(id);
    expect(byId(api(), 'fixture-a').title.tr).toBe('Örnek kayıt A');
    expect(api().state.dirty).toBe(false);
  });

  it('save keeps the edits as the new snapshot', () => {
    const { api } = mount({ projects: fixtureProjects, seeded: true });
    let id = '';
    act(() => {
      id = api().createProject({ title: 'Kalıcı', kind: 'calculation' });
    });
    act(() => api().save());
    act(() => api().patchProject(id, { title: { tr: 'Sonra', en: '' } }));
    act(() => api().discard());
    expect(byId(api(), id).title.tr).toBe('Kalıcı');
  });

  it('loading or removing the samples is not an edit and is not undone by discard', () => {
    const { api } = mount();
    act(() => api().seedSamples(fixtureProjects));
    expect(api().state.dirty).toBe(false);
    act(() => api().discard());
    expect(ids(api())).toEqual(fixtureProjects.map((p) => p.id));
    act(() => api().clearSamples());
    act(() => api().discard());
    expect(ids(api())).toEqual([]);
  });

  it('treats a stored session from before the snapshot existed as already saved', () => {
    const { api } = mount({ projects: fixtureProjects, seeded: true });
    act(() => api().discard());
    expect(ids(api())).toEqual(fixtureProjects.map((p) => p.id));
  });
});
