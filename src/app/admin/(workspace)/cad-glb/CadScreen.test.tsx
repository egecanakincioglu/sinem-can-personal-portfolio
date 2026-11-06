import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureProjects } from '@/content/fixtures/projects';
import { mediaManifest } from '@/content/media-manifest';
import type { ProjectRecord } from '@/content/projects/types';
import { glbLibrary } from '@/lib/glb';
import { fixtureMediaAssets } from '@/lib/media';
import { AdminProvider, useAdmin } from '../../ui/store';
import { CadScreen } from './CadScreen';
import CadScreenPage from './page.dev';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/admin/cad-glb',
}));

// The sample module is loaded with a runtime require that cannot read TypeScript here, so the samples are supplied directly.
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

const library = glbLibrary(48_000);
const samples = fixtureMediaAssets(fixtureProjects);
const portrait = { ...mediaManifest[0], id: 'portrait-photo' };
const assets = [portrait, ...samples];
const fixtureA = fixtureProjects.find((p) => p.id === 'fixture-a') as ProjectRecord;

function Probe() {
  const { state } = useAdmin();
  return <p data-testid="probe">{state.probe ?? 'none'}</p>;
}

function setup(projects: ProjectRecord[] = fixtureProjects) {
  sessionStorage.setItem('antet-admin', JSON.stringify({ schema: 1, projects, seeded: true }));
  return render(
    <AdminProvider>
      <CadScreen assets={assets} portraitId="portrait-photo" library={library} projectCount={fixtureProjects.length} />
      <Probe />
    </AdminProvider>,
  );
}
const open = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const modelSelect = () => screen.getByLabelText('Model') as HTMLSelectElement;

