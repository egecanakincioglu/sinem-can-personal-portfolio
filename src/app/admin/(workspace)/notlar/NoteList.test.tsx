import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureNotes } from '@/content/fixtures/notes';
import { fixtureProjects } from '@/content/fixtures/projects';
import { AdminProvider } from '../../ui/store';
import { NoteList } from './NoteList';
import NotesScreen from './page';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/admin/notlar',
  useRouter: () => ({ push }),
}));
vi.mock('@/content/media-manifest', async (orig) => {
  const actual = await orig<typeof import('@/content/media-manifest')>();
  const { fixtureNotes } = await import('@/content/fixtures/notes');
  const { fixtureProjects } = await import('@/content/fixtures/projects');
  return { ...actual, devFixtureNotes: () => fixtureNotes, devFixtureProjects: () => fixtureProjects };
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  push.mockClear();
  vi.unstubAllEnvs();
});

const setup = () =>
  render(
    <AdminProvider>
      <NoteList samples={fixtureNotes} projectSamples={fixtureProjects} />
    </AdminProvider>,
  );
const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;

describe('Notlar screen', () => {
  it('starts with the empty state, zero counts and both actions', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Notlar' })).toBeTruthy();
    expect(screen.getByText('Pafta 04')).toBeTruthy();
    expect(screen.getByText('Henüz yayımlanmış bir not yok.')).toBeTruthy();
    expect(screen.getByText(/^0 kayıt · 0 yayında · 0 taslak/)).toBeTruthy();
    expect(button('Yeni not')).toBeTruthy();
    expect(button('Örnek verileri yükle').disabled).toBe(false);
    expect(screen.queryByRole('list', { name: 'Notlar' })).toBeNull();
  });

  it('loads the sample notes with derived chips and counts', () => {
    setup();
    fireEvent.click(button('Örnek verileri yükle'));
    const rows = within(screen.getByRole('list', { name: 'Notlar' })).getAllByRole('listitem');
    expect(rows).toHaveLength(fixtureNotes.length);
    expect(screen.getByText(/^4 kayıt · 3 yayında · 1 taslak · 3 onaylı/)).toBeTruthy();
    const beam = screen.getByRole('link', { name: 'Basit mesnetli kiriş: yükten sehime' });
    expect(beam.getAttribute('href')).toBe('/admin/notlar/fx-beam');
    const beamRow = beam.closest('li')!;
    expect(within(beamRow).getByText('TR · EN')).toBeTruthy();
    expect(within(beamRow).getByText('31 Ekim 2026')).toBeTruthy();
    expect(within(beamRow).getByText(/dk okuma/)).toBeTruthy();
    expect(within(beamRow).getByText('Geliştirme örneği')).toBeTruthy();
    const units = screen.getByRole('link', { name: 'Birimler ve boyut analizi' }).closest('li')!;
    expect(within(units).getByText('Yalnızca TR')).toBeTruthy();
    expect(within(units).getByText('EN eksik')).toBeTruthy();
    const draft = screen.getByRole('link', { name: 'Taslak örnek' }).closest('li')!;
    expect(within(draft).getByText('Taslak')).toBeTruthy();
    expect(button('Örnek verileri yükle').disabled).toBe(true);
  });

  it('removes the samples again and clears them with the demo reset', () => {
    setup();
    fireEvent.click(button('Örnek verileri yükle'));
    fireEvent.click(button('Örnekleri kaldır'));
    expect(screen.queryByRole('list', { name: 'Notlar' })).toBeNull();
    expect(screen.getByText('Henüz yayımlanmış bir not yok.')).toBeTruthy();
  });

  it('creates a draft note from a title and opens its editor', () => {
    setup();
    fireEvent.click(button('Yeni not'));
    expect(button('Oluştur').disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Not başlığı (Türkçe)'), { target: { value: 'Kiriş Eğilmesi' } });
    fireEvent.click(button('Oluştur'));
    expect(push).toHaveBeenCalledWith('/admin/notlar/kiris-egilmesi');
  });

  it('tolerates a stored state without a notes list', () => {
    sessionStorage.setItem('antet-admin', JSON.stringify({ schema: 1, projects: [] }));
    setup();
    expect(screen.getByText('Henüz yayımlanmış bir not yok.')).toBeTruthy();
  });

  it('is gated: 404 outside development, the list in development', () => {
    expect(() => NotesScreen()).toThrow('NEXT_NOT_FOUND');
    vi.stubEnv('NODE_ENV', 'development');
    expect(() => NotesScreen()).not.toThrow();
  });
});
