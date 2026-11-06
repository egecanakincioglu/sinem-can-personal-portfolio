import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { PublishDialog } from './PublishDialog';
import { AdminProvider, useAdmin } from './store';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

function Harness({ edits }: { edits: Record<string, string> }) {
  const { state, setValue } = useAdmin();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => Object.entries(edits).forEach(([id, v]) => setValue(id, v))}>
        Düzenle
      </button>
      <button type="button" onClick={() => setOpen(true)}>
        Aç
      </button>
      <p data-testid="rev">{state.published ? `yayında ${state.published.rev}` : 'yayın yok'}</p>
      <PublishDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const setup = (edits: Record<string, string>) => {
  render(
    <AdminProvider>
      <Harness edits={edits} />
    </AdminProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Düzenle' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aç' }));
};
const confirm = () => screen.getByRole('button', { name: 'Yayını simüle et' }) as HTMLButtonElement;

describe('PublishDialog', () => {
  it('says it is a simulation and that the real site is untouched', () => {
    setup({ 'hero.isolation.tr': 'Yeni etiket' });
    const dialog = screen.getByRole('dialog', { name: 'Yayınla (simülasyon)' });
    expect(within(dialog).getByRole('heading', { name: 'Yayınla (simülasyon)' })).toBeTruthy();
    expect(within(dialog).getByText(/Rev\. A → Rev\. B olarak simüle edilecek/)).toBeTruthy();
    expect(within(dialog).getByText(/Gerçek site bu işlemden etkilenmez/)).toBeTruthy();
    expect(within(dialog).getByText('Değişiklikler (1)')).toBeTruthy();
    expect(within(dialog).getByText('Yeni etiket')).toBeTruthy();
  });

  it('publishes straight away when nothing needs attention', () => {
    setup({ 'hero.isolation.tr': 'Yeni etiket' });
    expect(confirm().disabled).toBe(false);
    fireEvent.click(confirm());
    expect(screen.getByTestId('rev').textContent).toBe('yayında 1');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('disables the confirm on a blocking error and moves focus to the summary', () => {
    setup({ 'hero.isolation.tr': 'x'.repeat(40) });
    const summary = screen.getByRole('alert');
    expect(summary.textContent).toContain('Yayını engelleyen hatalar (1)');
    expect(document.activeElement).toBe(summary);
    expect(confirm().disabled).toBe(true);
    fireEvent.click(confirm());
    expect(screen.getByTestId('rev').textContent).toBe('yayın yok');
  });

  it('needs one acknowledgement per warning group before it can confirm', () => {
    setup({ 'hero.lead.tr': 'Tutkulu bir öğrenci' });
    const draft = screen.getByRole('checkbox', { name: /Onaysız taslak metin: 1 uyarı/ }) as HTMLInputElement;
    const honesty = screen.getByRole('checkbox', { name: /Dürüstlük denetimi: 1 uyarı/ }) as HTMLInputElement;
    expect(draft.checked).toBe(false);
    expect(confirm().disabled).toBe(true);
    fireEvent.click(draft);
    expect(confirm().disabled).toBe(true);
    fireEvent.click(honesty);
    expect(confirm().disabled).toBe(false);
    fireEvent.click(confirm());
    expect(screen.getByTestId('rev').textContent).toBe('yayında 1');
  });

  it('does not keep an acknowledgement for the next publish', () => {
    setup({ 'hero.lead.tr': 'Yeni bir cümle' });
    fireEvent.click(screen.getByRole('checkbox', { name: /Onaysız taslak metin/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aç' }));
    expect((screen.getByRole('checkbox', { name: /Onaysız taslak metin/ }) as HTMLInputElement).checked).toBe(false);
    expect(confirm().disabled).toBe(true);
  });

  it('lists the first eight changes and points to the Yayın screen for the rest', () => {
    const ids = ['isolation', 'whatIs', 'note', 'program', 'university', 'graduation', 'internship', 'direction'];
    const edits = Object.fromEntries(ids.map((k) => [`hero.${k}.tr`, `Metin ${k}`]));
    edits['kuvvetler.heading.tr'] = 'Başlık';
    setup(edits);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByRole('listitem').length).toBeGreaterThanOrEqual(8);
    const link = within(dialog).getByRole('link', { name: 'Tümü Yayın ekranında' });
    expect(link.getAttribute('href')).toBe('/admin/yayin');
  });
});
