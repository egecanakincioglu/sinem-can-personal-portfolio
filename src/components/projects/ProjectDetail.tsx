import type { SiteContent } from '@/content/site-content';
import type { ImageMedia, PublicProject } from '@/content/projects/types';
import type { Copy, Locale } from '@/content/types';
import { num, fullDate, monthYear, periodText } from '@/lib/format';
import { pagePath } from '@/lib/routes';
import { nextProject, relatedProjects, toCard } from '@/lib/projects';
import { Cta } from '../linework';
import { Gallery, type GalleryItem } from './Gallery';
import { Viewer3D } from './Viewer3D';
import { ProjectRow } from './ProjectRow';

const TOP = 'pt-[calc(72px+clamp(32px,4vw,64px))]';

/** A body section: label in the left margin, reading column right. Rendered only when it has content. */
function Block({
  id,
  title,
  children,
  wide,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="shell g12 mt-[clamp(56px,7vw,112px)]">
      <h2
        id={`${id}-h`}
        className="serif col-[1/-1] mb-5 text-[24px] leading-tight lg:col-[1/4] lg:mb-0 lg:text-[26px]"
      >
        {title}
      </h2>
      <div className={`col-[1/-1] ${wide ? 'lg:col-[2/12]' : 'lg:col-[4/11]'}`}>{children}</div>
    </section>
  );
}

function CalcRow({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div
      className={`grid gap-1 border-b border-cizgi py-4 md:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] md:gap-6 ${strong ? 'border-b-[1.5px] border-b-grafit' : ''}`}
    >
      <dt className="t-meta pt-1">{label}</dt>
      <dd className="min-w-0 text-[17px] leading-[1.55]">{children}</dd>
    </div>
  );
}

function Lines({ items, locale, numbered }: { items: Copy[]; locale: Locale; numbered?: boolean }) {
  const L = numbered ? 'ol' : 'ul';
  return (
    <L className="max-w-[60ch] space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className={numbered ? 'grid grid-cols-[1.5rem_1fr]' : ''}>
          {numbered && <span className="tnum t-meta pt-1">{i + 1}.</span>}
          <span>{t[locale]}</span>
        </li>
      ))}
    </L>
  );
}

const Paras = ({ items, locale }: { items: Copy[]; locale: Locale }) => (
  <div className="max-w-[62ch] space-y-5 text-[18px] leading-[1.65]">
    {items.map((p, i) => (
      <p key={i}>{p[locale]}</p>
    ))}
  </div>
);

function HeroFigure({ m, locale, tone }: { m: ImageMedia; locale: Locale; tone: 'paper' | 'band' }) {
  return (
    <figure>
      <div className={tone === 'band' ? 'p-6 md:p-12 lg:p-16' : ''}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={m.src}
          alt={m.alt[locale]}
          width={m.width}
          height={m.height}
          decoding="async"
          className={`mx-auto block h-auto w-full ${tone === 'band' ? 'max-w-[60rem] bg-white' : ''}`}
        />
      </div>
      {m.caption && (
        <figcaption className={`t-caption ${tone === 'band' ? 'shell pb-4' : 'mt-2.5'}`}>
          {m.caption[locale]}
        </figcaption>
      )}
    </figure>
  );
}

