/* ------------------------------------------------------------------------------------------------
   Field registry: shape and pure helpers. DEVELOPMENT ONLY (Admin mock).
   The data lives in app/admin/registry.ts; this file knows nothing about screens or wording, so the
   coverage rules can be tested on their own.

   A "public field" is a leaf of the public content model. Leaves are addressed by a dotted path;
   array elements use `[]` (`education[].institution`). A registry entry covers a leaf when its `path`
   equals the leaf, or when it ends in `.*` and the leaf lies below that prefix. The most specific entry
   wins, so a group can be declared planned while single fields inside it already have an editor.
   ------------------------------------------------------------------------------------------------ */

type FieldStatus = 'ready' | 'planned';
export type FieldLocale = 'bilingual' | 'shared';
export type FieldType = 'text' | 'number' | 'toggle' | 'choice' | 'list' | 'record' | 'media';

export type RegistryEntry = {
  /** Stable id: the editor field id where one exists, otherwise derived from the path. */
  id: string;
  /** Public path this entry covers; a trailing `.*` covers every leaf below the prefix. */
  path: string;
  /** Admin wording (Turkish) for the field or group. */
  label?: string;
  /** Other words the command palette matches besides the label. */
  synonyms?: string[];
  /** Public location: page and section as visitors know them. */
  page: string;
  section: string;
  /** Admin screen slug and the section of that screen which edits the field. */
  screen: string;
  editorSection?: string;
  status: FieldStatus;
  locale: FieldLocale;
  type: FieldType;
  /** Shown or computed from other fields; the editor lists it read-only. */
  derived?: boolean;
};

const isCopy = (v: unknown): boolean =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as Record<string, unknown>).tr === 'string' &&
  typeof (v as Record<string, unknown>).en === 'string';

/** Every leaf path of a content value: a localised pair, a primitive, null or an empty container is one leaf.
 *  Array elements share one path, so a list contributes the union of its elements' fields. */
export function publicLeaves(value: unknown, prefix = ''): string[] {
  const out = new Set<string>();
  const walk = (v: unknown, p: string) => {
    if (isCopy(v) || v === null || typeof v !== 'object') {
      out.add(p);
    } else if (Array.isArray(v)) {
      if (v.length === 0) out.add(`${p}[]`);
      for (const item of v) walk(item, `${p}[]`);
    } else {
      const keys = Object.keys(v);
      if (keys.length === 0) out.add(p);
      for (const k of keys) walk((v as Record<string, unknown>)[k], p ? `${p}.${k}` : k);
    }
  };
  walk(value, prefix);
  return [...out].sort();
}

/** How well `entry` matches `leaf`: -1 = not at all, larger = more specific. */
function specificity(entry: RegistryEntry, leaf: string): number {
  if (entry.path === leaf) return Number.POSITIVE_INFINITY;
  if (entry.path.endsWith('.*') && leaf.startsWith(entry.path.slice(0, -1))) return entry.path.length;
  return -1;
}

/** Admin wording for an entry: its label, or the page and section when it has none. Never a raw path. */
export const entryLabel = (e: RegistryEntry): string => e.label ?? `${e.page} › ${e.section}`;

/** The most specific entry covering `path`. Array indices (`items[2].name`) count as the shared `[]` form. */
export function entryFor(entries: readonly RegistryEntry[], path: string): RegistryEntry | undefined {
  const leaf = path.replace(/\[\d+\]/g, '[]');
  let best: RegistryEntry | undefined;
  let bestScore = -1;
  for (const e of entries) {
    const s = specificity(e, leaf);
    if (s > bestScore) {
      best = e;
      bestScore = s;
    }
  }
  return best;
}

export type Coverage = {
  /** Leaf -> the entry that owns it. */
  owner: Map<string, RegistryEntry>;
  /** Leaves no entry covers. */
  uncovered: string[];
  /** Entries that own no leaf: their public field no longer exists. */
  stale: RegistryEntry[];
  /** Entry ids or paths that appear more than once. */
  duplicates: string[];
};

export function checkCoverage(entries: readonly RegistryEntry[], leaves: readonly string[]): Coverage {
  const owner = new Map<string, RegistryEntry>();
  const uncovered: string[] = [];
  for (const leaf of leaves) {
    const best = entryFor(entries, leaf);
    if (best) owner.set(leaf, best);
    else uncovered.push(leaf);
  }
  const used = new Set(owner.values());
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const e of entries) {
    for (const key of [`id:${e.id}`, `path:${e.path}`]) {
      if (seen.has(key)) duplicates.push(key);
      seen.add(key);
    }
  }
  return { owner, uncovered, stale: entries.filter((e) => !used.has(e)), duplicates };
}

export type CoverageRow = { entry: RegistryEntry; fields: number };
export type CoverageSummary = { total: number; ready: number; planned: number; rows: CoverageRow[] };

/** Counts public fields (leaves), not entries: a group entry counts every leaf it owns. */
export function summarize(entries: readonly RegistryEntry[], leaves: readonly string[]): CoverageSummary {
  const { owner } = checkCoverage(entries, leaves);
  const counts = new Map<RegistryEntry, number>();
  for (const e of owner.values()) counts.set(e, (counts.get(e) ?? 0) + 1);
  const rows = entries.flatMap((entry) => {
    const fields = counts.get(entry);
    return fields ? [{ entry, fields }] : [];
  });
  const ready = rows.filter((r) => r.entry.status === 'ready').reduce((n, r) => n + r.fields, 0);
  const planned = rows.filter((r) => r.entry.status === 'planned').reduce((n, r) => n + r.fields, 0);
  return { total: ready + planned, ready, planned, rows };
}
