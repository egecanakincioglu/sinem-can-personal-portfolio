import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mediaManifest } from '@/content/media-manifest';
import { fixtureProjects } from '@/content/fixtures/projects';
import { fixtureMediaAssets, mediaTasks, mediaUsage, type MediaAsset } from '@/lib/media';
import { AdminProvider } from '../../ui/store';
import { MediaEditor } from './MediaEditor';
import MediaScreen from './page.dev';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/admin/medya',
}));

// The sample module is loaded with a runtime require that cannot read TypeScript here, so the development
// group is supplied directly.
vi.mock('@/content/media-manifest', async (orig) => {
  const actual = await orig<typeof import('@/content/media-manifest')>();
  const { fixtureProjects } = await import('@/content/fixtures/projects');
  const { fixtureMediaAssets } = await import('@/lib/media');
  return {
    ...actual,
    devFixtureProjects: () => fixtureProjects,
    devMediaAssets: () => fixtureMediaAssets(fixtureProjects),
  };
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllEnvs();
});

const photo = mediaManifest[0];
const samples = fixtureMediaAssets(fixtureProjects);

function setup(extra: MediaAsset[] = [], withSamples = samples) {
  const assets = [...mediaManifest, ...extra];
  return render(
    <AdminProvider>
      <MediaEditor
        assets={assets}
        samples={withSamples}
        usage={mediaUsage([...assets, ...withSamples], photo.src, fixtureProjects)}
        tasks={mediaTasks(assets)}
      />
    </AdminProvider>,
  );
}
const preview = (c: HTMLElement) => c.querySelector('.a-media-preview');

describe('Medya screen', () => {
  it('shows the portrait, an unchecked consent box and a waiting clearance status', () => {
    const { container } = setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Medya' })).toBeTruthy();
    expect(preview(container)?.querySelector('img')).toBeTruthy();
    const consent = screen.getByLabelText('Sinem bu fotoğrafın kullanımını onayladı') as HTMLInputElement;
    expect(consent.checked).toBe(false);
    expect(container.querySelector('.a-media-status')?.textContent).toContain('Onay bekliyor');
    expect(container.textContent).not.toMatch(/Onaylı|İzinli/);
  });

  it('keeps the photo and the waiting status when the consent box is checked', () => {
    const { container } = setup();
    fireEvent.click(screen.getByLabelText('Sinem bu fotoğrafın kullanımını onayladı'));
    expect((screen.getByLabelText('Sinem bu fotoğrafın kullanımını onayladı') as HTMLInputElement).checked).toBe(true);
    expect(preview(container)?.querySelector('img')).toBeTruthy();
    expect(container.querySelector('.a-media-status')?.textContent).toContain('Onay bekliyor');
    expect(container.textContent).not.toMatch(/Onaylı|İzinli/);
  });

  it('hides the portrait only with the show switch', () => {
    const { container } = setup();
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Portre göster' })).getByText('Gizle'));
    expect(preview(container)?.querySelector('img')).toBeNull();
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Portre göster' })).getByText('Göster'));
    expect(preview(container)?.querySelector('img')).toBeTruthy();
  });

  it('offers only eligible photographs and reverts to the previous portrait', () => {
    setup([{ ...photo, id: 'second-photo' }]);
    const select = screen.getByLabelText('Portre görseli') as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual([photo.id, 'second-photo']);
    const back = screen.getByRole('button', { name: 'Önceki portreye dön' }) as HTMLButtonElement;
    expect(back.disabled).toBe(true);
    fireEvent.change(select, { target: { value: 'second-photo' } });
    expect((screen.getByLabelText('Portre görseli') as HTMLSelectElement).value).toBe('second-photo');
    fireEvent.click(screen.getByRole('button', { name: 'Önceki portreye dön' }));
    expect((screen.getByLabelText('Portre görseli') as HTMLSelectElement).value).toBe(photo.id);
  });

  it('validates the zoom range of 1 to 2,5', () => {
    setup();
    const zoom = screen.getByLabelText(/Yakınlaştırma/) as HTMLInputElement;
    fireEvent.change(zoom, { target: { value: '3' } });
    expect(screen.getByText(/1 ile 2,5 arasında olmalı/)).toBeTruthy();
    fireEvent.change(zoom, { target: { value: '2,5' } });
    expect(screen.queryByText(/1 ile 2,5 arasında olmalı/)).toBeNull();
  });

  it('has a disabled upload button and no file input', () => {
    const { container } = setup();
    expect((screen.getByRole('button', { name: 'Yükle' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Prototipte dosya yükleme yok; görseller depodaki dosyalardan seçilir.')).toBeTruthy();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it('lists samples in their own group, never in the portrait selector', () => {
    const { container } = setup();
    expect(screen.getByRole('heading', { level: 2, name: 'Geliştirme örnekleri' })).toBeTruthy();
    const group = screen.getByRole('list', { name: 'Geliştirme örnekleri' });
    expect(group.querySelectorAll('li')).toHaveLength(samples.length);
    const options = [...container.querySelectorAll('select option')].map((o) => (o as HTMLOptionElement).value);
    expect(options.some((id) => samples.some((s) => s.id === id))).toBe(false);
  });

  it('shows no sample group without samples', () => {
    setup([], []);
    expect(screen.queryByRole('heading', { level: 2, name: 'Geliştirme örnekleri' })).toBeNull();
  });
});

describe('Medya page', () => {
  it('answers not-found outside development', () => {
    expect(() => render(<MediaScreen />)).toThrow('NEXT_NOT_FOUND');
  });

  it('renders the library with samples in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    render(
      <AdminProvider>
        <MediaScreen />
      </AdminProvider>,
    );
    expect(screen.getByRole('list', { name: 'Görseller' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Geliştirme örnekleri' })).toBeTruthy();
  });
});
