import type { NoteContent, NoteRecord } from '@/content/notes/types';
import { locales, type Locale } from '@/content/types';
import { blockStrings, citeTokens } from './inline';
import { texIssues } from './math';
import {
  pairBlocks,
  unpairBlocks,
  validatePairedBlocks,
  type BlockIssue,
  type PairError,
  type PairedBlock,
} from './note-blocks';
import { readingMinutes } from './notes';

/* Editor-side shape of a note: both languages side by side, so the two can never drift apart structurally.
   pairNote and unpairNote convert to and from the stored NoteRecord. */

type Pair = Extract<PairedBlock, { type: 'p' }>['text'];

export type MockNote = Omit<NoteRecord, 'tr' | 'en'> & {
  /** A side set to 'off' is not stored; its text stays here so it can be switched on again. */
  langs: Record<Locale, 'on' | 'off'>;
  slug: Pair;
  title: Pair;
  subtitle: Pair;
  summary: Pair;
  category: Pair;
  /** Matched by position. */
  tags: Pair[];
  coverAlt: Pair;
  blocks: PairedBlock[];
  footnotes: { id: string; text: Pair }[];
  references: { id: string; text: Pair; url?: string }[];
  revisions: { rev: string; date: string; text: Pair }[];
};

export type NotePairError = {
  part: 'blocks' | 'footnotes' | 'references' | 'revisions';
  index: number;
  code: PairError['code'];
};

export type NoteIssue = { field: string; lang?: Locale; severity: 'error' | 'warning'; message: string };

export type NoteIssueContext = {
  records: readonly MockNote[];
  figureIds: readonly string[];
  assetIds: readonly string[];
};

const pr = (tr?: string, en?: string): Pair => ({ tr: tr ?? '', en: en ?? '' });
const opt = (s: string) => (s === '' ? undefined : s);
const present = (n: MockNote) => locales.filter((l) => n.langs[l] === 'on');
const LANG = { tr: 'TR', en: 'EN' } as const;

export function pairNote(record: NoteRecord): { ok: true; note: MockNote } | { ok: false; errors: NotePairError[] } {
  const { tr, en, ...rest } = record;
  const errors: NotePairError[] = [];
  const both = tr !== undefined && en !== undefined;

  const blocks = pairBlocks(tr?.blocks, en?.blocks);
  if (!blocks.ok) errors.push(...blocks.errors.map((e) => ({ part: 'blocks' as const, index: e.index, code: e.code })));

  /** Items matched by position; both sides must agree on the shared part of each. */
  const zip = <T, R>(
    part: Exclude<NotePairError['part'], 'blocks'>,
    a: readonly T[] | undefined,
    b: readonly T[] | undefined,
    build: (x: T | undefined, y: T | undefined) => R,
    sharedOf: (x: T) => unknown,
  ): R[] => {
    if (both && (a?.length ?? 0) !== (b?.length ?? 0)) errors.push({ part, index: 0, code: 'length' });
    return Array.from({ length: Math.max(a?.length ?? 0, b?.length ?? 0) }, (_, index) => {
      const [x, y] = [a?.[index], b?.[index]];
      if (both && x && y && JSON.stringify(sharedOf(x)) !== JSON.stringify(sharedOf(y)))
        errors.push({ part, index, code: 'shared' });
      return build(x, y);
    });
  };

  const footnotes = zip(
    'footnotes',
    tr?.footnotes,
    en?.footnotes,
    (x, y) => ({ id: (x ?? y)!.id, text: pr(x?.text, y?.text) }),
    (f) => f.id,
  );
  const references = zip(
    'references',
    tr?.references,
    en?.references,
    (x, y) => {
      const url = x?.url ?? y?.url;
      return { id: (x ?? y)!.id, text: pr(x?.text, y?.text), ...(url === undefined ? {} : { url }) };
    },
    (r) => [r.id, r.url],
  );
  const revisions = zip(
    'revisions',
    tr?.revisions,
    en?.revisions,
    (x, y) => ({ rev: (x ?? y)!.rev, date: (x ?? y)!.date, text: pr(x?.text, y?.text) }),
    (r) => [r.rev, r.date],
  );

  if (errors.length > 0 || !blocks.ok) return { ok: false, errors };
  const tagCount = Math.max(tr?.tags?.length ?? 0, en?.tags?.length ?? 0);
  return {
    ok: true,
    note: {
      ...rest,
      langs: { tr: tr ? 'on' : 'off', en: en ? 'on' : 'off' },
      slug: pr(tr?.slug, en?.slug),
      title: pr(tr?.title, en?.title),
      subtitle: pr(tr?.subtitle, en?.subtitle),
      summary: pr(tr?.summary, en?.summary),
      category: pr(tr?.category, en?.category),
      tags: Array.from({ length: tagCount }, (_, i) => pr(tr?.tags?.[i], en?.tags?.[i])),
      coverAlt: pr(tr?.coverAlt, en?.coverAlt),
      blocks: blocks.blocks,
      footnotes,
      references,
      revisions,
    },
  };
}

