import type { SiteContent } from '@/content/site-content';
import { profileIndexIds } from '@/content/structure';
import type { Copy, Locale } from '@/content/types';
import { monthYear, num, periodText } from '@/lib/format';
import { Cta } from './linework';
import { Portrait } from './Portrait';
import { ProcessList } from './Sections';
import { ProfileIndex } from './ProfileIndex';
import { Sidenote } from './Sidenote';

/** `content` defaults to the authoritative public content; the Admin live preview passes the edited, derived content. */
type P = { locale: Locale; content: SiteContent };

/** Keeps "Month Year" and the dash that follows together, so a range breaks only after the dash. */
const NBSP = String.fromCodePoint(0xa0);
const keepRange = (s: string) => s.replace(/ (?=\d{4}\b)/g, NBSP).replace(/ –/g, `${NBSP}–`);

/** Record pattern: meta column, then title and detail, separated by hairlines. */
function Rec({ meta, children }: { meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="hair grid gap-2 py-6 md:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] md:gap-6">
      <div className="tnum text-[15px] leading-snug text-kursun">{meta}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Block({
  id,
  locale,
  dict,
  children,
}: {
  id: string;
  locale: Locale;
  dict: SiteContent['dict'];
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-[var(--band)] border-t border-cizgi pt-10 lg:pt-14">
      <h2 id={`${id}-h`} className="t-display-m">
        {(dict.sections as Record<string, Copy>)[id][locale]}
      </h2>
      <div className="mt-8 lg:mt-12">{children}</div>
    </section>
  );
}

const Title = ({ children }: { children: React.ReactNode }) => (
  <h3 className="serif text-[24px] leading-[1.15] tracking-[-0.01em] md:text-[26px]">{children}</h3>
);

function ProfileIntro({ locale, content }: P) {
  const { dict, draft, cvPdf } = content;
  const p = dict.profile;
  return (
    <section id="intro" aria-labelledby="intro-h" className="lg:grid lg:grid-cols-10 lg:gap-x-[var(--g)]">
      <h1 id="intro-h" className="t-display-l lg:col-[1/7]">
        {p.h1[locale]}
      </h1>

      {/* Monograph opening: the portrait sits beside name and biography on lg, between name and lead on small screens */}
      <Portrait
        locale={locale}
        source={content.portrait}
        priority
        sizes="(min-width: 1024px) 30vw, (min-width: 768px) 55vw, 100vw"
        className="mt-8 w-full md:w-[55%] lg:col-[7/11] lg:row-[1/3] lg:mt-3 lg:w-full"
      />

      <div className="lg:col-[1/7] lg:row-start-2">
        <p className="t-statement max-w-[26ch] pt-8 lg:pt-12">{draft.profileLead[locale]}</p>
        <p className="max-w-[58ch] pt-6 text-[17px] leading-[1.6] lg:pt-8">{draft.profileBody[locale]}</p>

        <div className="mt-10">
          <dl className="hair grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] gap-4 py-6">
            <dt className="t-meta pt-0.5">{p.now[locale]}</dt>
            <dd className="leading-snug">{p.nowValue[locale]}</dd>
          </dl>
        </div>

        {cvPdf ? (
          <div className="mt-6">
            <Cta href={cvPdf.href}>{p.cv[locale]}</Cta>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProfileEducation({ locale, content }: P) {
  const { dict, draft } = content;
  const p = dict.profile;
  return (
    <Block id="education" locale={locale} dict={dict}>
      <div>
        {content.education.map((e) => (
          <Rec
            key={e.id}
            meta={
              <>
                <p>{keepRange(periodText(e.period, locale))}</p>
                {e.period.expected ? <p className="t-caption pt-0.5">{p.expected[locale]}</p> : null}
              </>
            }
          >
            <Title>{e.institution[locale]}</Title>
            {e.program || e.stage ? (
              <p className="pt-2 text-[17px]">{[e.program?.[locale], e.stage?.[locale]].filter(Boolean).join(' · ')}</p>
            ) : null}
            {e.score ? (
              <p className="pt-2 text-[17px]">
                {p.score[locale]} <span className="tnum font-semibold">{num(e.score, locale)}/100</span>
              </p>
            ) : null}
          </Rec>
        ))}
      </div>

      <div className="rail-q mt-12">
        <p className="text-[17px] leading-[1.6]">
          {draft.academicIntro[locale]}
          <Sidenote n="1">{draft.academicNote[locale]}</Sidenote>
        </p>
      </div>

      <p className="t-meta pb-2 pt-8">{p.academic[locale]}</p>
      <ul className="grid gap-x-[var(--g)] sm:grid-cols-2">
        {content.academicInterests.map((it, n) => (
          <li key={`${n}-${it.en}`} className="border-t border-cizgi py-2.5 text-[17px]">
            {it[locale]}
          </li>
        ))}
      </ul>
    </Block>
  );
}

function ProfileExperience({ locale, content }: P) {
  const { dict, draft } = content;
  const w = dict.workshop;
  return (
    <Block id="experience" locale={locale} dict={dict}>
      {content.experience.map((x) => (
        <article key={x.id}>
          <Rec
            meta={
              <>
                <p>{monthYear(x.month, locale)}</p>
                <p className="t-caption pt-0.5">
                  {x.duration[locale]} · {x.place[locale]}
                </p>
              </>
            }
          >
            <Title>{x.organization}</Title>
            <p className="pt-2 text-[17px]">{x.role[locale]}</p>
            <p className="max-w-[52ch] pt-4 text-[17px] leading-[1.6]">{draft.experienceIntro[locale]}</p>
          </Rec>

          {/* working-area panel: Applied (solid, graphite) and Observed (lead, thin pencil line) stay visibly apart */}
          <div className="on-pafta mt-8 grid gap-10 border-[1.5px] border-grafit bg-pafta p-6 md:grid-cols-2 md:gap-[var(--g)] md:p-8">
            <div>
              <h3 className="serif text-[22px] italic leading-none">{w.applied[locale]}</h3>
              <p className="t-caption pb-4 pt-2">{w.appliedHint[locale]}</p>
              <ProcessList items={x.applied} tone="applied" locale={locale} />
            </div>
            <div>
              <h3 className="serif text-[22px] italic leading-none text-kursun">{w.observed[locale]}</h3>
              <p className="t-caption pb-4 pt-2">{w.observedHint[locale]}</p>
              <ProcessList items={x.observed} tone="observed" locale={locale} />
            </div>
          </div>
        </article>
      ))}
    </Block>
  );
}

function ProfileCommunity({ locale, content }: P) {
  const { dict, draft } = content;
  return (
    <Block id="community" locale={locale} dict={dict}>
      {content.memberships.map((m) => (
        <Rec key={m.id} meta={keepRange(periodText(m.period, locale))}>
          <Title>{m.organization}</Title>
          <p className="pt-2 text-[17px]">{m.role[locale]}</p>
          <div className="rail-q mt-4">
            <p className="text-[17px] leading-[1.6]">
              {m.text[locale]}
              <Sidenote n="2">{draft.rastageNote[locale]}</Sidenote>
            </p>
          </div>
        </Rec>
      ))}
    </Block>
  );
}

function ProfileSkills({ locale, content }: P) {
  return (
    <Block id="skills" locale={locale} dict={content.dict}>
      {content.skillGroups.map((g) => (
        <div key={g.id} className="hair grid gap-3 py-6 md:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] md:gap-6">
          <h3 className="serif text-[20px] italic leading-tight">{g.name[locale]}</h3>
          <ul className="dot-sep text-[17px]">
            {g.items.map((it, n) => (
              <li key={`${n}-${it.name.en}`}>
                {it.name[locale]}
                {it.context ? <span className="text-kursun"> ({it.context[locale]})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Block>
  );
}

function ProfileLanguages({ locale, content }: P) {
  return (
    <Block id="languages" locale={locale} dict={content.dict}>
      {content.languages.map((l) => (
        <div key={l.id} className="hair grid gap-1 py-4 md:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] md:gap-6">
          <p className="text-[19px] font-semibold leading-[1.3]">{l.name[locale]}</p>
          {/* Turkish carries no level label until Sinem confirms one */}
          {l.level ? <p className="text-[17px] text-kursun">{l.level[locale]}</p> : null}
        </div>
      ))}
    </Block>
  );
}

function ProfileInterests({ locale, content }: P) {
  return (
    <Block id="interests" locale={locale} dict={content.dict}>
      <ul className="max-w-[28rem]">
        {content.interests.map((it, n) => (
          <li key={`${n}-${it.en}`} className="pt-5">
            <p className="serif text-[28px] leading-none md:text-[32px]">{it[locale]}</p>
            {/* ghost line = a possible, future position */}
            <div className="ghost-h mt-4" aria-hidden />
          </li>
        ))}
      </ul>
      <p className="t-caption pt-6">{content.dict.profile.interestsCaption[locale]}</p>
    </Block>
  );
}

function ProfileOffField({ locale, content }: P) {
  const { draft } = content;
  return (
    <Block id="off-field" locale={locale} dict={content.dict}>
      <div className="rail-q">
        <p className="text-[17px] leading-[1.6]">
          {draft.offField[locale]}
          <Sidenote n="3">{draft.teamSportNote[locale]}</Sidenote>
        </p>
      </div>
      <div className="mt-8">
        {content.activities.map((a) => (
          <Rec key={a.id} meta={a.period ? keepRange(periodText(a.period, locale)) : undefined}>
            <p className="text-[19px] font-semibold leading-[1.3]">{a.name[locale]}</p>
          </Rec>
        ))}
      </div>
    </Block>
  );
}

/** Index + content columns of the Profile page: index 1–2, content 3–9, notes 10–12. */
export function ProfileLayout({ locale, content }: P) {
  const { dict } = content;
  const items = profileIndexIds.map((id) => ({
    id,
    label: id === 'intro' ? dict.profile.index[locale] : (dict.sections as Record<string, Copy>)[id][locale],
  }));
  return (
    <div className="shell g12 pb-[var(--section)] pt-[calc(72px+var(--band))]">
      <div className="col-[1/-1] mb-12 lg:col-[1/3] lg:row-[1/3] lg:mb-0">
        <ProfileIndex items={items} title={dict.profile.onThisPage[locale]} />
      </div>
      {/* the opening spans content + notes columns so the portrait can sit beside the name */}
      <div className="col-[1/-1] lg:col-[3/13] lg:row-start-1">
        <ProfileIntro locale={locale} content={content} />
      </div>
      <div className="col-[1/-1] lg:col-[3/10] lg:row-start-2">
        <ProfileEducation locale={locale} content={content} />
        <ProfileExperience locale={locale} content={content} />
        <ProfileCommunity locale={locale} content={content} />
        <ProfileSkills locale={locale} content={content} />
        <ProfileLanguages locale={locale} content={content} />
        <ProfileInterests locale={locale} content={content} />
        <ProfileOffField locale={locale} content={content} />
      </div>
    </div>
  );
}
