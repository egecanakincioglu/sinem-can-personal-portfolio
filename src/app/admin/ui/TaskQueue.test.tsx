import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminHeader } from './AdminHeader';
import { TaskQueue } from './TaskQueue';
import { AdminProvider } from './store';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin' }));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <AdminProvider>
      <AdminHeader onTasks={() => setOpen(true)} onPalette={() => undefined} />
      <TaskQueue open={open} onClose={() => setOpen(false)} />
    </AdminProvider>
  );
}

const seed = (values: Record<string, string>) =>
  sessionStorage.setItem('antet-admin', JSON.stringify({ schema: 1, values }));
const openQueue = () => fireEvent.click(screen.getByRole('button', { name: /görev$/ }));

describe('TaskQueue', () => {
  it('says there is nothing to do when there are no issues', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: '0 görev' })).toBeTruthy();
    openQueue();
    expect(within(screen.getByRole('dialog', { name: 'Görev kuyruğu' })).getByText('Bekleyen görev yok.')).toBeTruthy();
  });

  it('lists as many rows as the title block counts, in the fixed group order', () => {
    seed({ 'hero.lead.tr': 'Yeni cümle', 'ayarlar.contact.email': 'geçersiz' });
    render(<Harness />);
    const count = Number(screen.getByRole('button', { name: /görev$/ }).textContent!.match(/\d+/)![0]);
    expect(count).toBeGreaterThan(1);
    openQueue();
    const dialog = screen.getByRole('dialog', { name: 'Görev kuyruğu' });
    expect(within(dialog).getByRole('status').textContent).toBe(`${count} görev`);
    expect(within(dialog).getAllByRole('link')).toHaveLength(count);
    const headings = within(dialog)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent!.split(' · ')[0]);
    expect(headings).toEqual(['Onay bekleyen metinler', 'Hatalar']);
  });

  it('links a row to its screen with the field to focus', () => {
    seed({ 'hero.lead.tr': 'Yeni cümle' });
    render(<Harness />);
    openQueue();
    const link = within(screen.getByRole('dialog', { name: 'Görev kuyruğu' })).getByRole('link', {
      name: /Hero cümlesi/,
    });
    expect(link.getAttribute('href')).toBe('/admin/ana-sayfa?alan=hero.lead.tr');
    expect(link.textContent).toContain('Ana sayfa › Hero');
  });

  it('closes when a row is followed', () => {
    seed({ 'hero.lead.tr': 'Yeni cümle' });
    render(<Harness />);
    openQueue();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Görev kuyruğu' })).getAllByRole('link')[0]);
    expect(screen.queryByRole('dialog', { name: 'Görev kuyruğu' })).toBeNull();
  });
});
