'use client';

import { useState } from 'react';
import type { Copy } from '@/content/types';
import type { QuantityForm } from '@/lib/project-edit';
import { BilingualField, ListEditor, RecordRow, TextField } from '../../../ui/controls';
import { Glyph } from '../../../ui/feedback';

export const MAX_ITEMS = 20;
export const emptyCopy = (): Copy => ({ tr: '', en: '' });

/** The field wrapper adds "Hata: " itself, so a message that already starts with it is trimmed. */
export const bare = (m?: string): string | undefined => m?.replace(/^(Hata|Uyarı): /, '');

export function moved<T>(list: readonly T[], i: number, d: -1 | 1): T[] {
  const next = [...list];
  [next[i], next[i + d]] = [next[i + d], next[i]];
  return next;
}

const isBlankCopy = (c: Copy | undefined) => !c || (!c.tr.trim() && !c.en.trim());

/** A list of bilingual paragraphs or names. */
export function CopyList({
  label,
  name,
  itemLabel,
  items,
  onChange,
  multiline,
}: {
  label: string;
  name: string;
  itemLabel: string;
  items: readonly Copy[];
  onChange: (next: Copy[]) => void;
  multiline?: boolean;
}) {
  const edit = (i: number, c: Copy) => onChange(items.map((x, j) => (i === j ? c : x)));
  return (
    <ListEditor
      label={label}
      min={0}
      max={MAX_ITEMS}
      count={items.length}
      addLabel={`${itemLabel} ekle`}
      onAdd={() => onChange([...items, emptyCopy()])}
    >
      {items.map((c, i) => (
        <RecordRow
          key={i}
          index={i}
          itemLabel={itemLabel}
          onUp={i > 0 ? () => onChange(moved(items, i, -1)) : undefined}
          onDown={i < items.length - 1 ? () => onChange(moved(items, i, 1)) : undefined}
          onRemove={() => onChange(items.filter((_, j) => j !== i))}
        >
          <BilingualField
            name={`${name}.${i}`}
            label={`${itemLabel} ${i + 1}`}
            multiline={multiline}
            tr={c.tr}
            en={c.en}
            onTr={(v) => edit(i, { ...c, tr: v })}
            onEn={(v) => edit(i, { ...c, en: v })}
          />
        </RecordRow>
      ))}
    </ListEditor>
  );
}

/** An optional bilingual value: both languages empty removes it. */
export function OptionalCopy({
  name,
  label,
  value,
  onChange,
  multiline,
}: {
  name: string;
  label: string;
  value: Copy | undefined;
  onChange: (next: Copy | undefined) => void;
  multiline?: boolean;
}) {
  const v = value ?? emptyCopy();
  const set = (c: Copy) => onChange(isBlankCopy(c) ? undefined : c);
  return (
    <BilingualField
      name={name}
      label={label}
      optional
      multiline={multiline}
      tr={v.tr}
      en={v.en}
      onTr={(x) => set({ ...v, tr: x })}
      onEn={(x) => set({ ...v, en: x })}
    />
  );
}

/* ---------- quantities: measurements, calculation givens and results ---------- */

type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };
type Quantity = { symbol?: string; label: Copy; value: number; digits?: number; unit?: string; note?: Copy };

const blankForm = (): QuantityForm => ({
  symbol: '',
  label: emptyCopy(),
  value: '',
  digits: '',
  unit: '',
  verified: false,
});

const formOf = (q: Quantity): QuantityForm => ({
  symbol: q.symbol ?? '',
  label: q.label,
  value: String(q.value).replace('.', ','),
  digits: q.digits === undefined ? '' : String(q.digits),
  unit: q.unit ?? '',
  ...(q.note ? { note: q.note } : {}),
  verified: true,
});

const decimal = (n: number) => String(n).replace('.', ',');

export const quantityText = (q: Quantity): string =>
  `${q.symbol ? `${q.symbol} = ` : ''}${q.label.tr || q.label.en || '—'}: ${decimal(q.value)}${q.unit ? ` ${q.unit}` : ''}`;

