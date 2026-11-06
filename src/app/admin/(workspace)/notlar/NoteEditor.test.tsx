import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MediaAsset } from '@/lib/media';
import type { PairedBlock } from '@/lib/note-blocks';
import type { MockNote } from '@/lib/note-record';
import { AdminProvider } from '../../ui/store';
import { accusative } from './BlockEditor';
import { NoteEditor } from './NoteEditor';
import NoteEditorScreen from './[id]/page';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/admin/notlar/deneme',
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  push.mockClear();
  vi.unstubAllEnvs();
});

const pr = (tr: string, en = tr) => ({ tr, en });
const blocks: PairedBlock[] = [
  { type: 'p', text: pr('Birinci paragraf', 'First paragraph') },
  { type: 'h2', id: 'baslik', text: pr('Başlık', 'Heading') },
  {
    type: 'table',
    caption: pr('Tablo yazısı', 'Table caption'),
    head: [pr('A'), pr('B')],
    rows: [[pr('1'), pr('2')]],
    note: pr('', ''),
  },
  { type: 'math', tex: 'x^{2}' },
  { type: 'pullquote', text: pr('Söz', 'Quote'), cite: pr('', '') },
  { type: 'code', code: 'let a = 1;', lang: 'ts', filename: pr('', '') },
  { type: 'figure', figureId: 'beam', alt: pr('', ''), caption: pr('', '') },
];
const note = (over: Partial<MockNote> = {}): MockNote => ({
  id: 'deneme',
  status: 'draft',
  approved: false,
  published: '2026-11-01',
  langs: { tr: 'on', en: 'on' },
  slug: pr('deneme', 'sample'),
  title: pr('Deneme', 'Sample'),
  subtitle: pr('', ''),
  summary: pr('Özet', 'Summary'),
  category: pr('', ''),
  tags: [],
  coverAlt: pr('', ''),
  blocks,
  footnotes: [],
  references: [],
  revisions: [],
  ...over,
});

const assets: MediaAsset[] = [];
const setup = (n: MockNote = note(), id = n.id) => {
  sessionStorage.setItem('antet-admin', JSON.stringify({ schema: 1, notes: [n] }));
  return render(
    <AdminProvider>
      <NoteEditor id={id} figureIds={['beam']} assets={assets} />
    </AdminProvider>,
  );
};
const type = (label: string, value: string, at = 0) =>
  fireEvent.change(screen.getAllByLabelText(label)[at], { target: { value } });

