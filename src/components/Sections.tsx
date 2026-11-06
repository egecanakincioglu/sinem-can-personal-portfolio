import type { SiteContent } from '@/content/site-content';
import { type Locale, type Process } from '@/content/types';
import { fullDate, monthYear, num } from '@/lib/format';
import type { NoteItem } from '@/lib/notes';
import type { ProjectCard } from '@/lib/projects';
import { resultant } from '@/lib/physics';
import { pagePath } from '@/lib/routes';
import { BeamFigure } from './BeamFigure';
import { CopyEmail } from './CopyEmail';
import { Portrait } from './Portrait';
import { Featured } from './projects/Featured';
import { ProjectRow } from './projects/ProjectRow';
import { ForcesInteractive } from './ForceFigure';
import { Cta, RVector, SupportLine, V } from './linework';
import { Sidenote } from './Sidenote';

/** The page passes the content to render: the authoritative public content, or a merged override in preview. */
type P = { locale: Locale; content: SiteContent };
/** Parts that hand an edited dictionary slice to a client figure only in preview, so the public payload stays unchanged. */
type PreviewP = P & { preview?: boolean };

/* 02 — Kısaca: statement, intro paragraph with a rail note, recruiter summary */
export function Intro({ locale, content }: P) {
  const { dict, draft, summaryRows } = content;
  return (
    <section id="profile" aria-labelledby="intro-h" className="sec">
      <div className="shell g12">
        <h2 id="intro-h" className="t-meta col-[1/-1] mb-8 lg:col-[2/-1]">
          {dict.intro.heading[locale]}
        </h2>

        <p className="t-statement col-[1/-1] lg:col-[2/10]">{draft.statement[locale]}</p>

        {/* Portrait: right-aligned and narrower than the column on small screens, hung at the right margin beside statement and paragraph on lg (clear of the rail note) */}
        <Portrait
          locale={locale}
          source={content.portrait}
          sizes="(min-width: 1024px) 28vw, (min-width: 768px) 40vw, 72vw"
          className="col-[2/-1] mt-10 md:col-[4/-1] lg:col-[10/13] lg:row-[2/4] lg:ml-16 lg:mt-3 lg:self-start"
        />

        <div className="rail-host col-[1/-1] mt-10 lg:col-[2/9] lg:mt-14">
          <p className="max-w-[58ch] text-[17px] leading-[1.6]">
            {draft.introBody[locale]}
            <Sidenote n="1">{draft.introNote[locale]}</Sidenote>
          </p>
        </div>

        <div className="col-[1/-1] lg:col-[2/11]">
          <p className="t-meta pb-3">{dict.intro.summary[locale]}</p>
          <dl className="grid grid-cols-1 gap-x-[calc(var(--g)*2)] md:grid-cols-2">
            {summaryRows.map((r) => (
              <div key={r.label.en} className="hair grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] gap-4 py-3.5">
                <dt className="t-meta pt-0.5">{r.label[locale]}</dt>
                <dd className="leading-snug">{r.value[locale]}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="col-[1/-1] mt-10 lg:col-[2/-1]">
          <Cta href={pagePath('profile', locale)}>{dict.intro.fullProfile[locale]}</Cta>
        </div>
      </div>
    </section>
  );
}

/* 03 — Kuvvetler: ordered list (real content) + static force polygon (conceptual summary) */
export function Forces({ locale, content, preview }: PreviewP) {
  const { dict, draft, forceRecords } = content;
  return (
    <section id="forces" aria-labelledby="forces-h" className="band on-pafta">
      <div className="shell g12">
        <h2 id="forces-h" className="t-display-l col-[1/-1] lg:col-[1/10]">
          {dict.forces.heading[locale]}
        </h2>
        <p className="col-[1/-1] mt-8 max-w-[52ch] text-[17px] leading-[1.6] lg:col-[2/7] lg:mt-10">
          {draft.forcesText[locale]}
        </p>

        {/* list + figure are grid items of this container; they share one client state (step, order, highlight) */}
        <ForcesInteractive records={forceRecords} locale={locale} copy={preview ? dict.forces : undefined} />
      </div>
    </section>
  );
}

export function ProcessList({
  items,
  tone,
  locale,
}: {
  items: Process[];
  tone: 'applied' | 'observed';
  locale: Locale;
}) {
  const applied = tone === 'applied';
  return (
    <ul className={applied ? 'border-l-[1.5px] border-grafit' : 'border-l border-kalem text-kursun'}>
      {items.map((p, i) => (
        <li key={`${i}-${p.name.en}`} className="py-3 pl-5">
          <p className={`text-[19px] leading-[1.3] ${applied ? 'font-semibold text-grafit' : 'font-medium'}`}>
            {p.name[locale]}
          </p>
          <p className="t-note mt-0.5 max-w-[34ch]">{p.note[locale]}</p>
        </li>
      ))}
    </ul>
  );
}

/* 04 — Atölye: typographic only, no imagery */
export function Workshop({ locale, content }: P) {
  const { dict, applied, observed } = content;
  const internship = content.experience[0];
  const w = dict.workshop;
  return (
    <section id="workshop" aria-labelledby="workshop-h" className="sec">
      <div className="shell g12">
        <h2 id="workshop-h" className="t-display-l col-[1/-1] lg:col-[1/10]">
          {w.heading[locale]}
        </h2>

        <div className="col-[1/-1] mt-12 lg:col-[2/7] lg:mt-20">
          <p className="t-meta">{w.internship[locale]}</p>
          <h3 className="t-display-m mt-2">{internship.organization}</h3>
          <p className="t-lead mt-4 max-w-[26ch]">{w.role[locale]}</p>
          <p className="tnum mt-6 text-[15px] text-kursun">
            {monthYear(internship.month, locale)} · {w.duration[locale]} · {w.place[locale]}
          </p>
        </div>

        <div className="col-[1/-1] mt-14 grid gap-12 md:grid-cols-2 md:gap-[var(--g)] lg:col-[7/13] lg:mt-20">
          <div>
            <h3 className="serif text-[22px] italic leading-none">{w.applied[locale]}</h3>
            <p className="t-caption mb-4 mt-2">{w.appliedHint[locale]}</p>
            <ProcessList items={applied} tone="applied" locale={locale} />
          </div>
          <div>
            <h3 className="serif text-[22px] italic leading-none text-kursun">{w.observed[locale]}</h3>
            <p className="t-caption mb-4 mt-2">{w.observedHint[locale]}</p>
            <ProcessList items={observed} tone="observed" locale={locale} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* 05 — Yaklaşım: static beam composition; B2 adds the live slider */
export function Approach({ locale, content, preview }: PreviewP) {
  const { dict, academicInterests, draft } = content;
  const a = dict.approach;
  return (
    <section id="approach" aria-labelledby="approach-h" className="band on-pafta">
      <div className="shell g12">
        <h2 id="approach-h" className="t-display-l col-[1/-1] lg:col-[1/10]">
          {a.heading[locale]}
        </h2>

        <div className="col-[1/-1] mt-12 lg:col-[1/5] lg:mt-20">
          <p className="t-meta mb-2">{a.interests[locale]}</p>
          <ul>
            {academicInterests.map((it) => (
              <li key={it.en} className="border-t border-kalem/50 py-3 text-[17px]">
                {it[locale]}
              </li>
            ))}
          </ul>
        </div>

        <div className="col-[1/-1] mt-14 lg:col-[6/13] lg:mt-20">
          {/* key: a changed default load remounts the figure, so the initial load and reset target follow it */}
          <BeamFigure
            key={content.beam.defaultLoad}
            locale={locale}
            defaultLoad={content.beam.defaultLoad}
            copy={preview ? a : undefined}
          />
          <p className="t-note mt-8 max-w-[46ch]">{draft.beamTeaching[locale]}</p>
        </div>
      </div>
    </section>
  );
}

/* 06 — Çalışmalar: data-driven. `projects` are public view-models, featured first (see homeProjectCards).
   None → the designed empty state, unchanged. Otherwise: the featured block, up to two rows and the archive link; notes follow. */
export function Work({
  locale,
  notes = [],
  projects = [],
  content,
}: P & { notes?: NoteItem[]; projects?: ProjectCard[] }) {
  const { dict, ownerName, workView } = content;
  const w = dict.work;
  // Featured pick only reorders the public cards this page was given (published + approved); an unknown id changes nothing.
  const lead = workView.featuredId ? projects.findIndex((c) => c.id === workView.featuredId) : -1;
  const ordered = !workView.showProjects
    ? []
    : lead > 0
      ? [projects[lead], ...projects.filter((_, i) => i !== lead)]
      : projects;
  const [featured, ...rest] = ordered;

  const notesCell = (cls: string) =>
    !workView.showNotes ? null : (
      <div id="notes" className={cls}>
        <p className="t-meta">{w.notes[locale]}</p>
        {notes.length === 0 ? (
          <>
            <p className="serif mt-3 text-[22px] leading-snug">{w.emptyNotes[locale]}</p>
            <div className="ghost-h mt-6" aria-hidden />
          </>
        ) : (
          <ul className="mt-3">
            {notes.slice(0, 3).map((n) => (
              <li key={n.id} className="border-t border-cizgi py-3 first:border-t-0 first:pt-0">
                <p className="t-meta tnum">{fullDate(n.date, locale)}</p>
                <a href={n.href} className="serif ulink mt-0.5 block text-[20px] leading-snug">
                  {n.title}
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6">
          <Cta href={pagePath('notes', locale)}>{w.allNotes[locale]}</Cta>
        </div>
      </div>
    );

  // title block: the full-width rule closes the frame; the block itself sits bottom-right on md+
  const titleBlock = (
    <div className="flex border-t-[1.5px] border-grafit md:justify-end">
      <dl className="grid w-full grid-cols-[1.15fr_1.5fr_0.6fr] md:w-[34rem] md:grid-cols-3 md:border-l-[1.5px] md:border-grafit">
        {[
          [w.drawnBy[locale], ownerName],
          [w.status[locale], w.statusValue[locale]],
          [w.rev[locale], '—'],
        ].map(([k, v], i) => (
          <div key={k} className={`min-w-0 px-3 py-3 md:px-4 ${i > 0 ? 'border-l border-cizgi' : ''}`}>
            <dt className="t-meta">{k}</dt>
            <dd className="mt-0.5 text-[15px] leading-snug">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  if (featured) {
    return (
      <section id="work" aria-labelledby="work-h" className="sec">
        <div className="shell g12">
          <h2 id="work-h" className="t-display-l col-[1/-1] lg:col-[1/8]">
            {w.heading[locale]}
          </h2>

          <Featured card={featured} locale={locale} dict={dict} embedded />

          {rest.length > 0 && (
            <div className="col-[1/-1] mt-12 lg:mt-16">
              <ul>
                {rest.slice(0, 2).map((card) => (
                  <ProjectRow key={card.id} card={card} locale={locale} />
                ))}
              </ul>
              <div className="mt-6">
                <Cta href={pagePath('projects', locale)}>{dict.projects.back[locale]}</Cta>
              </div>
            </div>
          )}

          <div className="col-[1/-1] mt-14 border-[1.5px] border-grafit lg:mt-20">
            {notesCell('p-6 md:p-10')}
            {titleBlock}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="work" aria-labelledby="work-h" className="sec">
      <div className="shell g12">
        <h2 id="work-h" className="t-display-l col-[1/-1] lg:col-[1/8]">
          {w.heading[locale]}
        </h2>

        <div className="col-[1/-1] mt-12 border-[1.5px] border-grafit lg:mt-16">
          <div className={workView.showProjects && workView.showNotes ? 'grid md:grid-cols-[1.35fr_1fr]' : 'grid'}>
            {workView.showProjects && (
              <div className="relative p-6 md:min-h-[340px] md:p-10">
                {/* Construction geometry lives in its own empty area: beside the text on md+, below it on mobile. */}
                <svg
                  aria-hidden
                  viewBox="0 0 200 200"
                  preserveAspectRatio="xMidYMid meet"
                  className="pointer-events-none mx-auto mt-8 block h-40 w-full md:absolute md:inset-y-0 md:right-0 md:mx-0 md:mt-0 md:h-full md:w-[40%]"
                >
                  <line x1="0" y1="100" x2="200" y2="100" className="svg-axis" />
                  <line x1="100" y1="0" x2="100" y2="200" className="svg-axis" />
                  <rect x="38" y="52" width="124" height="96" className="svg-ghost" />
                </svg>
                <div className="relative md:max-w-[56%]">
                  <p className="t-meta">{w.projects[locale]}</p>
                  <h3 className="t-display-m mt-3 max-w-[12ch]">{w.emptyProjects[locale]}</h3>
                  <p className="mt-4 max-w-[30ch] text-kursun">{w.emptyProjectsText[locale]}</p>
                  <div className="mt-6">
                    <Cta href={pagePath('profile', locale)}>{w.toProfile[locale]}</Cta>
                  </div>
                </div>
              </div>
            )}

            {notesCell(
              workView.showProjects ? 'border-t border-cizgi p-6 md:border-l md:border-t-0 md:p-10' : 'p-6 md:p-10',
            )}
          </div>

          {titleBlock}
        </div>
      </div>
    </section>
  );
}

/* 07a — Yönelim */
export function Direction({ locale, content }: P) {
  const { dict, draft, forceRecords, interests } = content;
  const R = resultant(forceRecords);
  const deg = Math.round(R.angleDeg);
  return (
    <section id="direction" aria-labelledby="direction-h" className="sec pb-0">
      <div className="shell g12">
        <h2 id="direction-h" className="t-display-l col-[1/-1] lg:col-[2/10]">
          {dict.direction.heading[locale]}
        </h2>

        <div className="col-[1/-1] mt-12 flex items-end justify-between gap-6 lg:col-[2/-1] lg:mt-16">
          <ul className="min-w-0 flex-1 lg:max-w-[28rem]">
            {interests.map((it, i) => (
              <li key={`${i}-${it.en}`} className="pt-5">
                <p className="serif text-[28px] leading-none md:text-[32px]">{it[locale]}</p>
                <div className="ghost-h mt-4" aria-hidden />
              </li>
            ))}
          </ul>
          <div className="hidden shrink-0 pb-1 md:block">
            <RVector
              size={160}
              theta={R.angleDeg}
              label={dict.hero.resultantAlt[locale].replace('{deg}', String(deg))}
            />
            <p className="tnum t-caption mt-2">
              <V n="θ" s="R" /> = {num(R.angleDeg, locale, 0)}°
            </p>
          </div>
        </div>

        <p className="t-lead col-[1/-1] mt-12 max-w-[34ch] lg:col-[2/8]">{draft.openness[locale]}</p>
      </div>
    </section>
  );
}

/* 07b — İletişim */
export function Contact({ locale, content }: P) {
  const { dict, contact, platforms } = content;
  const c = dict.contact;
  return (
    <section id="contact" aria-labelledby="contact-h" className="pb-[var(--section)] pt-[calc(var(--section)*0.8)]">
      <div className="shell">
        <SupportLine />
        <div className="g12 mt-12 lg:mt-16">
          <h2 id="contact-h" className="t-meta col-[1/-1] lg:col-[2/-1]">
            {c.heading[locale]}
          </h2>
          <p className="t-lead col-[1/-1] mt-4 max-w-[30ch] lg:col-[2/8]">{c.lead[locale]}</p>

          <div className="col-[1/-1] mt-10 lg:col-[2/-1]">
            <a
              href={`mailto:${contact.email}`}
              className="ulink serif block max-w-full break-words text-[clamp(1.25rem,6.2vw,1.75rem)] leading-tight md:text-[clamp(1.75rem,3.5vw,3rem)]"
            >
              {contact.email}
            </a>
            <div className="mt-3">
              <CopyEmail
                email={contact.email}
                label={c.copy[locale]}
                copied={c.copied[locale]}
                failed={c.copyFailed[locale]}
                ariaLabel={c.copyLabel[locale]}
              />
            </div>
          </div>

          <div className="col-[1/-1] mt-10 lg:col-[2/-1]">
            <Cta href={contact.linkedin} external label={c.external[locale]}>
              {c.linkedin[locale]}
            </Cta>
          </div>

          <div className="col-[1/-1] mt-8 text-[15px] text-kursun lg:col-[2/-1]">
            <span className="mr-4">{c.also[locale]}</span>
            <ul className="inline-flex flex-wrap gap-x-6 gap-y-1">
              {platforms
                .filter((p) => p.id !== 'linkedin' && p.show.contact)
                .map((p) => (
                  <li key={p.id}>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ulink inline-flex min-h-11 items-center"
                    >
                      {`${p.name} `}
                      <span className="ml-2">{p.handle}</span>
                      <span className="sr-only"> ({c.external[locale]})</span>
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
