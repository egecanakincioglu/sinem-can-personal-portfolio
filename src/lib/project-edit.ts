import type { ProjectRecord } from '@/content/projects/types';
import { locales, type Copy, type Locale } from '@/content/types';
import { LIMIT_BYTES } from './glb';
import { parseForceNumber } from './preview-bridge';

/* ------------------------------------------------------------------------------------------------
   Pure helpers for the project editor: identifiers, slugs, numeric entry, publish checks.
   Messages are Turkish: the panel is Turkish only.
   ------------------------------------------------------------------------------------------------ */

type Measurement = NonNullable<ProjectRecord['measurements']>[number];
type Result = NonNullable<NonNullable<ProjectRecord['calculations']>[number]['result']>;
type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };

const EMPTY = 'Hata: Bu alan boş bırakılamaz.';

/** `prefix-xxxx`, unique among `taken`. The suffix grows when the short space is crowded. */
export function newRecordId(prefix: string, taken: Iterable<string>, rand: () => number): string {
  const used = new Set(taken);
  for (let attempt = 0; ; attempt++) {
    const len = 4 + Math.floor(attempt / 50);
    let suffix = '';
    for (let i = 0; i < len; i++) suffix += Math.floor(rand() * 36).toString(36);
    const id = `${prefix}-${suffix}`;
    if (!used.has(id)) return id;
  }
}

const TURKISH_FOLD: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

const SLUG_MAX = 80;
const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = ['new', 'admin'];

/** A slug suggestion from a title: Turkish letters folded, then `a-z0-9-` only. */
export function foldSlug(title: string): string {
  const folded = title
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => TURKISH_FOLD[c])
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, SLUG_MAX);
  return folded.replace(/-+$/, '');
}

/** Message for an invalid slug; `undefined` = valid. Uniqueness is per locale, ignoring the record itself. */
export function checkSlug(
  slug: string,
  locale: Locale,
  selfId: string,
  records: readonly ProjectRecord[],
): string | undefined {
  const s = slug.trim();
  if (!s) return EMPTY;
  if (s.length > SLUG_MAX) return `Hata: En fazla ${SLUG_MAX} karakter.`;
  if (!SLUG_SHAPE.test(s)) return 'Hata: Yalnızca küçük harf, rakam ve tire.';
  if (RESERVED_SLUGS.includes(s)) return 'Hata: Bu ad ayrılmış; başka bir adres seçin.';
  if (records.some((r) => r.id !== selfId && r.slug[locale] === s))
    return 'Hata: Bu adres başka bir kayıtta kullanılıyor.';
  return undefined;
}

/** At most one featured record: `id` is set, every other flag cleared. `null` clears all. */
export function applyFeatured<T extends { id: string; featured?: boolean }>(
  list: readonly T[],
  id: string | null,
): T[] {
  return list.map((item) => {
    const { featured: _featured, ...rest } = item;
    void _featured;
    return (item.id === id ? { ...rest, featured: true } : rest) as T;
  });
}

/** Decimal entry with `,` or `.`; the same strict rule as the force fields. */
export const parseDecimal: (raw: string | undefined) => number | undefined = parseForceNumber;

/* ---------- measurement and result forms ---------- */

export type QuantityForm = {
  symbol?: string;
  label: Copy;
  value: string;
  digits?: string;
  unit?: string;
  note?: Copy;
  verified: boolean;
};

const MAX_DIGITS = 6;

function quantity(form: QuantityForm): Outcome<{ value: number; digits?: number; unit?: string }> {
  if (!form.verified) return { ok: false, error: 'Hata: Doğrulanmamış değer yayımlanamaz.' };
  const value = parseDecimal(form.value);
  if (value === undefined) return { ok: false, error: 'Hata: Geçerli bir sayı girin.' };
  const digitsRaw = form.digits?.trim();
  let digits: number | undefined;
  if (digitsRaw) {
    digits = /^\d$/.test(digitsRaw) ? Number(digitsRaw) : undefined;
    if (digits === undefined || digits > MAX_DIGITS) {
      return { ok: false, error: `Hata: Basamak sayısı 0 ile ${MAX_DIGITS} arasında olmalı.` };
    }
  }
  const unit = form.unit?.trim();
  return { ok: true, value: { value, ...(digits !== undefined ? { digits } : {}), ...(unit ? { unit } : {}) } };
}

