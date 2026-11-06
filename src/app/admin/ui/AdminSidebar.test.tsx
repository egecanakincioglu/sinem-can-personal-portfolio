import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { screenBySlug, screens, sheetLabel, sheetNumber } from '../screens';
import { AdminSidebar } from './AdminSidebar';
import { AdminProvider } from './store';

const path = vi.hoisted(() => ({ current: '/admin/projeler' }));
vi.mock('next/navigation', () => ({ usePathname: () => path.current }));

beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

const indexHrefs = (at: string) => {
  path.current = at;
  render(
    <AdminProvider>
      <AdminSidebar />
    </AdminProvider>,
  );
  const nav = screen.getByRole('navigation', { name: 'Bölüm dizini' });
  return within(nav)
    .getAllByRole('link')
    .map((a) => a.getAttribute('href'));
};

describe('AdminSidebar section index', () => {
  it('lists the list page sections on a list page', () => {
    expect(indexHrefs('/admin/projeler')).toEqual(['#bolum-kayitlar']);
  });

  it('lists the editor sections on a record page', () => {
    const hrefs = indexHrefs('/admin/projeler/fixture-a');
    expect(hrefs).toContain('#bolum-kimlik');
    expect(hrefs).not.toContain('#bolum-kayitlar');
  });

  it('keeps the screen sections on screens without a separate list', () => {
    expect(indexHrefs('/admin/ayarlar')).toContain('#bolum-kimlik');
  });
});

const renderAt = (at: string) => {
  path.current = at;
  return render(
    <AdminProvider>
      <AdminSidebar />
    </AdminProvider>,
  );
};

describe('AdminSidebar numbers and rail', () => {
  it('numbers every screen link with its sheet number and short label', () => {
    renderAt('/admin/ayarlar');
    const nav = screen.getByRole('navigation', { name: 'Ekranlar' });
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(screens.length);
    links.forEach((a, i) => {
      expect(a.querySelector('.a-nav-n')?.textContent).toBe(String(sheetNumber(screens[i].slug)).padStart(2, '0'));
      expect(a.querySelector('.a-nav-s')?.textContent).toBe(screens[i].short);
    });
    expect(sheetLabel('notlar')).toBe('Pafta 05');
  });

  it('shows no placeholder sentence on a screen without sections', () => {
    renderAt('/admin/kapsam');
    expect(screen.queryByRole('navigation', { name: 'Bölüm dizini' })).toBeNull();
    expect(screen.queryByText(/sonraki aşamada/)).toBeNull();
  });
});

describe('AdminSidebar section glyphs', () => {
  it('marks a section with an error with the dashed exclamation mark and the count', () => {
    sessionStorage.setItem(
      'antet-admin',
      JSON.stringify({ schema: 1, values: { 'ayarlar.contact.email': 'geçersiz' } }),
    );
    renderAt('/admin/ayarlar');
    const link = screen.getByRole('link', { name: /İletişim ve platformlar/ });
    expect(link.querySelector('.a-sg-error')?.textContent).toContain('!');
    expect(link.textContent).toContain('hata var');
    expect(link.textContent).toMatch(/1\s*görev/);
  });

  it('keeps the plain status glyph on a section without errors', () => {
    renderAt('/admin/ayarlar');
    const link = screen.getByRole('link', { name: /İletişim ve platformlar/ });
    expect(link.querySelector('.a-sg-error')).toBeNull();
    expect(link.textContent).toContain('tamam');
  });
});

describe('AdminSidebar roving tabindex', () => {
  const stops = (nav: HTMLElement) =>
    within(nav)
      .getAllByRole('link')
      .filter((a) => a.tabIndex === 0);

  it('has one tab stop per list, at the current screen and the first section', () => {
    renderAt('/admin/ayarlar');
    const screensNav = screen.getByRole('navigation', { name: 'Ekranlar' });
    const indexNav = screen.getByRole('navigation', { name: 'Bölüm dizini' });
    expect(stops(screensNav).map((a) => a.getAttribute('href'))).toEqual(['/admin/ayarlar']);
    expect(stops(indexNav).map((a) => a.getAttribute('href'))).toEqual(['#bolum-kimlik']);
  });

  it('moves the tab stop with the arrow keys, Home and End', () => {
    renderAt('/admin/ayarlar');
    const indexNav = screen.getByRole('navigation', { name: 'Bölüm dizini' });
    const links = within(indexNav).getAllByRole('link');
    const last = links[links.length - 1];
    links[0].focus();
    fireEvent.keyDown(links[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(links[1]);
    expect(stops(indexNav)).toEqual([links[1]]);
    fireEvent.keyDown(links[1], { key: 'End' });
    expect(document.activeElement).toBe(last);
    expect(stops(indexNav)).toEqual([last]);
    fireEvent.keyDown(last, { key: 'Home' });
    expect(stops(indexNav)).toEqual([links[0]]);
  });
});

describe('declared section ids exist on the pages', () => {
  const sectionIds = (file: string) => {
    const text = readFileSync(join(__dirname, '..', '(workspace)', file), 'utf8');
    return [...text.matchAll(/<Section\s+id="([^"]+)"/g)].map((m) => m[1]);
  };

  it.each([
    ['projeler', 'projeler/ProjectList.tsx', 'projeler/[id]/ProjectEditor.tsx'],
    ['notlar', 'notlar/NoteList.tsx', 'notlar/NoteEditor.tsx'],
  ])('%s: list and editor anchors are rendered', (slug, listFile, editorFile) => {
    const def = screenBySlug(slug)!;
    expect(sectionIds(listFile)).toEqual(expect.arrayContaining(def.listSections!.map((s) => s.id)));
    expect(sectionIds(editorFile)).toEqual(expect.arrayContaining(def.sections.map((s) => s.id)));
  });
});