function contentOf(n: MockNote, lang: Locale): NoteContent {
  const tags = n.tags.map((t) => t[lang]).filter((t) => t !== '');
  const has = <T>(list: T[]) => (list.length > 0 ? list : undefined);
  const content: NoteContent = {
    slug: n.slug[lang],
    title: n.title[lang],
    summary: n.summary[lang],
    blocks: unpairBlocks(n.blocks, lang),
  };
  const optional: Partial<NoteContent> = {
    subtitle: opt(n.subtitle[lang]),
    category: opt(n.category[lang]),
    tags: has(tags),
    coverAlt: opt(n.coverAlt[lang]),
    footnotes: has(n.footnotes.map((f) => ({ id: f.id, text: f.text[lang] }))),
    references: has(
      n.references.map((r) => ({ id: r.id, text: r.text[lang], ...(r.url === undefined ? {} : { url: r.url }) })),
    ),
    revisions: has(n.revisions.map((r) => ({ rev: r.rev, date: r.date, text: r.text[lang] }))),
  };
  return Object.assign(content, Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== undefined)));
}

/** Fields that exist only in the editor shape. */
const EDITOR_ONLY = [
  'langs',
  'slug',
  'title',
  'subtitle',
  'summary',
  'category',
  'tags',
  'coverAlt',
  'blocks',
  'footnotes',
  'references',
  'revisions',
];

export function unpairNote(n: MockNote): NoteRecord {
  const record = Object.fromEntries(
    Object.entries(n).filter(([k]) => !EDITOR_ONLY.includes(k)),
  ) as unknown as NoteRecord;
  for (const l of locales) if (n.langs[l] === 'on') record[l] = contentOf(n, l);
  return record;
}

/** Per language: 'Tamam', 'Eksik (n alan)' or 'Yok' when that side is off. */
export function noteLangStatus(n: MockNote, lang: Locale): string {
  if (n.langs[lang] === 'off') return 'Yok';
  const missing =
    (n.title[lang] === '' ? 1 : 0) +
    (n.summary[lang] === '' ? 1 : 0) +
    validatePairedBlocks(n.blocks, { figureIds: [], publish: [lang] }).filter(
      (i) => i.code === 'empty' || i.code === 'image-alt',
    ).length;
  return missing === 0 ? 'Tamam' : `Eksik (${missing} alan)`;
}

const idPattern = /^[a-z0-9-]+$/;

const BLOCK_MESSAGES: Record<BlockIssue['code'], string> = {
  empty: 'Boş alan.',
  'heading-id-missing': 'Başlık kimliği gerekli.',
  'id-format': 'Kimlik yalnız küçük harf, rakam ve tire içerebilir.',
  'id-duplicate': 'Kimlik başka bir blokta da kullanılıyor.',
  'figure-unknown': 'Kayıtlı olmayan teknik figür.',
  'image-alt': 'Görsel için alternatif metin gerekli.',
  'table-limits': 'Tablo en çok 8 sütun ve 30 satır olabilir.',
  'table-ragged': 'Satırdaki hücre sayısı başlıkla aynı olmalı.',
  pullquote: 'Marka: pull quote kullanılmaz.',
};

