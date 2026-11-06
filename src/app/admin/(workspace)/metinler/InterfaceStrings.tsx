'use client';

import Link from 'next/link';
import { useId, useState, type ReactNode } from 'react';
import { getSiteContent } from '@/content/site-content';
import { dictAt, type InterfaceString } from '@/lib/interface-strings';
import { checkCopy, controlId, interfaceStrings } from '@/lib/preview-bridge';
import { BilingualField, Segmented } from '../../ui/controls';
import { EmptyState, StatusChip } from '../../ui/feedback';
import { PageHeader, Section } from '../../ui/PageHeader';
import { useAdmin } from '../../ui/store';
import { fold, screenBySlug } from '../../screens';

const screen = screenBySlug('metinler')!;
type Filter = 'all' | 'missing';
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'missing', label: 'Eksik' },
];
type Pair = { tr: string; en: string };

/** Groups the preview cannot show: the Homepage preview never renders these pages. */
const noPreview = new Set(['meta', 'projects', 'notes', 'notFound']);
const groupNote = (group: string, count: number) =>
  `${count} metin. ${
    group === 'profile'
      ? 'Bu metinler Profil sayfasındadır; sonucu Profil ekranının önizlemesinde görürsünüz.'
      : noPreview.has(group)
        ? 'Önizleme yok: bu metinler Ana sayfa önizlemesinde görünmez.'
        : ''
  }`.trim();

/** Read-only text pair: derived, locked, or edited on another screen. */
function ReadOnlyRow({ d, text, children }: { d: InterfaceString; text: Pair; children: ReactNode }) {
  return (
    <div className={`a-field a-str-ro${d.kind === 'locked' ? ' is-locked' : ' is-derived'}`}>
      <div className="a-field-head">
        <span className="a-label">
          {d.path}
          {d.kind === 'locked' && <span className="a-sfx"> · korumalı</span>}
          {d.kind === 'derived' && <span className="a-sfx"> · türetilmiş</span>}
        </span>
        {d.kind === 'locked' && <StatusChip kind="locked">Kilitli</StatusChip>}
      </div>
      <dl className="a-str-pair">
        <dt>TR</dt>
        <dd lang="tr">{text.tr}</dd>
        <dt>EN</dt>
        <dd lang="en">{text.en}</dd>
      </dl>
      <p className="a-help">{children}</p>
    </div>
  );
}

export function InterfaceStrings() {
  const { state, setValue, derived } = useAdmin();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const searchId = useId();
  const all = interfaceStrings();
  const defaults = getSiteContent().dict;

  const shown = (d: InterfaceString, root: unknown): Pair =>
    (dictAt(root, d.path) as Pair | undefined) ?? { tr: '', en: '' };
  const current = (d: InterfaceString): Pair => {
    const base = shown(d, defaults);
    const id = controlId(d);
    return { tr: state.values[`${id}.tr`] ?? base.tr, en: state.values[`${id}.en`] ?? base.en };
  };
  const editable = all.filter((d) => (d.kind === 'editable' || d.kind === 'alias') && !d.owner);
  const controls = editable.filter((d) => d.kind === 'editable');
  const sharedWith = (d: InterfaceString) => editable.filter((x) => x.aliasOf === d.path).map((x) => x.path);
  const missingEn = controls.filter((d) => !current(d).en.trim()).length;

  const needle = fold(query.trim());
  const visible = (d: InterfaceString): boolean => {
    if (d.kind === 'alias') return false;
    const hasControl = d.kind === 'editable' && !d.owner;
    const text = hasControl ? current(d) : shown(d, derived.dict);
    if (filter === 'missing' && !(hasControl && (!text.tr.trim() || !text.en.trim()))) return false;
    return !needle || fold(`${d.path} ${text.tr} ${text.en}`).includes(needle);
  };

  const row = (d: InterfaceString) => {
    if (d.kind === 'locked')
      return (
        <ReadOnlyRow key={d.id} d={d} text={shown(d, derived.dict)}>
          {d.reason}
        </ReadOnlyRow>
      );
    if (d.owner) {
      const target = screenBySlug(d.owner);
      const root = d.aliasOf ?? d.path;
      const places = all.filter((x) => x.owner && (x.aliasOf ?? x.path) === root).length;
      return (
        <ReadOnlyRow key={d.id} d={d} text={shown(d, derived.dict)}>
          Bu metin <Link href={`/admin/${d.owner}`}>{target?.title ?? d.owner} ekranından</Link> düzenlenir
          {places > 1 && ` · aynı metin ${places} yerde`}.
        </ReadOnlyRow>
      );
    }
    if (d.kind === 'derived')
      return (
        <ReadOnlyRow key={d.id} d={d} text={shown(d, derived.dict)}>
          Kayıttan gelir; kayıtlar değişince kendiliğinden güncellenir.
        </ReadOnlyRow>
      );
    const text = current(d);
    const also = sharedWith(d);
    return (
      <BilingualField
        key={d.id}
        name={d.id}
        label={d.path}
        helper={
          also.length
            ? `Aynı metin ${also.length + 1} yerde kullanılır (${[d.path, ...also].join(', ')}); bir düzenleme hepsini değiştirir.`
            : undefined
        }
        max={d.max}
        multiline={d.max > 120}
        tr={text.tr}
        en={text.en}
        onTr={(x) => setValue(`${controlId(d)}.tr`, x)}
        onEn={(x) => setValue(`${controlId(d)}.en`, x)}
        errors={{ tr: checkCopy(d, text.tr), en: checkCopy(d, text.en) }}
      />
    );
  };

  const groups = screen.sections
    .map((s) => ({ s, rows: all.filter((d) => d.group === s.id && visible(d)) }))
    .filter((g) => g.rows.length > 0);

  return (
    <>
      <PageHeader
        kicker="Pafta 07"
        title={screen.title}
        lede={screen.lede}
        aside={
          <p className="a-num">
            <span className="a-nowrap">{all.length} metin</span> ·{' '}
            <span className="a-nowrap">EN eksik: {missingEn}</span>
          </p>
        }
      />
      <div className="a-str-bar">
        <div className="a-field">
          <label htmlFor={searchId} className="a-label">
            Metin ara
          </label>
          <input
            id={searchId}
            type="search"
            className="a-input"
            placeholder="Türkçe metin, İngilizce metin ya da anahtar yolu"
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Segmented label="Metin süzgeci" options={filters} value={filter} onChange={setFilter} />
      </div>
      {groups.length === 0 && (
        <EmptyState title="Eşleşen metin yok">Aramayı kısaltın ya da süzgeci Tümü yapın.</EmptyState>
      )}
      {groups.map(({ s, rows }) => (
        <Section key={s.id} id={s.id} title={s.label} note={groupNote(s.id, rows.length)}>
          {rows.map(row)}
        </Section>
      ))}
    </>
  );
}
