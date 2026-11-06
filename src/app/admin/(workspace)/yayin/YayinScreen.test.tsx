import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminProvider, useAdmin } from '../../ui/store';
import PublishScreen from './page.dev';
import { YayinScreen } from './YayinScreen';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllEnvs();
});

function Drive() {
  const { setValue, publish, state } = useAdmin();
  return (
    <>
      <button type="button" onClick={() => setValue('hero.isolation.tr', 'Birinci')}>
        Birinci
      </button>
      <button type="button" onClick={() => setValue('hero.isolation.tr', 'İkinci')}>
        İkinci
      </button>
      <button type="button" onClick={() => setValue('hero.isolation.tr', 'x'.repeat(40))}>
        Uzun
      </button>
      <button type="button" onClick={() => setValue('hero.lead.tr', 'Yeni cümle')}>
        Taslak
      </button>
      <button type="button" onClick={publish}>
        Yayınla
      </button>
      <p data-testid="working">{state.values['hero.isolation.tr'] ?? '—'}</p>
      <p data-testid="saves">{state.saveCount}</p>
    </>
  );
}

const setup = () =>
  render(
    <AdminProvider>
      <Drive />
      <YayinScreen />
    </AdminProvider>,
  );
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const section = (name: string) => within(screen.getByRole('region', { name }));

describe('Yayın screen', () => {
  it('answers not-found outside development', () => {
    expect(() => render(<PublishScreen />)).toThrow('NEXT_NOT_FOUND');
  });

  it('starts empty, with the simulation notice and the numbered kicker', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Yayın' })).toBeTruthy();
    expect(screen.getByText('Pafta 10')).toBeTruthy();
    expect(screen.getByText('Gerçek site bu işlemden etkilenmez.')).toBeTruthy();
    expect(section('Bekleyen değişiklikler').getByText('Değişiklik yok.')).toBeTruthy();
    expect(section('Denetimler').getByText('Denetim sorunu yok.')).toBeTruthy();
    expect(section('Revizyonlar').getByText('Henüz revizyon yok.')).toBeTruthy();
  });

  it('lists pending changes with the registry label and the TR before and after', () => {
    setup();
    press('Birinci');
    const pending = section('Bekleyen değişiklikler');
    expect(pending.getByText('Birinci')).toBeTruthy();
    expect(pending.getByText('TR')).toBeTruthy();
    expect(pending.queryByText('EN')).toBeNull();
  });

  it('shows blocking errors and acknowledgement groups under Denetimler', () => {
    setup();
    press('Uzun');
    press('Taslak');
    const checks = section('Denetimler');
    expect(checks.getByText('Yayını engelleyen hatalar (1)')).toBeTruthy();
    expect(checks.getByText('Onaysız taslak metin (1)')).toBeTruthy();
  });

  it('adds a revision on publish, empties the pending list and shows its diff on request', () => {
    setup();
    press('Birinci');
    press('Yayınla');
    const row = section('Revizyonlar').getByText(/Rev\. B — .*\(sim\.\): 1 alan değişti/);
    expect(row).toBeTruthy();
    expect(section('Bekleyen değişiklikler').getByText('Değişiklik yok.')).toBeTruthy();
    expect(section('Bekleyen değişiklikler').getByText(/Rev\. B — .*\(sim\.\)/)).toBeTruthy();
    press('Farkı göster');
    expect(screen.getByRole('list', { name: 'Rev. B farkı' })).toBeTruthy();
    press('Farkı göster');
    expect(screen.queryByRole('list', { name: 'Rev. B farkı' })).toBeNull();
  });

  it('restores a revision only after confirmation, as a save, and the pending diff matches', () => {
    setup();
    press('Birinci');
    press('Yayınla');
    press('İkinci');
    press('Yayınla');
    expect(screen.getByTestId('working').textContent).toBe('İkinci');
    const saves = Number(screen.getByTestId('saves').textContent);

    const rows = within(screen.getByRole('list', { name: 'Revizyonlar' })).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    fireEvent.click(within(rows[1]).getByRole('button', { name: 'Bu revizyona dön (simülasyon)' }));
    const dialog = screen.getByRole('dialog', { name: 'Bu revizyona dön (simülasyon)' });
    expect(within(dialog).getByText(/Rev\. B içeriğine döner/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vazgeç' }));
    expect(screen.getByTestId('working').textContent).toBe('İkinci');

    fireEvent.click(within(rows[1]).getByRole('button', { name: 'Bu revizyona dön (simülasyon)' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Geri dön' }));
    expect(screen.getByTestId('working').textContent).toBe('Birinci');
    expect(Number(screen.getByTestId('saves').textContent)).toBe(saves + 1);
    const pending = section('Bekleyen değişiklikler');
    expect(pending.getByText('İkinci')).toBeTruthy();
    expect(pending.getByText('Birinci')).toBeTruthy();
    expect(within(screen.getByRole('list', { name: 'Revizyonlar' })).getAllByRole('listitem')).toHaveLength(2);
  });

  it('resets the demo only after confirmation and clears the revisions', () => {
    setup();
    press('Birinci');
    press('Yayınla');
    press('Demoyu sıfırla');
    const dialog = screen.getByRole('dialog', { name: 'Demoyu sıfırla (simülasyon)' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vazgeç' }));
    expect(screen.getByTestId('working').textContent).toBe('Birinci');

    press('Demoyu sıfırla');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sıfırla' }));
    expect(screen.getByTestId('working').textContent).toBe('—');
    expect(section('Revizyonlar').getByText('Henüz revizyon yok.')).toBeTruthy();
    expect(sessionStorage.getItem('antet-admin')).toBeNull();
  });
});
