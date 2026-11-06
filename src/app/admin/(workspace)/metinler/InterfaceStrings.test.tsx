import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSiteContent, mergeSiteContent } from '@/content/site-content';
import { buildOverride, checkCopy, interfaceStrings } from '@/lib/preview-bridge';
import { AdminProvider, useAdmin } from '../../ui/store';
import { InterfaceStrings } from './InterfaceStrings';
import InterfaceStringsScreen from './page.dev';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/admin/metinler',
}));

// Counts how many times a row is checked, which is once per render of that row.
vi.mock('@/lib/preview-bridge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/preview-bridge')>();
  return { ...original, checkCopy: vi.fn(original.checkCopy) };
});

// The screen lists every dictionary string, so each render is large.
vi.setConfig({ testTimeout: 20000 });

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllEnvs();
});

const dict = getSiteContent().dict;
const rows = interfaceStrings();

function Probe() {
  const { state, setValue, derived } = useAdmin();
  return (
    <>
      <output data-testid="values">{JSON.stringify(state.values)}</output>
      <output data-testid="dict">{JSON.stringify(derived.dict)}</output>
      <button type="button" onClick={() => setValue('profil.expected.en', 'Graduation')}>
        edit-expected
      </button>
      <button type="button" onClick={() => setValue('hero.briefly.en', 'Quick facts')}>
        edit-briefly
      </button>
    </>
  );
}

function setup() {
  return render(
    <AdminProvider>
      <InterfaceStrings />
      <Probe />
    </AdminProvider>,
  );
}
const group = (name: string) => screen.getByRole('region', { name });
const values = () => JSON.parse(screen.getByTestId('values').textContent ?? '{}') as Record<string, string>;
// Labels and roles are slow to query across ~300 rows, so fields are found by name.
const maybeField = (path: string, l: 'tr' | 'en') =>
  document.querySelector<HTMLInputElement>(`[name="metinler.${path}.${l}"]`);
const field = (path: string, l: 'tr' | 'en') => maybeField(path, l)!;
const counts = () => document.querySelector('.a-ph-aside')?.textContent;
const search = (q: string) => fireEvent.change(screen.getByLabelText('Metin ara'), { target: { value: q } });

