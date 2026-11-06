import type { Locale } from '@/content/types';
import type { Block } from '@/content/notes/types';

/** One value in both languages. An empty string means that side is empty, or that an optional field is absent. */
type Pair = { tr: string; en: string };

type CalloutKind = Extract<Block, { type: 'callout' }>['kind'];

/** Mirrors `Block`: language text becomes a `Pair`, language-neutral fields stay single and shared. */
export type PairedBlock =
  | { type: 'p'; text: Pair }
  | { type: 'h2' | 'h3'; id: string; text: Pair }
  | { type: 'h4'; id?: string; text: Pair }
  | { type: 'ul' | 'ol'; items: Pair[] }
  | { type: 'quote' | 'pullquote'; text: Pair; cite: Pair }
  | { type: 'code'; code: string; lang?: string; filename: Pair }
  | { type: 'math'; tex: string; id?: string }
  | {
      type: 'image';
      id?: string;
      src: string;
      width: number;
      height: number;
      focalX?: number;
      focalY?: number;
      alt: Pair;
      caption: Pair;
    }
  | { type: 'figure'; id?: string; figureId: string; alt: Pair; caption: Pair }
  | {
      type: 'table';
      id?: string;
      align?: ('l' | 'r')[];
      caption: Pair;
      head: Pair[];
      rows: Pair[][];
      note: Pair;
    }
  | { type: 'callout'; kind: CalloutKind; title: Pair; paragraphs: Pair[] };

export type PairError = { index: number; code: 'length' | 'type' | 'shared' | 'shape'; field?: string };

export type PairResult = { ok: true; blocks: PairedBlock[] } | { ok: false; errors: PairError[] };

export type BlockIssue = {
  index: number;
  field: string;
  lang?: Locale;
  severity: 'error' | 'warning';
  code:
    | 'empty'
    | 'heading-id-missing'
    | 'id-format'
    | 'id-duplicate'
    | 'figure-unknown'
    | 'image-alt'
    | 'table-limits'
    | 'table-ragged'
    | 'pullquote';
};

/** Drops keys whose value is undefined so optional fields are omitted rather than set. */
function clean<T extends object>(o: { [K in keyof T]: T[K] | undefined }): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

const pr = (tr?: string, en?: string): Pair => ({ tr: tr ?? '', en: en ?? '' });
const opt = (s: string) => (s === '' ? undefined : s);
const like = <B extends Block>(b: Block | undefined, base: B) => (b?.type === base.type ? (b as B) : undefined);

/** Pairs the two block lists of a note. A missing side (undefined) is paired as empty text. */
export function pairBlocks(tr?: readonly Block[], en?: readonly Block[]): PairResult {
  const errors: PairError[] = [];
  const both = tr !== undefined && en !== undefined;
  if (both && tr.length !== en.length) errors.push({ index: Math.min(tr.length, en.length), code: 'length' });
  const count = both ? Math.min(tr.length, en.length) : Math.max(tr?.length ?? 0, en?.length ?? 0);
  const blocks: PairedBlock[] = [];
  for (let index = 0; index < count; index++) {
    const t = tr?.[index];
    const e = en?.[index];
    const err = (code: PairError['code'], field?: string) => errors.push(clean<PairError>({ index, code, field }));
    const paired = pairBlock(t, e, both, err);
    if (paired) blocks.push(paired);
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, blocks };
}

