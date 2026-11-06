import { cleanup, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { screenBySlug } from '../screens';
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