function issue(field: string, message: string, lang?: Locale, severity: NoteIssue['severity'] = 'error'): NoteIssue {
  return { field, ...(lang ? { lang } : {}), severity, message };
}

/** Inline link targets other than https:, site paths and hash links. */
export function linkIssues(text: string): string[] {
  return citeTokens(text)
    .filter((t) => t.kind === 'link')
    .map((t) => t.value)
    .filter(
      (href) => !(href.startsWith('https://') || (href.startsWith('/') && !href.startsWith('//')) || href[0] === '#'),
    );
}

/** Text of a note in one language that can carry inline markup. */
function markedTexts(n: MockNote, lang: Locale): string[] {
  return [
    ...unpairBlocks(n.blocks, lang).flatMap(blockStrings),
    ...n.footnotes.map((f) => f.text[lang]),
    ...n.references.map((r) => r.text[lang]),
  ];
}

/** Footnote, reference and cross-reference ids used in one language against what is defined. */
export function crossRefIssues(n: MockNote, lang: Locale): NoteIssue[] {
  const out: NoteIssue[] = [];
  // Only figures, images, tables and equations are numbered, so only they can be cross-referenced.
  const labels = new Set(
    n.blocks.flatMap((b) =>
      (b.type === 'image' || b.type === 'figure' || b.type === 'table' || b.type === 'math') && b.id ? [b.id] : [],
    ),
  );
  const defined = {
    fn: new Set(n.footnotes.map((f) => f.id)),
    ref: new Set(n.references.map((r) => r.id)),
    xref: labels,
  };
  const syntax = { fn: (id: string) => `[^${id}]`, ref: (id: string) => `[@${id}]`, xref: (id: string) => `[[${id}]]` };
  const inBlocks = new Set(
    unpairBlocks(n.blocks, lang)
      .flatMap(blockStrings)
      .flatMap(citeTokens)
      .map((t) => `${t.kind}:${t.value}`),
  );
  const reported = new Set<string>();
  for (const t of markedTexts(n, lang).flatMap(citeTokens)) {
    if (t.kind === 'link' || defined[t.kind].has(t.value) || reported.has(`${t.kind}:${t.value}`)) continue;
    reported.add(`${t.kind}:${t.value}`);
    out.push(issue('blocks', `Hata: ${syntax[t.kind](t.value)} tanımlı değil.`, lang));
  }
  n.footnotes.forEach((f, i) => {
    if (!inBlocks.has(`fn:${f.id}`))
      out.push(issue(`footnotes[${i}]`, 'Uyarı: Metinde kullanılmıyor.', lang, 'warning'));
  });
  n.references.forEach((r, i) => {
    if (!inBlocks.has(`ref:${r.id}`))
      out.push(issue(`references[${i}]`, 'Uyarı: Metinde kullanılmıyor.', lang, 'warning'));
  });
  return out;
}