function pairBlock(
  t: Block | undefined,
  e: Block | undefined,
  both: boolean,
  err: (code: PairError['code'], field?: string) => void,
): PairedBlock | undefined {
  const base = (t ?? e) as Block;
  if (t && e && t.type !== e.type) {
    err('type');
    return undefined;
  }
  const shared = <V>(field: string, x: V | undefined, y: V | undefined) => {
    if (both && JSON.stringify(x) !== JSON.stringify(y)) err('shared', field);
    return x ?? y;
  };
  const list = (field: string, a?: readonly string[], b?: readonly string[]) => {
    if (both && a?.length !== b?.length) err('shape', field);
    return Array.from({ length: Math.max(a?.length ?? 0, b?.length ?? 0) }, (_, i) => pr(a?.[i], b?.[i]));
  };

  switch (base.type) {
    case 'p': {
      const [x, y] = [like(t, base), like(e, base)];
      return { type: 'p', text: pr(x?.text, y?.text) };
    }
    case 'h2':
    case 'h3': {
      const [x, y] = [like(t, base), like(e, base)];
      return { type: base.type, id: shared('id', x?.id, y?.id) ?? '', text: pr(x?.text, y?.text) };
    }
    case 'h4': {
      const [x, y] = [like(t, base), like(e, base)];
      return clean<PairedBlock>({ type: 'h4', id: shared('id', x?.id, y?.id), text: pr(x?.text, y?.text) });
    }
    case 'ul':
    case 'ol': {
      const [x, y] = [like(t, base), like(e, base)];
      return { type: base.type, items: list('items', x?.items, y?.items) };
    }
    case 'quote':
    case 'pullquote': {
      const [x, y] = [like(t, base), like(e, base)];
      return { type: base.type, text: pr(x?.text, y?.text), cite: pr(x?.cite, y?.cite) };
    }
    case 'code': {
      const [x, y] = [like(t, base), like(e, base)];
      return clean<PairedBlock>({
        type: 'code',
        code: shared('code', x?.code, y?.code) ?? '',
        lang: shared('lang', x?.lang, y?.lang),
        filename: pr(x?.filename, y?.filename),
      });
    }
    case 'math': {
      const [x, y] = [like(t, base), like(e, base)];
      return clean<PairedBlock>({
        type: 'math',
        tex: shared('tex', x?.tex, y?.tex) ?? '',
        id: shared('id', x?.id, y?.id),
      });
    }
    case 'image': {
      const [x, y] = [like(t, base), like(e, base)];
      const media = <K extends 'src' | 'width' | 'height' | 'focalX' | 'focalY'>(k: K) =>
        shared(k, x?.image[k], y?.image[k]);
      return clean<PairedBlock>({
        type: 'image',
        id: shared('id', x?.id, y?.id),
        src: media('src') ?? '',
        width: media('width') ?? 0,
        height: media('height') ?? 0,
        focalX: media('focalX'),
        focalY: media('focalY'),
        alt: pr(x?.image.alt, y?.image.alt),
        caption: pr(x?.caption, y?.caption),
      });
    }
    case 'figure': {
      const [x, y] = [like(t, base), like(e, base)];
      return clean<PairedBlock>({
        type: 'figure',
        id: shared('id', x?.id, y?.id),
        figureId: shared('figureId', x?.figureId, y?.figureId) ?? '',
        alt: pr(x?.alt, y?.alt),
        caption: pr(x?.caption, y?.caption),
      });
    }
    case 'table': {
      const [x, y] = [like(t, base), like(e, base)];
      if (both && x?.rows.length !== y?.rows.length) err('shape', 'rows');
      const rows = Array.from({ length: Math.max(x?.rows.length ?? 0, y?.rows.length ?? 0) }, (_, i) =>
        list(`rows[${i}]`, x?.rows[i], y?.rows[i]),
      );
      return clean<PairedBlock>({
        type: 'table',
        id: shared('id', x?.id, y?.id),
        align: shared('align', x?.align, y?.align),
        caption: pr(x?.caption, y?.caption),
        head: list('head', x?.head, y?.head),
        rows,
        note: pr(x?.note, y?.note),
      });
    }
    case 'callout': {
      const [x, y] = [like(t, base), like(e, base)];
      return {
        type: 'callout',
        kind: shared('kind', x?.kind, y?.kind) ?? 'note',
        title: pr(x?.title, y?.title),
        paragraphs: list('paragraphs', x?.paragraphs, y?.paragraphs),
      };
    }
  }
}