/** A measurement row, or an error while it is not marked "Doğrulandı". */
export function toMeasurement(form: QuantityForm): Outcome<Measurement> {
  const q = quantity(form);
  if (!q.ok) return q;
  return {
    ok: true,
    value: { label: form.label, ...q.value, ...(form.note ? { note: form.note } : {}), verified: true },
  };
}

/** A calculation result, or an error while it is not marked "Doğrulandı". */
export function toResult(form: QuantityForm): Outcome<Result> {
  const q = quantity(form);
  if (!q.ok) return q;
  const symbol = form.symbol?.trim();
  return {
    ok: true,
    value: {
      ...(symbol ? { symbol } : {}),
      label: form.label,
      ...q.value,
      ...(form.note ? { note: form.note } : {}),
      verified: true,
    },
  };
}

/* ---------- hero ---------- */

export type HeroOption = { value: 'render' | 'figure' | 'text'; label: string; disabled: boolean; reason?: string };

/** The three hero variants; the two image-based ones need a cover image. */
export function heroOptions(p: Pick<ProjectRecord, 'cover'>): HeroOption[] {
  const reason = p.cover ? undefined : 'kapak görseli gerekli';
  return [
    { value: 'render', label: 'Render', disabled: !p.cover, ...(reason ? { reason } : {}) },
    { value: 'figure', label: 'Şekil', disabled: !p.cover, ...(reason ? { reason } : {}) },
    { value: 'text', label: 'Metin', disabled: false },
  ];
}

/* ---------- translation completeness ---------- */

const present = (list: readonly (Copy | undefined)[] | undefined): Copy[] =>
  (list ?? []).flatMap((c) => (c ? [c] : []));

/** Every Copy the record holds, so a half-translated record can be counted. */
function allCopies(p: ProjectRecord): Copy[] {
  const media = [p.cover, ...(p.figures ?? []), p.preview3d?.poster].flatMap((m) => (m ? [m] : []));
  return [
    p.title,
    ...present([p.subtitle]),
    ...present(p.materials),
    ...present(p.objective),
    ...present(p.process),
    ...present(p.methodology),
    ...present(p.learnings),
    ...present(p.results),
    ...present(p.conclusions),
    ...(p.measurements ?? []).flatMap((m) => [m.label, ...present([m.note])]),
    ...(p.calculations ?? []).flatMap((c) => [
      c.title,
      ...(c.given ?? []).map((g) => g.label),
      ...present(c.required),
      ...present(c.assumptions),
      ...present(c.method),
      ...(c.result ? [c.result.label, ...present([c.result.note])] : []),
    ]),
    ...(p.decisions ?? []).flatMap((d) => [
      d.title,
      ...present(d.criteria),
      ...d.alternatives.flatMap((a) => [a.name, ...present(a.evidence)]),
      ...present([d.rationale]),
    ]),
    ...media.flatMap((m) => [m.alt, ...present([m.caption])]),
    ...present([p.preview3d?.caption]),
    ...(p.revisions ?? []).flatMap((r) => [r.note, ...present([r.reasoning])]),
    ...(p.privateOriginals ?? []).map((o) => o.label),
  ];
}

const isBlank = (s: string) => s.trim() === '';

function missingCounts(p: ProjectRecord): Record<Locale, number> {
  const out: Record<Locale, number> = { tr: 0, en: 0 };
  for (const c of allCopies(p)) for (const l of locales) if (isBlank(c[l])) out[l]++;
  for (const l of locales) if (isBlank(p.slug[l])) out[l]++;
  return out;
}

const LANG_LABEL: Record<Locale, string> = { tr: 'TR', en: 'EN' };

/** One line for the list and the publish screen, e.g. "Eksik: EN çevirisi (3 alan)". */
export function projectCompleteness(p: ProjectRecord): string {
  const counts = missingCounts(p);
  const parts = locales.filter((l) => counts[l] > 0).map((l) => `${LANG_LABEL[l]} çevirisi (${counts[l]} alan)`);
  return parts.length ? `Eksik: ${parts.join(', ')}` : 'İki dil tamam';
}

/* ---------- issues ---------- */

type ProjectSection = 'kimlik' | 'antet' | 'gorsel' | 'govde' | 'sekiller' | 'model' | 'iliskiler' | 'yayin';

export type ProjectIssue = {
  section: ProjectSection;
  field: string;
  lang?: Locale;
  severity: 'error' | 'warning';
  message: string;
};

