import type { ProjectRecord } from '@/content/projects/types';
import { mergeSiteContent, type SiteContent } from '@/content/site-content';
import type { Issue } from './admin-issues';
import type { MockNote } from './note-record';
import { buildOverride } from './preview-bridge';

/* ------------------------------------------------------------------------------------------------
   Simulated publishing, pure: what changed between two states, the revision list, and which checks
   block a publish or only need an acknowledgement. Nothing here talks to a server.
   ------------------------------------------------------------------------------------------------ */

export type Delta = { before: string; after: string };
/** One changed field: a bilingual text carries `tr` and/or `en`, everything else `shared`. */
export type Change = {
  path: string;
  /** Admin wording for the row when the path alone is not readable (note fields name the note by title). */
  label?: string;
  /** Title of the project a field change belongs to; the row names the record by it, never by its id. */
  title?: string;
  /** Set when the whole record was added or removed; such a row has no before and after text. */
  record?: 'added' | 'removed';
  tr?: Delta;
  en?: Delta;
  shared?: Delta;
};
export type WorkSnapshot = { values: Record<string, string>; projects: ProjectRecord[]; notes: MockNote[] };
export type Revision = { rev: number; at: string; changes: Change[]; state: WorkSnapshot };

type Leaf = { tr: string; en: string } | { shared: string };

const isCopy = (v: unknown): v is { tr: string; en: string } =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as Record<string, unknown>).tr === 'string' &&
  typeof (v as Record<string, unknown>).en === 'string';