describe('3B ve CAD screen', () => {
  it('shows the empty state without projects, pointing at the sample loader when samples exist', () => {
    setup([]);
    expect(screen.getByRole('heading', { level: 1, name: '3B ve CAD' })).toBeTruthy();
    expect(screen.getByText('Henüz 3B önizleme ya da özel dosya yok.')).toBeTruthy();
    expect(screen.getByText(/Projeler ekranından örnek verileri yükleyin/)).toBeTruthy();
    expect(screen.getByText(/0 proje · 0 onaylı · 0 taslak · 0 özel dosya/)).toBeTruthy();
  });

  it('lists only projects with a model or originals, with counts, state and gauge', () => {
    setup();
    const list = screen.getByRole('list', { name: '3B ve CAD kayıtları' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(screen.getByText(/2 proje · 1 onaylı · 1 taslak · 2 özel dosya/)).toBeTruthy();
    expect(within(rows[0]).getByText('Onaylı')).toBeTruthy();
    expect(within(rows[1]).getByText('Taslak')).toBeTruthy();
    expect(within(rows[0]).queryByRole('img')).toBeNull(); // the sample has no declared size yet
  });

  it('flags a missing size as an open checklist item and opens both editors from a row', () => {
    setup();
    open(/Örnek kayıt A/);
    expect(screen.getByRole('list', { name: 'Görünme koşulları' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Özel dosyalar' })).toBeTruthy();
    expect(screen.getByText('Boyut 15 MB veya altında — eksik')).toBeTruthy();
  });

  it('measures the gauge from the library entry: 3,2 MB ok, 8,4 MB warning, 18 MB error', () => {
    setup();
    open(/Örnek kayıt A/);
    fireEvent.change(modelSelect(), { target: { value: 'size-3-2' } });
    // once in the row, once in the editor
    expect(screen.getAllByText('3,2 MB · 3.200.000 bayt', { selector: 'p' })).toHaveLength(2);
    expect(within(screen.getByRole('list', { name: '3B ve CAD kayıtları' })).getAllByRole('img')).toHaveLength(1);
    expect(screen.getByText('Hedef içinde (5 MB ve altı).')).toBeTruthy();
    fireEvent.change(modelSelect(), { target: { value: 'size-8-4' } });
    expect(screen.getByText(/Uyarı: Hedefin üzerinde; Draco\/meshopt sıkıştırması önerilir\./)).toBeTruthy();
    fireEvent.change(modelSelect(), { target: { value: 'size-18' } });
    expect(screen.getByText(/Hata: 15 MB sınırının üstünde/)).toBeTruthy();
    expect(screen.getByText('Boyut 15 MB veya altında — eksik')).toBeTruthy();
    expect(screen.getAllByText('15 MB üstü').length).toBeGreaterThan(0);
    fireEvent.change(modelSelect(), { target: { value: 'dev-flange' } });
    expect(screen.getAllByText('0,0 MB · 48.000 bayt', { selector: 'p' })).toHaveLength(2);
    expect(screen.queryByText('Boyut 15 MB veya altında — eksik')).toBeNull();
  });

  it('offers only the library models, with the size samples labelled as having no file', () => {
    setup();
    open(/Örnek kayıt A/);
    const labels = Array.from(modelSelect().options).map((o) => o.textContent);
    expect(labels).toHaveLength(library.length + 1);
    expect(labels.filter((l) => l?.includes('Boyut örneği — dosya yok'))).toHaveLength(3);
    expect(labels.some((l) => l?.includes('Geliştirme örneği — gerçek model değil'))).toBe(true);
    expect(labels.every((l) => !/sldprt|sldasm|\.step|\.iges/i.test(l ?? ''))).toBe(true);
    expect(screen.getByText(/SolidWorks\/NX dosyaları tarayıcıda gösterilmez/)).toBeTruthy();
  });

  it('never offers the portrait as a poster', () => {
    setup();
    open(/Örnek kayıt A/);
    const values = Array.from((screen.getByLabelText('Poster') as HTMLSelectElement).options).map((o) => o.textContent);
    expect(values.some((v) => v?.startsWith('portrait-photo'))).toBe(false);
    expect(values.some((v) => v?.startsWith('fixture-a/'))).toBe(false);
    expect(values.filter((v) => /\(\d+ × \d+\)$/.test(v ?? '')).length).toBeGreaterThan(0);
  });

  it('toggles "Yayında göster" and updates the state and the checklist', () => {
    setup();
    open(/Örnek kayıt A/);
    const toggle = screen.getByLabelText('Yayında göster') as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
    expect(screen.getByText('Yayında göster açık — eksik')).toBeTruthy();
    expect(screen.getByText(/2 proje · 0 onaylı · 2 taslak/)).toBeTruthy();
  });

  it('edits the caption pair', () => {
    setup();
    open(/Örnek kayıt A/);
    const tr = screen.getByLabelText(/Açıklama · TR/) as HTMLTextAreaElement;
    fireEvent.change(tr, { target: { value: 'Yeni açıklama' } });
    expect((screen.getByLabelText(/Açıklama · TR/) as HTMLTextAreaElement).value).toBe('Yeni açıklama');
  });

  it('starts a draft preview from a poster for a project that only has originals', () => {
    const only = { ...fixtureA, id: 'only-originals', preview3d: undefined } as ProjectRecord;
    setup([only]);
    open(/Örnek kayıt A/);
    expect(screen.getByText(/Bu projede 3B önizleme yok/)).toBeTruthy();
    expect(modelSelect().disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Önizlemeyi sına' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Poster'), { target: { value: samples[0].src } });
    expect(modelSelect().disabled).toBe(false);
    expect(screen.getByText(/1 proje · 0 onaylı · 1 taslak/)).toBeTruthy();
  });

  it('"Önizlemeyi sına" selects the project for the live preview, and leaving the screen clears it', () => {
    const { unmount } = setup();
    open(/Örnek kayıt A/);
    expect(screen.getByTestId('probe').textContent).toBe('none');
    fireEvent.click(screen.getByRole('button', { name: 'Önizlemeyi sına' }));
    expect(screen.getByTestId('probe').textContent).toBe('fixture-a');
    unmount();
  });
});

describe('patchProject', () => {
  it('changes the fields of the named project only', () => {
    function Patch() {
      const { state, patchProject } = useAdmin();
      const a = state.projects.find((p) => p.id === 'fixture-a');
      return (
        <>
          <button
            type="button"
            onClick={() =>
              patchProject('fixture-a', { privateOriginals: [], title: { tr: 'Değişti', en: 'Changed' } } as never)
            }
          >
            patch
          </button>
          <p data-testid="out">
            {a?.title.tr}|{a?.privateOriginals?.length}|{state.projects.find((p) => p.id === 'fixture-b')?.title.tr}
          </p>
        </>
      );
    }
    sessionStorage.setItem('antet-admin', JSON.stringify({ schema: 1, projects: fixtureProjects, seeded: true }));
    render(
      <AdminProvider>
        <Patch />
      </AdminProvider>,
    );
    expect(screen.getByTestId('out').textContent).toBe('Örnek kayıt A|1|Örnek kayıt B — yalnızca zorunlu alanlar');
    fireEvent.click(screen.getByRole('button', { name: 'patch' }));
    expect(screen.getByTestId('out').textContent).toBe('Değişti|0|Örnek kayıt B — yalnızca zorunlu alanlar');
  });
});

describe('private originals', () => {
  it('has no address field and no file field, only a file id line and a fixed notice', () => {
    const { container } = setup();
    open(/Örnek kayıt A/);
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(container.querySelector('input[type="url"]')).toBeNull();
    expect(screen.queryByLabelText(/adres|url|yol/i)).toBeNull();
    expect(screen.queryByLabelText('Dosya anahtarı')).toBeNull();
    expect(screen.getAllByText(/Dosya kimliği: .*Sistem tarafından üretilir/)).toHaveLength(1);
    expect(screen.getByText(/Özel dosya\. Genel sitede hiçbir zaman bağlantı olarak görünmez\./)).toBeTruthy();
    expect(screen.getByText(/bu prototipte indirme yoktur\./)).toBeTruthy();
    expect(screen.getByText('Bu liste genel sayfaya gönderilmez ✓')).toBeTruthy();
    expect(screen.getByText(/1 özel dosya \(genel sitede görünmez\)/)).toBeTruthy();
  });

  it('adds a row with a generated key, changes its format and removes it', () => {
    setup();
    open(/Örnek kayıt A/);
    fireEvent.click(screen.getByRole('button', { name: 'Özel dosya ekle' }));
    const keys = screen.getAllByText(/Dosya kimliği: /);
    expect(keys).toHaveLength(2);
    expect(keys[1].textContent).toMatch(/Dosya kimliği: asset-[0-9a-f]{6}\./);
    expect(screen.getByText(/2 özel dosya \(genel sitede görünmez\)/)).toBeTruthy();
    const format = screen.getAllByLabelText('Biçim')[1] as HTMLSelectElement;
    expect(Array.from(format.options).map((o) => o.textContent)).toEqual([
      'SolidWorks parça',
      'SolidWorks montaj',
      'Siemens NX',
      'STEP',
      'IGES',
      'Diğer',
    ]);
    fireEvent.change(format, { target: { value: 'step' } });
    expect((screen.getAllByLabelText('Biçim')[1] as HTMLSelectElement).value).toBe('step');
    fireEvent.click(screen.getAllByRole('button', { name: 'Kaldır' })[1]);
    expect(screen.getAllByText(/Dosya kimliği: /)).toHaveLength(1);
  });
});

describe('3B ve CAD page', () => {
  it('answers not-found outside development', () => {
    expect(() => render(<CadScreenPage />)).toThrow('NEXT_NOT_FOUND');
  });

  it('renders in development with the measured demo model in the library', () => {
    vi.stubEnv('NODE_ENV', 'development');
    sessionStorage.setItem('antet-admin', JSON.stringify({ schema: 1, projects: fixtureProjects, seeded: true }));
    render(
      <AdminProvider>
        <CadScreenPage />
      </AdminProvider>,
    );
    open(/Örnek kayıt A/);
    expect(Array.from(modelSelect().options).map((o) => o.value)).toEqual([
      '',
      'dev-flange',
      'size-3-2',
      'size-8-4',
      'size-18',
    ]);
    fireEvent.change(modelSelect(), { target: { value: 'dev-flange' } });
    const panel = document.getElementById('bolum-onizleme')!.textContent ?? '';
    expect(panel).toMatch(/\d bayt/);
    expect(panel).not.toContain('48.000');
  });
});
