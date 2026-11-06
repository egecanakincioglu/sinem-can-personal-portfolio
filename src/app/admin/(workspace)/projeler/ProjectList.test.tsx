import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureProjects } from '@/content/fixtures/projects';
import type { ProjectRecord } from '@/content/projects/types';
import { AdminProvider, useAdmin } from '../../ui/store';
import { ProjectList } from './ProjectList';
import ProjectsScreen from './page.dev';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/admin/projeler',
  useRouter: () => ({ push: vi.fn() }),
}));

// The sample module is loaded with a runtime require that cannot read TypeScript here, so the samples are supplied directly.
vi.mock('@/content/media-manifest', async (orig) => {
  const actual = await orig<typeof import('@/content/media-manifest')>();
  const { fixtureProjects } = await import('@/content/fixtures/projects');
  return { ...actual, devFixtureProjects: () => fixtureProjects, devFixtureNotes: () => [] };
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllEnvs();
});

function Reset() {
  return (
    <button type="button" onClick={useAdmin().reset}>
      Sıfırla
    </button>
  );
}

const setup = (samples: ProjectRecord[] = fixtureProjects) =>
  render(
    <AdminProvider>
      <ProjectList samples={samples} />
      <Reset />
    </AdminProvider>,
  );
const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;
const counts = (n: number, pub: number) => `${n} kayıt · ${pub} yayında · ${n - pub} taslak`;

describe('Projeler screen', () => {
  it('starts with the empty sheet, zero counts and an enabled new-project button', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Projeler' })).toBeTruthy();
    expect(screen.getByText(counts(0, 0))).toBeTruthy();
    expect(screen.getByText('Pafta hazırlanıyor. — İlk projeyi ekleyin')).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Projeler' })).toBeNull();
    expect(button('Yeni proje').disabled).toBe(false);
    expect(screen.getByText(/Yeni proje taslak olarak açılır/)).toBeTruthy();
    expect(screen.getByText('Filtre 6+ projede görünür.')).toBeTruthy();
    expect(screen.getByText(/Düzen: tek boş çerçeve/)).toBeTruthy();
    expect(button('Örnekleri kaldır').disabled).toBe(true);
  });

  it('loads the samples as marked rows with a link to each record', () => {
    setup();
    fireEvent.click(button('Örnek verileri yükle'));
    const rows = within(screen.getByRole('list', { name: 'Projeler' })).getAllByRole('listitem');
    expect(rows).toHaveLength(fixtureProjects.length);
    for (const row of rows) expect(within(row).getByText('Geliştirme örneği')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Örnek kayıt A' });
    expect(link.getAttribute('href')).toBe('/admin/projeler/fixture-a');
    const draft = rows.find((r) => within(r).queryByRole('link', { name: 'Örnek taslak' }))!;
    expect(within(draft).getByText('Taslak')).toBeTruthy();
    expect(within(draft).queryByText('Onaylı')).toBeNull();
    const published = fixtureProjects.filter((p) => p.visibility === 'published').length;
    expect(screen.getByText(counts(fixtureProjects.length, published))).toBeTruthy();
    expect(button('Örnek verileri yükle').disabled).toBe(true);
    expect(button('Örnekleri kaldır').disabled).toBe(false);
  });

  it('never counts samples as public outside development', () => {
    setup();
    fireEvent.click(button('Örnek verileri yükle'));
    expect(screen.getByText(/Projeler: 0 · Notlar: 0/)).toBeTruthy();
  });

  it('counts the published and approved samples toward the Homepage Work state in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    setup();
    fireEvent.click(button('Örnek verileri yükle'));
    const n = fixtureProjects.filter((p) => p.visibility === 'published' && p.approved).length;
    expect(screen.getByText(new RegExp(`Projeler: ${n} · Notlar: 0 → Düzen: öne çıkan \\+ 2 satır`))).toBeTruthy();
  });

  it('removes the samples again', () => {
    setup();
    fireEvent.click(button('Örnek verileri yükle'));
    fireEvent.click(button('Örnekleri kaldır'));
    expect(screen.queryByRole('list', { name: 'Projeler' })).toBeNull();
    expect(screen.getByText('Pafta hazırlanıyor. — İlk projeyi ekleyin')).toBeTruthy();
    expect(button('Örnek verileri yükle').disabled).toBe(false);
  });

  it('clears the loaded samples with the demo reset', () => {
    setup();
    fireEvent.click(button('Örnek verileri yükle'));
    fireEvent.click(button('Sıfırla'));
    expect(screen.queryByRole('list', { name: 'Projeler' })).toBeNull();
    expect(button('Örnek verileri yükle').disabled).toBe(false);
  });

  it('cannot load without samples', () => {
    setup([]);
    expect(button('Örnek verileri yükle').disabled).toBe(true);
  });

  it('restores stored records and marks a missing language', () => {
    const noEn = { ...fixtureProjects[0], id: 'no-en', title: { tr: 'Yalnız Türkçe', en: '' } };
    sessionStorage.setItem('antet-admin', JSON.stringify({ schema: 1, projects: [noEn], seeded: true }));
    setup();
    const row = screen.getByRole('link', { name: 'Yalnız Türkçe' }).closest('li')!;
    expect(within(row).getByText('EN eksik')).toBeTruthy();
    expect(within(row).queryByText('TR eksik')).toBeNull();
    expect(button('Örnekleri kaldır').disabled).toBe(false);
  });

  it('ignores a stored project list that is not a list', () => {
    sessionStorage.setItem('antet-admin', JSON.stringify({ schema: 1, projects: 'x', seeded: 'yes' }));
    setup();
    expect(screen.getByText('Pafta hazırlanıyor. — İlk projeyi ekleyin')).toBeTruthy();
    expect(button('Örnekleri kaldır').disabled).toBe(true);
  });
});

describe('Projeler page', () => {
  it('is a 404 outside development', () => {
    expect(() => ProjectsScreen()).toThrow('NEXT_NOT_FOUND');
  });

  it('passes the development samples to the list in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect((ProjectsScreen().props as { samples: ProjectRecord[] }).samples).toBe(fixtureProjects);
  });
});
