import type { SiteContent } from '@/content/site-content';
import { pick, type Locale } from '@/content/types';
import { angleText, glueLastWords } from '@/lib/format';
import { resultant } from '@/lib/physics';
import { RVector, SupportLine, V } from './linework';
import { Sidenote } from './Sidenote';

/** Hero "Cisim", typographic Variant B: no portrait, the isolation boundary encloses the name itself. */
export function Hero({ locale, content }: { locale: Locale; content: SiteContent }) {
  const { dict, draft, forceRecords, identity, interests, ownerName } = content;
  const h = dict.hero;
  const R = resultant(forceRecords);
  const deg = Math.round(R.angleDeg);
  const brief = [
    { k: h.program, v: h.programValue },
    { k: h.university, v: h.universityValue },
    { k: h.graduation, v: h.graduationValue },
    { k: h.internship, v: h.internshipValue },
  ];

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="flex min-h-[80svh] flex-col pt-[104px] md:pt-[128px] lg:min-h-0"
    >
      <div className="shell g12 flex-1 content-start gap-y-0">
        {/* meta */}
        <div className="i-meta col-[1/-1] text-[14px] leading-snug text-kursun lg:col-[1/9]">
          <p>{h.meta1[locale]}</p>
          <p>{glueLastWords(h.meta2[locale])}</p>
        </div>

        {/* isolation boundary around name + lead */}
        <div className="col-[1/-1] mt-10 lg:col-[1/10] lg:mt-14">
          <div className="relative">
            <div aria-hidden className="i-bound pointer-events-none absolute -inset-3 md:-inset-5">
              <svg className="h-full w-full overflow-visible">
                <rect
                  width="100%"
                  height="100%"
                  x="0"
                  y="0"
                  fill="none"
                  stroke="#262624"
                  strokeWidth="1"
                  strokeDasharray="6 5"
                />
              </svg>
              <span className="absolute -top-[0.75em] left-4 bg-kagit px-2 font-serif text-[15px] italic leading-none text-grafit md:left-6">
                {h.isolation[locale]}
                <sup>1</sup>
              </span>
            </div>

            <h1 id="hero-title" aria-label={ownerName} className="t-name relative">
              <span className="i-mask block md:inline-block">
                <span className="i-name block">{identity.firstName}</span>
              </span>
              <span className="i-mask block md:ml-[0.22em] md:inline-block">
                <span className="i-name block" style={{ animationDelay: '0.06s' }}>
                  {identity.lastName}
                </span>
              </span>
            </h1>

            <p className="i-lead t-lead mt-8 max-w-[28ch] md:mt-10 lg:ml-[calc((100%-8*var(--g))/9+var(--g))] lg:max-w-[30ch]">
              {draft.heroLead[locale]}
            </p>
          </div>
        </div>

        {/* aside: recruiter glance + the note on the boundary */}
        <aside className="i-meta rail-aside col-[1/-1] mt-14 lg:col-[10/13] lg:row-[1/4] lg:mt-0 lg:self-start lg:pl-7">
          <p className="t-meta hidden lg:block">{h.briefly[locale]}</p>
          <dl className="grid grid-cols-2 gap-x-[var(--g)] gap-y-5 lg:grid-cols-1 lg:gap-y-0">
            {brief.map((b, i) => (
              <div key={i} className="hair pt-3 lg:py-3">
                <dt className="t-meta">{b.k[locale]}</dt>
                <dd className="mt-0.5 text-[16px] leading-snug">{pick(b.v, locale)}</dd>
              </div>
            ))}
          </dl>
          <p className="t-note mt-8 max-w-[34ch]">
            <Sidenote n="1" label={h.whatIs[locale]}>
              {draft.isolationNote[locale]}
            </Sidenote>
          </p>
        </aside>

        {/* resultant row */}
        <div className="col-[1/-1] mt-14 lg:col-[2/10] lg:mt-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:gap-10">
            <div className="flex items-end gap-4">
              <div className="hidden md:block lg:hidden">
                <RVector
                  size={72}
                  theta={R.angleDeg}
                  label={h.resultantAlt[locale].replace('{deg}', String(deg))}
                  animate
                />
              </div>
              <div className="md:hidden">
                <RVector
                  size={56}
                  theta={R.angleDeg}
                  label={h.resultantAlt[locale].replace('{deg}', String(deg))}
                  animate
                />
              </div>
              <div className="hidden lg:block">
                <RVector
                  size={88}
                  theta={R.angleDeg}
                  label={h.resultantAlt[locale].replace('{deg}', String(deg))}
                  animate
                />
              </div>
              <p className="hero-theta tnum shrink-0 whitespace-nowrap pb-1 text-[16px] text-kursun">
                <V n="θ" s="R" /> = {angleText(R.angleDeg, locale)}
              </p>
            </div>
            <div className="flex gap-4 md:pb-0.5">
              <div aria-hidden className="ghost-v md:hidden" />
              <div>
                <p className="t-meta">{h.direction[locale]}</p>
                <ul className="dot-sep dot-sep--stack mt-1 text-[15px] italic">
                  {interests.map((it, i) => (
                    <li key={`${i}-${it.en}`} className="font-serif text-[17px] md:text-[16px]">
                      {it[locale]}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shell mt-14 w-full pb-10 lg:mt-16 lg:pb-0">
        <SupportLine />
      </div>
    </section>
  );
}
