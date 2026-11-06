import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureProjects } from '@/content/fixtures/projects';
import { AdminProvider } from '../ui/store';
import { Overview } from './Overview';
import OverviewScreen from './page.dev';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllEnvs();
});

const seed = (state: Record<string, unknown>) =>
  sessionStorage.setItem('antet-admin', JSON.stringify({ schema: 1, ...state }));
const show = () =>
  render(
    <AdminProvider>
      <Overview />
    </AdminProvider>,
  );
const row = (label: string) =>
  screen
    .getAllByText(label)
    .map((e) => e.closest('.a-readout'))
    .find(Boolean) as HTMLElement;

describe('Overview', () => {
  it('shows the derived resultant angle and no tasks on the initial state', () => {
    show();
    expect(screen.getByRole('heading', { level: 1, name: 'Genel bakış' })).toBeTruthy();
    expect(row('Bileşke açısı θR').textContent).toMatch(/\d+,\d °/);
    expect(screen.getByText('Bekleyen görev yok.')).toBeTruthy();
    expect(screen.getByText('Henüz simüle edilmiş yayın yok.')).toBeTruthy();
    expect(within(row('Boş alternatif metin')).getByText('0')).toBeTruthy();
  });

  it('counts tasks per group from the same issues as the title block', () => {
    seed({ values: { 'hero.lead.tr': 'Yeni cümle', 'ayarlar.contact.email': 'geçersiz' } });
    show();
    expect(within(row('Onay bekleyen metinler')).getByText('1')).toBeTruthy();
    expect(within(row('Hatalar')).getByText('1')).toBeTruthy();
  });

  it('shows the last three revisions and the project counts', () => {
    const rev = (n: number) => ({
      rev: n,
      at: `2026-11-0${n}T10:00`,
      changes: [{ path: 'draft.heroLead' }],
      state: { values: {}, projects: [] },
    });
    seed({
      rev: 4,
      revisions: [rev(4), rev(3), rev(2), rev(1)],
      published: { rev: 4, at: '2026-11-04T10:00' },
      projects: fixtureProjects,
      seeded: true,
    });
    show();
    expect(screen.getByText(/^Rev\. E — /)).toBeTruthy();
    expect(screen.getByText(/^Rev\. D — /)).toBeTruthy();
    expect(screen.getByText(/^Rev\. C — /)).toBeTruthy();
    expect(screen.queryByText(/^Rev\. B — /)).toBeNull();
    expect(within(row('Projeler')).getByText(String(fixtureProjects.length))).toBeTruthy();
  });

  it('counts a blank alternative text', () => {
    const [p] = fixtureProjects;
    seed({ projects: [{ ...p, cover: { ...p.cover!, alt: { tr: '', en: ' ' } } }] });
    show();
    expect(within(row('Boş alternatif metin')).getByText('2')).toBeTruthy();
  });

  it('stays closed outside development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => OverviewScreen()).toThrow('NEXT_NOT_FOUND');
  });
});