/** Every leaf of a value keyed by path. A localised pair is one leaf; array elements are addressed by index. */
export function flattenContent(value: unknown): Map<string, Leaf> {
  const out = new Map<string, Leaf>();
  const walk = (v: unknown, p: string) => {
    if (v === undefined || typeof v === 'function') return;
    if (isCopy(v)) out.set(p, { tr: v.tr, en: v.en });
    else if (Array.isArray(v)) v.forEach((item, i) => walk(item, `${p}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, item] of Object.entries(v)) walk(item, p ? `${p}.${k}` : k);
    else out.set(p, { shared: String(v) });
  };
  walk(value, '');
  return out;
}

const side = (leaf: Leaf | undefined, key: 'tr' | 'en' | 'shared'): string =>
  leaf && key in leaf ? (leaf as Record<string, string>)[key] : '';

function diffLeaves(a: Map<string, Leaf>, b: Map<string, Leaf>, prefix: string): Change[] {
  const changes: Change[] = [];
  for (const path of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const x = a.get(path);
    const y = b.get(path);
    const change: Change = { path: prefix + path };
    for (const key of ['tr', 'en', 'shared'] as const) {
      const before = side(x, key);
      const after = side(y, key);
      if (before !== after) change[key] = { before, after };
    }
    if (change.tr || change.en || change.shared) changes.push(change);
  }
  return changes;
}

export const diffContent = (a: SiteContent, b: SiteContent): Change[] =>
  diffLeaves(flattenContent(a), flattenContent(b), '');

export const UNTITLED = 'Başlıksız kayıt';

/** Development samples never leave development, so no change list mentions them. */
const real = <T extends { fixture?: boolean }>(list: readonly T[]): T[] => list.filter((r) => !r.fixture);

/** Records are matched by id: a new id is an addition, a missing id a removal, the rest compare field by field. */
export function diffRecords(a: readonly ProjectRecord[], b: readonly ProjectRecord[]): Change[] {
  const changes: Change[] = [];
  const before = new Map(real(a).map((r) => [r.id, r]));
  const after = new Map(real(b).map((r) => [r.id, r]));
  for (const id of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const x = before.get(id);
    const y = after.get(id);
    const title = (y ?? x)!.title.tr.trim() || UNTITLED;
    if (!x || !y) {
      changes.push({
        path: `project.${id}`,
        label: `Proje “${title}”`,
        record: x ? 'removed' : 'added',
      });
    } else {
      for (const c of diffLeaves(flattenContent(x), flattenContent(y), `project.${id}.`)) changes.push({ ...c, title });
    }
  }
  return changes;
}

const NOTE_FIELDS: Record<string, string> = {
  blocks: 'Gövde, blok',
  footnotes: 'Dipnot',
  references: 'Kaynak',
  revisions: 'Revizyon',
  tags: 'Etiket',
  slug: 'Adres parçası',
  title: 'Başlık',
  subtitle: 'Alt başlık',
  summary: 'Özet',
  category: 'Konu',
  coverAlt: 'Kapak alternatif metni',
  status: 'Durum',
  approved: 'Onay',
  featured: 'Öne çıkan',
  published: 'Yayım tarihi',
  updated: 'Güncelleme tarihi',
  langs: 'Diller',
  relatedIds: 'İlgili notlar',
};

/** "Not “Title” · Gövde, blok 3" for a flattened note path such as `blocks[2].text`. */
function noteLabel(title: string, field: string): string {
  const m = /^([A-Za-z]+)(?:\[(\d+)\])?/.exec(field);
  const name = m ? (NOTE_FIELDS[m[1]] ?? m[1]) : field;
  return `Not “${title}” · ${m?.[2] === undefined ? name : `${name} ${Number(m[2]) + 1}`}`;
}

/** Notes are matched by id like project records; changes are labelled with the note title. */
export function diffNotes(a: readonly MockNote[], b: readonly MockNote[]): Change[] {
  const changes: Change[] = [];
  const before = new Map(real(a).map((n) => [n.id, n]));
  const after = new Map(real(b).map((n) => [n.id, n]));
  for (const id of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const x = before.get(id);
    const y = after.get(id);
    const title = (y ?? x)!.title.tr.trim() || UNTITLED;
    if (!x || !y) {
      changes.push({ path: `note.${id}`, label: `Not “${title}”`, record: x ? 'removed' : 'added' });
      continue;
    }
    for (const c of diffLeaves(flattenContent(x), flattenContent(y), `note.${id}.`)) {
      changes.push({ ...c, label: noteLabel(title, c.path.slice(`note.${id}.`.length)) });
    }
  }
  return changes;
}

/** Everything that differs between two work states: the public content they would produce, and the records. */
export const changesBetween = (a: WorkSnapshot, b: WorkSnapshot): Change[] => [
  ...diffContent(mergeSiteContent(buildOverride(a.values)), mergeSiteContent(buildOverride(b.values))),
  ...diffRecords(a.projects, b.projects),
  ...diffNotes(a.notes, b.notes),
];

/** Local clock as `YYYY-MM-DDTHH:MM`; the first ten characters are the date shown as the simulated revision date. */
export function stamp(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** A short single-line excerpt for change lists. */
export function excerpt(text: string, max = 80): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** A, B … Z, AA, AB … */
export const revLetter = (n: number): string => {
  let out = '';
  let i = n;
  do {
    out = String.fromCharCode(65 + (i % 26)) + out;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return out;
};

/** Newest first; the oldest entries drop off beyond `max`. */
export const pushRevision = (list: readonly Revision[], r: Revision, max = 10): Revision[] =>
  [r, ...list].slice(0, max);

export type AckGroup = { group: string; items: Issue[] };

/** Errors block the publish; warnings need one acknowledgement per group. */
export function publishChecks(issues: readonly Issue[]): { blocking: Issue[]; acknowledge: AckGroup[] } {
  const acknowledge: AckGroup[] = [];
  for (const issue of issues) {
    if (issue.severity !== 'warning') continue;
    const found = acknowledge.find((g) => g.group === issue.group);
    if (found) found.items.push(issue);
    else acknowledge.push({ group: issue.group, items: [issue] });
  }
  return { blocking: issues.filter((i) => i.severity === 'error'), acknowledge };
}