export function ProjectDetail({
  project: p,
  locale,
  dict,
}: {
  project: PublicProject;
  locale: Locale;
  dict: SiteContent['dict'];
}) {
  const d = dict.projects;
  const v = d.viewer;
  const latestRev = p.revisions?.[p.revisions.length - 1];

  // Title block: only cells that carry a real value.
  const cells = [
    [d.kind[locale], d.kinds[p.kind][locale]],
    [d.discipline[locale], p.disciplines.map((x) => d.disciplines[x][locale]).join(', ')],
    [d.context[locale], p.context && d.contexts[p.context][locale]],
    [
      d.period[locale],
      p.period &&
        (p.period.end
          ? periodText(p.period, locale)
          : p.status === 'in-progress'
            ? periodText(p.period, locale)
            : p.period.precision === 'year'
              ? p.period.start
              : monthYear(p.period.start, locale)),
    ],
    [d.status[locale], d.statuses[p.status][locale]],
    [d.tools[locale], p.tools?.join(', ')],
    [d.materials[locale], p.materials?.map((m) => m[locale]).join(', ')],
    [d.revision[locale], latestRev?.rev],
  ].filter((c): c is [string, string] => !!c[1]);

  const hero = p.hero === 'render' && p.cover ? 'render' : p.hero === 'figure' && p.cover ? 'figure' : 'text';
  const figures = p.figures ?? [];
  const items: GalleryItem[] = figures.map((m, i) => ({
    n: i + 1,
    src: m.src,
    alt: m.alt[locale],
    caption: m.caption?.[locale],
    width: m.width,
    height: m.height,
    externalUrl: m.kind === 'video' ? m.externalUrl : undefined,
  }));
  const related = relatedProjects(p);
  const next = related.length ? undefined : nextProject(p);
  const prev3d = p.preview3d?.approved ? p.preview3d : undefined;
  const calcs = (p.calculations ?? []).filter(
    (c) => c.given?.length || c.required?.length || c.assumptions?.length || c.method?.length || c.result,
  );
  const decisions = (p.decisions ?? []).filter((x) => x.alternatives.length > 1);

  return (
    <article id="project">
      <div className={`shell ${TOP}`}>
        <a href={pagePath('projects', locale)} className="ulink t-meta inline-flex min-h-11 items-center">
          ← {d.back[locale]}
        </a>
        {p.fixture && (
          <p role="note" className="mt-4 border border-grafit px-3 py-2 text-[15px] font-medium text-grafit md:w-fit">
            {d.fixtureLabel[locale]}
          </p>
        )}
      </div>

      <header className="shell g12 mt-8 md:mt-10">
        <h1 className="t-display-l col-[1/-1] lg:col-[1/8]">{p.title[locale]}</h1>
        {p.subtitle && (
          <p className="t-lead col-[1/-1] mt-6 max-w-[36ch] text-kursun lg:col-[1/8]">{p.subtitle[locale]}</p>
        )}
        {/* 1px gaps over a hairline ground draw the dividers; a lone last cell spans both columns so none is ever empty */}
        <dl className="col-[1/-1] mt-10 grid grid-cols-2 gap-px border-[1.5px] border-grafit bg-cizgi lg:col-[8/13] lg:row-[1/3] lg:mt-3 lg:self-start">
          {cells.map(([k, v]) => (
            <div key={k} className="min-w-0 bg-kagit px-3 py-2.5 [&:last-child:nth-child(odd)]:col-span-2">
              <dt className="t-meta">{k}</dt>
              <dd className="mt-0.5 text-[15px] leading-snug">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      {hero === 'render' && p.cover && (
        <div className="shell mt-12 lg:mt-16">
          <HeroFigure m={p.cover} locale={locale} tone="paper" />
        </div>
      )}
      {hero === 'figure' && p.cover && (
        <div className="on-pafta mt-12 bg-pafta pt-2 lg:mt-16">
          <HeroFigure m={p.cover} locale={locale} tone="band" />
        </div>
      )}

      {p.objective?.length ? (
        <Block id="objective" title={d.objective[locale]}>
          <Paras items={p.objective} locale={locale} />
        </Block>
      ) : null}
      {p.process?.length ? (
        <Block id="process" title={d.process[locale]}>
          <Paras items={p.process} locale={locale} />
        </Block>
      ) : null}
      {p.methodology?.length ? (
        <Block id="methodology" title={d.methodology[locale]}>
          <Paras items={p.methodology} locale={locale} />
        </Block>
      ) : null}

      {p.measurements?.length ? (
        <Block id="measurements" title={d.measurements[locale]}>
          <dl className="border-t-[1.5px] border-grafit">
            {p.measurements.map((m, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 border-b border-cizgi py-3.5 md:grid-cols-[1.2fr_auto_1.4fr]"
              >
                <dt>{m.label[locale]}</dt>
                <dd className="tnum serif text-right text-[22px] leading-none">
                  {num(m.value, locale, m.digits ?? 2)}
                  {m.unit && <span className="t-meta ml-1.5 font-sans">{m.unit}</span>}
                </dd>
                {m.note && <dd className="t-caption col-[1/-1] md:col-auto">{m.note[locale]}</dd>}
              </div>
            ))}
          </dl>
        </Block>
      ) : null}

      {items.length ? (
        <Block id="figures" title={d.figures[locale]} wide>
          <Gallery
            items={items}
            labels={{
              figure: d.figure[locale],
              enlarge: d.enlarge[locale],
              lightbox: d.lightbox[locale],
              prev: d.prev[locale],
              next: d.nextFigure[locale],
              close: dict.nav.close[locale],
              watch: d.watchVideo[locale],
              external: d.external[locale],
            }}
          />
        </Block>
      ) : null}

      {/* Interactive viewer: only an approved preview reaches here (lib/projects strips the rest). three.js loads on click. */}
      {prev3d ? (
        <Block id="preview3d" title={d.preview3d[locale]} wide>
          <Viewer3D
            modelSrc={prev3d.modelSrc}
            poster={{
              src: prev3d.poster.src,
              alt: prev3d.poster.alt[locale],
              width: prev3d.poster.width,
              height: prev3d.poster.height,
            }}
            labels={{
              activate: v.activate[locale],
              hint: v.hint[locale],
              instructions: v.instructions[locale],
              loading: v.loading[locale],
              errorTitle: v.errorTitle[locale],
              errorText: v.errorText[locale],
              retry: v.retry[locale],
              reset: v.reset[locale],
              zoomIn: v.zoomIn[locale],
              zoomOut: v.zoomOut[locale],
              rotateLeft: v.rotateLeft[locale],
              rotateRight: v.rotateRight[locale],
              rotateUp: v.rotateUp[locale],
              rotateDown: v.rotateDown[locale],
              canvas: v.canvas[locale],
              sizeNote: prev3d.sizeBytes ? `${num(prev3d.sizeBytes / 1048576, locale, 1)} MB` : undefined,
              demo: p.fixture ? v.demo[locale] : undefined,
            }}
          />
          {prev3d.caption && <p className="t-caption mt-3">{prev3d.caption[locale]}</p>}
        </Block>
      ) : null}

      {calcs.length ? (
        <Block id="calculations" title={d.calculations[locale]} wide>
          <div className="space-y-14">
            {calcs.map((c) => (
              <article key={c.id} aria-labelledby={`${c.id}-h`}>
                <h3 id={`${c.id}-h`} className="serif text-[22px] italic leading-tight">
                  {c.title[locale]}
                </h3>
                <dl className="mt-4 border-t-[1.5px] border-grafit">
                  {c.given?.length ? (
                    <CalcRow label={d.calcGiven[locale]}>
                      <ul className="space-y-1">
                        {c.given.map((q, i) => (
                          <li key={i} className="tnum">
                            {q.label[locale]}
                            {q.symbol && (
                              <>
                                {' '}
                                (<span className="serif italic">{q.symbol}</span>)
                              </>
                            )}{' '}
                            = <span className="serif text-[19px]">{num(q.value, locale, q.digits ?? 2)}</span>
                            {q.unit && <span className="t-meta ml-1.5">{q.unit}</span>}
                          </li>
                        ))}
                      </ul>
                    </CalcRow>
                  ) : null}
                  {c.required?.length ? (
                    <CalcRow label={d.calcRequired[locale]}>
                      <Lines items={c.required} locale={locale} />
                    </CalcRow>
                  ) : null}
                  {c.assumptions?.length ? (
                    <CalcRow label={d.calcAssumptions[locale]}>
                      <Lines items={c.assumptions} locale={locale} numbered />
                    </CalcRow>
                  ) : null}
                  {c.method?.length ? (
                    <CalcRow label={d.calcMethod[locale]}>
                      <Lines items={c.method} locale={locale} />
                    </CalcRow>
                  ) : null}
                  {c.result?.verified ? (
                    <CalcRow label={d.calcResult[locale]} strong>
                      <p className="tnum">
                        {c.result.symbol && <span className="serif mr-2 italic">{c.result.symbol} =</span>}
                        <span className="serif text-[32px] leading-none">
                          {num(c.result.value, locale, c.result.digits ?? 2)}
                        </span>
                        {c.result.unit && <span className="t-meta ml-2">{c.result.unit}</span>}
                      </p>
                      <p className="t-caption mt-1">
                        {c.result.label[locale]}
                        {c.result.note ? ` — ${c.result.note[locale]}` : ''}
                      </p>
                    </CalcRow>
                  ) : null}
                </dl>
              </article>
            ))}
          </div>
        </Block>
      ) : null}

      {decisions.length ? (
        <Block id="decisions" title={d.decisions[locale]} wide>
          <div className="space-y-14">
            {decisions.map((x) => (
              <article key={x.id} aria-labelledby={`${x.id}-h`}>
                <h3 id={`${x.id}-h`} className="serif text-[22px] italic leading-tight">
                  {x.title[locale]}
                </h3>
                <ol className="mt-4 border-t border-cizgi">
                  {x.alternatives.map((a, i) => {
                    const notes = (x.criteria ?? [])
                      .map((cr, k) => [cr, a.evidence?.[k]] as const)
                      .filter(([, ev]) => ev);
                    return (
                      <li
                        key={i}
                        className={`grid gap-x-8 gap-y-2 border-b border-cizgi py-5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] relative ${a.selected ? 'before:absolute before:inset-y-0 before:-left-3 before:w-[3px] before:bg-grafit' : ''}`}
                      >
                        <div>
                          <p className="t-meta">
                            {d.decisionAlternative[locale]} {String.fromCharCode(65 + i)}
                          </p>
                          <p className="serif text-[22px] leading-tight">{a.name[locale]}</p>
                          {a.selected && (
                            <p className="t-meta mt-1 font-semibold text-grafit">✓ {d.decisionSelected[locale]}</p>
                          )}
                        </div>
                        {notes.length > 0 && (
                          <dl className="space-y-2 text-[16px] leading-snug">
                            {notes.map(([cr, ev], k) => (
                              <div key={k}>
                                <dt className="t-meta">{cr[locale]}</dt>
                                <dd>{ev![locale]}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {x.rationale && (
                  <div className="mt-6 max-w-[62ch]">
                    <p className="t-meta">{d.decisionRationale[locale]}</p>
                    <p className="mt-1 text-[18px] leading-[1.65]">{x.rationale[locale]}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </Block>
      ) : null}

      {p.results?.length ? (
        <Block id="results" title={d.results[locale]}>
          <Paras items={p.results} locale={locale} />
        </Block>
      ) : null}
      {p.conclusions?.length ? (
        <Block id="conclusions" title={d.conclusions[locale]}>
          <Paras items={p.conclusions} locale={locale} />
        </Block>
      ) : null}

      {p.learnings?.length ? (
        <Block id="learnings" title={d.learnings[locale]}>
          <div className="rail-q">
            <Paras items={p.learnings} locale={locale} />
          </div>
        </Block>
      ) : null}

      {p.revisions?.length ? (
        <Block id="revisions" title={d.revisions[locale]}>
          <ol className="border-t border-cizgi">
            {[...p.revisions].reverse().map((r) => (
              <li
                key={r.rev}
                className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 border-b border-cizgi py-3 text-[15px]"
              >
                <span className="tnum font-medium">
                  {d.rev[locale]} {r.rev}
                </span>
                <span>
                  {r.date && (
                    <>
                      <span className="tnum muted">{fullDate(r.date, locale)}</span> —{' '}
                    </>
                  )}
                  {r.note[locale]}
                  {r.reasoning && (
                    <span className="t-caption mt-1 block">
                      {d.revisionReason[locale]}: {r.reasoning[locale]}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </Block>
      ) : null}

      {related.length > 0 && (
        <section aria-labelledby="related-h" className="shell mt-[clamp(72px,9vw,144px)]">
          <h2 id="related-h" className="t-meta mb-4">
            {d.related[locale]}
          </h2>
          <ul className="border-b border-cizgi">
            {related.map((r) => (
              <ProjectRow key={r.id} card={toCard(r, locale)} locale={locale} />
            ))}
          </ul>
        </section>
      )}
      {next && (
        <div className="shell mt-[clamp(72px,9vw,144px)]">
          <div className="hair pt-4">
            <Cta href={toCard(next, locale).href}>
              {d.next[locale]}: {next.title[locale]}
            </Cta>
          </div>
        </div>
      )}
      <div className="h-[var(--section)]" />
    </article>
  );
}