export function noteIssues(n: MockNote, ctx: NoteIssueContext): NoteIssue[] {
  const out: NoteIssue[] = [];
  const on = present(n);

  for (const b of validatePairedBlocks(n.blocks, { figureIds: ctx.figureIds, publish: on })) {
    out.push(issue(`blocks[${b.index}].${b.field}`, BLOCK_MESSAGES[b.code], b.lang, b.severity));
  }
  n.blocks.forEach((b, i) => {
    if (b.type === 'math') {
      for (const t of texIssues(b.tex)) {
        const what =
          t.kind === 'command' ? `Desteklenmeyen TeX: ${t.value}` : `Desteklenmeyen TeX: eşleşmeyen ${t.value}`;
        out.push(issue(`blocks[${i}].tex`, `Hata: ${what}`));
      }
    }
    if (b.type === 'image' && !ctx.assetIds.includes(b.src))
      out.push(issue(`blocks[${i}].src`, 'Görsel kitaplıkta yok.'));
  });

  if (n.updated !== undefined && n.updated < n.published)
    out.push(issue('updated', 'Güncelleme tarihi yayın tarihinden önce olamaz.'));
  if (n.cover && !ctx.assetIds.includes(n.cover.src)) out.push(issue('cover', 'Kapak görseli kitaplıkta yok.'));
  for (const id of n.relatedIds ?? []) {
    if (id === n.id || !ctx.records.some((r) => r.id === id))
      out.push(issue('relatedIds', `İlgili not bulunamadı: ${id}.`));
  }

  for (const lang of on) {
    if (n.summary[lang].length > 240) out.push(issue('summary', 'Özet en çok 240 karakter olabilir.', lang));
    if (n.category[lang].length > 40) out.push(issue('category', 'Konu en çok 40 karakter olabilir.', lang));
    if (n.cover && n.coverAlt[lang] === '') out.push(issue('coverAlt', 'Kapak için alternatif metin gerekli.', lang));
    if (
      n.slug[lang] !== '' &&
      ctx.records.some((r) => r.id !== n.id && r.langs[lang] === 'on' && r.slug[lang] === n.slug[lang])
    )
      out.push(issue('slug', 'Bu adres başka bir notta kullanılıyor.', lang));
    out.push(...crossRefIssues(n, lang));
    for (const href of markedTexts(n, lang).flatMap(linkIssues))
      out.push(issue('blocks', `Hata: Bağlantı https, / veya # ile başlamalı: ${href}`, lang));
  }

  const checkIds = (field: 'footnotes' | 'references', ids: string[]) =>
    ids.forEach((id, i) => {
      if (!idPattern.test(id)) out.push(issue(`${field}[${i}].id`, BLOCK_MESSAGES['id-format']));
      else if (ids.indexOf(id) !== i) out.push(issue(`${field}[${i}].id`, BLOCK_MESSAGES['id-duplicate']));
    });
  checkIds(
    'footnotes',
    n.footnotes.map((f) => f.id),
  );
  checkIds(
    'references',
    n.references.map((r) => r.id),
  );
  n.references.forEach((r, i) => {
    if (r.url !== undefined && r.url !== '' && !r.url.startsWith('https://'))
      out.push(issue(`references[${i}].url`, 'Bağlantı https ile başlamalı.'));
  });
  return out;
}

export type NoteListRow = {
  id: string;
  date: string;
  title: string;
  summary: string;
  topic: string;
  minutes: number;
  /** 'TR · EN', 'Yalnızca TR', 'Yalnızca EN' or '' when no language is on. */
  langChip: string;
  status: NoteRecord['status'];
  approved: boolean;
  featured: boolean;
  /** Languages that are off, for the missing-translation mark. */
  missing: Locale[];
};

/** One list row. Text comes from `lang` when that side is on, otherwise from the other one. */
export function noteListRow(n: MockNote, lang: Locale = 'tr'): NoteListRow {
  const on = present(n);
  const shown = on.includes(lang) ? lang : (on[0] ?? lang);
  const minutes = on.length > 0 ? readingMinutes(contentOf(n, shown), shown) : 0;
  return {
    id: n.id,
    date: n.published,
    title: n.title[shown],
    summary: n.summary[shown],
    topic: n.category[shown],
    minutes,
    langChip: on.length === 2 ? 'TR · EN' : on.length === 1 ? `Yalnızca ${LANG[on[0]]}` : '',
    status: n.status,
    approved: n.approved,
    featured: n.featured === true,
    missing: locales.filter((l) => n.langs[l] === 'off'),
  };
}

export function noteCounts(list: readonly MockNote[]): {
  total: number;
  published: number;
  drafts: number;
  approved: number;
  featured: number;
} {
  const published = list.filter((n) => n.status === 'published').length;
  return {
    total: list.length,
    published,
    drafts: list.length - published,
    approved: list.filter((n) => n.approved).length,
    featured: list.filter((n) => n.featured === true).length,
  };
}