/** One language of a paired list. Optional strings that are empty are omitted. */
export function unpairBlocks(blocks: readonly PairedBlock[], lang: Locale): Block[] {
  const s = (p: Pair) => p[lang];
  return blocks.map((b): Block => {
    switch (b.type) {
      case 'p':
        return { type: 'p', text: s(b.text) };
      case 'h2':
      case 'h3':
        return { type: b.type, id: b.id, text: s(b.text) };
      case 'h4':
        return clean<Block>({ type: 'h4', id: b.id, text: s(b.text) });
      case 'ul':
      case 'ol':
        return { type: b.type, items: b.items.map(s) };
      case 'quote':
      case 'pullquote':
        return clean<Block>({ type: b.type, text: s(b.text), cite: opt(s(b.cite)) });
      case 'code':
        return clean<Block>({ type: 'code', code: b.code, lang: b.lang, filename: opt(s(b.filename)) });
      case 'math':
        return clean<Block>({ type: 'math', tex: b.tex, id: b.id });
      case 'image':
        return clean<Block>({
          type: 'image',
          id: b.id,
          image: clean({
            src: b.src,
            alt: s(b.alt),
            width: b.width,
            height: b.height,
            focalX: b.focalX,
            focalY: b.focalY,
          }),
          caption: s(b.caption),
        });
      case 'figure':
        return clean<Block>({
          type: 'figure',
          id: b.id,
          figureId: b.figureId,
          alt: opt(s(b.alt)),
          caption: opt(s(b.caption)),
        });
      case 'table':
        return clean<Block>({
          type: 'table',
          id: b.id,
          caption: s(b.caption),
          head: b.head.map(s),
          rows: b.rows.map((r) => r.map(s)),
          align: b.align,
          note: opt(s(b.note)),
        });
      case 'callout':
        return clean<Block>({
          type: 'callout',
          kind: b.kind,
          title: opt(s(b.title)),
          paragraphs: b.paragraphs.map(s),
        });
    }
  });
}

type Text = { field: string; pair: Pair };

/** Text sides a block cannot do without. */
function requiredTexts(b: PairedBlock): Text[] {
  switch (b.type) {
    case 'p':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'quote':
    case 'pullquote':
      return [{ field: 'text', pair: b.text }];
    case 'ul':
    case 'ol':
      return b.items.map((pair, i) => ({ field: `items[${i}]`, pair }));
    case 'image':
      return [
        { field: 'alt', pair: b.alt },
        { field: 'caption', pair: b.caption },
      ];
    case 'table':
      return [{ field: 'caption', pair: b.caption }, ...b.head.map((pair, i) => ({ field: `head[${i}]`, pair }))];
    case 'callout':
      return b.paragraphs.map((pair, i) => ({ field: `paragraphs[${i}]`, pair }));
    case 'code':
    case 'math':
    case 'figure':
      return [];
  }
}

export function isLanguageComplete(blocks: readonly PairedBlock[], lang: Locale): boolean {
  return blocks.every((b) => requiredTexts(b).every((t) => t.pair[lang] !== ''));
}

const idPattern = /^[a-z0-9-]+$/;

export function validatePairedBlocks(
  blocks: readonly PairedBlock[],
  opts: { figureIds: readonly string[]; publish: readonly Locale[] },
): BlockIssue[] {
  const issues: BlockIssue[] = [];
  const seen = new Set<string>();
  blocks.forEach((b, index) => {
    const add = (field: string, code: BlockIssue['code'], lang?: Locale, severity: BlockIssue['severity'] = 'error') =>
      issues.push(clean<BlockIssue>({ index, field, lang, severity, code }));

    if ('id' in b && b.id !== undefined) {
      if (b.id === '') {
        if (b.type === 'h2' || b.type === 'h3') add('id', 'heading-id-missing');
      } else {
        if (!idPattern.test(b.id)) add('id', 'id-format');
        if (seen.has(b.id)) add('id', 'id-duplicate');
        seen.add(b.id);
      }
    }
    if (b.type === 'figure' && !opts.figureIds.includes(b.figureId)) add('figureId', 'figure-unknown');
    if (b.type === 'table') {
      if (b.head.length > 8 || b.rows.length > 30) add('rows', 'table-limits');
      b.rows.forEach((r, i) => {
        if (r.length !== b.head.length) add(`rows[${i}]`, 'table-ragged');
      });
    }
    if (b.type === 'pullquote') add('type', 'pullquote', undefined, 'warning');
    for (const lang of opts.publish) {
      for (const t of requiredTexts(b)) {
        if (t.pair[lang] !== '') continue;
        add(t.field, b.type === 'image' && t.field === 'alt' ? 'image-alt' : 'empty', lang);
      }
    }
  });
  return issues;
}
