'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { Glyph, StatusChip } from './feedback';

type FieldMeta = {
  label: string;
  helper?: string;
  error?: string;
  warning?: string;
  counter?: { value: number; max: number };
  derived?: boolean;
  locked?: string; // reason
  draft?: boolean;
  required?: boolean;
};

/** Label + control + helper/error/counter + state suffix. One component for all text types. */
export function Field({
  meta,
  id,
  children,
  lang,
}: {
  meta: FieldMeta;
  id: string;
  children: (p: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
  lang?: string;
}) {
  const hid = `${id}-h`,
    eid = `${id}-e`,
    lid = `${id}-l`;
  const over = meta.counter && meta.counter.value > meta.counter.max;
  const near = meta.counter && !over && meta.counter.value >= meta.counter.max * 0.9;
  const err = meta.error ?? (over ? `En fazla ${meta.counter!.max} karakter.` : undefined);
  const describedBy = [meta.helper && hid, err && eid, meta.locked && lid].filter(Boolean).join(' ') || undefined;
  return (
    <div
      className={`a-field${meta.derived ? ' is-derived' : ''}${meta.locked ? ' is-locked' : ''}${err ? ' has-error' : ''}`}
      lang={lang}
    >
      <div className="a-field-head">
        <label htmlFor={id} className="a-label">
          {meta.label}
          {meta.required && <span className="a-sfx"> · zorunlu</span>}
          {meta.derived && <span className="a-sfx"> · türetilmiş</span>}
          {meta.locked && <span className="a-sfx"> · korumalı</span>}
        </label>
        <span className="a-field-flags">
          {meta.draft && <StatusChip kind="text-draft" />}
          {meta.locked && <StatusChip kind="locked">Kilitli</StatusChip>}
        </span>
      </div>
      {children({ id, describedBy, invalid: !!err })}
      <div className="a-field-foot">
        <div>
          {meta.helper && (
            <p className="a-help" id={hid}>
              {meta.helper}
            </p>
          )}
          {err && (
            <p className="a-err" id={eid}>
              <Glyph name="bang" /> Hata: {err}
            </p>
          )}
          {!err && meta.warning && (
            <p className="a-warn" id={eid}>
              Uyarı: {meta.warning}
            </p>
          )}
          {meta.locked && (
            <p className="a-help" id={lid}>
              {meta.locked}
            </p>
          )}
        </div>
        {meta.counter && (
          <p className={`a-count a-num${over ? ' is-err' : near ? ' is-warn' : ''}`} aria-live="off">
            {near && <span>Uyarı: </span>}
            {over && <span>Hata: </span>}
            {meta.counter.value} / {meta.counter.max}
          </p>
        )}
      </div>
    </div>
  );
}

export function TextField({
  meta,
  value,
  onChange,
  multiline,
  lang,
  name,
}: {
  meta: FieldMeta;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  lang?: string;
  name: string;
}) {
  const id = useId();
  const readOnly = !!meta.derived || !!meta.locked;
  return (
    <Field meta={meta} id={id} lang={lang}>
      {({ id, describedBy, invalid }) =>
        multiline ? (
          <textarea
            id={id}
            name={name}
            data-field={name}
            className="a-input"
            rows={4}
            value={value}
            readOnly={readOnly}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            aria-required={meta.required || undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            id={id}
            name={name}
            data-field={name}
            className="a-input"
            type="text"
            value={value}
            readOnly={readOnly}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            aria-required={meta.required || undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      }
    </Field>
  );
}

/** TR/EN pair: tabs on narrow containers, side by side on wide ones (container query). */
export function BilingualField({
  label,
  helper,
  tr,
  en,
  onTr,
  onEn,
  multiline,
  draft,
  max,
  name,
  errors,
  optional,
}: {
  label: string;
  helper?: string;
  tr: string;
  en: string;
  onTr: (v: string) => void;
  onEn: (v: string) => void;
  multiline?: boolean;
  draft?: boolean;
  max?: number;
  name: string;
  errors?: { tr?: string; en?: string };
  /** Optional pair: both languages empty is fine; a single empty language is still flagged as missing. */
  optional?: boolean;
}) {
  const [tab, setTab] = useState<'tr' | 'en'>('tr');
  const refs = { tr: useRef<HTMLButtonElement>(null), en: useRef<HTMLButtonElement>(null) };
  const trMissing = !tr.trim() && (!optional || !!en.trim()),
    enMissing = !en.trim() && (!optional || !!tr.trim());
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const next = tab === 'tr' ? 'en' : 'tr';
      setTab(next);
      refs[next].current?.focus();
    }
  };
  const tabBtn = (l: 'tr' | 'en', missing: boolean) => (
    <button
      key={l}
      ref={refs[l]}
      type="button"
      role="tab"
      id={`${name}-tab-${l}`}
      aria-selected={tab === l}
      aria-controls={`${name}-pane-${l}`}
      tabIndex={tab === l ? 0 : -1}
      className={`a-tab${tab === l ? ' is-active' : ''}${missing ? ' a-ghost' : ''}`}
      aria-label={`${l === 'tr' ? 'Türkçe' : 'İngilizce'}${missing ? ', eksik' : ''}${errors?.[l] ? ', hata var' : ''}`}
      onClick={() => setTab(l)}
    >
      {l.toUpperCase()}
      {missing && <span className="a-sfx"> eksik</span>}
      {errors?.[l] && <span className="a-sfx"> hata</span>}
    </button>
  );
  const pane = (l: 'tr' | 'en', v: string, set: (x: string) => void, missing: boolean) => (
    <div
      key={l}
      role="tabpanel"
      id={`${name}-pane-${l}`}
      aria-labelledby={`${name}-tab-${l}`}
      className={`a-pane${tab === l ? ' is-shown' : ''}${missing ? ' a-ghost-under' : ''}`}
    >
      <TextField
        name={`${name}.${l}`}
        lang={l}
        multiline={multiline}
        value={v}
        onChange={set}
        meta={{
          label: `${label} · ${l.toUpperCase()}`,
          counter: max ? { value: v.length, max } : undefined,
          error: errors?.[l],
          warning: missing ? `Bu dil henüz yazılmadı; önizlemede [${l.toUpperCase()} eksik] görünür.` : undefined,
        }}
      />
    </div>
  );
  return (
    <div className="a-bi" role="group" aria-labelledby={`${name}-lg`}>
      <div className="a-bi-legend" id={`${name}-lg`}>
        <span>{label}</span>
        {draft && <StatusChip kind="text-draft" />}
        {trMissing && <StatusChip kind="missing">TR eksik</StatusChip>}
        {enMissing && <StatusChip kind="missing">EN eksik</StatusChip>}
      </div>
      {helper && <p className="a-help a-bi-help">{helper}</p>}
      <div className="a-tabs" role="tablist" aria-label={`${label}: dil`} onKeyDown={onKey}>
        {tabBtn('tr', trMissing)}
        {tabBtn('en', enMissing)}
      </div>
      <div className="a-bi-panes">
        {pane('tr', tr, onTr, trMissing)}
        {pane('en', en, onEn, enMissing)}
      </div>
    </div>
  );
}

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = options.findIndex((o) => o.value === value);
  const move = (to: number) => {
    const i = (to + options.length) % options.length;
    onChange(options[i].value);
    refs.current[i]?.focus();
  };
  return (
    <div className="a-seg" role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={String(o.value)}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={i === idx ? 0 : -1}
          className={`a-seg-btn${o.value === value ? ' is-active' : ''}`}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              move(i + 1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              move(i - 1);
            } else if (e.key === 'Home') {
              e.preventDefault();
              move(0);
            } else if (e.key === 'End') {
              e.preventDefault();
              move(options.length - 1);
            }
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Disclosure({
  label,
  children,
  defaultOpen = false,
  meta,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
  meta?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="a-disc">
      <button
        type="button"
        className="a-disc-btn"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>{label}</span>
        {meta}
        <span className="a-disc-mark" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      <div id={id} hidden={!open} className="a-disc-body">
        {children}
      </div>
    </div>
  );
}

/** Hairline record with index/ID meta column and button-based reordering. */
export function RecordRow({
  index,
  meta,
  children,
  onUp,
  onDown,
  onRemove,
  itemLabel,
}: {
  index: number;
  meta?: string;
  children: ReactNode;
  onUp?: () => void;
  onDown?: () => void;
  onRemove?: () => void;
  itemLabel: string;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <li className="a-rec">
      <div className="a-rec-meta">
        <span className="a-num">{String(index + 1).padStart(2, '0')}</span>
        {meta && <span className="a-sfx">{meta}</span>}
      </div>
      <div className="a-rec-body">{children}</div>
      <div className="a-rec-tools">
        <button
          type="button"
          className="a-ibtn"
          disabled={!onUp}
          onClick={onUp}
          aria-label={`${itemLabel} ${index + 1}'i yukarı taşı`}
        >
          <Glyph name="up" />
        </button>
        <button
          type="button"
          className="a-ibtn"
          disabled={!onDown}
          onClick={onDown}
          aria-label={`${itemLabel} ${index + 1}'i aşağı taşı`}
        >
          <Glyph name="down" />
        </button>
        {confirm ? (
          <span className="a-inline-confirm" role="group" aria-label="Silinsin mi?">
            Silinsin mi?
            <button
              type="button"
              className="a-link"
              onClick={() => {
                setConfirm(false);
                onRemove?.();
              }}
            >
              Evet
            </button>
            <button type="button" className="a-link" onClick={() => setConfirm(false)}>
              Vazgeç
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="a-ibtn"
            disabled={!onRemove}
            onClick={() => setConfirm(true)}
            aria-label={`${itemLabel} ${index + 1}'i sil`}
          >
            <Glyph name="x" />
          </button>
        )}
      </div>
    </li>
  );
}

export function ListEditor({
  label,
  min,
  max,
  count,
  onAdd,
  children,
  addLabel = 'Ekle',
}: {
  label: string;
  min: number;
  max: number;
  count: number;
  onAdd: () => void;
  children: ReactNode;
  addLabel?: string;
}) {
  const full = count >= max;
  return (
    <div className="a-list">
      <div className="a-list-head">
        <span className="a-label">{label}</span>
        <span className="a-count a-num" role="status">
          {count} / {max}
        </span>
      </div>
      <ol className="a-recs">{children}</ol>
      {count < min && (
        <p className="a-err">
          <Glyph name="bang" /> Hata: En az {min} öğe gerekli.
        </p>
      )}
      <button type="button" className="a-btn" disabled={full} onClick={onAdd}>
        <Glyph name="plus" /> {addLabel}
      </button>
      {full && <p className="a-help">En fazla {max} öğe eklenebilir.</p>}
    </div>
  );
}
