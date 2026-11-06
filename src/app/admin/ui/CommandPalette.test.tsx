import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureNotes } from '@/content/fixtures/notes';
import { fixtureProjects } from '@/content/fixtures/projects';
import { AdminShell } from './AdminShell';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  push.mockClear();
  vi.useRealTimers();
});

const setup = (samples = fixtureProjects) =>
  render(
    <AdminShell samples={samples} noteSamples={fixtureNotes}>
      {null}
    </AdminShell>,
  );
const open = () => {
  const opener = screen.getByRole('button', { name: /komut paletini aç/ });
  opener.focus();
  fireEvent.keyDown(opener, { key: 'k', ctrlKey: true });
  return opener;
};
const dialog = () => screen.getByRole('dialog', { name: 'Komut paleti' });
const type = (text: string) => fireEvent.change(within(dialog()).getByRole('combobox'), { target: { value: text } });
const options = () => within(dialog()).queryAllByRole('option');

describe('CommandPalette', () => {
  it('opens with Ctrl+K and closes with Escape, returning focus to the opener', () => {
    setup();
    expect(screen.queryByRole('dialog', { name: 'Komut paleti' })).toBeNull();
    const opener = open();
    expect(document.activeElement).toBe(within(dialog()).getByRole('combobox'));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Komut paleti' })).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('opens with the Meta key too', () => {
    setup();
    fireEvent.keyDown(window, { key: 'K', metaKey: true });
    expect(dialog()).toBeTruthy();
  });

  it('finds a field from folded text and Enter jumps to it', () => {
    setup();
    open();
    type('hero cumlesi');
    expect(options()[0].textContent).toContain('Alan: Hero cümlesi');
    expect(within(dialog()).getByRole('status').textContent).toMatch(/^\d+ sonuç$/);
    fireEvent.keyDown(within(dialog()).getByRole('combobox'), { key: 'Enter' });
    act(() => {
      vi.runAllTimers();
    });
    expect(push).toHaveBeenCalledWith('/admin/ana-sayfa?alan=hero.lead');
  });

  it('groups results as actions, screens, fields and records', () => {
    setup();
    open();
    fireEvent.click(within(dialog()).getByRole('option', { name: 'Örnek verileri yükle' }));
    act(() => {
      vi.runAllTimers();
    });
    open();
    type(fixtureProjects[0].title.tr);
    const groups = within(dialog())
      .getAllByRole('group')
      .map((g) => g.getAttribute('aria-label'));
    expect(groups).toContain('Kayıtlar');
    fireEvent.click(options()[0]);
    act(() => {
      vi.runAllTimers();
    });
    expect(push).toHaveBeenCalledWith(`/admin/projeler/${encodeURIComponent(fixtureProjects[0].id)}`);
  });

  it('finds a loaded note by its title and opens its editor', () => {
    setup();
    open();
    fireEvent.click(within(dialog()).getByRole('option', { name: 'Örnek verileri yükle' }));
    act(() => {
      vi.runAllTimers();
    });
    open();
    const title = fixtureNotes[0].tr!.title;
    type(title);
    expect(options()[0].textContent).toBe(`Not: ${title}`);
    fireEvent.click(options()[0]);
    act(() => {
      vi.runAllTimers();
    });
    expect(push).toHaveBeenCalledWith(`/admin/notlar/${encodeURIComponent(fixtureNotes[0].id)}`);
  });

  it('offers loading samples only until they are loaded, then removing them', () => {
    setup();
    open();
    type('ornek verileri');
    expect(options().map((o) => o.textContent)).toEqual(['Örnek verileri yükle']);
    fireEvent.click(options()[0]);
    act(() => {
      vi.runAllTimers();
    });
    open();
    type('ornek verileri');
    expect(options().map((o) => o.textContent)).toEqual(['Örnek verileri kaldır']);
  });

  it('offers the preview source actions', () => {
    setup();
    open();
    type('onizleme');
    const labels = options().map((o) => o.textContent);
    expect(labels).toContain('Önizleme: Taslak');
    expect(labels).toContain('Önizleme: Yayınlanan (sim.)');
  });

  it('lists the two creation shortcuts first on an empty query, and they open the lists', () => {
    setup();
    open();
    const labels = options().map((o) => o.textContent);
    expect(labels.slice(0, 2)).toEqual(['Yeni proje', 'Yeni not']);
    fireEvent.click(options()[1]);
    act(() => {
      vi.runAllTimers();
    });
    expect(push).toHaveBeenCalledWith('/admin/notlar');
  });

  it('has a visible close button that closes it and returns focus', () => {
    setup();
    const opener = open();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Kapat' }));
    expect(screen.queryByRole('dialog', { name: 'Komut paleti' })).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('announces the result count in a polite live region', () => {
    setup();
    open();
    type('hero');
    const count = within(dialog()).getByRole('status');
    expect(count.getAttribute('aria-live')).toBe('polite');
    expect(count.textContent).toBe(`${options().length} sonuç`);
  });

  it('keeps at most the last five commands, without repeating the creation shortcuts', () => {
    setup();
    for (const q of [
      'kaydet',
      'dil: tr',
      'onizleme: masaustu',
      'onizleme: taslak',
      'onizleme: mobil',
      'onizleme: tablet',
    ]) {
      open();
      type(q);
      fireEvent.keyDown(within(dialog()).getByRole('combobox'), { key: 'Enter' });
      act(() => {
        vi.runAllTimers();
      });
    }
    open();
    const labels = options().map((o) => o.textContent);
    expect(labels).toHaveLength(2 + 5);
    expect(labels.filter((l) => l === 'Yeni proje')).toHaveLength(1);
    expect(labels).not.toContain('Kaydet (sim.)');
  });

  it('shows the recent commands on an empty query', () => {
    setup();
    open();
    expect(within(dialog()).queryByText('Son kullanılanlar')).toBeNull();
    type('kaydet');
    fireEvent.keyDown(within(dialog()).getByRole('combobox'), { key: 'Enter' });
    act(() => {
      vi.runAllTimers();
    });
    open();
    expect(within(dialog()).getByText('Son kullanılanlar')).toBeTruthy();
    expect(options().map((o) => o.textContent)).toEqual(['Yeni proje', 'Yeni not', 'Kaydet (sim.)']);
  });
});
