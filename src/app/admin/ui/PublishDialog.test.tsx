import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { fixtureProjects } from '@/content/fixtures/projects';
import { LIMIT_BYTES } from '@/lib/glb';
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

describe('PublishDialog: what it lists and where focus goes', () => {
  it('starts on the heading when nothing blocks, not on the last button', () => {
    setup({ 'hero.isolation.tr': 'Yeni etiket' });
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Yayınla (simülasyon)' }));
  });

  it('puts the actions in a sticky footer and caps the change list with its own scroll', () => {
    setup({ 'hero.isolation.tr': 'Yeni etiket' });
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('.a-dialog-actions.is-sticky')).toBeTruthy();
    expect(dialog.querySelector('.a-pub-changes')).toBeTruthy();
  });

  it('turns an emptied required field into a blocking error that links to the field', () => {
    setup({ 'ayarlar.identity.firstName': '' });
    const summary = screen.getByRole('alert');
    expect(document.activeElement).toBe(summary);
    expect(confirm().disabled).toBe(true);
    const link = within(summary).getByRole('link', { name: 'Ad' });
    expect(link.getAttribute('href')).toBe('/admin/ayarlar?alan=ayarlar.identity.firstName');
    expect(link.parentElement?.textContent).toMatch(/^Ad · .*Bu alan boş bırakılamaz/);
  });
});

function Records({ onReady }: { onReady: (ctx: ReturnType<typeof useAdmin>) => void }) {
  const ctx = useAdmin();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => onReady(ctx)}>
        Kur
      </button>
      <button type="button" onClick={() => setOpen(true)}>
        Aç
      </button>
      <PublishDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

describe('PublishDialog: records', () => {
  it('leaves the samples out of the change list and names a new record by its title', () => {
    let latest: ReturnType<typeof useAdmin> | undefined;
    const grab = (c: ReturnType<typeof useAdmin>) => {
      latest = c;
    };
    render(
      <AdminProvider>
        <Records onReady={grab} />
      </AdminProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kur' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kur' }));
    act(() => {
      latest!.seedSamples(fixtureProjects);
      latest!.createProject({ title: 'Deneme projesi', kind: 'single-part' });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aç' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Değişiklikler (1)')).toBeTruthy();
    const changes = within(dialog.querySelector<HTMLElement>('.a-pub-changes')!);
    expect(changes.getByText('Proje “Deneme projesi”')).toBeTruthy();
    expect(changes.getByText('Yeni kayıt')).toBeTruthy();
    expect(dialog.textContent).not.toContain(fixtureProjects[0].title.tr);
  });

  it('blocks on a 3D model over 15 MB and links to the record', () => {
    let latest: ReturnType<typeof useAdmin> | undefined;
    render(
      <AdminProvider>
        <Records
          onReady={(c) => {
            latest = c;
          }}
        />
      </AdminProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kur' }));
    let id = '';
    act(() => {
      id = latest!.createProject({ title: 'Büyük model', kind: 'single-part' });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kur' }));
    act(() => {
      latest!.patchProject(id, {
        visibility: 'published',
        approved: true,
        preview3d: {
          id: 'm',
          approved: false,
          modelSrc: '/m.glb',
          sizeBytes: LIMIT_BYTES + 1,
          poster: {
            id: 'poster',
            kind: 'image',
            src: '/media/poster.png',
            width: 800,
            height: 600,
            alt: { tr: 'Parçanın yandan görünüşü', en: 'Side view of the part' },
          },
        },
      });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aç' }));
    const summary = screen.getByRole('alert');
    expect(summary.textContent).toContain('3B model 15 MB sınırını aştı');
    const link = within(summary)
      .getAllByRole('link')
      .find((l) => l.parentElement?.textContent?.includes('3B model 15 MB sınırını aştı'))!;
    expect(link.getAttribute('href')).toBe(`/admin/projeler/${id}#bolum-model`);
    expect(link.textContent).toBe('Proje “Büyük model”');
    expect((screen.getByRole('button', { name: 'Yayını simüle et' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
