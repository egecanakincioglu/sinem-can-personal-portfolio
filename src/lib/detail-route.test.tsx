import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteRecord } from '@/content/notes/types';
import type { ProjectRecord } from '@/content/projects/types';

const project = {
  id: 'pr1',
  slug: { tr: 'pr1-tr', en: 'pr1-en' },
  title: { tr: 'Project one tr', en: 'Project one en' },
  subtitle: { tr: 'Sub tr', en: 'Sub en' },
  kind: 'single-part',
  disciplines: ['cad-modelling'],
  status: 'completed',
  visibility: 'published',
  approved: true,
} as ProjectRecord;

const hiddenProject = { ...project, id: 'pr2', slug: { tr: 'pr2-tr', en: 'pr2-en' }, approved: false } as ProjectRecord;

const note: NoteRecord = {
  id: 'nt1',
  status: 'published',
  approved: true,
  published: '2025-01-01',
  tr: { slug: 'nt1-tr', title: 'Note tr', summary: 'Sum tr', blocks: [{ type: 'p', text: 'x' }] },
};

const hiddenNote: NoteRecord = { ...note, id: 'nt2', approved: false, tr: { ...note.tr!, slug: 'nt2-tr' } };

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', 'production');
  vi.doMock('@/content/projects/published', () => ({ projectRecords: [project, hiddenProject] }));
  vi.doMock('@/content/notes/published', () => ({ noteRecords: [note, hiddenNote] }));
  vi.doMock('next/navigation', () => ({ notFound }));
  vi.doMock('@/components/Header', () => ({ Header: ({ page }: { page: string }) => <div>header-{page}</div> }));
  vi.doMock('@/components/Footer', () => ({ Footer: ({ page }: { page: string }) => <div>footer-{page}</div> }));
  vi.doMock('@/components/Sections', () => ({ Contact: () => <div>contact</div> }));
  vi.doMock('@/components/projects/ProjectDetail', () => ({
    ProjectDetail: ({ project: p }: { project: { id: string } }) => <div>project-{p.id}</div>,
  }));
  vi.doMock('@/components/notes/NoteArticle', () => ({
    NoteArticle: ({ note: n }: { note: { record: { id: string } } }) => <div>note-{n.record.id}</div>,
    tocOf: () => [
      { id: 's1', label: 'One', level: 2, parent: 's1' },
      { id: 's1a', label: 'One A', level: 3, parent: 's1' },
    ],
  }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.doUnmock('@/content/projects/published');
  vi.doUnmock('@/content/notes/published');
  vi.doUnmock('next/navigation');
  vi.doUnmock('@/components/Header');
  vi.doUnmock('@/components/Footer');
  vi.doUnmock('@/components/Sections');
  vi.doUnmock('@/components/projects/ProjectDetail');
  vi.doUnmock('@/components/notes/NoteArticle');
});

describe('detailStaticParams', () => {
  it('lists only public records under the localised list slug, using the given key', async () => {
    const { detailStaticParams } = await import('./detail-route');
    const params = detailStaticParams('entry');
    expect(params).toContainEqual({ locale: 'tr', slug: 'projeler', entry: 'pr1-tr' });
    expect(params).toContainEqual({ locale: 'en', slug: 'projects', entry: 'pr1-en' });
    expect(params).toContainEqual({ locale: 'tr', slug: 'notlar', entry: 'nt1-tr' });
    expect(params.some((p) => p.entry.startsWith('pr2') || p.entry.startsWith('nt2'))).toBe(false);
    expect(params.some((p) => p.locale === 'en' && p.slug === 'notes')).toBe(false);
  });
});

describe('detailMetadata', () => {
  it('returns project metadata with both language alternates', async () => {
    const { detailMetadata } = await import('./detail-route');
    const md = detailMetadata('en', 'projects', 'pr1-en');
    expect(String(md.title)).toContain('Project one en');
    expect(md.description).toBe('Sub en');
    expect(md.alternates?.canonical).toBe('/en/projects/pr1-en');
    expect(md.alternates?.languages).toEqual({ tr: '/tr/projeler/pr1-tr', en: '/en/projects/pr1-en' });
    expect(md.robots).toBeUndefined();
  });

  it('returns note metadata with alternates only for existing languages', async () => {
    const { detailMetadata } = await import('./detail-route');
    const md = detailMetadata('tr', 'notlar', 'nt1-tr');
    expect(md.description).toBe('Sum tr');
    expect(md.alternates?.canonical).toBe('/tr/notlar/nt1-tr');
    expect(md.alternates?.languages).toEqual({ tr: '/tr/notlar/nt1-tr' });
  });

  it('returns nothing for hidden, unknown, mismatched or invalid routes', async () => {
    const { detailMetadata } = await import('./detail-route');
    expect(detailMetadata('en', 'projects', 'pr2-en')).toEqual({});
    expect(detailMetadata('tr', 'notlar', 'nt2-tr')).toEqual({});
    expect(detailMetadata('en', 'projects', 'pr1-tr')).toEqual({});
    expect(detailMetadata('en', 'projeler', 'pr1-en')).toEqual({});
    expect(detailMetadata('en', 'notes', 'nt1-tr')).toEqual({});
    expect(detailMetadata('de', 'projects', 'pr1-en')).toEqual({});
  });
});

describe('DetailView', () => {
  it('renders a public project', async () => {
    const { DetailView } = await import('./detail-route');
    render(<DetailView locale="tr" slug="projeler" entry="pr1-tr" />);
    expect(screen.getByText('project-pr1')).toBeTruthy();
    expect(screen.getByText('header-project')).toBeTruthy();
    expect(screen.getByText('footer-project')).toBeTruthy();
  });

  it('renders a public note with its second-level sections', async () => {
    const { DetailView } = await import('./detail-route');
    render(<DetailView locale="tr" slug="notlar" entry="nt1-tr" />);
    expect(screen.getByText('note-nt1')).toBeTruthy();
    expect(screen.getByText('header-note')).toBeTruthy();
  });

  it('answers not found for hidden or unknown records', async () => {
    const { DetailView } = await import('./detail-route');
    expect(() => render(<DetailView locale="en" slug="projects" entry="pr2-en" />)).toThrow('NEXT_NOT_FOUND');
    expect(() => render(<DetailView locale="tr" slug="notlar" entry="nt2-tr" />)).toThrow('NEXT_NOT_FOUND');
    expect(() => render(<DetailView locale="en" slug="projects" entry="pr1-tr" />)).toThrow('NEXT_NOT_FOUND');
  });
});
