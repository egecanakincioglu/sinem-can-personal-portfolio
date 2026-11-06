'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Inline } from '@/lib/inline';
import { texIssues } from '@/lib/math';
import type { PairedBlock } from '@/lib/note-blocks';
import type { MockNote, NoteIssue } from '@/lib/note-record';
import type { MediaAsset } from '@/lib/media';
import { BilingualField, ListEditor, RecordRow, TextField } from '../../ui/controls';
import { Glyph } from '../../ui/feedback';
import { useAdmin } from '../../ui/store';
import { PairText, linkError, useGuarded, type Ctxs } from './PairText';
import { blockLabel, blockPalette, type BlockType } from './palette';

type Pair = { tr: string; en: string };
const pair = (): Pair => ({ tr: '', en: '' });

const ACCUSATIVE = ['', 'i', 'yi', 'ü', 'ü', 'i', 'yı', 'yi', 'i', 'u'];
const ACCUSATIVE_TENS = ['', 'u', 'yi', 'u', 'ı', 'yi', 'ı', 'i', 'i', 'ı'];
/** Turkish accusative ending for a position number: 3'ü, 5'i, 10'u. */
export function accusative(n: number): string {
  const suffix = n % 10 !== 0 ? ACCUSATIVE[n % 10] : n % 100 !== 0 ? ACCUSATIVE_TENS[(n / 10) % 10] : 'ü';
  return `${n}'${suffix}`;
}

const LANGS = ['ts', 'tsx', 'python', 'matlab', 'bash', 'text'];
const CALLOUT_KINDS = [
  { value: 'assumption', label: 'Varsayım' },
  { value: 'limitation', label: 'Sınırlama' },
  { value: 'note', label: 'Not' },
] as const;
const MAX_COLUMNS = 8;
const MAX_ROWS = 30;

function withTexError(tex: string): string | undefined {
  const [first] = texIssues(tex);
  if (!first) return undefined;
  const what = first.kind === 'command' ? first.value : `eşleşmeyen ${first.value}`;
  return `Desteklenmeyen TeX: ${what}. Bu blok kaydedilmedi.`;
}

