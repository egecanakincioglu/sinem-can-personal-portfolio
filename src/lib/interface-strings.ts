import { dict, dictTemplate } from '@/content/dictionary';

/* ------------------------------------------------------------------------------------------------
   Interface strings: one descriptor per localised leaf of the dictionary. DEVELOPMENT ONLY (Admin mock).
   The Arayüz metinleri screen, the registry and the preview bridge all read this one list, so a new
   dictionary key shows up everywhere without a second table.
   ------------------------------------------------------------------------------------------------ */

type StringKind = 'editable' | 'derived' | 'locked' | 'alias';

export type InterfaceString = {
  /** Dotted path inside the dictionary; array elements use `[i]` (`projects.legend[2]`). */
  path: string;
  /** `metinler.<path>`: the editor field id, stored as `<id>.tr` and `<id>.en`. */
  id: string;
  /** Screen group: the first path segment; the two top-level keys belong to `nav`. */
  group: string;
  kind: StringKind;
  /** Runtime `{tokens}` left in the resolved text; an edit must keep every one of them. */
  tokens: string[];
  /** Characters: max(24, ceil(1.5 x the longest default)). */
  max: number;
  /** Alias only: the path of the first use of the same shared string; that path owns the control. */
  aliasOf?: string;
  /** Locked only: why the text is not editable. */
  reason?: string;
  /** Slug of the screen that already edits this key; the row links there instead of editing twice. */
  owner?: string;
};

const FIXTURE = 'Geliştirme örneği işareti; dürüstlük gereği yalnızca kodda değişir.';
const AUTO_FIGURE = 'Şekil numarası otomatik verilir; yalnızca kodda değişir.';
const CONCEPTUAL = 'Vektörlerin kavramsal olduğunu belirten dürüstlük metni.';
const SPLIT = 'Uyguladım ve Gözlemledim ayrımı dürüstlük kuralıdır.';

/** Locked strings: read-only, with the reason shown as plain text. */
export const lockedStrings: Readonly<Record<string, string>> = {
  langNames: 'Dil adları kendi dillerinde yazılır.',
  'forces.figure': AUTO_FIGURE,
  'forces.caption': CONCEPTUAL,
  'forces.note': CONCEPTUAL,
  'workshop.applied': SPLIT,
  'workshop.observed': SPLIT,
  'approach.figure': AUTO_FIGURE,
  'approach.exaggeration': 'Çökme abartısını bildiren metin; sayılar çizimden gelir, yalnızca kodda değişir.',
  'approach.assumptions': 'Fizik varsayımları; yalnızca kodda değişir.',
  'projects.fixtureLabel': FIXTURE,
  'projects.fixtureShort': FIXTURE,
  'projects.viewer.demo': FIXTURE,
  'notes.fixtureLabel': FIXTURE,
  'notes.sampleAuthor': FIXTURE,
};

type Pair = { tr: string; en: string };
type Leaf = { path: string; tpl: object; templateTr: string; tr: string; en: string };

const isCopy = (v: unknown): v is Pair =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as Record<string, unknown>).tr === 'string' &&
  typeof (v as Record<string, unknown>).en === 'string';

/** Template and resolved dictionary have the same shape, so one walk reads both. */
function leaves(tpl: unknown, res: unknown, path: string, out: Leaf[]) {
  if (isCopy(tpl) && isCopy(res)) {
    out.push({ path, tpl, templateTr: tpl.tr, tr: res.tr, en: res.en });
  } else if (Array.isArray(tpl)) {
    tpl.forEach((t, i) => leaves(t, (res as unknown[])[i], `${path}[${i}]`, out));
  } else if (tpl && typeof tpl === 'object') {
    for (const [k, t] of Object.entries(tpl)) {
      leaves(t, (res as Record<string, unknown>)[k], path ? `${path}.${k}` : k, out);
    }
  }
}

const TOKEN = /\{[^{}]*\}/g;

/** A template made only of static tokens and punctuation is filled from the records, never typed. */
const onlyTokens = (t: string) => t.includes('{') && !/[\p{L}\p{N}]/u.test(t.replace(TOKEN, ''));

const groupOf = (path: string) => {
  const head = path.split(/[.[]/)[0];
  return head === 'skip' || head === 'langNames' ? 'nav' : head;
};

/** `ownerOf` names the screen that already edits a path (the Homepage editor table), if any. */
export function describeInterfaceStrings(
  ownerOf: (path: string) => string | undefined = () => undefined,
): InterfaceString[] {
  const all: Leaf[] = [];
  leaves(dictTemplate, dict, '', all);
  // One shared string (one object in the template) is one unit. If a path of the unit is edited on another screen,
  // the whole unit belongs to that screen; otherwise it is one control here.
  const unit = new Map<object, string[]>();
  for (const l of all) unit.set(l.tpl, [...(unit.get(l.tpl) ?? []), l.path]);
  const ownedPath = (l: Leaf) => unit.get(l.tpl)!.find((p) => ownerOf(p));
  return all.map((l): InterfaceString => {
    const reason = lockedStrings[l.path];
    const root = ownedPath(l);
    const owner = ownerOf(l.path) ?? (root && ownerOf(root));
    let kind: StringKind = reason ? 'locked' : !owner && onlyTokens(l.templateTr) ? 'derived' : 'editable';
    let aliasOf: string | undefined;
    if (kind === 'editable') {
      const head = root ?? unit.get(l.tpl)![0];
      if (head !== l.path) aliasOf = head;
      if (aliasOf && !owner) kind = 'alias';
    }
    return {
      path: l.path,
      id: `metinler.${l.path}`,
      group: groupOf(l.path),
      kind,
      tokens: [...new Set([...(l.tr.match(TOKEN) ?? []), ...(l.en.match(TOKEN) ?? [])])],
      max: Math.max(24, Math.ceil(1.5 * Math.max(l.tr.length, l.en.length))),
      ...(aliasOf ? { aliasOf } : {}),
      ...(reason ? { reason } : {}),
      ...(owner ? { owner } : {}),
    };
  });
}

/** A short human name for a dictionary string: its default Turkish text, on one line and trimmed. */
export function stringLabel(tr: string, max = 48): string {
  const t = tr.replace(/\s+/g, ' ').trim();
  if (t === '') return 'Başlıksız metin';
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}

const SEGMENT = /([^.[\]]+)|\[(\d+)\]/g;
const segments = (path: string) => [...path.matchAll(SEGMENT)].map((m) => m[1] ?? Number(m[2]));

/** The value a path holds in a dictionary-shaped object (the defaults, or an override that may hold half a pair). */
export function dictAt(root: unknown, path: string): unknown {
  let v: unknown = root;
  for (const s of segments(path)) {
    if (!v || typeof v !== 'object') return undefined;
    v = (v as Record<string | number, unknown>)[s];
  }
  return v;
}

/** Writes `value` at `path` of `target`, creating containers shaped like `base`. Arrays keep the base length
 *  because the structural merge only accepts an array of the same length. */
export function putAt(target: Record<string, unknown>, base: unknown, path: string, value: unknown) {
  const segs = segments(path);
  let t = target as Record<string | number, unknown>;
  let b = base as Record<string | number, unknown>;
  segs.forEach((s, i) => {
    b = b[s] as Record<string | number, unknown>;
    if (i === segs.length - 1) t[s] = value;
    else t = (t[s] ??= Array.isArray(b) ? new Array(b.length).fill(undefined) : {}) as Record<string | number, unknown>;
  });
}