describe('note editor', () => {
  it('shows the section index, the preview line and the block palette', () => {
    setup();
    const nav = screen.getByRole('navigation', { name: 'Not bölümleri' });
    for (const s of ['Üstbilgi', 'Gövde', 'Dipnotlar', 'Kaynaklar', 'Revizyonlar', 'Yayın'])
      expect(within(nav).getByRole('link', { name: s })).toBeTruthy();
    expect(screen.getByText('Taslak önizlemesi sonraki adımda.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Blok ekle' }));
    const options = within(screen.getByRole('listbox', { name: 'Blok türleri' })).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toContain('Teknik figür (kayıtlı)');
    expect(options.map((o) => o.textContent)).not.toContain('SVG');
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Paragraf' }));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getAllByRole('button', { name: /Paragraf \d+'. kaldır/ })).toHaveLength(2);
  });

  it('closes the palette with Escape and moves between options with the arrow keys', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Blok ekle' }));
    const list = screen.getByRole('listbox');
    const [first, second] = within(list).getAllByRole('option');
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: 'Enter' });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Blok ekle' }));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('renders <script> typed into a paragraph, a heading and a table cell as text', () => {
    const { container } = setup();
    const html = '<script>alert(1)</script>';
    for (const name of ['blk-0-text.tr', 'blk-1-text.tr'])
      fireEvent.change(container.querySelector(`[name="${name}"]`)!, { target: { value: html } });
    type('Hücre 1.1 · TR', html);
    expect(container.querySelector('script')).toBeNull();
    const previews = Array.from(container.querySelectorAll('.a-live')).map((p) => p.textContent);
    expect(previews.filter((t) => t?.includes(html))).toHaveLength(2);
    expect((screen.getByLabelText('Hücre 1.1 · TR') as HTMLInputElement).value).toBe(html);
  });

  it('binds no control to raw markup', () => {
    const { container } = setup();
    const names = Array.from(container.querySelectorAll('input, textarea, select')).map(
      (e) => `${e.getAttribute('name') ?? ''} ${e.getAttribute('type') === 'file' ? 'file' : ''}`,
    );
    expect(names.filter((n) => /svg|html|markup/i.test(n))).toEqual([]);
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByLabelText(/svg/i)).toBeNull();
  });

  it('names the move buttons with the block and its position', () => {
    setup();
    expect(accusative(3)).toBe("3'ü");
    expect(accusative(10)).toBe("10'u");
    expect((screen.getByRole('button', { name: "Paragraf 1'i yukarı taşı" }) as HTMLButtonElement).disabled).toBe(true);
    const up = screen.getByRole('button', { name: "Tablo 3'ü yukarı taşı" });
    fireEvent.click(up);
    expect(screen.getByRole('button', { name: "Tablo 2'yi yukarı taşı" })).toBeTruthy();
    expect(screen.getByRole('button', { name: "Başlık 2 3'ü aşağı taşı" })).toBeTruthy();
    expect(screen.getByRole('button', { name: "Teknik figür (kayıtlı) 7'yi aşağı taşı" })).toBeTruthy();
  });

  it('removes a block', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: "Paragraf 1'i kaldır" }));
    expect(screen.queryByRole('button', { name: /Paragraf \d+'. kaldır/ })).toBeNull();
  });

  it('limits a table to 8 columns and 30 rows and adds both languages together', () => {
    setup();
    const addColumn = screen.getByRole('button', { name: 'Sütun ekle' }) as HTMLButtonElement;
    for (let i = 0; i < 6; i++) fireEvent.click(addColumn);
    expect(addColumn.disabled).toBe(true);
    const addRow = screen.getByRole('button', { name: 'Satır ekle' }) as HTMLButtonElement;
    for (let i = 0; i < 29; i++) fireEvent.click(addRow);
    expect(addRow.disabled).toBe(true);
    for (const l of ['TR', 'EN']) {
      const grid = screen.getByRole('table', { name: `Tablo · ${l}` });
      expect(within(grid).getAllByRole('columnheader')).toHaveLength(8);
      expect(within(grid).getAllByRole('row')).toHaveLength(31);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Son sütunu sil' }));
    expect(within(screen.getByRole('table', { name: 'Tablo · EN' })).getAllByRole('columnheader')).toHaveLength(7);
  }, 30000);

  it('warns about a pull quote', () => {
    setup();
    expect(screen.getAllByText(/Marka: pull quote kullanılmaz/).length).toBeGreaterThan(0);
  });

  it('shows a live equation and holds back unsupported TeX', () => {
    const { container } = setup();
    expect(container.querySelector('math')).toBeTruthy();
    type('TeX', String.raw`\frac{a}{b}`);
    expect(container.querySelector('math mfrac')).toBeTruthy();
    type('TeX', String.raw`\nonsense{a}`);
    expect(screen.getByText(/Desteklenmeyen TeX: \\nonsense/)).toBeTruthy();
    expect(container.querySelector('math')).toBeNull();
    // the last text without an error is still the stored one
    type('TeX', String.raw`x^{3}`);
    expect(screen.queryByText(/Desteklenmeyen TeX/)).toBeNull();
  });

  it('holds back a link target the site would not follow', () => {
    const { container } = setup();
    type('Metin · TR', '[x](javascript:alert(1))');
    expect(screen.getByText(/Bağlantı https, \/ veya # ile başlamalı: javascript:alert/)).toBeTruthy();
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();
    type('Metin · TR', '[x](https://example.org)');
    expect(container.querySelector('.a-live a[href="https://example.org"]')).toBeTruthy();
  });

  it('flags a cross reference that is not defined', () => {
    setup();
    type('Metin · TR', 'Bkz. [^yok]');
    expect(screen.getAllByText(/Hata: \[\^yok\] tanımlı değil\./).length).toBeGreaterThan(0);
  });

  it('keeps the text of a language that is turned off, and turns it on again', () => {
    setup();
    const english = screen.getByRole('group', { name: 'İngilizce' });
    fireEvent.click(within(english).getByRole('button', { name: 'Bu dilde yayınlama' }));
    expect(within(english).getByText(/EN · Yok/)).toBeTruthy();
    expect((screen.getAllByLabelText('Başlık · EN')[0] as HTMLTextAreaElement | HTMLInputElement).value).toBe('Sample');
    // the last language stays on
    const turkish = screen.getByRole('group', { name: 'Türkçe' });
    expect((within(turkish).getByRole('button', { name: 'Bu dilde yayınlama' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(within(english).getByRole('button', { name: 'Bu dilde yayınla' }));
    expect(within(english).getByText(/EN · Tamam/)).toBeTruthy();
  });

  it('edits the header: status, approval stays manual, featured and dates', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Yayında' }));
    expect(screen.getAllByText('Yayında (sim.)').length).toBeGreaterThan(0);
    const approved = screen.getByRole('checkbox', { name: 'Sinem onayladı' }) as HTMLInputElement;
    expect(approved.checked).toBe(false);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Öne çıkan' }));
    expect((screen.getByRole('checkbox', { name: 'Öne çıkan' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.change(screen.getByLabelText('Güncelleme tarihi (isteğe bağlı)'), { target: { value: '2026-10-01' } });
    expect(screen.getAllByText(/Güncelleme tarihi yayın tarihinden önce olamaz./).length).toBeGreaterThan(0);
    expect(approved.checked).toBe(false);
  });

  it('edits footnotes with their usage check', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Dipnot ekle' }));
    fireEvent.change(screen.getByLabelText('Kimlik'), { target: { value: 'a' } });
    expect(screen.getAllByText(/Uyarı: Metinde kullanılmıyor\./).length).toBeGreaterThan(0);
  });

  it('shows a not-found state for an unknown id and deletes after confirming', () => {
    setup(note(), 'baska');
    expect(screen.getByText(/“baska” kaydı bulunamadı\./)).toBeTruthy();
    cleanup();
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Notu sil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sil' }));
    expect(push).toHaveBeenCalledWith('/admin/notlar');
  });

  it('is gated outside development', async () => {
    await expect(NoteEditorScreen({ params: Promise.resolve({ id: 'x' }) })).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
