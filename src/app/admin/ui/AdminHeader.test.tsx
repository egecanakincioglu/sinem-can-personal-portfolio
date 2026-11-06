import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminHeader } from './AdminHeader';
import { SimBanner } from './feedback';
import { AdminProvider } from './store';

const path = vi.hoisted(() => ({ current: '/admin' }));
vi.mock('next/navigation', () => ({ usePathname: () => path.current }));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

const seed = (state: object) => sessionStorage.setItem('antet-admin', JSON.stringify({ schema: 1, ...state }));
const sheetCell = () => screen.getByText('Pafta').parentElement!.textContent;

const renderAt = (at: string) => {
  path.current = at;
  render(
    <AdminProvider>
      <AdminHeader onTasks={() => undefined} onPalette={() => undefined} />
    </AdminProvider>,
  );
};

describe('AdminHeader breadcrumb', () => {
  it('shows the Turkish title of a project, not its id', () => {
    seed({ projects: [{ id: 'p-1', title: { tr: 'Kiriş bükülmesi', en: 'Beam bending' } }] });
    renderAt('/admin/projeler/p-1');
    expect(sheetCell()).toContain('Projeler › Kiriş bükülmesi');
    expect(sheetCell()).not.toContain('p-1');
  });

  it('shows the Turkish title of a note', () => {
    seed({ notes: [{ id: 'n-1', title: { tr: 'Gerilme notu', en: 'Stress note' } }] });
    renderAt('/admin/notlar/n-1');
    expect(sheetCell()).toContain('Notlar › Gerilme notu');
  });

  it('falls back to a neutral name for an untitled or unknown record', () => {
    seed({ projects: [{ id: 'p-2', title: { tr: '  ', en: '' } }] });
    renderAt('/admin/projeler/p-2');
    expect(sheetCell()).toContain('Projeler › Başlıksız kayıt');
    cleanup();
    renderAt('/admin/projeler/yok');
    expect(sheetCell()).toContain('Projeler › Başlıksız kayıt');
  });

  it('shows only the screen name on a list page', () => {
    renderAt('/admin/projeler');
    expect(sheetCell()).toBe('PaftaProjeler');
  });
});

describe('SimBanner', () => {
  it('is a named landmark', () => {
    render(<SimBanner />);
    expect(screen.getByRole('region', { name: 'Prototip bildirimi' }).textContent).toContain('Prototip');
  });
});
