import { dict } from '@/content/dictionary';
import { ownerName } from '@/content/site';
import type { Locale } from '@/content/types';
import { splitFeatured, toCard } from '@/lib/projects';
import type { PublicProject } from '@/content/projects/types';
import { pagePath } from '@/lib/routes';
import { Cta } from '../linework';
import { ArchiveList } from './ArchiveList';
import { Featured } from './Featured';

const TOP = 'pt-[calc(72px+clamp(48px,7vw,112px))]';

/** Opening composition: oversized title left, italic introduction right, hairline closing the sheet head. */
function Opening({ locale, children }: { locale: Locale; children?: React.ReactNode }) {
  const d = dict.projects;
  return (
    <header className={`shell g12 ${TOP}`}>
      {/* "!" beats the unlayered tag reset in globals.css, which would otherwise zero these margins and touch the title */}
      <p className="t-meta col-[1/-1] mb-10! md:mb-14!">{d.eyebrow[locale]}</p>
      <h1
        id="archive-h"
        className="serif col-[1/-1] text-[clamp(3.5rem,13vw,10.5rem)] font-[360] leading-[1.02] tracking-[-0.03em] lg:col-[1/9]"
      >
        {d.title[locale]}
      </h1>
      <p className="t-lead col-[1/-1] mt-8! max-w-[30ch] self-end text-kursun md:col-[1/7] lg:col-[9/13] lg:mt-0! lg:pb-3">
        {d.lead[locale]}
      </p>
      {children}
    </header>
  );
}

/** "Pafta hazırlanıyor." — a drawing sheet: frame, centre lines, one ghost outline, title block. */
function EmptySheet({ locale }: { locale: Locale }) {
  const d = dict.projects;
  const w = dict.work;
  return (
    <section id="archive" aria-labelledby="empty-h" className="sec pt-[clamp(56px,7vw,104px)]">
      <div className="shell">
        <div className="border-[1.5px] border-grafit">
          <div className="grid lg:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col justify-between gap-12 p-6 md:p-10 lg:min-h-[460px] lg:p-14">
              <div>
                <p className="t-meta">{w.projects[locale]}</p>
                <h2 id="empty-h" className="t-display-m mt-3! max-w-[12ch]">
                  {d.emptyTitle[locale]}
                </h2>
                <p className="mt-4! max-w-[30ch] text-kursun">{d.emptyText[locale]}</p>
                <div className="mt-6">
                  <Cta href={pagePath('profile', locale)}>{d.toProfile[locale]}</Cta>
                </div>
              </div>
              <div>
                <p className="t-meta">{d.legendHeading[locale]}</p>
                <ul className="mt-3 grid max-w-[30rem] gap-x-8 sm:grid-cols-2">
                  {d.legend.map((item) => (
                    <li key={item.en} className="pt-3">
                      <span className="serif text-[18px] leading-tight">{item[locale]}</span>
                      <div className="ghost-h mt-2" aria-hidden />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* construction geometry in its own cell: centre lines + the first contour of a part that does not exist yet */}
            <div className="border-t border-cizgi lg:border-l lg:border-t-0">
              <svg
                aria-hidden
                viewBox="0 0 400 400"
                preserveAspectRatio="xMidYMid meet"
                className="block h-[260px] w-full md:h-[340px] lg:h-full"
              >
                <line x1="0" y1="200" x2="400" y2="200" className="svg-axis" />
                <line x1="200" y1="0" x2="200" y2="400" className="svg-axis" />
                <rect x="96" y="124" width="208" height="152" className="svg-ghost" />
              </svg>
            </div>
          </div>

          <div className="flex border-t-[1.5px] border-grafit md:justify-end">
            <dl className="grid w-full grid-cols-[1.15fr_1.5fr_0.6fr] md:w-[34rem] md:grid-cols-3 md:border-l-[1.5px] md:border-grafit">
              {[
                [w.drawnBy[locale], ownerName],
                [w.status[locale], d.statusPreparing[locale]],
                [w.rev[locale], '—'],
              ].map(([k, v], i) => (
                <div key={k} className={`min-w-0 px-3 py-3 md:px-4 ${i > 0 ? 'border-l border-cizgi' : ''}`}>
                  <dt className="t-meta">{k}</dt>
                  <dd className="mt-0.5 text-[15px] leading-snug">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProjectsArchive({ locale, projects }: { locale: Locale; projects: PublicProject[] }) {
  const d = dict.projects;

  if (projects.length === 0) {
    return (
      <>
        <Opening locale={locale} />
        <EmptySheet locale={locale} />
      </>
    );
  }

  const cards = projects.map((p) => toCard(p, locale));
  const { featured, rest } = splitFeatured(projects, cards);
  const years = cards
    .map((c) => c.year)
    .filter(Boolean)
    .sort();
  const span = years.length
    ? years[0] === years[years.length - 1]
      ? years[0]
      : `${years[0]}–${years[years.length - 1]}`
    : null;

  return (
    <>
      <Opening locale={locale}>
        <dl className="hair col-[1/-1] mt-10 grid grid-cols-2 gap-x-[var(--g)] pt-4 md:grid-cols-4 lg:mt-14">
          <div>
            <dt className="t-meta">{d.other[locale]}</dt>
            <dd className="tnum serif text-[28px] leading-none">{cards.length}</dd>
          </div>
          {span && (
            <div>
              <dt className="t-meta">{d.year[locale]}</dt>
              <dd className="tnum serif text-[28px] leading-none">{span}</dd>
            </div>
          )}
        </dl>
      </Opening>

      <section id="archive" aria-labelledby="archive-h" className="pb-[var(--section)]">
        <Featured card={featured} locale={locale} />
        {rest.length > 0 && (
          <div className="shell mt-[clamp(64px,8vw,128px)]">
            <h2 className="t-meta mb-4">{d.other[locale]}</h2>
            <ArchiveList cards={rest} total={cards.length} locale={locale} />
          </div>
        )}
      </section>
    </>
  );
}