const MAX_TOOLS = 12;
const MAX_RELATED = 2;
const MIN_ALT = 8;

const filenameOf = (src: string) => src.split(/[?#]/)[0].split('/').pop() ?? '';
const stem = (name: string) => name.replace(/\.[^.]+$/, '');

function altIssues(
  p: ProjectRecord,
  assetIds: ReadonlySet<string>,
  section: ProjectSection,
  field: string,
  m: { id: string; src?: string; alt: Copy },
): ProjectIssue[] {
  const out: ProjectIssue[] = [];
  const issue = (message: string, lang?: Locale): ProjectIssue => ({
    section,
    field,
    ...(lang ? { lang } : {}),
    severity: 'error',
    message,
  });
  if (!assetIds.has(`${p.id}/${m.id}`)) out.push(issue('Hata: Görsel kitaplıkta bulunamadı.'));
  const file = m.src ? filenameOf(m.src).toLowerCase() : '';
  for (const l of locales) {
    const alt = m.alt[l].trim();
    if (!alt) out.push(issue('Hata: Görsel için açıklama (alt) gerekli.', l));
    else if (alt.length < MIN_ALT) out.push(issue(`Hata: Açıklama (alt) en az ${MIN_ALT} karakter olmalı.`, l));
    else if (file && (alt.toLowerCase() === file || alt.toLowerCase() === stem(file)))
      out.push(issue('Hata: Açıklama (alt) dosya adı olamaz.', l));
  }
  return out;
}

/** Everything that blocks or warns before this record can go public. */
export function projectIssues(
  p: ProjectRecord,
  ctx: { records: readonly ProjectRecord[]; assetIds: ReadonlySet<string> },
): ProjectIssue[] {
  const out: ProjectIssue[] = [];
  const add = (
    section: ProjectSection,
    field: string,
    severity: ProjectIssue['severity'],
    message: string,
    lang?: Locale,
  ) => out.push({ section, field, ...(lang ? { lang } : {}), severity, message });

  for (const l of locales) {
    if (isBlank(p.title[l])) add('kimlik', 'title', 'error', EMPTY, l);
    const slugMessage = checkSlug(p.slug[l], l, p.id, ctx.records);
    if (slugMessage) add('kimlik', 'slug', 'error', slugMessage, l);
  }

  if (p.disciplines.length < 1) add('antet', 'disciplines', 'error', 'Hata: En az 1 öğe gerekir.');
  if ((p.tools?.length ?? 0) > MAX_TOOLS) add('antet', 'tools', 'error', `Hata: En fazla ${MAX_TOOLS} öğe.`);
  if (p.period?.end) {
    const n = Math.min(p.period.start.length, p.period.end.length);
    if (p.period.end.slice(0, n) < p.period.start.slice(0, n))
      add('antet', 'period', 'error', 'Hata: Bitiş, başlangıçtan önce olamaz.');
  }

  (p.decisions ?? []).forEach((d, i) => {
    if (d.alternatives.length < 2)
      add('govde', `decisions.${i}`, 'warning', 'Uyarı: En az 2 seçenek olmadan karar sayfada görünmez.');
  });

  if ((p.relatedIds?.length ?? 0) > MAX_RELATED)
    add('iliskiler', 'relatedIds', 'warning', `Uyarı: En fazla ${MAX_RELATED} gösterilir.`);
  if (p.relatedIds?.includes(p.id))
    add('iliskiler', 'relatedIds', 'warning', 'Uyarı: Proje kendisiyle ilişkilendirilemez.');

  if (p.cover) out.push(...altIssues(p, ctx.assetIds, 'gorsel', 'cover', p.cover));
  (p.figures ?? []).forEach((m, i) => out.push(...altIssues(p, ctx.assetIds, 'sekiller', `figures.${i}`, m)));
  if (p.preview3d) out.push(...altIssues(p, ctx.assetIds, 'model', 'preview3d.poster', p.preview3d.poster));
  if (p.preview3d?.sizeBytes !== undefined && p.preview3d.sizeBytes > LIMIT_BYTES)
    add('model', 'preview3d.sizeBytes', 'error', 'Hata: 3B model 15 MB sınırını aştı; genel sitede gösterilmez.');

  const counts = missingCounts(p);
  for (const l of locales)
    if (counts[l] > 0) add('yayin', 'langs', 'error', `Eksik: ${LANG_LABEL[l]} çevirisi (${counts[l]} alan).`, l);

  return out;
}
