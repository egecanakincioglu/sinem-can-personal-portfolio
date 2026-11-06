import { dict } from '@/content/dictionary';
import { contact, ownerName } from '@/content/site';
import type { Locale } from '@/content/types';
import { fullDate } from '@/lib/format';
import { headingsOf, nextNote, readingMinutes, relatedNotes, toItem, type PublicNote } from '@/lib/notes';
import { pagePath } from '@/lib/routes';
import { Cta } from '../linework';
import { ArticleBody } from './ArticleBody';
import { ArticleToc, type TocItem } from './ArticleToc';
import { NoteList } from './NoteList';

const d = dict.notes;
const TOP = 'pt-[calc(72px+clamp(40px,6vw,96px))]';

/** Table-of-contents entries: H2 and H3 headings, plus the end sections when the article has them. */
export function tocOf(n: PublicNote, locale: Locale): TocItem[] {
  const { content } = n;
  let parent = '';
  const items: TocItem[] = headingsOf(content).map((h) => {
    if (h.level === 2) parent = h.id;
    return { id: h.id, label: h.text, level: h.level, parent: h.level === 2 ? h.id : parent };
  });
  if (content.footnotes?.length)
    items.push({ id: 'footnotes', label: dict.sections.footnotes[locale], level: 2, parent: 'footnotes' });
  if (content.references?.length)
    items.push({ id: 'references', label: dict.sections.references[locale], level: 2, parent: 'references' });
  return items;
}

/** Back link: the site's arrowhead standard, pointing left. */
function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="cta cta-back">
      <span aria-hidden className="arrow" />
      <span className="label">{children}</span>
    </a>
  );
}

export function NoteArticle({ note, locale }: { note: PublicNote; locale: Locale }) {
  const { record, content } = note;
  const minutes = readingMinutes(content, locale);
  const toc = tocOf(note, locale);
  const related = relatedNotes(note);
  const next = nextNote(note);
  const fixture = !!record.fixture;
  const updated = record.updated && record.updated !== record.published ? record.updated : undefined;

  const meta: [string, React.ReactNode][] = [
    [d.by[locale], fixture ? d.sampleAuthor[locale] : ownerName],
    [
      d.published[locale],
      <time key="p" dateTime={record.published} className="tnum">
        {fullDate(record.published, locale)}
      </time>,
    ],
    ...(updated
      ? ([
          [
            d.updated[locale],
            <time key="u" dateTime={updated} className="tnum">
              {fullDate(updated, locale)}
            </time>,
          ],
        ] as [string, React.ReactNode][])
      : []),
    [
      d.readingTime[locale],
      <span key="r" className="tnum">
        {d.minRead[locale].replace('{n}', String(minutes))}
      </span>,
    ],
  ];

  const mailto = `mailto:${contact.email}?subject=${encodeURIComponent(`${d.errorSubject[locale]}: ${content.title}`)}`;

  return (
    <article aria-labelledby="note-title" className="notes-scope">
      <header className={`shell g12 ${TOP}`}>
        <div className="col-[1/-1] mb-10 md:mb-14">
          <BackLink href={pagePath('notes', locale)}>{d.back[locale]}</BackLink>
        </div>
        {content.category && (
          <p className="t-meta col-[1/-1] mb-5">
            <span className="font-serif text-[16px] font-normal italic text-grafit">{content.category}</span>
          </p>
        )}
        <h1 id="note-title" className="art-title col-[1/-1] lg:col-[1/11]">
          {content.title}
        </h1>
        {content.subtitle && (
          <p className="t-lead col-[1/-1] mt-7 max-w-[34ch] text-kursun md:col-[1/8] lg:col-[2/9] lg:mt-9">
            {content.subtitle}
          </p>
        )}

        <dl className="hair col-[1/-1] mt-10 grid grid-cols-2 gap-x-[var(--g)] gap-y-4 pt-4 md:grid-cols-4 lg:mt-14">
          {meta.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="t-meta">{k}</dt>
              <dd className="mt-0.5 text-[15px] leading-snug">{v}</dd>
            </div>
          ))}
        </dl>
        {fixture && (
          <p className="t-meta col-[1/-1] mt-5 border border-dashed border-grafit px-3 py-2 text-grafit md:justify-self-start">
            {d.fixtureLabel[locale]}
          </p>
        )}
      </header>

      <div className="shell g12 mt-10 pb-[clamp(56px,7vw,104px)] lg:mt-16">
        <div className="col-[1/-1] lg:col-[1/4]">
          <ArticleToc
            items={toc}
            title={d.onThisPage[locale]}
            startLabel={content.category ?? dict.sections.note[locale]}
          />
        </div>
        <div className="col-[1/-1] mt-10 lg:col-[4/-1] lg:mt-0">
          <ArticleBody content={content} locale={locale} />
        </div>
      </div>

      <div className="shell g12 pb-[var(--section)]">
        <div className="col-[1/-1] lg:col-[4/-1]">
          <div className="art-end-wrap">
            {content.revisions && content.revisions.length > 0 && (
              <section aria-labelledby="rev-h" className="border-t border-grafit pt-5">
                <h2 id="rev-h" className="t-meta">
                  {d.revisions[locale]}
                </h2>
                <ul className="mt-3 space-y-1.5 text-[15px]">
                  {content.revisions.map((r) => (
                    <li key={r.rev}>
                      <span className="font-semibold">Rev. {r.rev}</span> ·{' '}
                      <span className="tnum">{fullDate(r.date, locale)}</span>: {r.text}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section
              aria-labelledby="author-h"
              className="mt-10 grid gap-x-[var(--g)] gap-y-6 border-t border-cizgi pt-5 md:grid-cols-2"
            >
              <div>
                <h2 id="author-h" className="t-meta">
                  {d.aboutAuthor[locale]}
                </h2>
                {fixture ? (
                  <p className="serif mt-2 text-[22px] leading-snug">{d.sampleAuthor[locale]}</p>
                ) : (
                  <>
                    <p className="serif mt-2 text-[24px] leading-tight">{ownerName}</p>
                    <p className="mt-1 max-w-[34ch] text-kursun">{d.authorLine[locale]}</p>
                  </>
                )}
              </div>
              <div className="md:pt-6">
                {!fixture && <Cta href={pagePath('profile', locale)}>{d.toProfileLink[locale]}</Cta>}
                <p className="mt-2 text-[15px]">
                  <a href={mailto} className="ulink">
                    {d.spotError[locale]}
                  </a>
                </p>
              </div>
            </section>

            {related.length > 0 && (
              <section aria-labelledby="rel-h" className="mt-14">
                <h2 id="rel-h" className="t-meta mb-3">
                  {d.related[locale]}
                </h2>
                <NoteList items={related.map(toItem)} locale={locale} filterable={false} />
              </section>
            )}

            {next && (
              <div className="mt-10 border-t border-grafit pt-5">
                <p className="t-meta">{d.next[locale]}</p>
                <p className="serif mt-1 text-[clamp(1.5rem,2.4vw,2rem)] leading-tight">
                  <a href={toItem(next).href} className="ulink">
                    {next.content.title}
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
