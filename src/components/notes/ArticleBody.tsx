import { dict } from '@/content/dictionary';
import { getFigure } from '@/content/figures/registry';
import type { Block, NoteContent } from '@/content/notes/types';
import { Inline, buildCtx, plain, type Ctx } from '@/lib/inline';
import { texToMathML } from '@/lib/math';
import type { Locale } from '@/content/types';
import { CodeBlock } from './CodeBlock';

const d = dict.notes;

/** Heading with an anchor link (language-neutral ids keep #hash across a language switch). */
function Heading({ b, ctx, locale }: { b: Extract<Block, { type: 'h2' | 'h3' | 'h4' }>; ctx: Ctx; locale: Locale }) {
  const Tag = b.type;
  const id = 'id' in b ? b.id : undefined;
  return (
    <Tag id={id} className={`art-prose art-${b.type}`}>
      <Inline text={b.text} ctx={ctx} keyPrefix={`${b.type}-${id}`} />
      {id && (
        <a href={`#${id}`} className="hanchor" aria-label={`${d.sectionLink[locale]}: ${plain(b.text)}`}>
          <span aria-hidden>#</span>
        </a>
      )}
    </Tag>
  );
}

function renderBlock(
  b: Block,
  i: number,
  ctx: Ctx,
  counters: { fig: number; tab: number; eq: number },
): React.ReactNode {
  const { locale } = ctx;
  const inl = (t: string) => <Inline text={t} ctx={ctx} keyPrefix={`b${i}`} />;
  const cap = (kind: 'fig' | 'tab', n: number, text: string) => (
    <figcaption className="art-cap">
      <span className="font-semibold text-grafit">
        {kind === 'fig' ? d.figure[locale] : d.table[locale]} {n}
      </span>{' '}
      — {inl(text)}
    </figcaption>
  );

  switch (b.type) {
    case 'p':
      return (
        <p key={i} className="art-prose art-p">
          {inl(b.text)}
        </p>
      );
    case 'h2':
    case 'h3':
    case 'h4':
      return <Heading key={i} b={b} ctx={ctx} locale={locale} />;
    case 'ul':
    case 'ol': {
      const L = b.type;
      return (
        <L key={i} className={`art-prose art-list art-${L}`}>
          {b.items.map((it, k) => (
            <li key={k}>{inl(it)}</li>
          ))}
        </L>
      );
    }
    case 'quote':
      return (
        <blockquote key={i} className="art-prose art-quote">
          <p>{inl(b.text)}</p>
          {b.cite && <footer className="t-caption mt-2">— {inl(b.cite)}</footer>}
        </blockquote>
      );
    case 'pullquote':
      return (
        <figure key={i} className="art-wide art-pull">
          <blockquote>
            <p>{inl(b.text)}</p>
          </blockquote>
          {b.cite && <figcaption className="t-meta mt-3">{inl(b.cite)}</figcaption>}
        </figure>
      );
    case 'code':
      return (
        <CodeBlock
          key={i}
          code={b.code}
          lang={b.lang}
          filename={b.filename}
          copy={d.copy[locale]}
          copied={d.copied[locale]}
          failed={d.copyFailed[locale]}
          label={d.code[locale]}
        />
      );
    case 'math': {
      const n = ++counters.eq;
      return (
        <div key={i} className="art-prose art-eq" id={b.id ? `eq-${b.id}` : undefined}>
          {/* nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- escaped MathML from texToMathML */}
          <div className="art-eq-body" dangerouslySetInnerHTML={{ __html: texToMathML(b.tex, locale, true) }} />
          <span className="art-eq-no tnum">({n})</span>
        </div>
      );
    }
    case 'image': {
      const n = ++counters.fig;
      return (
        <figure key={i} id={b.id ? `fig-${b.id}` : undefined} className="art-wide art-fig">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={b.image.src}
            alt={b.image.alt}
            width={b.image.width}
            height={b.image.height}
            loading="lazy"
            className="art-fig-media"
            style={{ objectPosition: `${b.image.focalX ?? 50}% ${b.image.focalY ?? 50}%` }}
          />
          {cap('fig', n, b.caption)}
        </figure>
      );
    }
    case 'figure': {
      const f = getFigure(b.figureId);
      if (!f) return null;
      const n = ++counters.fig;
      return (
        <figure key={i} id={b.id ? `fig-${b.id}` : undefined} className="art-wide art-fig">
          <div className="art-fig-media art-fig-svg">
            <svg viewBox={f.viewBox} role="img" aria-label={b.alt ?? f.alt[locale]} className="block h-auto w-full">
              <f.Component />
            </svg>
          </div>
          {cap('fig', n, b.caption ?? f.caption[locale])}
        </figure>
      );
    }
    case 'table': {
      const n = ++counters.tab;
      const align = (k: number) => (b.align?.[k] === 'r' ? 'text-right tnum' : 'text-left');
      return (
        <figure key={i} id={b.id ? `tab-${b.id}` : undefined} className="art-wide art-table">
          {cap('tab', n, b.caption)}
          <p className="t-caption mt-1 md:hidden" aria-hidden>
            ↔ {d.tableScroll[locale]}
          </p>
          <div
            role="region"
            tabIndex={0}
            aria-label={`${d.table[locale]} ${n}: ${plain(b.caption)}. ${d.tableScroll[locale]}`}
            className="art-table-scroll"
          >
            <table>
              <thead>
                <tr>
                  {b.head.map((h, k) => (
                    <th key={k} scope="col" className={align(k)}>
                      {inl(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((c, k) =>
                      k === 0 ? (
                        <th key={k} scope="row" className={align(k)}>
                          {inl(c)}
                        </th>
                      ) : (
                        <td key={k} className={align(k)}>
                          {inl(c)}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {b.note && <p className="t-caption mt-2">{inl(b.note)}</p>}
        </figure>
      );
    }
    case 'callout':
      return (
        <aside
          key={i}
          className={`art-prose art-callout art-callout-${b.kind}`}
          aria-label={b.title ?? d.callouts[b.kind][locale]}
        >
          <p className="t-meta">{d.callouts[b.kind][locale]}</p>
          {b.title && <p className="serif mt-1 text-[21px] leading-snug text-grafit">{b.title}</p>}
          <div className="mt-2 space-y-2">
            {b.paragraphs.map((t, k) => (
              <p key={k}>{inl(t)}</p>
            ))}
          </div>
        </aside>
      );
  }
}

/** The article body: blocks in a 9-column working grid; prose takes six columns, figures and tables the lot. */
export function ArticleBody({ content, locale }: { content: NoteContent; locale: Locale }) {
  const ctx = buildCtx(content, locale);
  const counters = { fig: 0, tab: 0, eq: 0 };
  const inl = (t: string, k: string) => <Inline text={t} ctx={ctx} keyPrefix={k} />;

  return (
    <div className="art-body">
      {content.blocks.map((b, i) => renderBlock(b, i, ctx, counters))}

      {content.footnotes && content.footnotes.length > 0 && (
        <section aria-labelledby="footnotes" className="art-prose art-end">
          <h2 id="footnotes" className="art-h2 art-h2-small">
            {dict.sections.footnotes[locale]}
          </h2>
          <ol className="art-notes">
            {[...content.footnotes]
              .filter((f) => ctx.fn.has(f.id))
              .sort((a, b) => ctx.fn.get(a.id)! - ctx.fn.get(b.id)!)
              .map((f) => (
                <li key={f.id} id={`fn-${f.id}`} value={ctx.fn.get(f.id)}>
                  <span>{inl(f.text, `fn-${f.id}`)}</span>{' '}
                  <a
                    href={`#fnref-${f.id}`}
                    className="ulink whitespace-nowrap"
                    aria-label={`${d.backToText[locale]}, ${ctx.fn.get(f.id)}`}
                  >
                    ↩ <span className="sr-only">{d.backToText[locale]}</span>
                  </a>
                </li>
              ))}
          </ol>
        </section>
      )}

      {content.references && content.references.length > 0 && (
        <section aria-labelledby="references" className="art-prose art-end">
          <h2 id="references" className="art-h2 art-h2-small">
            {dict.sections.references[locale]}
          </h2>
          <ol className="art-notes art-refs">
            {[...content.references]
              .filter((r) => ctx.ref.has(r.id))
              .sort((a, b) => ctx.ref.get(a.id)! - ctx.ref.get(b.id)!)
              .map((r) => (
                <li key={r.id} id={`ref-${r.id}`} value={ctx.ref.get(r.id)}>
                  <span>{inl(r.text, `ref-${r.id}`)}</span>
                  {r.url && (
                    <>
                      {' '}
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="ulink break-all">
                        {r.url.replace(/^https?:\/\//, '')}
                      </a>
                    </>
                  )}{' '}
                  <a href={`#refcite-${r.id}`} className="ulink whitespace-nowrap" aria-label={d.backToText[locale]}>
                    ↩ <span className="sr-only">{d.backToText[locale]}</span>
                  </a>
                </li>
              ))}
          </ol>
        </section>
      )}
    </div>
  );
}
