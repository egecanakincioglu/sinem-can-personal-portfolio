import { entryLabel, type RegistryEntry } from './field-registry';
import { fold } from './fold';
import { fieldHref } from './task-queue';

export type Searchable = { label: string; hint?: string; keywords?: string[] };
export type LinkCommand = Searchable & { id: string; group: 'Alanlar' | 'Kayıtlar'; href: string };

/** Token match over Turkish-folded text: every word of the query must occur in the label, hint or keywords. */
export function searchCommands<T extends Searchable>(cmds: readonly T[], query: string): T[] {
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  return cmds.filter((c) => {
    const hay = fold([c.label, c.hint ?? '', ...(c.keywords ?? [])].join(' '));
    return tokens.every((t) => hay.includes(t));
  });
}

const EXCERPT = 60;
const excerpt = (s: string) => (s.length > EXCERPT ? `${s.slice(0, EXCERPT).trimEnd()}…` : s);

/** One command per editable field: its label, synonyms and the current value, jumping to and focusing the field. */
export function fieldCommands(registry: readonly RegistryEntry[], values: Record<string, string>): LinkCommand[] {
  return registry
    .filter((e) => e.status === 'ready' && e.label)
    .map((e) => {
      const value = (values[e.id] ?? values[`${e.id}.tr`] ?? '').replace(/\s+/g, ' ').trim();
      return {
        id: `f-${e.id}`,
        group: 'Alanlar' as const,
        label: `Alan: ${entryLabel(e)}`,
        hint: value ? excerpt(value) : undefined,
        keywords: e.synonyms,
        href: fieldHref(e.screen, e.id),
      };
    });
}

type RecordLike = { id: string; title: { tr: string } };

/** One command per project and note record, opening its editor. Notes may be absent. */
export function recordCommands(projects: readonly RecordLike[], notes: readonly RecordLike[] = []): LinkCommand[] {
  const one = (screen: 'projeler' | 'notlar', kind: string) => (r: RecordLike) => ({
    id: `r-${screen}-${r.id}`,
    group: 'Kayıtlar' as const,
    label: `${kind}: ${r.title.tr}`,
    href: `/admin/${screen}/${encodeURIComponent(r.id)}`,
  });
  return [...projects.map(one('projeler', 'Proje')), ...notes.map(one('notlar', 'Not'))];
}
