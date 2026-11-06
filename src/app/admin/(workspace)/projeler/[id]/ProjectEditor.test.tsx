import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureProjects } from '@/content/fixtures/projects';
import { mediaManifest } from '@/content/media-manifest';
import type { ProjectRecord } from '@/content/projects/types';
import { glbLibrary } from '@/lib/glb';
import { fixtureMediaAssets } from '@/lib/media';
import { AdminProvider, useAdmin } from '../../../ui/store';
import { ProjectList } from '../ProjectList';
import { ProjectEditor } from './ProjectEditor';
import ProjectEditorPage from './page.dev';

const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/admin/projeler',
  useRouter: () => ({ push }),
}));

// The sample module is loaded with a runtime require that cannot read TypeScript here, so the samples are supplied directly.
vi.mock('@/content/media-manifest', async (orig) => {
  const actual = await orig<typeof import('@/content/media-manifest')>();
  const { fixtureProjects } = await import('@/content/fixtures/projects');
  const { fixtureMediaAssets } = await import('@/lib/media');
  return {
    ...actual,
    devFixtureProjects: () => fixtureProjects,
    devMediaAssets: () => fixtureMediaAssets(fixtureProjects),
  };
});

beforeEach(() => push.mockClear());
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllEnvs();
});

const library = glbLibrary(48_000);
const samples = fixtureMediaAssets(fixtureProjects);
const portrait = { ...mediaManifest[0], id: 'portrait-photo' };
const assets = [portrait, ...samples];

function Probe() {
  const { state } = useAdmin();
  return (
    <>
      <p data-testid="featured">
        {state.projects
          .filter((p) => p.featured)
          .map((p) => p.id)
          .join(',') || 'none'}
      </p>
      <p data-testid="ids">{state.projects.map((p) => p.id).join(',')}</p>
      <p data-testid="dirty">{String(state.dirty)}</p>
      <p data-testid="log">{state.log.join('|')}</p>
    </>
  );
}

const seed = (projects: ProjectRecord[]) =>
  sessionStorage.setItem('antet-admin', JSON.stringify({ schema: 1, projects, seeded: true }));

const editor = (id: string) =>
  render(
    <AdminProvider>
      <ProjectEditor id={id} assets={assets} portraitId="portrait-photo" library={library} />
      <Probe />
    </AdminProvider>,
  );

const draft = (over: Partial<ProjectRecord> & { id: string }): ProjectRecord =>
  ({
    slug: { tr: '', en: '' },
    title: { tr: 'Taslak proje', en: '' },
    kind: 'single-part',
    disciplines: [],
    status: 'in-progress',
    visibility: 'draft',
    ...over,
  }) as ProjectRecord;

const open = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const disclose = (name: string) => open(new RegExp(`^${name}`));
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const inlineErrors = () => Array.from(document.querySelectorAll('p.a-err')).map((e) => e.textContent ?? '');
const type = (label: string, value: string) => fireEvent.change(input(label), { target: { value } });

