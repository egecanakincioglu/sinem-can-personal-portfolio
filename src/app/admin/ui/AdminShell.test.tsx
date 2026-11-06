import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureProjects } from '@/content/fixtures/projects';
import { AdminShell } from './AdminShell';

let path = '/admin/ana-sayfa';
vi.mock('next/navigation', () => ({
  usePathname: () => path,
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

/** `narrow` answers the "below 1024" and, with `phone`, the "below 768" queries. */
function media(narrow: boolean, phone = false) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('1023') ? narrow : query.includes('767') ? phone : false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

const realMatchMedia = window.matchMedia;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
  sessionStorage.clear();
  window.matchMedia = realMatchMedia;
  vi.useRealTimers();
  path = '/admin/ana-sayfa';
});

const setup = () =>
  render(
    <AdminShell samples={fixtureProjects}>
      <input data-field="x" aria-label="Alan" />
    </AdminShell>,
  );
const toolbar = () => within(screen.getByRole('toolbar', { name: 'Çalışma araçları' }));

describe('toolbar', () => {
  it('offers Kaydet, Vazgeç, Önizle and Yayınla on an editing screen', () => {
    setup();
    expect(toolbar().getByRole('button', { name: 'Kaydet (sim.)' })).toBeTruthy();
    expect(toolbar().getByRole('button', { name: /^Vazgeç/ })).toBeTruthy();
    expect(toolbar().getByRole('button', { name: 'Önizle' })).toBeTruthy();
    expect(toolbar().getByRole('button', { name: 'Yayınla (sim.)' })).toBeTruthy();
    expect(toolbar().getByRole('status').textContent).toBe('Değişiklik yok');
  });

  it.each(['/admin', '/admin/kapsam', '/admin/yayin'])('shows no Kaydet or Vazgeç on the read-only screen %s', (p) => {
    path = p;
    setup();
    expect(toolbar().queryByRole('button', { name: /Kaydet/ })).toBeNull();
    expect(toolbar().queryByRole('button', { name: /Vazgeç/ })).toBeNull();
    expect(toolbar().queryByRole('status')).toBeNull();
    expect(toolbar().getByRole('button', { name: 'Yayınla (sim.)' })).toBeTruthy();
  });

  it('does not call loaded or removed samples an unsaved change', () => {
    path = '/admin/projeler';
    setup();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.click(screen.getByRole('option', { name: 'Örnek verileri yükle' }));
    act(() => {
      vi.runAllTimers();
    });
    expect(toolbar().getByRole('status').textContent).toBe('Değişiklik yok');
  });

  it('saves with Ctrl+S on an editing screen', () => {
    setup();
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(toolbar().getByRole('status').textContent).toBe('Kaydedildi (sim.)');
  });
});

describe('preview overlay', () => {
  it('is a labelled modal dialog on a narrow screen: focus moves in, Tab wraps, Esc closes and focus returns', () => {
    media(true, true);
    setup();
    const opener = toolbar().getByRole('button', { name: 'Önizle' });
    opener.focus();
    expect(screen.queryByRole('dialog', { name: 'Canlı önizleme' })).toBeNull();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Canlı önizleme' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const close = within(dialog).getByRole('button', { name: 'Düzenlemeye dön' });
    expect(document.activeElement).toBe(close);

    // Shift+Tab from the first control wraps to the last one inside the dialog.
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(close);

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Canlı önizleme' })).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('closes with its own button and returns focus to the opener', () => {
    media(true, true);
    setup();
    const opener = toolbar().getByRole('button', { name: 'Önizle' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole('button', { name: 'Düzenlemeye dön' }));
    expect(screen.queryByRole('dialog', { name: 'Canlı önizleme' })).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('is a plain complementary region, not a dialog, on a wide screen', () => {
    media(false);
    setup();
    expect(screen.queryByRole('dialog', { name: 'Canlı önizleme' })).toBeNull();
    expect(screen.getByRole('complementary', { name: 'Canlı önizleme' })).toBeTruthy();
  });

  it('starts at the 390 phone frame on a phone and at Tablet 768 on a tablet', () => {
    media(true, true);
    window.innerWidth = 390;
    setup();
    fireEvent.click(toolbar().getByRole('button', { name: 'Önizle' }));
    expect(screen.getByTitle(/390 piksel/)).toBeTruthy();
    cleanup();
    sessionStorage.clear();

    media(true, false);
    window.innerWidth = 820;
    setup();
    fireEvent.click(toolbar().getByRole('button', { name: 'Önizle' }));
    expect(screen.getByTitle(/768 piksel/)).toBeTruthy();
  });

  it('leaves Escape to a dialog opened above it', () => {
    media(true, true);
    setup();
    fireEvent.click(toolbar().getByRole('button', { name: 'Önizle' }));
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const palette = screen.getByRole('dialog', { name: 'Komut paleti' });
    fireEvent.keyDown(within(palette).getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Komut paleti' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Canlı önizleme' })).toBeTruthy();
  });
});