/** Palette: a button that opens a listbox of the allowed block types. */
function BlockPalette({ onPick }: { onPick: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>('[role="option"]')?.focus();
  }, [open]);
  const close = () => {
    setOpen(false);
    button.current?.focus();
  };
  const onKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const items = Array.from(list.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }
  };
  const pick = (type: BlockType) => {
    onPick(type);
    close();
  };
  return (
    <div className="a-palette">
      <button
        ref={button}
        type="button"
        className="a-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <Glyph name="plus" /> Blok ekle
      </button>
      {open && (
        <ul id={id} ref={list} role="listbox" aria-label="Blok türleri" className="a-palette-list" onKeyDown={onKey}>
          {blockPalette.map((b) => (
            <li
              key={b.type}
              role="option"
              aria-selected={false}
              tabIndex={0}
              className="a-palette-opt"
              onClick={() => pick(b.type)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pick(b.type);
                }
              }}
            >
              {b.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One cell of the table grid. */
function Cell({
  label,
  lang,
  value,
  onChange,
}: {
  label: string;
  lang: 'tr' | 'en';
  value: string;
  onChange: (v: string) => void;
}) {
  const g = useGuarded(value, linkError, onChange);
  return (
    <>
      <input
        className="a-input"
        type="text"
        lang={lang}
        aria-label={label}
        aria-invalid={g.error ? true : undefined}
        value={g.value}
        onChange={(e) => g.onChange(e.target.value)}
      />
      {g.error && <span className="a-err">Hata: {g.error}</span>}
    </>
  );
}

function TableEditor({
  block,
  index,
  set,
  ctxs,
}: {
  block: Extract<PairedBlock, { type: 'table' }>;
  index: number;
  set: (b: PairedBlock) => void;
  ctxs: Ctxs;
}) {
  const cols = block.head.length;
  const align = (c: number) => block.align?.[c] ?? 'l';
  const addColumn = () =>
    set({
      ...block,
      head: [...block.head, pair()],
      rows: block.rows.map((r) => [...r, pair()]),
      align: [...block.head.map((_, c) => align(c)), 'l'],
    });
  const removeColumn = () =>
    set({
      ...block,
      head: block.head.slice(0, -1),
      rows: block.rows.map((r) => r.slice(0, -1)),
      align: block.head.slice(0, -1).map((_, c) => align(c)),
    });
  const addRow = () => set({ ...block, rows: [...block.rows, block.head.map(pair)] });
  const removeRow = () => set({ ...block, rows: block.rows.slice(0, -1) });
  const grid = (l: 'tr' | 'en') => (
    <div className="a-grid-scroll" key={l}>
      <table className="a-grid" aria-label={`Tablo · ${l.toUpperCase()}`}>
        <thead>
          <tr>
            {block.head.map((h, c) => (
              <th key={c} scope="col">
                <Cell
                  label={`Başlık hücresi ${c + 1} · ${l.toUpperCase()}`}
                  lang={l}
                  value={h[l]}
                  onChange={(v) => set({ ...block, head: block.head.map((x, j) => (j === c ? { ...x, [l]: v } : x)) })}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c}>
                  <Cell
                    label={`Hücre ${r + 1}.${c + 1} · ${l.toUpperCase()}`}
                    lang={l}
                    value={cell[l]}
                    onChange={(v) =>
                      set({
                        ...block,
                        rows: block.rows.map((x, i) =>
                          i === r ? x.map((y, j) => (j === c ? { ...y, [l]: v } : y)) : x,
                        ),
                      })
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <>
      <PairText
        name={`blk-${index}-caption`}
        label="Başlık (tablo yazısı)"
        value={block.caption}
        onChange={(caption) => set({ ...block, caption })}
        ctxs={ctxs}
      />
      {grid('tr')}
      {grid('en')}
      <div className="a-proj-actions">
        <button type="button" className="a-btn" disabled={cols >= MAX_COLUMNS} onClick={addColumn}>
          Sütun ekle
        </button>
        <button type="button" className="a-btn" disabled={cols <= 1} onClick={removeColumn}>
          Son sütunu sil
        </button>
        <button type="button" className="a-btn" disabled={block.rows.length >= MAX_ROWS} onClick={addRow}>
          Satır ekle
        </button>
        <button type="button" className="a-btn" disabled={block.rows.length <= 1} onClick={removeRow}>
          Son satırı sil
        </button>
      </div>
      <p className="a-help">
        Sütun ve satır iki dile birlikte eklenir. En fazla {MAX_COLUMNS} sütun ve {MAX_ROWS} satır. Şu an {cols} sütun,{' '}
        {block.rows.length} satır.
      </p>
      <div className="a-proj-actions">
        {block.head.map((_, c) => (
          <label key={c} className="a-label">
            Sütun {c + 1} hizalaması{' '}
            <select
              className="a-input"
              value={align(c)}
              onChange={(e) =>
                set({
                  ...block,
                  align: block.head.map((__, j) => (j === c ? (e.target.value as 'l' | 'r') : align(j))),
                })
              }
            >
              <option value="l">Sola</option>
              <option value="r">Sağa</option>
            </select>
          </label>
        ))}
      </div>
      <PairText
        name={`blk-${index}-note`}
        label="Tablo notu"
        value={block.note}
        onChange={(note) => set({ ...block, note })}
        ctxs={ctxs}
        optional
      />
    </>
  );
}

function ItemsEditor({
  items,
  label,
  name,
  ctxs,
  onChange,
}: {
  items: Pair[];
  label: string;
  name: string;
  ctxs: Ctxs;
  onChange: (next: Pair[]) => void;
}) {
  const move = (i: number, by: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };
  return (
    <ListEditor
      label={label}
      min={1}
      max={30}
      count={items.length}
      onAdd={() => onChange([...items, pair()])}
      addLabel={`${label} ekle`}
    >
      {items.map((item, i) => (
        <RecordRow
          key={i}
          index={i}
          itemLabel={label}
          onUp={i > 0 ? () => move(i, -1) : undefined}
          onDown={i < items.length - 1 ? () => move(i, 1) : undefined}
          onRemove={items.length > 1 ? () => onChange(items.filter((_, j) => j !== i)) : undefined}
        >
          <PairText
            name={`${name}-${i}`}
            label={`${label} ${i + 1}`}
            value={item}
            onChange={(next) => onChange(items.map((x, j) => (j === i ? next : x)))}
            ctxs={ctxs}
            multiline
          />
        </RecordRow>
      ))}
    </ListEditor>
  );
}

function BlockFields({
  block,
  index,
  set,
  ctxs,
  figureIds,
  assets,
}: {
  block: PairedBlock;
  index: number;
  set: (b: PairedBlock) => void;
  ctxs: Ctxs;
  figureIds: readonly string[];
  assets: readonly MediaAsset[];
}) {
  const name = `blk-${index}`;
  const idField = (b: PairedBlock & { id?: string }, required: boolean) => (
    <TextField
      name={`${name}-id`}
      meta={{
        label: required ? 'Kimlik (iki dilde ortak)' : 'Kimlik (çapraz başvuru için, isteğe bağlı)',
        helper: 'Yalnız küçük harf, rakam ve tire.',
        required,
      }}
      value={b.id ?? ''}
      onChange={(v) => set({ ...b, id: v === '' && !required ? undefined : v } as PairedBlock)}
    />
  );

  switch (block.type) {
    case 'p':
      return (
        <PairText
          name={`${name}-text`}
          label="Metin"
          value={block.text}
          onChange={(text) => set({ ...block, text })}
          ctxs={ctxs}
          multiline
          helper={
            '**kalın**, *italik*, `kod`, [bağlantı](https://…), $x_\\mathrm{A}$, [^dipnot], [@kaynak], [[başvuru]]'
          }
        />
      );
    case 'h2':
    case 'h3':
    case 'h4':
      return (
        <>
          {idField(block, block.type !== 'h4')}
          <PairText
            name={`${name}-text`}
            label="Başlık"
            value={block.text}
            onChange={(text) => set({ ...block, text })}
            ctxs={ctxs}
          />
        </>
      );
    case 'ul':
    case 'ol':
      return (
        <ItemsEditor
          items={block.items}
          label="Madde"
          name={`${name}-item`}
          ctxs={ctxs}
          onChange={(items) => set({ ...block, items })}
        />
      );
    case 'quote':
    case 'pullquote':
      return (
        <>
          {block.type === 'pullquote' && (
            <p className="a-warn">
              Uyarı: Marka: pull quote kullanılmaz. Blok kaydedilir, ancak yayında kullanılmamalı.
            </p>
          )}
          <PairText
            name={`${name}-text`}
            label="Alıntı"
            value={block.text}
            onChange={(text) => set({ ...block, text })}
            ctxs={ctxs}
            multiline
          />
          <PairText
            name={`${name}-cite`}
            label="Kaynak (isteğe bağlı)"
            value={block.cite}
            onChange={(cite) => set({ ...block, cite })}
            ctxs={ctxs}
            optional
          />
        </>
      );
    case 'code': {
      const langs = block.lang && !LANGS.includes(block.lang) ? [...LANGS, block.lang] : LANGS;
      return (
        <>
          <div className="a-mono">
            <TextField
              name={`${name}-code`}
              multiline
              meta={{ label: 'Kod', helper: 'Yalnızca metin olarak gösterilir; hiçbir zaman çalıştırılmaz.' }}
              value={block.code}
              onChange={(code) => set({ ...block, code })}
            />
          </div>
          <label className="a-label" htmlFor={`${name}-lang`}>
            Dil
          </label>
          <select
            id={`${name}-lang`}
            className="a-input"
            value={block.lang ?? 'text'}
            onChange={(e) => set({ ...block, lang: e.target.value })}
          >
            {langs.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <TextField
            name={`${name}-filename`}
            meta={{ label: 'Dosya adı (isteğe bağlı, iki dilde ortak)' }}
            value={block.filename.tr}
            onChange={(v) => set({ ...block, filename: { tr: v, en: v } })}
          />
        </>
      );
    }
    case 'math':
      return <MathFields block={block} name={name} set={set} ctxs={ctxs} id={idField(block, false)} />;
    case 'image':
      return (
        <>
          <label className="a-label" htmlFor={`${name}-src`}>
            Görsel (kitaplıktan)
          </label>
          <select
            id={`${name}-src`}
            className="a-input"
            value={block.src}
            onChange={(e) => {
              const asset = assets.find((a) => a.src === e.target.value);
              if (asset) set({ ...block, src: asset.src, width: asset.width, height: asset.height });
            }}
          >
            <option value="" disabled>
              Seçilmedi
            </option>
            {block.src !== '' && !assets.some((a) => a.src === block.src) && (
              <option value={block.src}>Kitaplıkta yok: {block.src}</option>
            )}
            {assets.map((a) => (
              <option key={a.id} value={a.src}>
                {a.id} ({a.width} × {a.height})
              </option>
            ))}
          </select>
          {idField(block, false)}
          <BilingualField
            name={`${name}-alt`}
            label="Alternatif metin"
            tr={block.alt.tr}
            en={block.alt.en}
            onTr={(v) => set({ ...block, alt: { ...block.alt, tr: v } })}
            onEn={(v) => set({ ...block, alt: { ...block.alt, en: v } })}
          />
          <PairText
            name={`${name}-caption`}
            label="Yazı"
            value={block.caption}
            onChange={(caption) => set({ ...block, caption })}
            ctxs={ctxs}
            optional
          />
        </>
      );
    case 'figure':
      return (
        <>
          <label className="a-label" htmlFor={`${name}-figure`}>
            Kayıtlı teknik figür
          </label>
          <select
            id={`${name}-figure`}
            className="a-input"
            value={block.figureId}
            onChange={(e) => set({ ...block, figureId: e.target.value })}
          >
            <option value="" disabled>
              Seçilmedi
            </option>
            {figureIds.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <p className="a-help">
            Figür kodla yazılır ve gözden geçirilir; burada yalnız alternatif metin ve yazı değişir.
          </p>
          {idField(block, false)}
          <BilingualField
            name={`${name}-alt`}
            label="Alternatif metin"
            helper="Boş bırakılırsa kayıt defterindeki varsayılan kullanılır."
            optional
            tr={block.alt.tr}
            en={block.alt.en}
            onTr={(v) => set({ ...block, alt: { ...block.alt, tr: v } })}
            onEn={(v) => set({ ...block, alt: { ...block.alt, en: v } })}
          />
          <PairText
            name={`${name}-caption`}
            label="Yazı"
            value={block.caption}
            onChange={(caption) => set({ ...block, caption })}
            ctxs={ctxs}
            optional
          />
        </>
      );
    case 'table':
      return (
        <>
          {idField(block, false)}
          <TableEditor block={block} index={index} set={set} ctxs={ctxs} />
        </>
      );
    case 'callout':
      return (
        <>
          <label className="a-label" htmlFor={`${name}-kind`}>
            Tür
          </label>
          <select
            id={`${name}-kind`}
            className="a-input"
            value={block.kind}
            onChange={(e) => set({ ...block, kind: e.target.value as typeof block.kind })}
          >
            {CALLOUT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <PairText
            name={`${name}-title`}
            label="Başlık (isteğe bağlı)"
            value={block.title}
            onChange={(title) => set({ ...block, title })}
            ctxs={ctxs}
            optional
          />
          <ItemsEditor
            items={block.paragraphs}
            label="Paragraf"
            name={`${name}-para`}
            ctxs={ctxs}
            onChange={(paragraphs) => set({ ...block, paragraphs })}
          />
        </>
      );
  }
}

function MathFields({
  block,
  name,
  set,
  ctxs,
  id,
}: {
  block: Extract<PairedBlock, { type: 'math' }>;
  name: string;
  set: (b: PairedBlock) => void;
  ctxs: Ctxs;
  id: React.ReactNode;
}) {
  const g = useGuarded(block.tex, withTexError, (tex) => set({ ...block, tex }));
  return (
    <>
      <div className="a-mono">
        <TextField
          name={`${name}-tex`}
          multiline
          meta={{
            label: 'TeX',
            helper: 'Desteklenen TeX alt kümesi. Hata varsa blok kaydedilmez.',
            error: g.error,
          }}
          value={g.value}
          onChange={g.onChange}
        />
      </div>
      {g.value !== '' && !g.error && (
        <p className="a-live" role="img" aria-label="Denklem önizlemesi">
          <Inline text={`$${g.value}$`} ctx={ctxs.tr} keyPrefix={`${name}-math`} />
        </p>
      )}
      {id}
    </>
  );
}

/** Issue lines of one block, with their severity spelled out. */
export function IssueList({ issues, label }: { issues: NoteIssue[]; label: string }) {
  if (issues.length === 0) return null;
  return (
    <ul className="a-issues" aria-label={label}>
      {issues.map((x, k) => {
        const text = /^(Hata|Uyarı|Marka)/.test(x.message)
          ? x.message
          : `${x.severity === 'error' ? 'Hata' : 'Uyarı'}: ${x.message}`;
        return (
          <li key={k} className={x.severity === 'error' ? 'a-err' : 'a-warn'}>
            {x.lang ? `${x.lang.toUpperCase()} · ` : ''}
            {text}
          </li>
        );
      })}
    </ul>
  );
}

/** The ordered body: palette, then one card per block with a header of type and move/remove buttons. */
export function BlockList({
  note,
  ctxs,
  issues,
  figureIds,
  assets,
}: {
  note: MockNote;
  ctxs: Ctxs;
  issues: NoteIssue[];
  figureIds: readonly string[];
  assets: readonly MediaAsset[];
}) {
  const { addBlock, moveBlock, removeBlock, patchBlock } = useAdmin();
  const last = note.blocks.length - 1;
  return (
    <div className="a-blocks">
      {note.blocks.length === 0 && <p className="a-help">Gövde boş. “Blok ekle” ile ilk bloğu ekleyin.</p>}
      <ol className="a-recs">
        {note.blocks.map((b, i) => {
          const label = `${blockLabel(b.type)} ${accusative(i + 1)}`;
          return (
            <li key={`${i}-${b.type}`} className="a-block">
              <div className="a-block-head">
                <span className="a-block-type">
                  <span className="a-num">{String(i + 1).padStart(2, '0')}</span> {blockLabel(b.type)}
                </span>
                <span className="a-rec-tools a-block-tools">
                  <button
                    type="button"
                    className="a-ibtn"
                    disabled={i === 0}
                    aria-label={`${label} yukarı taşı`}
                    onClick={() => moveBlock(note.id, i, -1)}
                  >
                    <Glyph name="up" />
                  </button>
                  <button
                    type="button"
                    className="a-ibtn"
                    disabled={i === last}
                    aria-label={`${label} aşağı taşı`}
                    onClick={() => moveBlock(note.id, i, 1)}
                  >
                    <Glyph name="down" />
                  </button>
                  <button
                    type="button"
                    className="a-btn a-btn-quiet"
                    aria-label={`${label} kaldır`}
                    onClick={() => removeBlock(note.id, i)}
                  >
                    Kaldır
                  </button>
                </span>
              </div>
              <div className="a-block-body">
                <BlockFields
                  block={b}
                  index={i}
                  set={(next) => patchBlock(note.id, i, next)}
                  ctxs={ctxs}
                  figureIds={figureIds}
                  assets={assets}
                />
                <IssueList label="Blok denetimi" issues={issues.filter((x) => x.field.startsWith(`blocks[${i}].`))} />
              </div>
            </li>
          );
        })}
      </ol>
      <BlockPalette onPick={(type) => addBlock(note.id, type, note.blocks.length)} />
    </div>
  );
}