describe('creating a project', () => {
  it('asks for a title and a kind, creates a draft and opens its editor', () => {
    render(
      <AdminProvider>
        <ProjectList samples={[]} />
        <Probe />
      </AdminProvider>,
    );
    open('Yeni proje');
    const create = screen.getByRole('button', { name: 'Oluştur' }) as HTMLButtonElement;
    const dialog = within(screen.getByRole('dialog', { name: 'Yeni proje' }));
    expect((dialog.getByRole('combobox') as HTMLSelectElement).value).toBe('');
    fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'Mil tasarımı' } });
    fireEvent.click(create);
    expect(push).not.toHaveBeenCalled();
    fireEvent.change(dialog.getByRole('combobox'), { target: { value: 'single-part' } });
    fireEvent.click(create);

    const id = screen.getByTestId('ids').textContent!;
    expect(id).toMatch(/^proje-[a-z0-9]{4,}$/);
    expect(push).toHaveBeenCalledWith(`/admin/projeler/${id}`);
    expect(screen.getByRole('link', { name: 'Mil tasarımı' }).getAttribute('href')).toBe(`/admin/projeler/${id}`);
    cleanup();

    // The new draft carries only what was chosen.
    editor(id);
    expect(screen.getByRole('heading', { level: 1, name: 'Mil tasarımı' })).toBeTruthy();
    expect(input('Başlık · TR').value).toBe('Mil tasarımı');
    expect(input('Başlık · EN').value).toBe('');
    expect((screen.getByLabelText('Tür') as HTMLSelectElement).value).toBe('single-part');
    expect(screen.getAllByText(/EN çevirisi \(2 alan: Başlık, Adres parçası\)/).length).toBeGreaterThan(0);
  });

  it('refuses an empty submit with an inline error, focuses the first invalid field and returns focus on cancel', () => {
    render(
      <AdminProvider>
        <ProjectList samples={[]} />
      </AdminProvider>,
    );
    const opener = screen.getByRole('button', { name: 'Yeni proje' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = within(screen.getByRole('dialog', { name: 'Yeni proje' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Oluştur' }));
    const title = dialog.getByRole('textbox');
    expect(title.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(title);
    expect(dialog.getByText(/Hata: Bu alan boş bırakılamaz\./)).toBeTruthy();
    fireEvent.change(title, { target: { value: 'Mil' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Oluştur' }));
    const kind = dialog.getByRole('combobox');
    expect(kind.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(kind);
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole('button', { name: 'Vazgeç' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('suggests the address from the title until it is edited by hand', () => {
    seed([draft({ id: 'proje-slug', title: { tr: '', en: '' }, slug: { tr: '', en: '' } })]);
    editor('proje-slug');
    type('Başlık · TR', 'Çelik Köprü');
    expect(input('Adres parçası · TR').value).toBe('celik-kopru');
    type('Adres parçası · TR', 'kopru');
    type('Başlık · TR', 'Çelik Köprü 2');
    expect(input('Adres parçası · TR').value).toBe('kopru');
  });

  it('shows the title and a small id line instead of the id as the record name', () => {
    seed([draft({ id: 'proje-ad', title: { tr: 'Mil', en: '' } })]);
    editor('proje-ad');
    expect(screen.getByText('Kayıt kimliği: proje-ad')).toBeTruthy();
    expect(screen.queryByText('Kayıt kimliği', { selector: 'dt' })).toBeNull();
  });

  it('lists what blocks publishing and keeps the draft from going live', () => {
    seed([draft({ id: 'proje-test' })]);
    editor('proje-test');
    const list = screen.getByRole('list', { name: 'Yayın kontrolleri' });
    expect(within(list).getByText(/Hata: En az 1 öğe gerekir\./)).toBeTruthy();
    expect(within(list).getByText(/Eksik: EN çevirisi/)).toBeTruthy();
    expect((screen.getByRole('radio', { name: /Yayında/ }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'Sinem onayladı' }) as HTMLInputElement).disabled).toBe(true);
  });

  it('shows a message for an unknown id', () => {
    seed([]);
    editor('yok');
    expect(screen.getByText(/“yok” kaydı bulunamadı\./)).toBeTruthy();
  });
});

describe('identity and slugs', () => {
  const two = () => [
    draft({ id: 'a', title: { tr: 'Ay', en: 'A' }, slug: { tr: 'ay', en: 'a' } }),
    draft({ id: 'b', title: { tr: 'Be', en: 'B' }, slug: { tr: 'be', en: 'b' } }),
  ];

  it('reports a slug used by another record once the field is left, and again on change', () => {
    seed(two());
    editor('b');
    const tr = input('Adres parçası · TR');
    type('Adres parçası · TR', 'ay');
    expect(inlineErrors()).toEqual([]);
    fireEvent.blur(tr);
    expect(inlineErrors().join()).toContain('Bu adres başka bir kayıtta kullanılıyor.');
    type('Adres parçası · TR', 'be-2');
    expect(inlineErrors()).toEqual([]);
    type('Adres parçası · TR', 'Be 2');
    expect(inlineErrors().join()).toContain('Yalnızca küçük harf, rakam ve tire.');
  });

  it('is unique per language: the same slug in the other language is fine', () => {
    seed(two());
    editor('b');
    type('Adres parçası · EN', 'ay');
    fireEvent.blur(input('Adres parçası · EN'));
    expect(inlineErrors()).toEqual([]);
  });

  it('suggests a folded address from the titles', () => {
    seed([draft({ id: 'c', title: { tr: 'Çelik Şaft İşleme', en: 'Steel Shaft' } })]);
    editor('c');
    open('Adresi başlıktan öner');
    expect(input('Adres parçası · TR').value).toBe('celik-saft-isleme');
    expect(input('Adres parçası · EN').value).toBe('steel-shaft');
  });

  it('flags an empty title on blur', () => {
    seed([draft({ id: 'c' })]);
    editor('c');
    fireEvent.blur(input('Başlık · EN'));
    expect(screen.getAllByText(/Bu alan boş bırakılamaz\./).length).toBeGreaterThan(0);
  });
});

describe('title block', () => {
  it('renders only the filled cells, live from the record', () => {
    seed([draft({ id: 'c' })]);
    editor('c');
    const cells = within(screen.getByLabelText('Antet hücreleri'));
    expect(cells.getByText('Tekil parça')).toBeTruthy();
    expect(cells.queryByText('Araçlar')).toBeNull();
    type('Araç adı', 'CATIA');
    open('Araç ekle');
    expect(cells.getByText('CATIA')).toBeTruthy();
    expect(cells.getByText('Araçlar')).toBeTruthy();
  });

  it('keeps at most 12 tools', () => {
    seed([draft({ id: 'c', tools: Array.from({ length: 12 }, (_, i) => `T${i}`) })]);
    editor('c');
    expect((screen.getByRole('button', { name: 'Araç ekle' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('reports an end date before the start', () => {
    seed([draft({ id: 'c', period: { start: '2024-05', precision: 'month' } })]);
    editor('c');
    type('Dönem bitişi', '2024-01');
    fireEvent.blur(input('Dönem bitişi'));
    expect(inlineErrors().join()).toContain('Bitiş, başlangıçtan önce olamaz.');
  });
});

describe('hero and cover', () => {
  it('disables the image heroes with a reason until a cover exists', () => {
    seed([draft({ id: 'c' })]);
    editor('c');
    const render_ = screen.getByRole('radio', { name: /Render/ }) as HTMLInputElement;
    expect(render_.disabled).toBe(true);
    expect(screen.getAllByText(/kapak görseli gerekli/).length).toBe(2);
    expect((screen.getByRole('radio', { name: 'Metin' }) as HTMLInputElement).disabled).toBe(false);
    fireEvent.click(screen.getAllByRole('button', { name: 'Kitaplıktan seç' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /^Seç: / })[0]);
    expect((screen.getByRole('radio', { name: 'Render' }) as HTMLInputElement).disabled).toBe(false);
  });

  it('offers library pictures only: no upload field, no portrait', () => {
    seed([draft({ id: 'c' })]);
    const { container } = editor('c');
    expect(container.querySelector('input[type="file"]')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Kitaplıktan seç' })[0]);
    const grid = screen.getByRole('list', { name: 'Kapak görseli: kitaplık' });
    expect(within(grid).getAllByRole('listitem').length).toBe(samples.length);
  });
});

describe('body', () => {
  it('marks an unused module as empty and lists the modules in page order', () => {
    seed([draft({ id: 'c' })]);
    editor('c');
    const labels = [
      'Amaç',
      'Süreç',
      'Yöntem',
      'Ölçümler',
      'Hesaplar',
      'Tasarım kararları',
      'Öğrenilenler',
      'Sonuçlar',
      'Çıkarımlar',
    ];
    const buttons = labels.map((l) => screen.getByRole('button', { name: new RegExp(`^${l}`) }));
    expect(buttons.every((b) => b.textContent!.includes('Boş — sayfada görünmez'))).toBe(true);
    const order = buttons.map((b) => b.compareDocumentPosition(buttons[buttons.length - 1]));
    expect(order.slice(0, -1).every((o) => (o & Node.DOCUMENT_POSITION_FOLLOWING) !== 0)).toBe(true);
  });

  it('adds a paragraph and counts it', () => {
    seed([draft({ id: 'c' })]);
    editor('c');
    disclose('Amaç');
    open('Paragraf ekle');
    expect(screen.getByRole('button', { name: /^Amaç.*1 öğe/ })).toBeTruthy();
    type('Paragraf 1 · TR', 'Amaç metni');
    expect(input('Paragraf 1 · TR').value).toBe('Amaç metni');
  });

  it('refuses an unverified measurement and accepts it once verified', () => {
    seed([draft({ id: 'c' })]);
    editor('c');
    disclose('Ölçümler');
    open('Ölçüm ekle');
    type('Ad · TR', 'Çap');
    type('Değer', '12,5');
    type('Birim', 'mm');
    fireEvent.click(screen.getByRole('button', { name: 'Ölçüm ekle' }));
    expect(screen.getByRole('alert').textContent).toContain('Hata: Doğrulanmamış değer yayımlanamaz.');
    expect(screen.queryByText(/Çap: 12,5 mm/)).toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Doğrulandı' }));
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ölçüm ekle' }));
    expect(screen.getByText('Çap: 12,5 mm')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Ölçümler.*1 öğe/ })).toBeTruthy();
  });

  it('rejects a value that is not a number', () => {
    seed([draft({ id: 'c' })]);
    editor('c');
    disclose('Ölçümler');
    open('Ölçüm ekle');
    type('Değer', '12,5,1');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Doğrulandı' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ölçüm ekle' }));
    expect(screen.getByRole('alert').textContent).toContain('Geçerli bir sayı girin.');
  });

  it('keeps a calculation result unverified-proof as well', () => {
    seed([draft({ id: 'c' })]);
    editor('c');
    disclose('Hesaplar');
    open('Hesap ekle');
    type('Değer', '3');
    fireEvent.click(screen.getByRole('button', { name: 'Sonuç ekle' }));
    expect(screen.getByRole('alert').textContent).toContain('Doğrulanmamış değer yayımlanamaz.');
  });

  it('warns that a decision with fewer than two options stays off the page', () => {
    seed([draft({ id: 'c' })]);
    editor('c');
    disclose('Tasarım kararları');
    open('Karar ekle');
    expect(document.querySelector('p.a-warn[role="status"]')?.textContent).toContain(
      'En az 2 seçenek olmadan karar sayfada görünmez.',
    );
  });
});

describe('figures, relations, revisions', () => {
  it('adds figures from the library and reorders them', () => {
    seed([draft({ id: 'c' })]);
    editor('c');
    const addFigure = (n: number) => {
      const triggers = screen.getAllByRole('button', { name: 'Kitaplıktan seç' });
      fireEvent.click(triggers[triggers.length - 1]);
      fireEvent.click(screen.getAllByRole('button', { name: /^Seç: / })[n]);
    };
    addFigure(0);
    addFigure(1);
    expect(screen.getAllByRole('button', { name: /'i yukarı taşı$/ }).length).toBe(2);
    const ids = () =>
      Array.from(document.querySelectorAll('#bolum-sekiller .a-rec-body > .a-help')).map((e) => e.textContent);
    const before = ids();
    expect(before).toHaveLength(2);
    expect(before[0]).not.toBe(before[1]);
    fireEvent.click(screen.getByRole('button', { name: "Şekil 2'i yukarı taşı" }));
    expect(ids()).toEqual([before[1], before[0]]);
  });

  it('allows at most two related projects and never the record itself', () => {
    seed([
      draft({ id: 'a' }),
      draft({ id: 'b' }),
      draft({ id: 'c' }),
      draft({ id: 'd', title: { tr: 'Dört', en: '' } }),
    ]);
    editor('d');
    const boxes = () =>
      within(screen.getByRole('group', { name: 'İlgili projeler' })).getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes().length).toBe(3);
    fireEvent.click(boxes()[0]);
    fireEvent.click(boxes()[1]);
    expect(boxes()[2].disabled).toBe(true);
    expect(screen.getByText('En fazla 2 gösterilir.')).toBeTruthy();
  });

  it('adds a revision with the next letter', () => {
    seed([draft({ id: 'c' })]);
    editor('c');
    open('Revizyon ekle');
    open('Revizyon ekle');
    const letters = screen.getAllByLabelText('Revizyon harfi') as HTMLInputElement[];
    expect(letters.map((l) => l.value)).toEqual(['A', 'B']);
  });
});

describe('publishing and featuring', () => {
  const full = () => fixtureProjects.map((p) => ({ ...p }));

  it('shows the sample chip and publishes a complete record', () => {
    seed(full());
    editor('fixture-a');
    expect(screen.getAllByText('Geliştirme örneği').length).toBeGreaterThan(0);
    expect((screen.getByRole('radio', { name: /Yayında/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'Sinem onayladı' }) as HTMLInputElement).checked).toBe(true);
  });

  it('keeps the approval a manual choice: it is not reset by an edit', () => {
    seed(full());
    editor('fixture-a');
    type('Başlık · TR', 'Başka başlık');
    expect((screen.getByRole('checkbox', { name: 'Sinem onayladı' }) as HTMLInputElement).checked).toBe(true);
  });

  it('turns the approval off by hand', () => {
    seed(full());
    editor('fixture-a');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sinem onayladı' }));
    expect((screen.getByRole('checkbox', { name: 'Sinem onayladı' }) as HTMLInputElement).checked).toBe(false);
  });

  it('moving to draft drops the approval', () => {
    seed(full());
    editor('fixture-a');
    fireEvent.click(screen.getByRole('radio', { name: 'Taslak' }));
    expect((screen.getByRole('checkbox', { name: 'Sinem onayladı' }) as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: /Yayında/ }));
    expect((screen.getByRole('checkbox', { name: 'Sinem onayladı' }) as HTMLInputElement).checked).toBe(false);
  });

  it('features one record at a time and says which one lost it', () => {
    seed([...full().slice(0, 1), { ...full()[1] } as ProjectRecord]);
    editor('fixture-b');
    expect(screen.getByTestId('featured').textContent).toBe('fixture-a');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Öne çıkan' }));
    expect(screen.getByTestId('featured').textContent).toBe('fixture-b');
    expect(screen.getByTestId('log').textContent).toContain('“Örnek kayıt A” artık öne çıkan değil.');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Öne çıkan' }));
    expect(screen.getByTestId('featured').textContent).toBe('none');
  });
});

describe('private originals', () => {
  it('shows no private label or address outside the originals editor and no upload field', () => {
    seed(fixtureProjects.map((p) => ({ ...p })));
    const { container } = editor('fixture-a');
    const originals = fixtureProjects.find((p) => p.id === 'fixture-a')!.privateOriginals!;
    const outsideOriginals = () => {
      const clone = container.cloneNode(true) as HTMLElement;
      clone.querySelector('#bolum-model')?.remove();
      return clone;
    };
    for (const o of originals) {
      expect(outsideOriginals().textContent).not.toContain(o.label.tr);
      expect(outsideOriginals().innerHTML).not.toContain(o.assetId);
    }
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(container.innerHTML).not.toMatch(/https?:\/\/[^"']*\.(sldprt|sldasm|step|iges)/i);
  });
});

describe('deleting', () => {
  it('asks first, then removes the record and returns to the list', () => {
    seed([draft({ id: 'c' }), draft({ id: 'd' })]);
    editor('c');
    open('Projeyi sil');
    const dialog = screen.getByRole('dialog', { name: 'Proje silinsin mi?' });
    expect(screen.getByTestId('ids').textContent).toBe('c,d');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vazgeç' }));
    expect(screen.getByTestId('ids').textContent).toBe('c,d');
    open('Projeyi sil');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Projeyi sil' }));
    expect(screen.getByTestId('ids').textContent).toBe('d');
    expect(push).toHaveBeenCalledWith('/admin/projeler');
  });
});

describe('screen entry', () => {
  it('answers 404 outside development and renders the editor in development', async () => {
    await expect(ProjectEditorPage({ params: Promise.resolve({ id: 'x' }) })).rejects.toThrow('NEXT_NOT_FOUND');
    vi.stubEnv('NODE_ENV', 'development');
    const el = await ProjectEditorPage({ params: Promise.resolve({ id: 'fixture-a' }) });
    expect(el.props.id).toBe('fixture-a');
    expect(el.props.assets.length).toBeGreaterThan(0);
  });
});
