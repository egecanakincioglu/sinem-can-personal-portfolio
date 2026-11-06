'use client';

import { useMemo, useState } from 'react';
import { dict } from '@/content/dictionary';
import type { Discipline, ProjectKind } from '@/content/projects/types';
import type { Locale } from '@/content/types';
import type { ProjectCard } from '@/lib/projects';
import { ProjectRow } from './ProjectRow';

/** The type filter appears only from six published records upward. */
const FILTER_THRESHOLD = 6;

/** Text tabs — the active one is set in italics, like the running head. */
function Tabs<T extends string>({
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: { id: T; name: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  const tab = (id: T | null, name: string) => (
    <li key={id ?? 'all'}>
      <button
        type="button"
        aria-pressed={value === id}
        onClick={() => onChange(id)}
        className={`inline-flex min-h-11 items-center px-0.5 text-[15px] ${value === id ? 'serif text-[17px] italic' : 'ulink text-kursun'}`}
      >
        {name}
      </button>
    </li>
  );
  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
      <p className="t-meta w-24 shrink-0">{label}</p>
      <ul className="flex flex-wrap gap-x-5">
        {tab(null, allLabel)}
        {options.map((o) => tab(o.id, o.name))}
      </ul>
    </div>
  );
}

/**
 * The record list. `total` is the size of the whole archive (featured record included), so the
 * filter threshold counts every published record, not only the rows shown here.
 */
export function ArchiveList({ cards, total, locale }: { cards: ProjectCard[]; total: number; locale: Locale }) {
  const d = dict.projects;
  const [kind, setKind] = useState<ProjectKind | null>(null);
  const [disc, setDisc] = useState<Discipline | null>(null);

  const kinds = useMemo(() => {
    const m = new Map<ProjectKind, string>();
    cards.forEach((c) => m.set(c.kind, c.kindLabel));
    return [...m].map(([id, name]) => ({ id, name }));
  }, [cards]);
  const disciplines = useMemo(() => {
    const m = new Map<Discipline, string>();
    cards.forEach((c) => c.disciplines.forEach((x, i) => m.set(x, c.disciplineLabels[i])));
    return [...m].map(([id, name]) => ({ id, name }));
  }, [cards]);

  const shown = cards.filter((c) => (!kind || c.kind === kind) && (!disc || c.disciplines.includes(disc)));
  const filterable = total >= FILTER_THRESHOLD;

  return (
    <div>
      {filterable && (
        <div role="group" aria-label={d.filterGroup[locale]} className="mb-6 flex flex-col gap-1">
          <Tabs label={d.filterKind[locale]} allLabel={d.all[locale]} options={kinds} value={kind} onChange={setKind} />
          <Tabs
            label={d.filterDiscipline[locale]}
            allLabel={d.all[locale]}
            options={disciplines}
            value={disc}
            onChange={setDisc}
          />
        </div>
      )}
      {/* aria-live: screen-reader users hear the list change after a filter is chosen */}
      <ul className={filterable ? '' : 'border-b border-cizgi'} aria-live={filterable ? 'polite' : undefined}>
        {shown.map((c) => (
          <ProjectRow key={c.id} card={c} locale={locale} />
        ))}
      </ul>
      {shown.length === 0 && <p className="serif py-8 text-[22px] text-kursun">{d.noMatch[locale]}</p>}
    </div>
  );
}
