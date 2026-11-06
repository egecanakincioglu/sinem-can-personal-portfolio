/* ------------------------------------------------------------------------------------------------
   Notes content model. Presentation never reads these records directly: pages go through
   lib/notes.ts, which decides what is public.

   An article is a list of typed blocks. Text fields use a small inline markup, parsed by lib/inline.tsx:
     **bold**  *italic*  `code`  [text](url)  $x_\mathrm{A}$ (inline math)
     [^id] footnote   [@id] reference   [[id]] cross-reference to a figure, table or equation
   Heading ids are authored and language-neutral, so a #hash survives a language switch.
   ------------------------------------------------------------------------------------------------ */

type ImageBlockMedia = {
  src: string;
  /** Meaningful, localised alternative text, required. */
  alt: string;
  width: number;
  height: number;
  focalX?: number;
  focalY?: number;
};

type CalloutKind = 'assumption' | 'limitation' | 'note';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2' | 'h3'; id: string; text: string }
  | { type: 'h4'; id?: string; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'quote'; text: string; cite?: string }
  | { type: 'pullquote'; text: string; cite?: string }
  | { type: 'code'; code: string; lang?: string; filename?: string }
  /** Display equation in TeX subset (lib/math.ts). Numbered automatically; `id` makes it referable. */
  | { type: 'math'; tex: string; id?: string }
  | { type: 'image'; id?: string; image: ImageBlockMedia; caption: string }
  /** Technical SVG figure: trusted, authored markup using the site's line classes (svg-heavy, svg-thin …). */
  | { type: 'svg'; id?: string; svg: string; viewBox: string; alt: string; caption: string }
  | {
      type: 'table';
      id?: string;
      caption: string;
      head: string[];
      rows: string[][];
      align?: ('l' | 'r')[];
      note?: string;
    }
  | { type: 'callout'; kind: CalloutKind; title?: string; paragraphs: string[] };

type Reference = { id: string; text: string; url?: string };
type Footnote = { id: string; text: string };
type Revision = { rev: string; date: string; text: string };

/** One language of an article. A note may exist in one language or both. */
export type NoteContent = {
  slug: string;
  title: string;
  subtitle?: string;
  /** One or two sentences for the archive. */
  summary: string;
  category?: string;
  tags?: string[];
  blocks: Block[];
  footnotes?: Footnote[];
  references?: Reference[];
  revisions?: Revision[];
  coverAlt?: string;
};

export type NoteRecord = {
  id: string;
  /** Drafts never resolve in public. */
  status: 'draft' | 'published';
  /** Sinem's explicit approval. Without it nothing is public. */
  approved: boolean;
  /** Development sample: only exists in development, never attributed to Sinem. */
  fixture?: boolean;
  /** ISO date. */
  published: string;
  updated?: string;
  featured?: boolean;
  cover?: ImageBlockMedia;
  relatedIds?: string[];
  tr?: NoteContent;
  en?: NoteContent;
};