describe('InterfaceStrings', () => {
  it('shows the counts and one section per group', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Arayüz metinleri' })).toBeTruthy();
    expect(counts()).toBe(`${rows.length} metin · EN eksik: 0`);
    for (const name of ['Hero', 'Kuvvetler', 'Projeler', 'Gezinme']) expect(group(name)).toBeTruthy();
  });

  it('searches the Turkish text, the English text and the key path', () => {
    setup();
    search('bileşke');
    expect(screen.getByText('hero.resultantLabel')).toBeTruthy();
    expect(screen.queryByText('forces.angle')).toBeNull();
    search('RESULTANT');
    expect(screen.getByText('hero.resultantLabel')).toBeTruthy();
    search('viewer.zoomin');
    expect(screen.getByText('projects.viewer.zoomIn')).toBeTruthy();
    search('zzzz-yok');
    expect(screen.getByText('Eşleşen metin yok')).toBeTruthy();
  });

  it('Eksik lists only the texts with an empty side', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Eksik' }));
    expect(screen.getByText('Eşleşen metin yok')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Tümü' }));
    fireEvent.change(field('hero.resultantLabel', 'en'), { target: { value: '' } });
    expect(counts()).toBe(`${rows.length} metin · EN eksik: 1`);
    fireEvent.click(screen.getByRole('radio', { name: 'Eksik' }));
    expect(field('hero.resultantLabel', 'en')).toBeTruthy();
    expect(maybeField('forces.angle', 'en')).toBeNull();
  });

  it('re-renders only the edited row when one text changes', () => {
    setup();
    const check = vi.mocked(checkCopy);
    const mounted = check.mock.calls.length;
    expect(mounted).toBeGreaterThan(100);
    check.mockClear();
    fireEvent.change(field('hero.resultantLabel', 'en'), { target: { value: 'Net' } });
    expect(field('hero.resultantLabel', 'en').value).toBe('Net');
    // One row is checked for both languages; the other rows keep their render.
    expect(check.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('shows locked rows read-only with their reason', () => {
    setup();
    const row = screen.getByText('forces.caption').closest('.a-field') as HTMLElement;
    expect(within(row).getByText(/korumalı/)).toBeTruthy();
    expect(within(row).getByText(/kavramsal olduğunu belirten dürüstlük metni/)).toBeTruthy();
    expect(row.querySelector('input, textarea')).toBeNull();
    expect(maybeField('forces.caption', 'tr')).toBeNull();
    expect(screen.getByText('workshop.applied')).toBeTruthy();
    expect(maybeField('workshop.applied', 'en')).toBeNull();
  });

  it('shows a derived text as a read-only readout from the records', () => {
    setup();
    const row = screen.getByText('hero.programValue').closest('.a-field') as HTMLElement;
    expect(within(row).getByText(/Kayıttan gelir/)).toBeTruthy();
    expect(within(row).getByText(dict.hero.programValue.en)).toBeTruthy();
    expect(maybeField('hero.programValue', 'en')).toBeNull();
  });

  it('links a text that another screen edits instead of editing it twice', () => {
    setup();
    const row = screen.getByText('hero.isolation').closest('.a-field') as HTMLElement;
    expect(
      within(row)
        .getByRole('link', { name: /Ana sayfa ekranından/ })
        .getAttribute('href'),
    ).toBe('/admin/ana-sayfa');
    expect(maybeField('hero.isolation', 'en')).toBeNull();
    const meta = screen.getByText('projects.metaTitle').closest('.a-field') as HTMLElement;
    expect(within(meta).getByRole('link').getAttribute('href')).toBe('/admin/ayarlar');
  });

  it('shows every place of a shared string as a link to the screen that edits it', () => {
    setup();
    for (const path of ['work.emptyProjects', 'projects.emptyTitle']) {
      const row = screen.getByText(path).closest('.a-field') as HTMLElement;
      expect(
        within(row)
          .getByRole('link', { name: /Ana sayfa ekranından/ })
          .getAttribute('href'),
      ).toBe('/admin/ana-sayfa');
      expect(within(row).getByText(/aynı metin 2 yerde/)).toBeTruthy();
      expect(maybeField(path, 'en')).toBeNull();
    }
    const intro = screen.getByText('sections.intro').closest('.a-field') as HTMLElement;
    expect(within(intro).getByText(/aynı metin 7 yerde/)).toBeTruthy();
  });

  it('flags a text that loses a required token', () => {
    setup();
    fireEvent.change(field('notes.minRead', 'en'), { target: { value: 'min read' } });
    expect(screen.getByText(/\{n\} belirteci gerekli/)).toBeTruthy();
    const merged = mergeSiteContent(buildOverride(values())).dict;
    expect(merged.notes.minRead.en).toBe(dict.notes.minRead.en);
  });

  it('notes which groups have no preview', () => {
    setup();
    expect(within(group('Projeler')).getByText(/Önizleme yok/)).toBeTruthy();
    expect(within(group('Profil')).getByText(/Profil ekranının önizlemesinde/)).toBeTruthy();
    expect(within(group('Hero')).queryByText(/Önizleme yok/)).toBeNull();
  });
});

describe('shared editor fields', () => {
  const dictNow = () => JSON.parse(screen.getByTestId('dict').textContent ?? '{}') as typeof dict;

  it('editing profil.expected changes the hero.graduation value and both places', () => {
    setup();
    fireEvent.click(screen.getByText('edit-expected'));
    expect(values()['hero.graduation.en']).toBe('Graduation');
    expect(values()['profil.expected.en']).toBe('Graduation');
    expect(dictNow().hero.graduation.en).toBe('Graduation');
    expect(dictNow().profile.expected.en).toBe('Graduation');
  });

  it('editing hero.briefly changes the other editors and all three places', () => {
    setup();
    fireEvent.click(screen.getByText('edit-briefly'));
    for (const id of ['hero.briefly', 'kisaca.heading', 'ustbilgi.sec.profile'])
      expect(values()[`${id}.en`]).toBe('Quick facts');
    const d = dictNow();
    expect([d.hero.briefly.en, d.intro.heading.en, d.sections.profile.en]).toEqual([
      'Quick facts',
      'Quick facts',
      'Quick facts',
    ]);
    expect(d.hero.briefly.tr).toBe(dict.hero.briefly.tr);
  });
});

describe('Interface strings page', () => {
  it('is not available outside development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => InterfaceStringsScreen()).toThrow('NEXT_NOT_FOUND');
  });
});
