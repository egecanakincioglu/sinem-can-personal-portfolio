import type { ReactNode } from 'react';
import type { Block, NoteContent } from '@/content/notes/types';
import type { Locale } from '@/content/types';
import { getFigure } from '@/content/figures/registry';
import { texToMathML } from './math';

/* Inline markup for note text (see content/notes/types.ts) and the per-article numbering context. */

/** @public Kept as part of the module API. */
export type LabelKind = 'fig' | 'tab' | 'eq';
export type Ctx = {
  locale: Locale;
  /** footnote id → number, in order of first citation */
  fn: Map<string, number>;
  /** reference id → number, in order of first citation */
  ref: Map<string, number>;
  /** figure / table / equation id → its number */
  labels: Map<string, { kind: LabelKind; n: number }>;
};

const TOKEN =
  /(`[^`]+`)|(\$[^$]+\$)|(\[\^[\w-]+\])|(\[@[\w-]+\])|(\[\[[\w-]+\]\])|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;

/** Every text string of a block, in reading order (used for numbering and reading time). */
export function blockStrings(b: Block): string[] {
  switch (b.type) {
    case 'p':
    case 'h2':
    case 'h3':
    case 'h4':
      return [b.text];
    case 'ul':
    case 'ol':
      return b.items;
    case 'quote':
    case 'pullquote':
      return [b.text, b.cite ?? ''];
    case 'image':
      return [b.caption];
    case 'figure':
      return [b.caption ?? ''];
    case 'table':
      return [b.caption, ...b.head, ...b.rows.flat(), b.note ?? ''];
    case 'callout':
      return [b.title ?? '', ...b.paragraphs];
    default:
      return [];
  }
}

export function buildCtx(content: NoteContent, locale: Locale): Ctx {
  const ctx: Ctx = { locale, fn: new Map(), ref: new Map(), labels: new Map() };
  const counts: Record<LabelKind, number> = { fig: 0, tab: 0, eq: 0 };
  const cite = /\[\^([\w-]+)\]|\[@([\w-]+)\]/g;
  for (const b of content.blocks) {
    // An unknown figureId renders nothing, so it must not take a number.
    const kind: LabelKind | null =
      b.type === 'figure' && !getFigure(b.figureId)
        ? null
        : b.type === 'image' || b.type === 'figure'
          ? 'fig'
          : b.type === 'table'
            ? 'tab'
            : b.type === 'math'
              ? 'eq'
              : null;
    if (kind) {
      counts[kind]++;
      if ('id' in b && b.id) ctx.labels.set(b.id, { kind, n: counts[kind] });
    }
    for (const s of blockStrings(b)) {
      for (const m of s.matchAll(cite)) {
        if (m[1] && !ctx.fn.has(m[1])) ctx.fn.set(m[1], ctx.fn.size + 1);
        if (m[2] && !ctx.ref.has(m[2])) ctx.ref.set(m[2], ctx.ref.size + 1);
      }
    }
  }
  return ctx;
}

/** @public Kept as part of the module API. */
export const LABEL_WORD: Record<LabelKind, Record<Locale, string>> = {
  fig: { tr: 'Şekil', en: 'Fig.' },
  tab: { tr: 'Tablo', en: 'Table' },
  eq: { tr: 'Denklem', en: 'Eq.' },
};

const isExternal = (href: string) => /^https?:\/\//.test(href);

/** Plain text of marked-up text (for headings in navigation, aria-labels and metadata). */
export function plain(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g, (_, a, b, c) => a ?? b ?? c)
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\[\^[\w-]+\]|\[@[\w-]+\]|\[\[[\w-]+\]\]/g, '');
}

export function Inline({ text, ctx, keyPrefix = 'i' }: { text: string; ctx: Ctx; keyPrefix?: string }): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(TOKEN)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    const key = `${keyPrefix}-${k++}`;
    if (m[1])
      out.push(
        <code key={key} className="icode">
          {tok.slice(1, -1)}
        </code>,
      );
    else if (m[2])
      out.push(
        <span
          key={key}
          className="imath"
          dangerouslySetInnerHTML={{ __html: texToMathML(tok.slice(1, -1), ctx.locale) }}
        />,
      );
    else if (m[3]) {
      const id = tok.slice(2, -1);
      const n = ctx.fn.get(id);
      out.push(
        <sup key={key} id={`fnref-${id}`}>
          <a href={`#fn-${id}`} className="fnmark" aria-label={`${ctx.locale === 'tr' ? 'Dipnot' : 'Footnote'} ${n}`}>
            {n}
          </a>
        </sup>,
      );
    } else if (m[4]) {
      const id = tok.slice(2, -1);
      out.push(
        <a
          key={key}
          id={`refcite-${id}`}
          href={`#ref-${id}`}
          className="fnmark refmark"
          aria-label={`${ctx.locale === 'tr' ? 'Kaynak' : 'Reference'} ${ctx.ref.get(id)}`}
        >
          [{ctx.ref.get(id)}]
        </a>,
      );
    } else if (m[5]) {
      const id = tok.slice(2, -2);
      const l = ctx.labels.get(id);
      out.push(
        l ? (
          <a key={key} href={`#${l.kind}-${id}`} className="ulink">
            {l.kind === 'eq' ? `(${l.n})` : `${LABEL_WORD[l.kind][ctx.locale]} ${l.n}`}
          </a>
        ) : (
          tok
        ),
      );
    } else if (m[6]) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!;
      out.push(
        <a
          key={key}
          href={href}
          className="ulink"
          {...(isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          <Inline text={label} ctx={ctx} keyPrefix={key} />
          {isExternal(href) && (
            <span className="sr-only"> ({ctx.locale === 'tr' ? 'yeni sekmede açılır' : 'opens in a new tab'})</span>
          )}
        </a>,
      );
    } else if (m[7])
      out.push(
        <strong key={key} className="font-semibold">
          <Inline text={tok.slice(2, -2)} ctx={ctx} keyPrefix={key} />
        </strong>,
      );
    else if (m[8])
      out.push(
        <em key={key}>
          <Inline text={tok.slice(1, -1)} ctx={ctx} keyPrefix={key} />
        </em>,
      );
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
