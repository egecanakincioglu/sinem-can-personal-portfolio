import type { SiteContent } from '@/content/site-content';
import type { Locale } from '@/content/types';
import { fullDate } from '@/lib/format';
import { toItem, type NoteItem, type PublicNote } from '@/lib/notes';
import { pagePath } from '@/lib/routes';
import { Cta } from '../linework';
import { langStatus } from '@/lib/note-view';
import { NoteList } from './NoteList';

const TOP = 'pt-[calc(72px+clamp(48px,7vw,112px))]';
const FILTER_FROM = 8; // topic filter opens at eight notes

/** Opening: an oversized, outdented title; the eyebrow and lead sit in the margin rail beside it. */
function Opening({ locale, dict }: { locale: Locale; dict: SiteContent['dict'] }) {
  const d = dict.notes;
  return (
    <header className={`shell g12 ${TOP}`}>
      <p className="t-meta col-[1/-1] hair pt-4">{d.eyebrow[locale]}</p>
      <h1 id="archive-h" className="notes-title col-[1/-1] mt-6 lg:col-[1/10] lg:mt-10">
        {d.title[locale]}
      </h1>
      <p className="t-lead col-[1/-1] mt-8 max-w-[28ch] text-kursun md:col-[1/6] lg:col-[10/13] lg:mt-0 lg:self-end lg:pb-5">
        {d.lead[locale]}
      </p>
    </header>
  );
}

/** Designed empty state: the first ruled lines of a notebook. Real statement, then ghost entries. */
function EmptyNotebook({ locale, dict }: { locale: Locale; dict: SiteContent['dict'] }) {
  const d = dict.notes;
  return (
    <section id="archive" aria-labelledby="empty-h" className="sec pt-[clamp(56px,7vw,104px)]">
      <div className="shell g12">
        <div className="col-[1/-1] mb-8 lg:col-[1/4] lg:mb-0">
          <p className="t-meta">{d.archive[locale]}</p>
          <p className="t-note mt-3 max-w-[24ch]">{d.emptyAside[locale]}</p>
        </div>

        <div className="col-[1/-1] lg:col-[4/-1]">
          <div className="border-t border-grafit pb-12 pt-8 md:pb-16 md:pt-10">
            <h2 id="empty-h" className="t-display-m max-w-[16ch]">
              {d.emptyTitle[locale]}
            </h2>
            <p className="mt-5 max-w-[40ch] text-kursun">{d.emptyText[locale]}</p>
            <div className="mt-7 flex flex-wrap gap-x-8">
              <Cta href={pagePath('profile', locale)}>{d.toProfile[locale]}</Cta>
              <Cta href={pagePath('projects', locale)}>{d.toProjects[locale]}</Cta>
            </div>
          </div>
          {/* ruled lines still to be written: ghost date + ghost title, same rhythm as a real row */}
          <div aria-hidden>
            {[0, 1, 2].map((k) => (
              <div
                key={k}
                className="grid grid-cols-[3.5rem_1fr] items-end gap-6 border-t border-cizgi py-9 md:grid-cols-[6rem_1fr] md:py-11 lg:grid-cols-[6rem_1fr_9rem]"
              >
                <div className="ghost-h" />
                <div className="ghost-h" style={{ marginRight: `${k * 14}%` }} />
                <div className="ghost-h hidden lg:block" />
              </div>
            ))}
            <div className="border-t border-cizgi" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Featured({ n, locale, dict }: { n: NoteItem; locale: Locale; dict: SiteContent['dict'] }) {
  const d = dict.notes;
  return (
    <div className="shell g12 mt-14 lg:mt-20">
      <p className="t-meta col-[1/-1] mb-5">{d.latest[locale]}</p>
      {n.cover && (
        <a href={n.href} className="col-[1/-1] mb-8 block lg:col-[1/8] lg:mb-0" tabIndex={-1} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={n.cover.src}
            alt=""
            width={n.cover.width}
            height={n.cover.height}
            className="aspect-[3/2] w-full object-cover"
            style={{ objectPosition: `${n.cover.focalX}% ${n.cover.focalY}%` }}
          />
        </a>
      )}
      <div className={`col-[1/-1] ${n.cover ? 'lg:col-[8/13]' : 'lg:col-[1/10]'}`}>
        <h2
          className={`serif text-balance font-[380] leading-[1.04] tracking-[-0.02em] ${n.cover ? 'text-[clamp(2rem,3.4vw,3.5rem)]' : 'text-[clamp(2.25rem,5vw,4.75rem)]'}`}
        >
          <a href={n.href} className="hover:underline hover:decoration-1 hover:underline-offset-[8px]">
            {n.title}
          </a>
        </h2>
        <p className="t-lead mt-5 max-w-[36ch] text-kursun">{n.summary}</p>
        <p className="t-meta mt-6 flex flex-wrap gap-x-4 gap-y-1">
          <time dateTime={n.date} className="tnum">
            {fullDate(n.date, locale)}
          </time>
          {n.category && <span className="font-serif text-[15px] font-normal italic text-grafit">{n.category}</span>}
          <span className="tnum">{d.minRead[locale].replace('{n}', String(n.minutes))}</span>
          <span>{langStatus(n.langs, locale)}</span>
        </p>
        {n.fixture && <p className="t-meta mt-3 text-grafit">{d.fixtureLabel[locale]}</p>}
        <div className="mt-5">
          <Cta href={n.href}>{d.read[locale]}</Cta>
        </div>
      </div>
    </div>
  );
}

export function NotesArchive({
  locale,
  notes,
  dict,
}: {
  locale: Locale;
  notes: PublicNote[];
  dict: SiteContent['dict'];
}) {
  const d = dict.notes;
  if (notes.length === 0) {
    return (
      <div className="notes-scope">
        <Opening locale={locale} dict={dict} />
        <EmptyNotebook locale={locale} dict={dict} />
      </div>
    );
  }

  const items = notes.map(toItem);
  const fi = Math.max(
    0,
    items.findIndex((n) => n.featured),
  );
  const featured = items[fi];
  const rest = items.filter((_, i) => i !== fi);

  return (
    <div className="notes-scope">
      <Opening locale={locale} dict={dict} />
      <section id="archive" aria-labelledby="archive-h" className="pb-[var(--section)]">
        <Featured n={featured} locale={locale} dict={dict} />
        {rest.length > 0 && (
          <div className="shell mt-[clamp(64px,8vw,128px)]">
            <h2 className="t-meta mb-4">{d.archive[locale]}</h2>
            <NoteList items={rest} locale={locale} filterable={items.length >= FILTER_FROM} />
          </div>
        )}
      </section>
    </div>
  );
}