/** The entry form: units stay apart from values, and an unverified value is refused with a message. */
export function QuantityEditor<T>({
  name,
  withSymbol,
  askVerified,
  initial,
  submitLabel,
  convert,
  onSubmit,
  onCancel,
}: {
  name: string;
  withSymbol?: boolean;
  /** Measurements and results need the "Doğrulandı" tick; calculation givens do not carry it. */
  askVerified: boolean;
  initial?: Quantity;
  submitLabel: string;
  convert: (form: QuantityForm) => Outcome<T>;
  onSubmit: (value: T) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<QuantityForm>(initial ? formOf(initial) : blankForm());
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<QuantityForm>) => {
    setForm({ ...form, ...patch });
    setError(null);
  };
  const submit = () => {
    const out = convert(askVerified ? form : { ...form, verified: true });
    if (!out.ok) {
      setError(out.error);
      return;
    }
    onSubmit(out.value);
    if (!initial) setForm(blankForm());
  };
  return (
    <div className="a-cad-form" role="group" aria-label={submitLabel}>
      {withSymbol && (
        <TextField
          name={`${name}.symbol`}
          meta={{ label: 'Simge' }}
          value={form.symbol ?? ''}
          onChange={(v) => set({ symbol: v })}
        />
      )}
      <BilingualField
        name={`${name}.label`}
        label="Ad"
        tr={form.label.tr}
        en={form.label.en}
        onTr={(v) => set({ label: { ...form.label, tr: v } })}
        onEn={(v) => set({ label: { ...form.label, en: v } })}
      />
      <TextField
        name={`${name}.value`}
        meta={{ label: 'Değer', helper: 'Virgül ya da nokta kullanılabilir.' }}
        value={form.value}
        onChange={(v) => set({ value: v })}
      />
      <TextField
        name={`${name}.unit`}
        meta={{ label: 'Birim', helper: 'Değerden ayrı yazılır.' }}
        value={form.unit ?? ''}
        onChange={(v) => set({ unit: v })}
      />
      <TextField
        name={`${name}.digits`}
        meta={{ label: 'Basamak sayısı', helper: 'İsteğe bağlı; 0 ile 6 arasında.' }}
        value={form.digits ?? ''}
        onChange={(v) => set({ digits: v })}
      />
      {askVerified && (
        <>
          <OptionalCopy name={`${name}.note`} label="Not" value={form.note} onChange={(c) => set({ note: c })} />
          <label className="a-check">
            <input type="checkbox" checked={form.verified} onChange={(e) => set({ verified: e.target.checked })} />
            Doğrulandı
          </label>
        </>
      )}
      {error && (
        <p className="a-err" role="alert">
          <Glyph name="bang" /> {error}
        </p>
      )}
      <div className="a-proj-actions">
        <button type="button" className="a-btn a-btn-primary" onClick={submit}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="a-btn" onClick={onCancel}>
            Vazgeç
          </button>
        )}
      </div>
    </div>
  );
}

/** A list of quantities: each row can be edited through the form, reordered or removed. */
export function QuantityList<T extends Quantity>({
  name,
  itemLabel,
  items,
  onChange,
  convert,
  withSymbol,
  askVerified,
}: {
  name: string;
  itemLabel: string;
  items: readonly T[];
  onChange: (next: T[]) => void;
  convert: (form: QuantityForm) => Outcome<T>;
  withSymbol?: boolean;
  askVerified: boolean;
}) {
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  return (
    <div className="a-list">
      <div className="a-list-head">
        <span className="a-label">{itemLabel} listesi</span>
        <span className="a-count a-num">
          {items.length} / {MAX_ITEMS}
        </span>
      </div>
      <ol className="a-recs">
        {items.map((q, i) => (
          <RecordRow
            key={i}
            index={i}
            itemLabel={itemLabel}
            onUp={i > 0 ? () => onChange(moved(items, i, -1)) : undefined}
            onDown={i < items.length - 1 ? () => onChange(moved(items, i, 1)) : undefined}
            onRemove={() => {
              setEditing(null);
              onChange(items.filter((_, j) => j !== i));
            }}
          >
            {editing === i ? (
              <QuantityEditor
                name={`${name}.${i}`}
                withSymbol={withSymbol}
                askVerified={askVerified}
                initial={q}
                submitLabel={`${itemLabel} ${i + 1} kaydet`}
                convert={convert}
                onSubmit={(v) => {
                  onChange(items.map((x, j) => (j === i ? v : x)));
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <p className="a-num">{quantityText(q)}</p>
                <button type="button" className="a-link" onClick={() => setEditing(i)}>
                  {itemLabel} {i + 1} düzenle
                </button>
              </>
            )}
          </RecordRow>
        ))}
      </ol>
      {editing === 'new' ? (
        <QuantityEditor
          name={`${name}.new`}
          withSymbol={withSymbol}
          askVerified={askVerified}
          submitLabel={`${itemLabel} ekle`}
          convert={convert}
          onSubmit={(v) => {
            onChange([...items, v]);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button type="button" className="a-btn" disabled={items.length >= MAX_ITEMS} onClick={() => setEditing('new')}>
          <Glyph name="plus" /> {itemLabel} ekle
        </button>
      )}
    </div>
  );
}
